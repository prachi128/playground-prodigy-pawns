export type AdventureGameStatus = "live" | "coming_soon"

export type AdventureGame = {
  id: "plants-vs-zombies" | "neon-runner" | "subway-runner" | "car-racing"
  title: string
  description: string
  href: string
  emoji: string
  gradient: string
  borderColor: string
  status: AdventureGameStatus
}

export const ADVENTURE_GAMES: AdventureGame[] = [
  {
    id: "plants-vs-zombies",
    title: "Plants vs Zombies",
    description: "Defend your lane with smart unit placement and quick reactions.",
    href: "/adventure/games/plants-vs-zombies",
    emoji: "🌻",
    gradient: "from-green-400 to-emerald-600",
    borderColor: "border-green-300",
    status: "coming_soon",
  },
  {
    id: "neon-runner",
    title: "Neon Runner x Chess",
    description: "Run, dash, and solve chess checkpoints to refill fuel and beat bosses.",
    href: "/adventure/games/neon-runner",
    emoji: "⚡",
    gradient: "from-cyan-400 to-fuchsia-500",
    borderColor: "border-cyan-300",
    status: "live",
  },
  {
    id: "subway-runner",
    title: "Subway Surfer Type",
    description: "Fast reflexes, lane switching, and obstacle dodging in a speed run.",
    href: "/adventure/games/subway-runner",
    emoji: "🚇",
    gradient: "from-orange-400 to-red-500",
    borderColor: "border-orange-300",
    status: "coming_soon",
  },
  {
    id: "car-racing",
    title: "Car Racing",
    description: "Beat lap times, drift corners, and race to the podium.",
    href: "/adventure/games/car-racing",
    emoji: "🏎",
    gradient: "from-blue-500 to-indigo-600",
    borderColor: "border-blue-300",
    status: "coming_soon",
  },
]
