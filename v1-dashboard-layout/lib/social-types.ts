export type Friend = {
  id: string
  name: string
  level: number
  rating: number
  streak: number
  online: boolean
  lastSeen?: string
  avatar?: string
}

export type Achievement = {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: string
}

export type TeamQuest = {
  id: string
  name: string
  description: string
  goal: number
  current: number
  reward: number
  deadline: string
  participants: string[]
}

export type PuzzleRace = {
  id: string
  puzzleId: string
  participants: string[]
  startTime: string
  winner?: string
  times: Record<string, number>
}

export type ClassStats = {
  memberCount: number
  averageRating: number
  topPerformers: Friend[]
  thisWeekProgress: number
}
