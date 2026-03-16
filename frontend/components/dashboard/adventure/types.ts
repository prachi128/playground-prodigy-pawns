export interface GameState {
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

export interface Player {
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

export interface Enemy {
  x: number
  y: number
  vx: number
  w: number
  h: number
  alive: boolean
  patrolLeft: number
  patrolRight: number
}

export interface CoinEntity {
  x: number
  y: number
  collected: boolean
}

export interface Particle {
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

export interface HudData {
  lives: number
  coins: number
  world: string
  score: number
}
