export type AdventureModeStatus = "live" | "coming_soon"

export type AdventureMode = {
  id: "great-chess-adventure" | "pawn-village"
  title: string
  description: string
  href: string
  emoji: string
  gradient: string
  borderColor: string
  status: AdventureModeStatus
}

export const ADVENTURE_MODES: AdventureMode[] = [
  {
    id: "great-chess-adventure",
    title: "The Great Chess Adventure",
    description:
      "50 friendly challengers await along the golden path. Every victory unlocks the next chapter of your adventure!",
    href: "/adventure/great-chess-adventure",
    emoji: "🦉",
    gradient: "from-indigo-600 via-purple-700 to-amber-500",
    borderColor: "border-amber-300",
    status: "live",
  },
  {
    id: "pawn-village",
    title: "Pawn Village",
    description:
      "Run, jump, and solve chess puzzles in a Mario-style platformer through Pawn Village.",
    href: "/adventure/pawn-village",
    emoji: "🏘️",
    gradient: "from-sky-400 to-emerald-600",
    borderColor: "border-emerald-300",
    status: "live",
  },
]
