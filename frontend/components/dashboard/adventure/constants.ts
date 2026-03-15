/* Game Constants */
export const T = 32 // tile size
export const GRAVITY = 0.55
export const JUMP_FORCE = -11
export const MOVE_SPEED = 3.5
export const ENEMY_SPEED = 0.8
export const CANVAS_H = 480
export const GROUND_ROW = 13 // y row for ground (13 * 32 = 416, leaves room at bottom)
export const ROWS = 15
export const CHUNK_COLS = 50
export const QUESTION_INTERVAL = 22 // ? block every N cols
export const PIPE_INTERVAL = 38
export const ENEMY_INTERVAL = 18
export const COIN_CLUSTER_INTERVAL = 12

/* Tile types */
export const EMPTY = 0
export const GROUND = 1
export const BRICK = 2
export const QUESTION = 3
export const QUESTION_USED = 4
export const PIPE_LEFT = 5
export const PIPE_RIGHT = 6
export const PIPE_TOP_LEFT = 7
export const PIPE_TOP_RIGHT = 8
export const COIN = 9

/* Colors */
export const SKY = "#5c94fc"
export const SKY_BOTTOM = "#88b4fc"
export const GROUND_COLOR = "#c84c09"
export const GROUND_DARK = "#a03000"
export const GROUND_LINE = "#6b2000"
export const GRASS_TOP = "#5ab54a"
export const GRASS_HIGHLIGHT = "#70d060"
export const BRICK_COLOR = "#c06020"
export const BRICK_LINE_COLOR = "#401500"
export const Q_BLOCK_COLOR = "#f0a830"
export const Q_BLOCK_BORDER = "#805010"
export const Q_BLOCK_HIGHLIGHT = "#f8d878"
export const Q_USED_COLOR = "#8b6914"
export const PIPE_GREEN = "#30a830"
export const PIPE_DARK = "#208020"
export const PIPE_LIGHT = "#50c850"
export const COIN_GOLD = "#ffd700"
export const COIN_DARK = "#c09000"
