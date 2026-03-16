import {
  T,
  CANVAS_H,
  GROUND_ROW,
  SKY,
  SKY_BOTTOM,
  GROUND_COLOR,
  GROUND_LINE,
  GRASS_TOP,
  GRASS_HIGHLIGHT,
  BRICK_COLOR,
  BRICK_LINE_COLOR,
  Q_BLOCK_COLOR,
  Q_BLOCK_BORDER,
  Q_BLOCK_HIGHLIGHT,
  Q_USED_COLOR,
  PIPE_GREEN,
  PIPE_DARK,
  PIPE_LIGHT,
  COIN_GOLD,
  COIN_DARK,
  GROUND,
  BRICK,
  QUESTION,
  QUESTION_USED,
  PIPE_LEFT,
  PIPE_RIGHT,
  PIPE_TOP_LEFT,
  PIPE_TOP_RIGHT,
} from "./constants"
import type { Player, Enemy, CoinEntity, Particle } from "./types"

export function drawSky(ctx: CanvasRenderingContext2D, w: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, SKY)
  grad.addColorStop(1, SKY_BOTTOM)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, CANVAS_H)
}

export function drawParallaxBg(ctx: CanvasRenderingContext2D, w: number, camX: number) {
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

export function drawTile(ctx: CanvasRenderingContext2D, type: number, x: number, y: number, time: number) {
  switch (type) {
    case GROUND: {
      ctx.fillStyle = GROUND_COLOR
      ctx.fillRect(x, y, T, T)
      ctx.strokeStyle = GROUND_LINE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y + T / 2)
      ctx.lineTo(x + T, y + T / 2)
      ctx.stroke()
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
      ctx.fillStyle = Q_BLOCK_BORDER
      ctx.fillRect(x + 3, y + T - 5, T - 6, 3)
      ctx.fillRect(x + T - 5, y + 3, 3, T - 6)
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
      ctx.fillStyle = isLeft ? PIPE_LIGHT : PIPE_DARK
      ctx.fillRect(isLeft ? x : x + T - 4, y, 4, T)
      ctx.fillStyle = PIPE_DARK
      ctx.fillRect(isLeft ? x + T - 2 : x, y, 2, T)
      break
    }
    case PIPE_TOP_LEFT:
    case PIPE_TOP_RIGHT: {
      const isLeft = type === PIPE_TOP_LEFT
      ctx.fillStyle = PIPE_GREEN
      ctx.fillRect(x - (isLeft ? 3 : 0), y, T + (isLeft ? 3 : 3), T)
      ctx.fillStyle = PIPE_LIGHT
      ctx.fillRect(x - (isLeft ? 3 : 0), y, 4, T)
      ctx.fillStyle = PIPE_DARK
      ctx.fillRect(x + T + (isLeft ? 0 : 3) - 2, y, 2, T)
      ctx.fillStyle = PIPE_LIGHT
      ctx.fillRect(x - (isLeft ? 3 : 0), y, T + (isLeft ? 3 : 3), 3)
      break
    }
  }
}

export function drawGrassOnTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GRASS_TOP
  ctx.fillRect(x, y, T, 4)
  ctx.fillStyle = GRASS_HIGHLIGHT
  ctx.fillRect(x, y, T, 2)
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, time: number, invincible: boolean) {
  const bobY = p.grounded ? Math.sin(time * 8 + p.x * 0.1) * 1.5 : 0
  const px = p.x + p.w / 2
  const py = p.y + p.h + bobY

  if (invincible && Math.floor(time * 10) % 2 === 0) return

  ctx.save()
  ctx.translate(px, py)
  if (p.facing < 0) ctx.scale(-1, 1)

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

  // Pupils
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.arc(-2, -25, 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(4, -25, 0.8, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  if (!e.alive) return
  const px = e.x + e.w / 2
  const py = e.y + e.h
  const bobY = Math.sin(time * 4 + e.x * 0.05) * 1

  ctx.save()
  ctx.translate(px, py + bobY)
  if (e.vx < 0) ctx.scale(-1, 1)

  // Dark pawn body
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

export function drawCoin(ctx: CanvasRenderingContext2D, c: CoinEntity, time: number) {
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

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
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
