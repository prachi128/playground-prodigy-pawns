"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { ArrowRight, Lightbulb, RotateCcw, X } from "lucide-react"
import { puzzleAPI, Puzzle } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import toast from "react-hot-toast"

/* ================================================================== */
/*  GAME CONSTANTS                                                     */
/* ================================================================== */

const T = 32 // tile size
const GRAVITY = 0.55
const JUMP_FORCE = -11
const MOVE_SPEED = 3.5
const ENEMY_SPEED = 0.8
const CANVAS_H = 480
const GROUND_ROW = 13 // y row for ground (13 * 32 = 416, leaves room at bottom)
const ROWS = 15
const CHUNK_COLS = 50
const QUESTION_INTERVAL = 22 // ? block every N cols
const PIPE_INTERVAL = 38
const ENEMY_INTERVAL = 18
const COIN_CLUSTER_INTERVAL = 12

/* Tile types */
const EMPTY = 0
const GROUND = 1
const BRICK = 2
const QUESTION = 3
const QUESTION_USED = 4
const PIPE_LEFT = 5
const PIPE_RIGHT = 6
const PIPE_TOP_LEFT = 7
const PIPE_TOP_RIGHT = 8
const COIN = 9

/* Colors */
const SKY = "#5c94fc"
const SKY_BOTTOM = "#88b4fc"
const GROUND_COLOR = "#c84c09"
const GROUND_DARK = "#a03000"
const GROUND_LINE = "#6b2000"
const GRASS_TOP = "#5ab54a"
const GRASS_HIGHLIGHT = "#70d060"
const BRICK_COLOR = "#c06020"
const BRICK_LINE_COLOR = "#401500"
const Q_BLOCK_COLOR = "#f0a830"
const Q_BLOCK_BORDER = "#805010"
const Q_BLOCK_HIGHLIGHT = "#f8d878"
const Q_USED_COLOR = "#8b6914"
const PIPE_GREEN = "#30a830"
const PIPE_DARK = "#208020"
const PIPE_LIGHT = "#50c850"
const COIN_GOLD = "#ffd700"
const COIN_DARK = "#c09000"

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

interface GameState {
  player: Player
  camera: { x: number }
  tiles: Map<string, number> // "col,row" → tile type
  enemies: Enemy[]
  coins: CoinEntity[]
  particles: Particle[]
  generatedUpTo: number // rightmost generated column
  lives: number
  coinCount: number
  score: number
  puzzlesSolved: number
  gameOver: boolean
  paused: boolean
  started: boolean
  time: number
  invincibleUntil: number
  lastCheckpointX: number
  questionBlocks: Set<string> // track which ? blocks have been used
}

interface Player {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  grounded: boolean
  facing: number // 1 = right, -1 = left
  frame: number
}

interface Enemy {
  x: number
  y: number
  vx: number
  w: number
  h: number
  alive: boolean
  patrolLeft: number
  patrolRight: number
}

interface CoinEntity {
  x: number
  y: number
  collected: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  text?: string
  size: number
}

/* ================================================================== */
/*  LEVEL GENERATION                                                   */
/* ================================================================== */

function tileKey(col: number, row: number) {
  return `${col},${row}`
}

function generateChunk(
  tiles: Map<string, number>,
  enemies: Enemy[],
  coins: CoinEntity[],
  startCol: number,
  chunkSize: number,
  isFirstChunk: boolean
) {
  const endCol = startCol + chunkSize

  for (let col = startCol; col < endCol; col++) {
    // Ground with occasional gaps
    const isGap =
      !isFirstChunk &&
      col > startCol + 3 &&
      col < endCol - 3 &&
      col % 15 >= 12 &&
      col % 15 <= 13

    if (!isGap) {
      tiles.set(tileKey(col, GROUND_ROW), GROUND)
      tiles.set(tileKey(col, GROUND_ROW + 1), GROUND)
    }

    // Floating platforms
    if (!isFirstChunk && col % 8 === 0 && Math.random() > 0.4) {
      const platRow = GROUND_ROW - 3 - Math.floor(Math.random() * 3)
      const platLen = 3 + Math.floor(Math.random() * 3)
      for (let p = 0; p < platLen && col + p < endCol; p++) {
        tiles.set(tileKey(col + p, platRow), BRICK)
      }

      // Sometimes add coins above platform
      if (Math.random() > 0.5) {
        for (let p = 0; p < platLen; p++) {
          coins.push({ x: (col + p) * T + T / 2, y: (platRow - 1) * T + T / 2, collected: false })
        }
      }
    }

    // Question blocks
    if (!isFirstChunk && col % QUESTION_INTERVAL === 0 && col > 10) {
      const qRow = GROUND_ROW - 4
      tiles.set(tileKey(col, qRow), QUESTION)
      // Coins near question blocks
      if (col - 1 > startCol) tiles.set(tileKey(col - 1, qRow), BRICK)
      if (col + 1 < endCol) tiles.set(tileKey(col + 1, qRow), BRICK)
    }

    // Standalone question blocks at ground level above
    if (!isFirstChunk && col % QUESTION_INTERVAL === 11 && col > 15) {
      tiles.set(tileKey(col, GROUND_ROW - 3), QUESTION)
    }

    // Pipes
    if (!isFirstChunk && col % PIPE_INTERVAL === 0 && col > 15 && !isGap) {
      const pipeHeight = 2 + Math.floor(Math.random() * 2)
      for (let r = 0; r < pipeHeight; r++) {
        const row = GROUND_ROW - 1 - r
        if (r === pipeHeight - 1) {
          tiles.set(tileKey(col, row), PIPE_TOP_LEFT)
          tiles.set(tileKey(col + 1, row), PIPE_TOP_RIGHT)
        } else {
          tiles.set(tileKey(col, row), PIPE_LEFT)
          tiles.set(tileKey(col + 1, row), PIPE_RIGHT)
        }
      }
    }

    // Coins on ground
    if (col % COIN_CLUSTER_INTERVAL === 5 && !isGap) {
      for (let c = 0; c < 3; c++) {
        coins.push({
          x: (col + c) * T + T / 2,
          y: (GROUND_ROW - 2) * T + T / 2,
          collected: false,
        })
      }
    }

    // High floating coins (in arcs)
    if (col % 20 === 10) {
      for (let c = 0; c < 5; c++) {
        const arcY = GROUND_ROW - 4 - Math.round(2 * Math.sin((c / 4) * Math.PI))
        coins.push({
          x: (col + c) * T + T / 2,
          y: arcY * T + T / 2,
          collected: false,
        })
      }
    }

    // Enemies
    if (!isFirstChunk && col % ENEMY_INTERVAL === 0 && col > 12 && !isGap) {
      enemies.push({
        x: col * T,
        y: (GROUND_ROW - 1) * T,
        vx: ENEMY_SPEED,
        w: T - 4,
        h: T - 2,
        alive: true,
        patrolLeft: (col - 4) * T,
        patrolRight: (col + 4) * T,
      })
    }
  }
}

/* ================================================================== */
/*  RENDERING FUNCTIONS                                                */
/* ================================================================== */

function drawSky(ctx: CanvasRenderingContext2D, w: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, SKY)
  grad.addColorStop(1, SKY_BOTTOM)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, CANVAS_H)
}

function drawParallaxBg(ctx: CanvasRenderingContext2D, w: number, camX: number) {
  // Hills (far)
  const hillData = [
    { cx: 200, r: 120, h: 80 },
    { cx: 600, r: 150, h: 100 },
    { cx: 1000, r: 100, h: 70 },
    { cx: 1400, r: 180, h: 110 },
  ]
  ctx.fillStyle = "#48a848"
  for (const hill of hillData) {
    const px = ((hill.cx - camX * 0.3) % (w + 400)) - 200
    ctx.beginPath()
    ctx.ellipse(px, GROUND_ROW * T, hill.r, hill.h, 0, Math.PI, 0)
    ctx.fill()
  }

  // Bushes (closer)
  ctx.fillStyle = "#30a030"
  const bushData = [
    { cx: 100, r: 40, h: 20 },
    { cx: 350, r: 55, h: 25 },
    { cx: 700, r: 35, h: 18 },
    { cx: 950, r: 50, h: 22 },
    { cx: 1200, r: 45, h: 20 },
  ]
  for (const bush of bushData) {
    const px = ((bush.cx - camX * 0.5) % (w + 300)) - 100
    ctx.beginPath()
    ctx.ellipse(px, GROUND_ROW * T, bush.r, bush.h, 0, Math.PI, 0)
    ctx.fill()
  }

  // Clouds
  ctx.fillStyle = "#ffffff"
  const cloudData = [
    { cx: 150, cy: 60, r: 30 },
    { cx: 400, cy: 40, r: 40 },
    { cx: 700, cy: 70, r: 25 },
    { cx: 1050, cy: 50, r: 35 },
    { cx: 1300, cy: 30, r: 28 },
  ]
  for (const cloud of cloudData) {
    const px = ((cloud.cx - camX * 0.15) % (w + 400)) - 100
    ctx.beginPath()
    ctx.ellipse(px, cloud.cy, cloud.r * 1.5, cloud.r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(px - cloud.r * 0.5, cloud.cy - cloud.r * 0.3, cloud.r * 0.8, cloud.r * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(px + cloud.r * 0.5, cloud.cy - cloud.r * 0.2, cloud.r * 0.9, cloud.r * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    // Cloud eyes
    ctx.fillStyle = "#000"
    ctx.beginPath()
    ctx.arc(px - 6, cloud.cy - 2, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(px + 6, cloud.cy - 2, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
  }
}

function drawTile(ctx: CanvasRenderingContext2D, type: number, x: number, y: number, time: number) {
  switch (type) {
    case GROUND: {
      // Brick pattern
      ctx.fillStyle = GROUND_COLOR
      ctx.fillRect(x, y, T, T)
      ctx.strokeStyle = GROUND_LINE
      ctx.lineWidth = 1
      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(x, y + T / 2)
      ctx.lineTo(x + T, y + T / 2)
      ctx.stroke()
      // Vertical lines (offset every other row)
      ctx.beginPath()
      ctx.moveTo(x + T / 2, y)
      ctx.lineTo(x + T / 2, y + T / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y + T / 2)
      ctx.lineTo(x, y + T)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + T, y + T / 2)
      ctx.lineTo(x + T, y + T)
      ctx.stroke()
      // Grass on top if the tile above is empty
      break
    }
    case BRICK: {
      ctx.fillStyle = BRICK_COLOR
      ctx.fillRect(x, y, T, T)
      ctx.strokeStyle = BRICK_LINE_COLOR
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, T, T)
      ctx.beginPath()
      ctx.moveTo(x, y + T / 2)
      ctx.lineTo(x + T, y + T / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + T / 2, y)
      ctx.lineTo(x + T / 2, y + T / 2)
      ctx.stroke()
      break
    }
    case QUESTION: {
      const glow = Math.sin(time * 3) * 0.15 + 0.85
      ctx.fillStyle = Q_BLOCK_COLOR
      ctx.fillRect(x + 1, y + 1, T - 2, T - 2)
      ctx.strokeStyle = Q_BLOCK_HIGHLIGHT
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, T - 2, T - 2)
      // Inner shadow
      ctx.fillStyle = Q_BLOCK_BORDER
      ctx.fillRect(x + 3, y + T - 5, T - 6, 3)
      ctx.fillRect(x + T - 5, y + 3, 3, T - 6)
      // Question mark
      ctx.fillStyle = `rgba(255,255,255,${glow})`
      ctx.font = "bold 18px Fredoka, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("?", x + T / 2, y + T / 2)
      break
    }
    case QUESTION_USED: {
      ctx.fillStyle = Q_USED_COLOR
      ctx.fillRect(x + 1, y + 1, T - 2, T - 2)
      ctx.strokeStyle = "#5a3e0a"
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, T - 2, T - 2)
      break
    }
    case PIPE_LEFT:
    case PIPE_RIGHT: {
      const isLeft = type === PIPE_LEFT
      ctx.fillStyle = PIPE_GREEN
      ctx.fillRect(x, y, T, T)
      // Shading
      ctx.fillStyle = isLeft ? PIPE_LIGHT : PIPE_DARK
      ctx.fillRect(isLeft ? x : x + T - 4, y, 4, T)
      ctx.fillStyle = PIPE_DARK
      ctx.fillRect(isLeft ? x + T - 2 : x, y, 2, T)
      break
    }
    case PIPE_TOP_LEFT:
    case PIPE_TOP_RIGHT: {
      const isLeft = type === PIPE_TOP_LEFT
      // Pipe cap (wider)
      ctx.fillStyle = PIPE_GREEN
      ctx.fillRect(x - (isLeft ? 3 : 0), y, T + (isLeft ? 3 : 3), T)
      ctx.fillStyle = PIPE_LIGHT
      ctx.fillRect(x - (isLeft ? 3 : 0), y, 4, T)
      ctx.fillStyle = PIPE_DARK
      ctx.fillRect(x + T + (isLeft ? 0 : 3) - 2, y, 2, T)
      // Top highlight
      ctx.fillStyle = PIPE_LIGHT
      ctx.fillRect(x - (isLeft ? 3 : 0), y, T + (isLeft ? 3 : 3), 3)
      break
    }
  }
}

function drawGrassOnTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GRASS_TOP
  ctx.fillRect(x, y, T, 4)
  ctx.fillStyle = GRASS_HIGHLIGHT
  ctx.fillRect(x, y, T, 2)
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, time: number, invincible: boolean) {
  const bobY = p.grounded ? Math.sin(time * 8 + p.x * 0.1) * 1.5 : 0
  const px = p.x + p.w / 2
  const py = p.y + p.h + bobY

  // Flash if invincible
  if (invincible && Math.floor(time * 10) % 2 === 0) return

  ctx.save()
  ctx.translate(px, py)
  if (p.facing < 0) ctx.scale(-1, 1)

  // Pawn body (white chess pawn shape)
  // Base
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.ellipse(0, -4, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#aaa"
  ctx.lineWidth = 1
  ctx.stroke()

  // Body
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.moveTo(-7, -6)
  ctx.quadraticCurveTo(-5, -18, 0, -22)
  ctx.quadraticCurveTo(5, -18, 7, -6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Head
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.arc(0, -24, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Eyes
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.arc(-3, -25, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(3, -25, 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Pupils (look in facing direction)
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.arc(-2, -25, 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(4, -25, 0.8, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  if (!e.alive) return
  const px = e.x + e.w / 2
  const py = e.y + e.h
  const bobY = Math.sin(time * 4 + e.x * 0.05) * 1

  ctx.save()
  ctx.translate(px, py + bobY)
  if (e.vx < 0) ctx.scale(-1, 1)

  // Dark pawn body (black chess pawn)
  ctx.fillStyle = "#333"
  ctx.beginPath()
  ctx.ellipse(0, -3, 9, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(-6, -5)
  ctx.quadraticCurveTo(-4, -15, 0, -18)
  ctx.quadraticCurveTo(4, -15, 6, -5)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, -20, 6, 0, Math.PI * 2)
  ctx.fill()

  // Evil red eyes
  ctx.fillStyle = "#ff3030"
  ctx.beginPath()
  ctx.arc(-2.5, -21, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(2.5, -21, 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawCoin(ctx: CanvasRenderingContext2D, c: CoinEntity, time: number) {
  if (c.collected) return
  const scaleX = Math.abs(Math.cos(time * 3 + c.x * 0.01))
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.scale(scaleX, 1)
  ctx.fillStyle = COIN_GOLD
  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = COIN_DARK
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = COIN_DARK
  ctx.font = "bold 8px Fredoka, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("$", 0, 0)
  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    if (p.life <= 0) continue
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    if (p.text) {
      ctx.fillStyle = p.color
      ctx.font = `bold ${p.size}px Fredoka, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(p.text, p.x, p.y)
    } else {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

/* ================================================================== */
/*  COLLISION HELPERS                                                   */
/* ================================================================== */

function isSolid(type: number) {
  return (
    type === GROUND ||
    type === BRICK ||
    type === QUESTION ||
    type === QUESTION_USED ||
    type === PIPE_LEFT ||
    type === PIPE_RIGHT ||
    type === PIPE_TOP_LEFT ||
    type === PIPE_TOP_RIGHT
  )
}

/* ================================================================== */
/*  REACT COMPONENT                                                    */
/* ================================================================== */

export function AdventureMap() {
  const { user, updateUser } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // React state — only for UI overlays
  const [showPuzzle, setShowPuzzle] = useState(false)
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null)
  const [puzzleGame, setPuzzleGame] = useState<Chess | null>(null)
  const [puzzleMoves, setPuzzleMoves] = useState<string[]>([])
  const [puzzleHints, setPuzzleHints] = useState(0)
  const [puzzleStartTime, setPuzzleStartTime] = useState(0)
  const [puzzleResult, setPuzzleResult] = useState<"solved" | "wrong" | null>(null)
  const [hudData, setHudData] = useState({ lives: 3, coins: 0, world: "1-1", score: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(800)

  // Puzzle pool
  const puzzlePoolRef = useRef<Puzzle[]>([])
  const puzzleIndexRef = useRef(0)

  // Load puzzles on mount
  useEffect(() => {
    puzzleAPI.getAll("beginner", undefined, 0, 100).then((list) => {
      // Shuffle
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
      }
      puzzlePoolRef.current = list
    }).catch(() => {})
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
    const enemies: Enemy[] = []
    const coins: CoinEntity[] = []

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

  // Trigger puzzle
  const triggerPuzzle = useCallback((blockKey: string) => {
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
    setPuzzleGame(new Chess(puzzle.fen))
    setPuzzleMoves([])
    setPuzzleHints(0)
    setPuzzleStartTime(Date.now())
    setPuzzleResult(null)
    setShowPuzzle(true)
  }, [])

  // Puzzle drop handler
  const onPuzzleDrop = useCallback(
    (src: string, dst: string) => {
      if (!puzzleGame || !currentPuzzle || puzzleResult) return false
      try {
        const move = puzzleGame.move({ from: src, to: dst, promotion: "q" })
        if (!move) return false
        const newMoves = [...puzzleMoves, `${src}${dst}`]
        setPuzzleMoves(newMoves)
        setPuzzleGame(new Chess(puzzleGame.fen()))

        const solution = currentPuzzle.moves.split(" ")
        const done = newMoves.length >= solution.length
        const correct = newMoves.every((m, i) => {
          const sol = solution[i]
          return m === sol || m === sol.replace(/[+=]/, "")
        })

        if (done) {
          const timeTaken = Math.floor((Date.now() - puzzleStartTime) / 1000)
          puzzleAPI
            .submitAttempt(currentPuzzle.id, {
              is_solved: correct,
              moves_made: newMoves.join(" "),
              time_taken: timeTaken,
              hints_used: puzzleHints,
            })
            .then((result) => {
              if (correct && user && result.xp_earned) {
                updateUser({ total_xp: user.total_xp + result.xp_earned })
              }
            })
            .catch(() => {})

          if (correct) {
            setPuzzleResult("solved")
            const gs = gameRef.current
            if (gs) {
              gs.coinCount += 50
              gs.score += 500
              gs.puzzlesSolved++
            }
          } else {
            setPuzzleResult("wrong")
          }
        }
        return true
      } catch {
        return false
      }
    },
    [puzzleGame, currentPuzzle, puzzleMoves, puzzleResult, puzzleStartTime, puzzleHints, user, updateUser]
  )

  // Close puzzle
  const closePuzzle = useCallback(() => {
    setShowPuzzle(false)
    setCurrentPuzzle(null)
    setPuzzleGame(null)
    setPuzzleResult(null)
    const gs = gameRef.current
    if (gs) gs.paused = false
  }, [])

  // Puzzle hint
  const puzzleHint = useCallback(() => {
    if (!currentPuzzle) return
    const solution = currentPuzzle.moves.split(" ")
    if (puzzleMoves.length < solution.length) {
      const next = solution[puzzleMoves.length]
      toast(`Try: ${next.substring(0, 2)} → ${next.substring(2, 4)}`, { icon: "💡", duration: 4000 })
      setPuzzleHints((h) => h + 1)
    }
  }, [currentPuzzle, puzzleMoves])

  // Reset puzzle
  const resetPuzzleBoard = useCallback(() => {
    if (currentPuzzle) {
      setPuzzleGame(new Chess(currentPuzzle.fen))
      setPuzzleMoves([])
      setPuzzleStartTime(Date.now())
      setPuzzleResult(null)
    }
  }, [currentPuzzle])

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

  // Main game loop
  useEffect(() => {
    if (!started || gameOver) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    lastTimeRef.current = performance.now()

    function loop(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 16.667, 3) // normalize to ~60fps
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
      if (p.x < gs.camera.x) p.x = gs.camera.x // can't go back

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
            // Check overlap
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
                // Landing on top
                p.y = tileY - p.h
                p.vy = 0
                p.grounded = true
                gs.lastCheckpointX = p.x
              } else if (p.vy < 0) {
                // Hitting from below
                p.y = tileY + T
                p.vy = 0

                // Check if it's a ? block
                if (tt === QUESTION) {
                  const key = tileKey(col, row)
                  if (!gs.questionBlocks.has(key)) {
                    gs.questionBlocks.add(key)
                    gs.tiles.set(key, QUESTION_USED)
                    // Spawn particles
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
                    // Trigger puzzle
                    triggerPuzzle(key)
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
        // Only update enemies near camera
        if (Math.abs(e.x - gs.camera.x) > w + 200) continue

        e.x += e.vx * dt
        if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx *= -1

        // Player vs enemy
        if (gs.time < gs.invincibleUntil) continue
        const overlap =
          p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h
        if (overlap) {
          if (p.vy > 0 && p.y + p.h < e.y + e.h / 2) {
            // Stomp!
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
            // Hit! Lose life
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

      // Visible tile range
      const startCol = Math.floor(cam / T) - 1
      const endCol = Math.ceil((cam + w) / T) + 1

      // Draw grass on top of ground tiles
      for (let col = startCol; col <= endCol; col++) {
        for (let row = 0; row < ROWS; row++) {
          const tt = gs.tiles.get(tileKey(col, row))
          if (tt !== undefined && tt !== COIN) {
            drawTile(ctx, tt, col * T - cam, row * T, gs.time)
          }
          // Grass
          if (
            (tt === GROUND || tt === BRICK) &&
            row > 0 &&
            !isSolid(gs.tiles.get(tileKey(col, row - 1)) ?? 0)
          ) {
            drawGrassOnTop(ctx, col * T - cam, row * T)
          }
        }
      }

      // Coins
      for (const c of gs.coins) {
        if (c.collected) continue
        if (c.x - cam > -T && c.x - cam < w + T) {
          drawCoin(ctx, { ...c, x: c.x - cam }, gs.time)
        }
      }

      // Enemies
      for (const e of gs.enemies) {
        if (!e.alive) continue
        if (e.x - cam > -T * 2 && e.x - cam < w + T * 2) {
          drawEnemy(ctx, { ...e, x: e.x - cam }, gs.time)
        }
      }

      // Player
      drawPlayer(ctx, { ...p, x: p.x - cam }, gs.time, gs.time < gs.invincibleUntil)

      // Particles
      const shiftedParticles = gs.particles.map((pp) => ({ ...pp, x: pp.x - cam }))
      drawParticles(ctx, shiftedParticles)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, gameOver, canvasWidth, triggerPuzzle])

  /* ================================================================ */
  /*  START SCREEN                                                     */
  /* ================================================================ */
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
          <div className="relative" style={{ height: 420, background: `linear-gradient(to bottom, ${SKY}, ${SKY_BOTTOM})` }}>
            {/* Decorative scene */}
            <div className="absolute bottom-0 left-0 right-0 h-28" style={{ background: `linear-gradient(to top, ${GROUND_COLOR}, ${GRASS_TOP})` }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">♟️</div>
              <h1 className="font-heading text-4xl font-black text-white mb-2" style={{ textShadow: "3px 3px 0 #000" }}>
                CHESS ADVENTURE
              </h1>
              <p className="font-heading text-lg font-bold text-white/80 mb-6" style={{ textShadow: "2px 2px 0 #000" }}>
                A Mario-style platformer with chess puzzles!
              </p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={startGame}
                  className="rounded-xl px-10 py-4 font-heading text-xl font-black text-white shadow-lg hover:scale-105 transition-transform"
                  style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "3px solid #ff6060" }}
                >
                  START GAME
                </button>
                <div className="flex gap-4 text-sm font-heading font-bold text-white/70" style={{ textShadow: "1px 1px 0 #000" }}>
                  <span>Arrow Keys / WASD = Move</span>
                  <span>Space = Jump</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  GAME OVER SCREEN                                                 */
  /* ================================================================ */
  if (gameOver) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
          <div className="relative" style={{ height: 420, background: "#000" }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="font-heading text-4xl font-black text-red-500 mb-4" style={{ textShadow: "3px 3px 0 #600" }}>
                GAME OVER
              </h1>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Score</p>
                  <p className="font-heading text-3xl font-black text-white">{hudData.score}</p>
                </div>
                <div className="text-center">
                  <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Coins</p>
                  <p className="font-heading text-3xl font-black text-yellow-400">{hudData.coins}</p>
                </div>
                <div className="text-center">
                  <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">World</p>
                  <p className="font-heading text-3xl font-black text-white">{hudData.world}</p>
                </div>
                <div className="text-center">
                  <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Puzzles</p>
                  <p className="font-heading text-3xl font-black text-emerald-400">{gameRef.current?.puzzlesSolved ?? 0}</p>
                </div>
              </div>
              <button
                onClick={startGame}
                className="rounded-xl px-10 py-4 font-heading text-xl font-black text-white shadow-lg hover:scale-105 transition-transform"
                style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "3px solid #ff6060" }}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  PLAYING — Canvas + HUD + Puzzle Modal                            */
  /* ================================================================ */
  return (
    <div className="mx-auto max-w-5xl" ref={containerRef}>
      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
        {/* HUD overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Lives</p>
              <p className="font-heading text-sm font-black text-white">
                {Array.from({ length: hudData.lives }, (_, i) => "♟️").join("")}
              </p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Coins</p>
              <p className="font-heading text-lg font-black text-yellow-400">{hudData.coins}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">World</p>
              <p className="font-heading text-lg font-black text-white">{hudData.world}</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Score</p>
              <p className="font-heading text-lg font-black text-white">{hudData.score}</p>
            </div>
          </div>
        </div>

        {/* Mobile controls hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 font-heading text-[10px] font-bold text-white/40 uppercase tracking-wider">
          Arrow Keys / WASD + Space
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={CANVAS_H}
          className="block w-full"
          style={{ imageRendering: "pixelated" }}
          tabIndex={0}
        />

        {/* Puzzle Modal */}
        {showPuzzle && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full mx-4" style={{ background: "#1a1a2e", border: "4px solid #f0a830" }}>
              {/* Puzzle header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(to right, #f0a830, #d89020)" }}>
                <h3 className="font-heading text-lg font-black text-white" style={{ textShadow: "2px 2px 0 #805010" }}>
                  ? BLOCK PUZZLE!
                </h3>
                <button onClick={closePuzzle} className="text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Puzzle result banner */}
              {puzzleResult === "solved" && (
                <div className="px-4 py-3 text-center" style={{ background: "#208020" }}>
                  <p className="font-heading text-lg font-black text-white">CORRECT! +50 COINS ⭐</p>
                  <button
                    onClick={closePuzzle}
                    className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-white hover:scale-105 transition"
                    style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "2px solid #ff6060" }}
                  >
                    CONTINUE <ArrowRight className="inline h-4 w-4 ml-1" />
                  </button>
                </div>
              )}
              {puzzleResult === "wrong" && (
                <div className="px-4 py-3 text-center" style={{ background: "#802020" }}>
                  <p className="font-heading text-lg font-black text-white">NOT QUITE!</p>
                  <button
                    onClick={resetPuzzleBoard}
                    className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-white hover:scale-105 transition mr-2"
                    style={{ background: "linear-gradient(to bottom, #f0a830, #c07818)", border: "2px solid #f8d878" }}
                  >
                    <RotateCcw className="inline h-4 w-4 mr-1" /> RETRY
                  </button>
                  <button
                    onClick={closePuzzle}
                    className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-gray-300 hover:text-white transition"
                    style={{ background: "#333", border: "2px solid #555" }}
                  >
                    SKIP
                  </button>
                </div>
              )}

              {/* Chessboard */}
              {!puzzleResult && (
                <div className="p-4 flex flex-col items-center gap-3">
                  <p className="font-heading text-sm font-bold text-gray-300">Find the best move!</p>
                  {puzzleGame && currentPuzzle && (
                    <div style={{ maxWidth: 320 }}>
                      <Chessboard
                        key={puzzleGame.fen()}
                        options={{
                          position: puzzleGame.fen(),
                          onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) =>
                            sourceSquare && targetSquare ? onPuzzleDrop(sourceSquare, targetSquare) : false,
                          boardStyle: { borderRadius: "8px", boxShadow: "0 5px 15px rgba(0,0,0,0.4)" },
                          darkSquareStyle: { backgroundColor: "#6b8e23" },
                          lightSquareStyle: { backgroundColor: "#f0d9b5" },
                        }}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={puzzleHint}
                      className="rounded-lg px-4 py-2 font-heading text-sm font-black text-white hover:scale-105 transition"
                      style={{ background: "linear-gradient(to bottom, #f0a830, #c07818)", border: "2px solid #f8d878" }}
                    >
                      <Lightbulb className="inline h-4 w-4 mr-1" /> HINT
                    </button>
                    <button
                      onClick={resetPuzzleBoard}
                      className="rounded-lg px-4 py-2 font-heading text-sm font-black text-gray-300 hover:text-white transition"
                      style={{ background: "#333", border: "2px solid #555" }}
                    >
                      <RotateCcw className="inline h-4 w-4 mr-1" /> RESET
                    </button>
                    <button
                      onClick={closePuzzle}
                      className="rounded-lg px-4 py-2 font-heading text-sm font-black text-gray-400 hover:text-white transition"
                      style={{ background: "#222", border: "2px solid #444" }}
                    >
                      SKIP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
