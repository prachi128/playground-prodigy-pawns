import {
  T,
  GROUND_ROW,
  CHUNK_COLS,
  QUESTION_INTERVAL,
  PIPE_INTERVAL,
  ENEMY_INTERVAL,
  COIN_CLUSTER_INTERVAL,
  ENEMY_SPEED,
  GROUND,
  BRICK,
  QUESTION,
  PIPE_LEFT,
  PIPE_RIGHT,
  PIPE_TOP_LEFT,
  PIPE_TOP_RIGHT,
} from "./constants"
import type { Enemy, CoinEntity } from "./types"

export function tileKey(col: number, row: number) {
  return `${col},${row}`
}

export function generateChunk(
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
      // Bricks near question blocks
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
