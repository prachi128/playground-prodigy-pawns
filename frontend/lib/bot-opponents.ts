export type BotTier = "beginner" | "intermediate" | "advanced" | "expert";

export interface BotOpponent {
  id: string;
  name: string;
  tier: BotTier;
  rating: number;
  depth: number;
  avatar: string;
  tagline: string;
  description: string;
  themeName: string;
  themeGradient: string;
  borderColor: string;
  panelGradient: string;
  boardLight: string;
  boardDark: string;
}

export const BOT_TIER_LABELS: Record<BotTier, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export const BOT_OPPONENTS: BotOpponent[] = [
  {
    id: "martin",
    name: "Martin",
    tier: "beginner",
    rating: 400,
    depth: 4,
    avatar: "🎸",
    tagline: "Garage jam starter",
    description: "Very friendly opening play and forgiving tactics.",
    themeName: "Garage Rock",
    themeGradient: "from-green-400 to-emerald-500",
    borderColor: "border-green-300",
    panelGradient: "from-green-50 to-emerald-100",
    boardLight: "#e8f7e8",
    boardDark: "#5fa872",
  },
  {
    id: "elena",
    name: "Elena",
    tier: "beginner",
    rating: 550,
    depth: 5,
    avatar: "🎤",
    tagline: "Pop rhythm learner",
    description: "Build confidence with calm, simple positions.",
    themeName: "Pop Stage",
    themeGradient: "from-pink-400 to-rose-500",
    borderColor: "border-pink-300",
    panelGradient: "from-pink-50 to-rose-100",
    boardLight: "#ffe8f2",
    boardDark: "#db5d89",
  },
  {
    id: "mika",
    name: "Mika",
    tier: "beginner",
    rating: 700,
    depth: 6,
    avatar: "🎹",
    tagline: "Lo-fi keys master",
    description: "Plays logical moves but still leaves tactical chances.",
    themeName: "Lo-fi Studio",
    themeGradient: "from-cyan-400 to-sky-500",
    borderColor: "border-cyan-300",
    panelGradient: "from-cyan-50 to-sky-100",
    boardLight: "#e8f8ff",
    boardDark: "#4f90b6",
  },
  {
    id: "ravi",
    name: "Ravi",
    tier: "intermediate",
    rating: 950,
    depth: 9,
    avatar: "🥁",
    tagline: "Drummer with tempo",
    description: "Keeps pressure and punishes one-move blunders.",
    themeName: "Rhythm Stage",
    themeGradient: "from-amber-400 to-orange-500",
    borderColor: "border-amber-300",
    panelGradient: "from-amber-50 to-orange-100",
    boardLight: "#fff4e5",
    boardDark: "#c1843f",
  },
  {
    id: "nova",
    name: "Nova",
    tier: "intermediate",
    rating: 1100,
    depth: 11,
    avatar: "🎧",
    tagline: "EDM beat dropper",
    description: "Sharp tactical style and active piece play.",
    themeName: "Neon Festival",
    themeGradient: "from-violet-400 to-fuchsia-500",
    borderColor: "border-violet-300",
    panelGradient: "from-violet-50 to-fuchsia-100",
    boardLight: "#f4ecff",
    boardDark: "#7d5bb4",
  },
  {
    id: "diego",
    name: "Diego",
    tier: "intermediate",
    rating: 1250,
    depth: 12,
    avatar: "🎷",
    tagline: "Jazz board artist",
    description: "Positional style with patient maneuvering.",
    themeName: "Jazz Club",
    themeGradient: "from-indigo-400 to-blue-500",
    borderColor: "border-indigo-300",
    panelGradient: "from-indigo-50 to-blue-100",
    boardLight: "#edf2ff",
    boardDark: "#5c73ad",
  },
  {
    id: "astra",
    name: "Astra",
    tier: "advanced",
    rating: 1450,
    depth: 14,
    avatar: "🌌",
    tagline: "Cosmic strategist",
    description: "Strong middlegame plans and cleaner endgames.",
    themeName: "Space Opera",
    themeGradient: "from-slate-500 to-indigo-600",
    borderColor: "border-slate-400",
    panelGradient: "from-slate-100 to-indigo-100",
    boardLight: "#edf1f7",
    boardDark: "#5a6e8a",
  },
  {
    id: "irina",
    name: "Irina",
    tier: "advanced",
    rating: 1600,
    depth: 16,
    avatar: "🎻",
    tagline: "Classical precision",
    description: "Balanced style with excellent tactical awareness.",
    themeName: "Symphony Hall",
    themeGradient: "from-rose-500 to-purple-600",
    borderColor: "border-rose-300",
    panelGradient: "from-rose-50 to-purple-100",
    boardLight: "#fff0f4",
    boardDark: "#986181",
  },
  {
    id: "viktor",
    name: "Viktor",
    tier: "advanced",
    rating: 1750,
    depth: 18,
    avatar: "🕶️",
    tagline: "Arena headliner",
    description: "Calculates deeply and attacks weak king safety.",
    themeName: "Arena Lights",
    themeGradient: "from-red-500 to-orange-600",
    borderColor: "border-red-300",
    panelGradient: "from-red-50 to-orange-100",
    boardLight: "#fff0ea",
    boardDark: "#af5d45",
  },
  {
    id: "noor",
    name: "Noor",
    tier: "expert",
    rating: 1950,
    depth: 20,
    avatar: "👑",
    tagline: "Grand stage icon",
    description: "Punishes passive play and converts advantages cleanly.",
    themeName: "Royal Concert",
    themeGradient: "from-purple-500 to-indigo-700",
    borderColor: "border-purple-400",
    panelGradient: "from-purple-100 to-indigo-100",
    boardLight: "#f3edff",
    boardDark: "#6d5a9a",
  },
  {
    id: "zeno",
    name: "Zeno",
    tier: "expert",
    rating: 2100,
    depth: 22,
    avatar: "⚡",
    tagline: "Electric prodigy",
    description: "Fast tactical spotting with relentless initiative.",
    themeName: "Electro Dome",
    themeGradient: "from-yellow-400 to-orange-500",
    borderColor: "border-yellow-300",
    panelGradient: "from-yellow-50 to-orange-100",
    boardLight: "#fff9e8",
    boardDark: "#bb8f45",
  },
];

export const DEFAULT_BOT = BOT_OPPONENTS[0];

export function getBotById(botId?: string | null): BotOpponent {
  if (!botId) return DEFAULT_BOT;
  const match = BOT_OPPONENTS.find((bot) => bot.id === botId.toLowerCase());
  return match ?? DEFAULT_BOT;
}
