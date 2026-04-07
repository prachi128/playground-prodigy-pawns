import { useCallback, useEffect, useRef, useState } from "react"
import { clamp, createInitialRunnerState, expectedNextCheckpointX, shouldTriggerCheckpoint } from "./engine"
import type { RunnerOrb, RunnerPlatform } from "./types"

const GAME_W = 900
const GAME_H = 540
const GROUND_Y = GAME_H - 54

type EngineInput = {
  puzzleOpen: boolean
  onCheckpoint: () => void
  onGameOver: (reason: string) => void
}

export function useNeonRunnerEngine({
  puzzleOpen,
  onCheckpoint,
  onGameOver,
}: EngineInput) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)
  const keysRef = useRef({ left: false, right: false, jump: false })
  const [started, setStarted] = useState(false)
  const [reason, setReason] = useState("")
  const [runner, setRunner] = useState(() => createInitialRunnerState())
  const runnerRef = useRef(runner)

  const platformsRef = useRef<RunnerPlatform[]>([])
  const orbsRef = useRef<RunnerOrb[]>([])

  useEffect(() => {
    runnerRef.current = runner
  }, [runner])

  const seedLevel = useCallback(() => {
    const platforms: RunnerPlatform[] = [{ x: 0, y: GROUND_Y, w: 3000, h: 18 }]
    const orbs: RunnerOrb[] = []
    let x = 330
    for (let i = 0; i < 80; i++) {
      const w = 80 + Math.random() * 90
      const y = clamp(280 + (Math.random() - 0.5) * 140, 180, 440)
      platforms.push({ x, y, w, h: 14 })
      orbs.push({ x: x + w / 2, y: y - 28, collected: false })
      x += w + 95 + Math.random() * 80
    }
    platformsRef.current = platforms
    orbsRef.current = orbs
  }, [])

  const start = useCallback(() => {
    setStarted(true)
    setRunner(createInitialRunnerState((runnerRef.current?.runNumber ?? 0) + 1))
    seedLevel()
  }, [seedLevel])

  const restartRun = useCallback(() => {
    setRunner(createInitialRunnerState((runnerRef.current?.runNumber ?? 0) + 1))
    setReason("")
    setStarted(true)
    seedLevel()
  }, [seedLevel])

  const applyCheckpointSolve = useCallback((reward: { fuelGain: number; scoreGain: number }) => {
    setRunner((prev) => {
      const next = { ...prev }
      next.checkpointsCleared += 1
      next.currentCheckpointAttempt = 1
      next.retryUsedForCheckpoint = false
      next.solveStreak += 1
      next.puzzlesSolved += 1
      next.fuel = clamp(next.fuel + reward.fuelGain, 0, 1)
      next.score += reward.scoreGain
      next.lastCheckpointSolvedAt = Date.now()
      next.nextCheckpointX = next.checkpointSpacingPx * (next.checkpointsCleared + 1)
      next.gameSpeedScale = 1 + Math.min(0.9, next.checkpointsCleared * 0.015)
      return next
    })
  }, [])

  const applyCheckpointFail = useCallback(() => {
    setRunner((prev) => {
      const next = { ...prev }
      next.solveStreak = 0
      next.currentCheckpointAttempt += 1
      if (next.currentCheckpointAttempt >= 2) {
        next.over = true
      } else {
        next.retryUsedForCheckpoint = true
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function draw(now: number) {
      const dtMs = now - (lastRef.current || now)
      const dt = dtMs / 16.667
      lastRef.current = now

      setRunner((prev) => {
        if (puzzleOpen || prev.over) return prev
        const next = { ...prev }
        const expectedNext = expectedNextCheckpointX(next.checkpointSpacingPx, next.checkpointsCleared)
        if (next.nextCheckpointX !== expectedNext) {
          next.nextCheckpointX = expectedNext
        }
        const keys = keysRef.current
        const move = keys.left ? -1 : keys.right ? 1 : 0
        next.playerX += move * next.speed * next.gameSpeedScale * dt
        if (keys.jump && next.grounded) {
          next.playerVY = next.jumpSpeed
          next.grounded = false
        }
        next.playerVY += next.gravity * dt
        next.playerY += next.playerVY * dt

        next.grounded = false
        for (const p of platformsRef.current) {
          const insideX = next.playerX + 28 > p.x && next.playerX < p.x + p.w
          const crossingTop = next.playerY + 38 >= p.y && next.playerY + 38 <= p.y + 12
          if (insideX && crossingTop && next.playerVY >= 0) {
            next.playerY = p.y - 38
            next.playerVY = 0
            next.grounded = true
          }
        }
        if (next.playerY > GAME_H + 80) {
          next.over = true
          setReason("You fell into the void.")
          onGameOver("You fell into the void.")
          return next
        }

        next.fuel = clamp(next.fuel - next.fuelDrainPerSec * dt, 0, 1)
        next.score = Math.max(next.score, Math.floor(next.playerX / 8))
        if (next.fuel <= 0) {
          next.over = true
          setReason("Fuel ran out.")
          onGameOver("Fuel ran out. Solve checkpoints faster.")
          return next
        }

        for (const orb of orbsRef.current) {
          if (orb.collected) continue
          const dx = next.playerX + 14 - orb.x
          const dy = next.playerY + 19 - orb.y
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            orb.collected = true
            next.combo += 1
            next.maxCombo = Math.max(next.maxCombo, next.combo)
            next.score += 50 + next.combo * 3
          }
        }

        if (shouldTriggerCheckpoint(next.playerX, next.nextCheckpointX)) {
          onCheckpoint()
        }

        return next
      })

      const current = runnerRef.current
      const camX = Math.max(0, current.playerX - GAME_W / 3)
      ctx.clearRect(0, 0, GAME_W, GAME_H)
      ctx.fillStyle = "#070914"
      ctx.fillRect(0, 0, GAME_W, GAME_H)
      ctx.strokeStyle = "rgba(0,255,170,0.08)"
      for (let x = -((camX * 0.35) % 60); x < GAME_W; x += 60) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, GAME_H)
        ctx.stroke()
      }

      const gateX = current.nextCheckpointX - camX
      if (gateX > -20 && gateX < GAME_W + 20) {
        ctx.fillStyle = "rgba(255,204,0,0.7)"
        ctx.fillRect(gateX - 2, 0, 4, GAME_H)
      }

      ctx.fillStyle = "rgba(0,255,170,0.2)"
      for (const p of platformsRef.current) {
        const x = p.x - camX
        if (x + p.w < -20 || x > GAME_W + 20) continue
        ctx.fillRect(x, p.y, p.w, p.h)
        ctx.fillStyle = "rgba(0,255,170,0.8)"
        ctx.fillRect(x, p.y, p.w, 3)
        ctx.fillStyle = "rgba(0,255,170,0.2)"
      }

      ctx.fillStyle = "#ffcc00"
      for (const orb of orbsRef.current) {
        if (orb.collected) continue
        const x = orb.x - camX
        if (x < -20 || x > GAME_W + 20) continue
        ctx.beginPath()
        ctx.arc(x, orb.y, 7, 0, Math.PI * 2)
        ctx.fill()
      }

      const px = current.playerX - camX
      ctx.fillStyle = "#00ffaa"
      ctx.fillRect(px, current.playerY, 28, 38)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [started, puzzleOpen, onCheckpoint, onGameOver])

  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = true
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = true
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault()
        keysRef.current.jump = true
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = false
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = false
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keysRef.current.jump = false
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [])

  return {
    canvasRef,
    gameWidth: GAME_W,
    gameHeight: GAME_H,
    started,
    reason,
    runner,
    start,
    restartRun,
    applyCheckpointSolve,
    applyCheckpointFail,
  }
}
