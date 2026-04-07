export interface BlockedSquare {
  square: string
  type: 'lava' | 'rock' // Lava = red/orange, Rock = gray
}

// --- Generic piece-lesson engine (Star Collector) ---
export type PieceTypeCode = 'b' | 'n' | 'k' | 'q' | 'r' | 'p'

export interface PieceLessonStep {
  startSquare: string
  starSquares: string[]
  /** Hot lava / rocks — cannot land here. More common in later lessons (higher difficulty). */
  blocked?: BlockedSquare[]
}

export interface PieceLessonMeta {
  pieceType: PieceTypeCode
  pieceName: string
  description: string
  goalText: string
  /** Number of lessons (8 per piece in Burger / Star collector piece mode) */
  lessonCount: number
  lessons: PieceLessonStep[]
}

/** Bishop: 8 lessons. Bishop stays on one color; all stars are on same color and on a diagonal from start. */
const BISHOP_LESSONS: PieceLessonStep[] = [
  { startSquare: 'e4', starSquares: ['a8', 'h1', 'b7'] },
  { startSquare: 'd5', starSquares: ['a8', 'g8', 'a2', 'g2'] },
  { startSquare: 'c4', starSquares: ['a6', 'f1', 'b5', 'a2'] },
  { startSquare: 'f5', starSquares: ['b1', 'c2', 'd3', 'e4', 'e6', 'g6'] },
  {
    startSquare: 'a3',
    starSquares: ['c1', 'b2', 'b4', 'c5', 'd6', 'e7', 'f8'],
    blocked: [
      { square: 'h2', type: 'rock' },
      { square: 'h3', type: 'lava' },
    ],
  },
  {
    startSquare: 'h4',
    starSquares: ['e7', 'g5', 'f6', 'd8', 'e1'],
    blocked: [
      { square: 'a1', type: 'rock' },
      { square: 'b1', type: 'lava' },
    ],
  },
  {
    startSquare: 'b2',
    starSquares: ['a1', 'a3', 'c1', 'c3'],
    blocked: [
      { square: 'g7', type: 'lava' },
      { square: 'h8', type: 'rock' },
    ],
  },
  {
    startSquare: 'e6',
    starSquares: ['c4', 'd5', 'f7', 'a2', 'g4', 'h3'],
    blocked: [
      { square: 'a8', type: 'rock' },
      { square: 'b8', type: 'lava' },
      { square: 'h1', type: 'rock' },
    ],
  },
]

/** Queen: 8 lessons */
const QUEEN_LESSONS: PieceLessonStep[] = [
  { startSquare: 'd4', starSquares: ['d8', 'h4', 'a4', 'a1'] },
  { startSquare: 'e5', starSquares: ['e8', 'a5', 'h5', 'b1'] },
  { startSquare: 'c3', starSquares: ['c8', 'a3', 'h3', 'e3', 'c1', 'f6'] },
  { startSquare: 'f4', starSquares: ['f8', 'a4', 'c1', 'h4', 'b8', 'd6'] },
  {
    startSquare: 'a2',
    starSquares: ['a8', 'h2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2'],
    blocked: [
      { square: 'g7', type: 'lava' },
      { square: 'h8', type: 'rock' },
    ],
  },
  {
    startSquare: 'h6',
    starSquares: ['h1', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6'],
    blocked: [
      { square: 'a1', type: 'rock' },
      { square: 'b2', type: 'lava' },
    ],
  },
  {
    startSquare: 'e4',
    starSquares: ['a8', 'h1', 'e8', 'a4', 'b1', 'h5'],
    blocked: [
      { square: 'c7', type: 'lava' },
      { square: 'f7', type: 'rock' },
    ],
  },
  {
    startSquare: 'd5',
    starSquares: ['d1', 'd8', 'a5', 'h5', 'a2', 'g8', 'b2', 'e7'],
    blocked: [
      { square: 'g2', type: 'rock' },
      { square: 'h3', type: 'lava' },
      { square: 'c8', type: 'rock' },
    ],
  },
]

/** Knight: 8 lessons */
const KNIGHT_LESSONS: PieceLessonStep[] = [
  { startSquare: 'e4', starSquares: ['d6', 'f6', 'c5', 'g5'] },
  { startSquare: 'd4', starSquares: ['c6', 'e6', 'b5', 'f5', 'b3', 'f3', 'c2', 'e2'] },
  { startSquare: 'b1', starSquares: ['a3', 'c3', 'd2'] },
  { startSquare: 'g8', starSquares: ['e7', 'f6', 'h6'] },
  {
    startSquare: 'e5',
    starSquares: ['d7', 'f7', 'c6', 'g6', 'c4', 'g4', 'd3', 'f3'],
    blocked: [
      { square: 'a1', type: 'lava' },
      { square: 'h1', type: 'rock' },
    ],
  },
  {
    startSquare: 'a4',
    starSquares: ['b6', 'c5', 'c3', 'b2'],
    blocked: [
      { square: 'h7', type: 'rock' },
      { square: 'g8', type: 'lava' },
    ],
  },
  {
    startSquare: 'f4',
    starSquares: ['d5', 'e6', 'g6', 'h5', 'd3', 'e2', 'g2', 'h3'],
    blocked: [
      { square: 'a8', type: 'lava' },
      { square: 'b7', type: 'rock' },
    ],
  },
  {
    startSquare: 'c4',
    starSquares: ['a5', 'b6', 'd6', 'e5', 'e3', 'd2', 'b2', 'a3'],
    blocked: [
      { square: 'g1', type: 'rock' },
      { square: 'h2', type: 'lava' },
      { square: 'h8', type: 'rock' },
    ],
  },
]

/** King: 8 lessons (gentle start → ring patterns + obstacles on later levels) */
const KING_LESSONS: PieceLessonStep[] = [
  { startSquare: 'e4', starSquares: ['e5', 'd5', 'd4', 'd3', 'e3', 'f3', 'f4', 'f5'] },
  { startSquare: 'd4', starSquares: ['c5', 'e5', 'e4', 'e3', 'd3', 'c3', 'c4'] },
  { startSquare: 'a1', starSquares: ['a2', 'b2', 'b1'] },
  { startSquare: 'e5', starSquares: ['d6', 'e6', 'f6', 'f5', 'f4', 'e4', 'd4', 'd5'] },
  { startSquare: 'h8', starSquares: ['h7', 'g7', 'g8'] },
  {
    startSquare: 'e4',
    starSquares: ['d5', 'e5', 'f5', 'f4', 'f3', 'e3', 'd3', 'd4'],
    blocked: [
      { square: 'a1', type: 'rock' },
      { square: 'h1', type: 'lava' },
    ],
  },
  {
    startSquare: 'c5',
    starSquares: ['b4', 'b5', 'b6', 'c6', 'd6', 'd5', 'd4', 'c4'],
    blocked: [
      { square: 'g2', type: 'lava' },
      { square: 'h3', type: 'rock' },
    ],
  },
  {
    startSquare: 'g3',
    starSquares: ['f2', 'g2', 'h2', 'h3', 'h4', 'g4', 'f4', 'f3'],
    blocked: [
      { square: 'a7', type: 'rock' },
      { square: 'b8', type: 'lava' },
      { square: 'c1', type: 'rock' },
    ],
  },
]

/** Pawn: 8 lessons (forward movement; promotion on 8th rank). Later lessons add side “splat” squares (decoys) — cannot land there. */
const PAWN_LESSONS: PieceLessonStep[] = [
  { startSquare: 'e2', starSquares: ['e4', 'e5', 'e6'] },
  { startSquare: 'd2', starSquares: ['d4', 'd5', 'd6', 'd7', 'd8'] },
  { startSquare: 'a2', starSquares: ['a4', 'a5', 'a6', 'a7', 'a8'] },
  { startSquare: 'e3', starSquares: ['e4', 'e5', 'e6', 'e7', 'e8'] },
  {
    startSquare: 'c2',
    starSquares: ['c3', 'c4', 'c5', 'c6', 'c7', 'c8'],
    blocked: [
      { square: 'b3', type: 'lava' },
      { square: 'd3', type: 'lava' },
    ],
  },
  {
    startSquare: 'f2',
    starSquares: ['f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
    blocked: [
      { square: 'e3', type: 'rock' },
      { square: 'g3', type: 'rock' },
    ],
  },
  {
    startSquare: 'b2',
    starSquares: ['b4', 'b5', 'b6', 'b7', 'b8'],
    blocked: [
      { square: 'a3', type: 'lava' },
      { square: 'c3', type: 'lava' },
      { square: 'd4', type: 'rock' },
    ],
  },
  {
    startSquare: 'g2',
    starSquares: ['g3', 'g4', 'g5', 'g6', 'g7', 'g8'],
    blocked: [
      { square: 'f3', type: 'lava' },
      { square: 'h3', type: 'lava' },
      { square: 'e4', type: 'rock' },
    ],
  },
]

export const PIECE_LESSON_SETS: Record<PieceTypeCode, PieceLessonMeta> = {
  b: {
    pieceType: 'b',
    pieceName: 'Bishop',
    description: 'Bishops move diagonally any number of squares. They stay on the same color.',
    goalText: 'Land on every star square by moving only diagonally.',
    lessonCount: 8,
    lessons: BISHOP_LESSONS,
  },
  q: {
    pieceType: 'q',
    pieceName: 'Queen',
    description: 'The Queen combines the moves of the Rook and Bishop: straight or diagonal, any number of squares.',
    goalText: 'Collect every star by moving straight or diagonally.',
    lessonCount: 8,
    lessons: QUEEN_LESSONS,
  },
  n: {
    pieceType: 'n',
    pieceName: 'Knight',
    description: 'Knights move in an L-shape: 2 squares in one direction and 1 in the other. They jump over pieces.',
    goalText: 'Collect every star by moving in an L-shape.',
    lessonCount: 8,
    lessons: KNIGHT_LESSONS,
  },
  k: {
    pieceType: 'k',
    pieceName: 'King',
    description: 'The King moves one square in any direction: horizontally, vertically, or diagonally.',
    goalText: 'Collect every star by moving one square at a time.',
    lessonCount: 8,
    lessons: KING_LESSONS,
  },
  p: {
    pieceType: 'p',
    pieceName: 'Pawn',
    description: 'Pawns move forward one square. On the 8th rank they promote to a Queen (or other piece).',
    goalText: 'Move forward to each star. Reach the 8th rank to promote, then collect remaining stars as a Queen.',
    lessonCount: 8,
    lessons: PAWN_LESSONS,
  },
  r: {
    pieceType: 'r',
    pieceName: 'Rook',
    description: 'Rooks move straight horizontally or vertically any number of squares.',
    goalText: 'Collect every star by moving straight.',
    lessonCount: 8,
    lessons: [
      { startSquare: 'e4', starSquares: ['e8', 'h4', 'e1', 'a4'] },
      { startSquare: 'd5', starSquares: ['d8', 'h5', 'd1', 'a5'] },
      { startSquare: 'a1', starSquares: ['a8', 'h1'] },
      { startSquare: 'b4', starSquares: ['b8', 'b1', 'h4', 'a4'] },
      {
        startSquare: 'f2',
        starSquares: ['f8', 'f1', 'a2', 'h2'],
        blocked: [
          { square: 'd7', type: 'lava' },
          { square: 'h7', type: 'rock' },
        ],
      },
      {
        startSquare: 'c6',
        starSquares: ['c8', 'c1', 'a6', 'h6'],
        blocked: [
          { square: 'f3', type: 'rock' },
          { square: 'g2', type: 'lava' },
        ],
      },
      {
        startSquare: 'g3',
        starSquares: ['g8', 'g1', 'a3', 'h3'],
        blocked: [
          { square: 'd4', type: 'lava' },
          { square: 'e5', type: 'rock' },
        ],
      },
      {
        startSquare: 'e5',
        starSquares: ['e8', 'e1', 'a5', 'b5', 'c5', 'd5', 'f5', 'g5', 'h5'],
        blocked: [
          { square: 'a8', type: 'rock' },
          { square: 'h8', type: 'lava' },
          { square: 'b2', type: 'rock' },
        ],
      },
    ],
  },
}

export function getPieceLessonSet(pieceType: PieceTypeCode): PieceLessonMeta {
  return PIECE_LESSON_SETS[pieceType]
}

export interface StarCollectorLevel {
  id: string
  piece: 'rook' | 'bishop' | 'knight' | 'queen' | 'king' | 'pawn'
  title: string
  description: string
  fen: string
  stars: string[] // Target squares to visit (e.g., ['d8', 'h5'])
  blocked?: BlockedSquare[] // Squares blocked by lava or rocks
  obstacles?: string[] // Legacy: squares with obstacles (optional, will be converted to blocked)
  instructions: string
  unlockRequirement?: string[] // IDs of levels that must be completed first
  pieceColor: 'w' | 'b' // Color of the hero piece
}

export const basicsLevels: StarCollectorLevel[] = [
  {
    id: 'rook-1',
    piece: 'rook',
    title: 'The Rook',
    description: 'Move straight in any direction!',
    fen: '4k3/8/8/3R4/8/8/8/4K3 w - - 0 1', // Rook on d5, white king on e1, black king on e8
    stars: ['d8', 'h5', 'd1', 'a5'],
    instructions: 'Collect all stars by moving straight! Rooks move horizontally or vertically.',
    pieceColor: 'w',
  },
  {
    id: 'rook-2',
    piece: 'rook',
    title: 'Rook Challenge',
    description: 'Navigate around obstacles!',
    fen: '4k3/8/8/3R4/8/2P5/8/4K3 w - - 0 1', // Rook on d5, pawn on c3, white king on e1, black king on e8
    stars: ['d8', 'h5'],
    blocked: [
      { square: 'c3', type: 'rock' },
      { square: 'e3', type: 'lava' },
      { square: 'f5', type: 'rock' },
    ],
    instructions: 'Move around the obstacles! Avoid lava (red) and rocks (gray)!',
    pieceColor: 'w',
  },
  {
    id: 'bishop-1',
    piece: 'bishop',
    title: 'The Bishop',
    description: 'Move diagonally!',
    fen: '4k3/8/8/3B4/8/8/8/4K3 w - - 0 1', // Bishop on d5, white king on e1, black king on e8
    stars: ['a8', 'h8', 'a2', 'h2'],
    instructions: 'Collect all stars by moving diagonally! Bishops only move on diagonal lines.',
    pieceColor: 'w',
    unlockRequirement: ['rook-1'], // Must complete rook first
  },
  {
    id: 'bishop-2',
    piece: 'bishop',
    title: 'Bishop Challenge',
    description: 'Diagonal mastery!',
    fen: '4k3/8/8/3B4/8/4P3/8/4K3 w - - 0 1', // Bishop on d5, pawn on e3, white king on e1, black king on e8
    stars: ['a8', 'h2'],
    blocked: [
      { square: 'e3', type: 'rock' },
      { square: 'c7', type: 'lava' },
      { square: 'f7', type: 'rock' },
    ],
    instructions: 'Navigate diagonally around obstacles! Avoid lava and rocks!',
    pieceColor: 'w',
    unlockRequirement: ['rook-1'],
  },
  {
    id: 'knight-1',
    piece: 'knight',
    title: 'The Knight',
    description: 'Move in an L-shape!',
    fen: '4k3/8/8/3N4/8/8/8/4K3 w - - 0 1', // Knight on d5, white king on e1, black king on e8
    stars: ['c7', 'e7', 'f6', 'f4', 'e3', 'c3', 'b4', 'b6'],
    instructions: 'Collect stars by moving in an L-shape! Knights jump over pieces.',
    pieceColor: 'w',
    unlockRequirement: ['rook-1', 'bishop-1'], // Must complete rook and bishop
  },
  {
    id: 'queen-1',
    piece: 'queen',
    title: 'The Queen',
    description: 'Move like a Rook and Bishop combined!',
    fen: '4k3/8/8/3Q4/8/8/8/4K3 w - - 0 1', // Queen on d5, white king on e1, black king on e8
    stars: ['d8', 'h5', 'a8', 'h2'],
    instructions: 'The Queen can move straight or diagonally! Collect all stars.',
    pieceColor: 'w',
    unlockRequirement: ['rook-1', 'bishop-1'],
  },
  {
    id: 'king-1',
    piece: 'king',
    title: 'The King',
    description: 'Move one square in any direction!',
    fen: '4k3/8/8/3K4/8/8/8/8 w - - 0 1', // White king on d5 (hero), black king on e8
    stars: ['d6', 'e6', 'e5', 'e4', 'd4', 'c4', 'c5', 'c6'],
    instructions: 'The King moves one square at a time in any direction!',
    pieceColor: 'w',
    unlockRequirement: ['rook-1'],
  },
  {
    id: 'pawn-1',
    piece: 'pawn',
    title: 'The Pawn',
    description: 'Move forward, capture diagonally!',
    fen: '4k3/8/8/8/3P4/8/8/4K3 w - - 0 1', // Pawn on d4, white king on e1, black king on e8
    stars: ['d8'],
    instructions: 'Pawns move forward one square at a time. Collect the star ahead!',
    pieceColor: 'w',
    unlockRequirement: ['rook-1', 'bishop-1'], // Must complete rook and bishop
  },
]

export function getLevelById(id: string): StarCollectorLevel | undefined {
  return basicsLevels.find(level => level.id === id)
}

export function isLevelUnlocked(levelId: string, completedLevels: string[]): boolean {
  const level = getLevelById(levelId)
  if (!level) return false
  
  if (!level.unlockRequirement || level.unlockRequirement.length === 0) {
    return true // No requirements, always unlocked
  }
  
  // Check if all required levels are completed
  return level.unlockRequirement.every(reqId => completedLevels.includes(reqId))
}
