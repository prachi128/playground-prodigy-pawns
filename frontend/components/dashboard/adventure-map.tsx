"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { puzzleAPI, Puzzle } from "@/lib/api"
import toast from "react-hot-toast"

/* Submodules */
import {
  T,
  GRAVITY,
  JUMP_FORCE,
  MOVE_SPEED,
  CANVAS_H,
  GROUND_ROW,
  ROWS,
  CHUNK_COLS,
  QUESTION,
  QUESTION_USED,
  COIN,
  COIN_GOLD,
} from "./adventure/constants"
import type { GameState, HudData } from "./adventure/types"
import { tileKey, generateChunk } from "./adventure/level-generation"
import {
  drawSky,
  drawParallaxBg,
  drawTile,
  drawGrassOnTop,
  drawPlayer,
  drawEnemy,
  drawCoin,
  drawParticles,
} from "./adventure/rendering"
import { isSolid } from "./adventure/collision"
import { PuzzleModal } from "./adventure/PuzzleModal"
import { StartScreen } from "./adventure/StartScreen"
import { GameOverScreen } from "./adventure/GameOverScreen"
import { GameHUD } from "./adventure/GameHUD"

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function AdventureMap({ autoStart }: { autoStart?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // React state — only for UI overlays
  const [showPuzzle, setShowPuzzle] = useState(false)
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null)
  const [hudData, setHudData] = useState<HudData>({ lives: 3, coins: 0, world: "1-1", score: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(800)

  // Puzzle pool
  const puzzlePoolRef = useRef<Puzzle[]>([])
  const puzzleIndexRef = useRef(0)

  // Load puzzles on mount
  useEffect(() => {
    puzzleAPI
      .getAll("beginner", undefined, 0, 100)
      .then((list) => {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[list[i], list[j]] = [list[j], list[i]]
        }
        puzzlePoolRef.current = list
      })
      .catch(() => {})
  }, [])

  // Resize canvas
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Initialize game
  const initGame = useCallback((): GameState => {
    const tiles = new Map<string, number>()
    const enemies: never[] = []
    const coins: never[] = []

    generateChunk(tiles, enemies, coins, 0, CHUNK_COLS, true)

    return {
      player: {
        x: 3 * T,
        y: (GROUND_ROW - 2) * T,
        vx: 0,
        vy: 0,
        w: 16,
        h: 28,
        grounded: false,
        facing: 1,
        frame: 0,
      },
      camera: { x: 0 },
      tiles,
      enemies,
      coins,
      particles: [],
      generatedUpTo: CHUNK_COLS,
      lives: 3,
      coinCount: 0,
      score: 0,
      puzzlesSolved: 0,
      gameOver: false,
      paused: false,
      started: true,
      time: 0,
      invincibleUntil: 0,
      lastCheckpointX: 3 * T,
      questionBlocks: new Set(),
    }
  }, [])

  // Start game
  const startGame = useCallback(() => {
    gameRef.current = initGame()
    setStarted(true)
    setGameOver(false)
    setHudData({ lives: 3, coins: 0, world: "1-1", score: 0 })
  }, [initGame])

  useLayoutEffect(() => {
    if (autoStart) startGame()
  }, [autoStart, startGame])

  // Trigger puzzle
  const triggerPuzzle = useCallback(() => {
    const gs = gameRef.current
    if (!gs) return
    const pool = puzzlePoolRef.current
    if (pool.length === 0) {
      toast.error("No puzzles loaded!")
      return
    }
    gs.paused = true
    const puzzle = pool[puzzleIndexRef.current % pool.length]
    puzzleIndexRef.current++
    setCurrentPuzzle(puzzle)
    setShowPuzzle(true)
  }, [])

  // Puzzle solved callback
  const onPuzzleSolve = useCallback((coins: number, score: number) => {
    const gs = gameRef.current
    if (gs) {
      gs.coinCount += coins
      gs.score += score
      gs.puzzlesSolved++
    }
  }, [])

  // Close puzzle
  const closePuzzle = useCallback(() => {
    setShowPuzzle(false)
    setCurrentPuzzle(null)
    const gs = gameRef.current
    if (gs) gs.paused = false
  }, [])

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showPuzzle) return
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", " "].includes(e.key)) {
        e.preventDefault()
      }
      keysRef.current.add(e.key)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [showPuzzle])

  // ==================== MAIN GAME LOOP ====================
  useEffect(() => {
    if (!started || gameOver) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!ctx) return

    lastTimeRef.current = performance.now()

    function loop(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 16.667, 3)
      lastTimeRef.current = now

      const gs = gameRef.current
      if (!gs || gs.gameOver) {
        setGameOver(true)
        return
      }
      if (gs.paused) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      gs.time += dt * 0.016
      const keys = keysRef.current
      const p = gs.player
      const w = canvasWidth

      // --- INPUT ---
      p.vx = 0
      if (keys.has("ArrowLeft") || keys.has("a")) {
        p.vx = -MOVE_SPEED
        p.facing = -1
      }
      if (keys.has("ArrowRight") || keys.has("d")) {
        p.vx = MOVE_SPEED
        p.facing = 1
      }
      if ((keys.has("ArrowUp") || keys.has(" ") || keys.has("Space") || keys.has("w")) && p.grounded) {
        p.vy = JUMP_FORCE
        p.grounded = false
      }

      // --- PHYSICS ---
      p.vy += GRAVITY * dt
      if (p.vy > 12) p.vy = 12

      // Move X
      p.x += p.vx * dt
      if (p.x < gs.camera.x) p.x = gs.camera.x

      // X collisions
      const pLeft = Math.floor(p.x / T)
      const pRight = Math.floor((p.x + p.w) / T)
      const pTop = Math.floor(p.y / T)
      const pBottom = Math.floor((p.y + p.h) / T)

      for (let row = pTop; row <= pBottom; row++) {
        for (let col = pLeft; col <= pRight; col++) {
          const tt = gs.tiles.get(tileKey(col, row))
          if (tt !== undefined && isSolid(tt)) {
            const tileX = col * T
            const tileY = row * T
            if (p.x + p.w > tileX && p.x < tileX + T && p.y + p.h > tileY && p.y < tileY + T) {
              if (p.vx > 0) p.x = tileX - p.w
              else if (p.vx < 0) p.x = tileX + T
            }
          }
        }
      }

      // Move Y
      p.y += p.vy * dt
      p.grounded = false

      // Y collisions
      const pLeft2 = Math.floor(p.x / T)
      const pRight2 = Math.floor((p.x + p.w) / T)
      const pTop2 = Math.floor(p.y / T)
      const pBottom2 = Math.floor((p.y + p.h) / T)

      for (let row = pTop2; row <= pBottom2; row++) {
        for (let col = pLeft2; col <= pRight2; col++) {
          const tt = gs.tiles.get(tileKey(col, row))
          if (tt !== undefined && isSolid(tt)) {
            const tileX = col * T
            const tileY = row * T
            if (p.x + p.w > tileX && p.x < tileX + T && p.y + p.h > tileY && p.y < tileY + T) {
              if (p.vy > 0) {
                p.y = tileY - p.h
                p.vy = 0
                p.grounded = true
                gs.lastCheckpointX = p.x
              } else if (p.vy < 0) {
                p.y = tileY + T
                p.vy = 0

                // Check if it's a ? block
                if (tt === QUESTION) {
                  const key = tileKey(col, row)
                  if (!gs.questionBlocks.has(key)) {
                    gs.questionBlocks.add(key)
                    gs.tiles.set(key, QUESTION_USED)
                    for (let i = 0; i < 6; i++) {
                      gs.particles.push({
                        x: col * T + T / 2,
                        y: row * T,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -Math.random() * 4 - 2,
                        life: 1,
                        maxLife: 1,
                        color: COIN_GOLD,
                        size: 3,
                      })
                    }
                    triggerPuzzle()
                  }
                }
              }
            }
          }
        }
      }

      // Fall death
      if (p.y > CANVAS_H + 50) {
        gs.lives--
        if (gs.lives <= 0) {
          gs.gameOver = true
        } else {
          p.x = gs.lastCheckpointX
          p.y = (GROUND_ROW - 3) * T
          p.vy = 0
          p.vx = 0
          gs.invincibleUntil = gs.time + 2
        }
      }

      // --- CAMERA ---
      const targetCamX = p.x - w * 0.35
      gs.camera.x = Math.max(0, targetCamX)

      // --- GENERATE MORE LEVEL ---
      const neededCol = Math.floor((gs.camera.x + w) / T) + 20
      while (gs.generatedUpTo < neededCol) {
        generateChunk(gs.tiles, gs.enemies, gs.coins, gs.generatedUpTo, CHUNK_COLS, false)
        gs.generatedUpTo += CHUNK_COLS
      }

      // --- ENEMIES ---
      for (const e of gs.enemies) {
        if (!e.alive) continue
        if (Math.abs(e.x - gs.camera.x) > w + 200) continue

        e.x += e.vx * dt
        if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx *= -1

        if (gs.time < gs.invincibleUntil) continue
        const overlap = p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h
        if (overlap) {
          if (p.vy > 0 && p.y + p.h < e.y + e.h / 2) {
            e.alive = false
            p.vy = JUMP_FORCE * 0.6
            gs.score += 100
            gs.particles.push({
              x: e.x + e.w / 2,
              y: e.y,
              vx: 0,
              vy: -2,
              life: 1,
              maxLife: 1,
              color: "#fff",
              text: "100",
              size: 14,
            })
          } else {
            gs.lives--
            gs.invincibleUntil = gs.time + 2
            p.vy = JUMP_FORCE * 0.5
            if (gs.lives <= 0) gs.gameOver = true
          }
        }
      }

      // --- COINS ---
      for (const c of gs.coins) {
        if (c.collected) continue
        if (Math.abs(c.x - gs.camera.x) > w + 100) continue
        const dx = c.x - (p.x + p.w / 2)
        const dy = c.y - (p.y + p.h / 2)
        if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
          c.collected = true
          gs.coinCount++
          gs.score += 10
          gs.particles.push({
            x: c.x,
            y: c.y,
            vx: 0,
            vy: -2,
            life: 0.8,
            maxLife: 0.8,
            color: COIN_GOLD,
            text: "+1",
            size: 12,
          })
        }
      }

      // --- PARTICLES ---
      for (const part of gs.particles) {
        part.x += part.vx * dt
        part.y += part.vy * dt
        part.vy += 0.05 * dt
        part.life -= 0.02 * dt
      }
      gs.particles = gs.particles.filter((pp) => pp.life > 0)

      // --- UPDATE HUD ---
      const world = Math.ceil((p.x / T + 1) / 50)
      const level = Math.ceil(((p.x / T + 1) % 50) / 10) || 1
      setHudData({
        lives: gs.lives,
        coins: gs.coinCount,
        world: `${world}-${level}`,
        score: gs.score,
      })

      // --- RENDER ---
      const cam = gs.camera.x
      ctx.clearRect(0, 0, w, CANVAS_H)

      drawSky(ctx, w)
      drawParallaxBg(ctx, w, cam)

      const startCol = Math.floor(cam / T) - 1
      const endCol = Math.ceil((cam + w) / T) + 1

      for (let col = startCol; col <= endCol; col++) {
        for (let row = 0; row < ROWS; row++) {
          const tt = gs.tiles.get(tileKey(col, row))
          if (tt !== undefined && tt !== COIN) {
            drawTile(ctx, tt, col * T - cam, row * T, gs.time)
          }
          if (
            (tt === 1 || tt === 2) &&
            row > 0 &&
            !isSolid(gs.tiles.get(tileKey(col, row - 1)) ?? 0)
          ) {
            drawGrassOnTop(ctx, col * T - cam, row * T)
          }
        }
      }

      for (const c of gs.coins) {
        if (c.collected) continue
        if (c.x - cam > -T && c.x - cam < w + T) {
          drawCoin(ctx, { ...c, x: c.x - cam }, gs.time)
        }
      }

      for (const e of gs.enemies) {
        if (!e.alive) continue
        if (e.x - cam > -T * 2 && e.x - cam < w + T * 2) {
          drawEnemy(ctx, { ...e, x: e.x - cam }, gs.time)
        }
      }

      drawPlayer(ctx, { ...p, x: p.x - cam }, gs.time, gs.time < gs.invincibleUntil)

      const shiftedParticles = gs.particles.map((pp) => ({ ...pp, x: pp.x - cam }))
      drawParticles(ctx, shiftedParticles)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, gameOver, canvasWidth, triggerPuzzle])

  /* ================================================================ */
  /*  CONDITIONAL SCREENS                                              */
  /* ================================================================ */

  if (!started) {
    if (autoStart) return null
    return <StartScreen onStart={startGame} />
  }

  if (gameOver) {
    return (
      <GameOverScreen
        hudData={hudData}
        puzzlesSolved={gameRef.current?.puzzlesSolved ?? 0}
        onRestart={startGame}
      />
    )
  }

  /* ================================================================ */
  /*  PLAYING — Canvas + HUD + Puzzle Modal                            */
  /* ================================================================ */
  return (
    <div className="mx-auto max-w-5xl" ref={containerRef}>
      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
        <GameHUD hudData={hudData} />

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={CANVAS_H}
          className="block w-full"
          style={{ imageRendering: "pixelated" }}
          tabIndex={0}
        />

        {showPuzzle && currentPuzzle && (
          <PuzzleModal puzzle={currentPuzzle} onClose={closePuzzle} onSolve={onPuzzleSolve} />
        )}
      </div>
    </div>
  )
}
