"use client"

import {
  Check,
  Lock,
  Play,
  Star,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  X,
  Clock,
  BookOpen,
  Trophy,
} from "lucide-react"
import { useState } from "react"
import { QuestCharacter } from "./quest-character"
import { MapScenery } from "./map-scenery"

/* ------------------------------------------------------------------ */
/*  Quest data with full storytelling fields                          */
/* ------------------------------------------------------------------ */

interface Quest {
  id: number
  title: string
  piece: string
  status: "completed" | "active" | "locked"
  xp: number
  description: string
  unlockRequirement?: string
  emoji: string
  terrainType: "grass" | "hill" | "mountain" | "valley" | "castle"
  storySnippet: string
  learningGoals: string[]
  reward: string
  duration: string
  npc?: {
    type: "coach" | "friend" | "enemy"
    emoji: string
    name: string
    dialogue: string
  }
}

const CHAPTER = {
  number: 1,
  name: "The Pawn's Beginning",
  adventure: "The Kingdom of Chess",
  subtitle: "Your quest to save the Queen and become a chess master!",
}

const quests: Quest[] = [
  {
    id: 1,
    title: "Pawn Power!",
    piece: "\u265F",
    status: "completed",
    xp: 50,
    description: "Learn how pawns move and capture",
    emoji: "\u265F\uFE0F",
    terrainType: "grass",
    storySnippet:
      "The humble Pawn takes its first steps onto the battlefield. Small but mighty, every great journey begins here!",
    learningGoals: ["Pawn movement", "Pawn captures", "En passant", "Pawn promotion"],
    reward: "+50 XP, Pawn Pioneer badge",
    duration: "~20 minutes",
    npc: {
      type: "friend",
      emoji: "\u265F",
      name: "Private Pawnsworth",
      dialogue: "Great job, recruit! You've mastered the basics!",
    },
  },
  {
    id: 2,
    title: "Knight's Big Jump!",
    piece: "\u265E",
    status: "completed",
    xp: 60,
    description: "Master the L-shaped knight moves",
    emoji: "\u265E",
    terrainType: "hill",
    storySnippet:
      "The brave Knight leaps over obstacles no other piece can! Learn the tricky L-shape and surprise your opponents.",
    learningGoals: [
      "Knight movement",
      "Knight forks",
      "Jumping over pieces",
      "Knight outposts",
    ],
    reward: "+60 XP, Knight Jumper badge",
    duration: "~25 minutes",
    npc: {
      type: "coach",
      emoji: "\uD83E\uDDD1\u200D\uD83C\uDFEB",
      name: "Coach Alex",
      dialogue: "Remember: a Knight on the rim is dim! Keep them in the center.",
    },
  },
  {
    id: 3,
    title: "Save the Queen!",
    piece: "\u265B",
    status: "active",
    xp: 90,
    description: "Protect your most powerful piece",
    emoji: "\uD83D\uDC51",
    terrainType: "mountain",
    storySnippet:
      "The Queen is trapped! Learn her powerful moves and rescue her from danger. She can move in any direction -- make her unstoppable!",
    learningGoals: [
      "Queen movement",
      "Queen tactics",
      "Protecting the queen",
      "Queen sacrifices",
    ],
    reward: "+90 XP, Queen Master badge \uD83D\uDC51",
    duration: "~30 minutes",
    npc: {
      type: "enemy",
      emoji: "\u265A",
      name: "The Dark King",
      dialogue: "You'll never rescue her! My defenses are too strong!",
    },
  },
  {
    id: 4,
    title: "Bishop's Zigzag!",
    piece: "\u265D",
    status: "locked",
    xp: 85,
    description: "Learn diagonal bishop moves",
    unlockRequirement: "Complete 'Save the Queen!' to unlock this quest",
    emoji: "\u265D",
    terrainType: "mountain",
    storySnippet:
      "The sneaky Bishop strikes from afar on the diagonals! Master the art of long-range attacks and pin your enemies.",
    learningGoals: [
      "Bishop movement",
      "Diagonal tactics",
      "Bishop pair advantage",
      "Pins and skewers",
    ],
    reward: "+85 XP, Diagonal Master badge",
    duration: "~25 minutes",
    npc: {
      type: "friend",
      emoji: "\u265D",
      name: "Bishop Bartholomew",
      dialogue: "I see things others can't... from the diagonals!",
    },
  },
  {
    id: 5,
    title: "Castle Defense!",
    piece: "\u265C",
    status: "locked",
    xp: 100,
    description: "Master castling and rook power",
    unlockRequirement: "Complete 'Bishop's Zigzag!' to unlock this quest",
    emoji: "\uD83C\uDFF0",
    terrainType: "castle",
    storySnippet:
      "The mighty Rook guards the castle walls! Learn to castle for safety and unleash the Rook's power along open files.",
    learningGoals: [
      "Rook movement",
      "Castling rules",
      "Open files",
      "Rook endgames",
    ],
    reward: "+100 XP, Castle Commander badge \uD83C\uDFF0",
    duration: "~35 minutes",
    npc: {
      type: "coach",
      emoji: "\uD83E\uDDD1\u200D\uD83C\uDFEB",
      name: "Coach Alex",
      dialogue: "The final challenge! You're ready for this, champion!",
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Story Tooltip Component                                           */
/* ------------------------------------------------------------------ */

function StoryTooltip({
  quest,
  onClose,
}: {
  quest: Quest
  onClose: () => void
}) {
  const isLocked = quest.status === "locked"
  const isCompleted = quest.status === "completed"

  return (
    <div className="animate-zoom-in absolute -top-4 left-1/2 z-[60] w-80 -translate-x-1/2 -translate-y-full">
      <div
        className={`overflow-hidden rounded-3xl border-4 shadow-2xl ${
          isLocked
            ? "border-muted bg-card"
            : isCompleted
            ? "border-emerald-300 bg-card"
            : "border-amber-400 bg-card"
        }`}
      >
        {/* Header */}
        <div
          className={`relative px-4 py-3 ${
            isLocked
              ? "bg-muted/50"
              : isCompleted
              ? "bg-gradient-to-r from-emerald-500 to-green-500"
              : "bg-gradient-to-r from-amber-500 to-orange-500"
          }`}
        >
          <button
            onClick={onClose}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/30"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                isLocked ? "bg-muted grayscale" : "bg-white/20"
              }`}
            >
              {isLocked ? <Lock className="h-6 w-6 text-muted-foreground" /> : quest.emoji}
            </div>
            <div>
              <h4
                className={`font-heading text-lg font-bold leading-tight ${
                  isLocked ? "text-muted-foreground" : "text-white"
                }`}
              >
                {quest.title}
              </h4>
              {isCompleted && (
                <span className="text-sm font-bold text-white/90">Completed!</span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Story snippet */}
          <p
            className={`text-sm leading-relaxed ${
              isLocked ? "italic text-muted-foreground" : "text-foreground"
            }`}
          >
            {isLocked
              ? `A mysterious challenge awaits... ${quest.storySnippet.slice(0, 60)}...`
              : quest.storySnippet}
          </p>

          {/* Learning goals */}
          {!isLocked && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {"What you'll learn"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quest.learningGoals.map((goal) => (
                  <span
                    key={goal}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reward + Duration */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">{quest.reward}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground">{quest.duration}</span>
            </div>
          </div>

          {/* Lock message for future quests */}
          {isLocked && quest.unlockRequirement && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-bold text-amber-700">{quest.unlockRequirement}</p>
                {/* Silhouette preview */}
                <div className="mt-2 flex items-center gap-2 opacity-50 grayscale">
                  <span className="text-xl">{quest.emoji}</span>
                  <span className="text-xs italic text-muted-foreground">
                    Coming soon...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action button for active quest */}
          {quest.status === "active" && (
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-heading text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl">
              <Play className="h-5 w-5 fill-white" />
              Start Quest!
            </button>
          )}
        </div>
      </div>
      {/* Arrow pointing down */}
      <div className="flex justify-center">
        <div
          className={`h-0 w-0 border-x-[12px] border-t-[12px] border-x-transparent ${
            isLocked
              ? "border-t-card"
              : isCompleted
              ? "border-t-card"
              : "border-t-card"
          }`}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  NPC Character along the path                                      */
/* ------------------------------------------------------------------ */

function NpcCharacter({ npc, position }: { npc: Quest["npc"]; position: "left" | "right" }) {
  const [showDialogue, setShowDialogue] = useState(false)
  if (!npc) return null

  const bgColor =
    npc.type === "coach"
      ? "bg-gradient-to-br from-emerald-400 to-green-500"
      : npc.type === "enemy"
      ? "bg-gradient-to-br from-red-400 to-rose-500"
      : "bg-gradient-to-br from-sky-400 to-blue-500"

  const borderColor =
    npc.type === "coach"
      ? "border-emerald-300"
      : npc.type === "enemy"
      ? "border-red-300"
      : "border-sky-300"

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${
        position === "left" ? "-left-24" : "-right-24"
      }`}
    >
      <button
        onClick={() => setShowDialogue(!showDialogue)}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full ${bgColor} border-3 ${borderColor} shadow-lg transition-all hover:scale-110`}
        aria-label={`Talk to ${npc.name}`}
      >
        <span className="text-2xl">{npc.emoji}</span>
        {/* Speech indicator */}
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md">
          <span className="text-xs">💬</span>
        </div>
      </button>

      {/* Dialogue bubble */}
      {showDialogue && (
        <div
          className={`animate-zoom-in absolute top-full z-50 mt-2 w-56 rounded-2xl border-2 ${borderColor} bg-card p-3 shadow-xl ${
            position === "left" ? "left-0" : "right-0"
          }`}
        >
          <p className="mb-1 font-heading text-xs font-bold text-foreground">
            {npc.name}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {npc.dialogue}
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Adventure Map                                                */
/* ------------------------------------------------------------------ */

export function AdventureMap() {
  const [zoom, setZoom] = useState(1)
  const [selectedQuest, setSelectedQuest] = useState<number | null>(null)
  const [shakeQuest, setShakeQuest] = useState<number | null>(null)
  const [celebrateQuest, setCelebrateQuest] = useState<number | null>(null)
  const [weather, setWeather] = useState<'sunny' | 'rain' | 'rainbow' | 'snow'>('sunny')

  const completedCount = quests.filter((q) => q.status === "completed").length
  const progressPercent = Math.round((completedCount / quests.length) * 100)
  const activeQuest = quests.find((q) => q.status === "active")
  const estimatedTime = activeQuest ? activeQuest.duration : "Complete!"

  const pathPoints = [
    { x: 15, y: 85 },
    { x: 35, y: 60 },
    { x: 50, y: 40 },
    { x: 70, y: 55 },
    { x: 85, y: 20 },
  ]

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.8))

  const handleLockedClick = (questId: number) => {
    setShakeQuest(questId)
    // Play click sound (optional)
    setTimeout(() => setShakeQuest(null), 400)
  }

  const handleCompletedClick = (questId: number) => {
    setCelebrateQuest(questId)
    setTimeout(() => setCelebrateQuest(null), 600)
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      {/* ============================================================ */}
      {/*  Map Title Area                                               */}
      {/* ============================================================ */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-2xl bg-card px-4 py-3 font-heading text-base font-bold text-foreground shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </a>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
              Chapter {CHAPTER.number}: {CHAPTER.name}
            </p>
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              {CHAPTER.adventure}
            </h1>
            <p className="mt-0.5 text-base font-medium text-muted-foreground">
              {CHAPTER.subtitle}
            </p>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-md transition-all hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5 text-foreground" />
          </button>
          <div className="rounded-xl bg-card px-4 py-3 font-heading text-base font-bold shadow-md">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={handleZoomIn}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-md transition-all hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Progress indicator                                           */}
      {/* ============================================================ */}
      <div className="mb-6 overflow-hidden rounded-3xl border-4 border-amber-300 bg-card shadow-lg">
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-heading text-2xl font-bold text-white">
                {progressPercent}% Complete
              </p>
              <p className="text-base font-bold text-white/90">
                {estimatedTime} to next quest
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2">
              <Star className="h-6 w-6 fill-white text-white" />
              <span className="font-heading text-xl font-bold text-white">
                {quests.reduce(
                  (acc, q) => acc + (q.status === "completed" ? q.xp : 0),
                  0
                )}{" "}
                XP
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="h-6 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full animate-xp-fill rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-inner"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Treasure Map Canvas                                          */}
      {/* ============================================================ */}
      <div
        className="parchment-bg torn-edges relative mx-auto overflow-hidden rounded-3xl border-8 border-amber-800/60 shadow-2xl"
        style={{ minHeight: "700px" }}
      >
        {/* Terrain illustrations */}
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/images/terrain-grass.jpg"
            alt=""
            className="absolute bottom-8 left-4 h-32 w-32 opacity-40"
          />
          <img
            src="/images/terrain-mountain.jpg"
            alt=""
            className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 opacity-30"
          />
          <img
            src="/images/terrain-castle.jpg"
            alt=""
            className="absolute right-8 top-8 h-48 w-48 opacity-50"
          />
        </div>

        {/* Animated scenery - clouds, weather, sky effects */}
        <MapScenery weather={weather} showAnimated={true} />

        {/* Map content with zoom */}
        <div
          className="relative h-full w-full p-8 transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          {/* SVG winding path */}
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 1 }}
            aria-hidden="true"
          >
            <path
              d={`
                M ${pathPoints[0].x}% ${pathPoints[0].y}%
                Q ${pathPoints[0].x + 5}% ${pathPoints[0].y - 15}%, ${pathPoints[1].x}% ${pathPoints[1].y}%
                Q ${pathPoints[1].x + 5}% ${pathPoints[1].y - 10}%, ${pathPoints[2].x}% ${pathPoints[2].y}%
                Q ${pathPoints[2].x + 8}% ${pathPoints[2].y + 5}%, ${pathPoints[3].x}% ${pathPoints[3].y}%
                Q ${pathPoints[3].x + 5}% ${pathPoints[3].y - 20}%, ${pathPoints[4].x}% ${pathPoints[4].y}%
              `}
              fill="none"
              stroke="#8b572a"
              strokeWidth="8"
              strokeDasharray="6 14"
              strokeLinecap="round"
              className="animate-dash-march"
            />
            {/* Footprints along the path */}
            {pathPoints.slice(0, -1).map((point, idx) => {
              const next = pathPoints[idx + 1]
              const midX = (point.x + next.x) / 2
              const midY = (point.y + next.y) / 2
              return (
                <text
                  key={`foot-${idx}`}
                  x={`${midX}%`}
                  y={`${midY}%`}
                  fontSize="20"
                  fill="#8b572a"
                  opacity="0.4"
                  className="pointer-events-none"
                >
                  👣
                </text>
              )
            })}
          </svg>

          {/* Quest nodes */}
          <div
            className="relative h-full w-full"
            style={{ minHeight: "600px", zIndex: 2 }}
          >
            {pathPoints.map((point, idx) => {
              const quest = quests[idx]
              const isActive = quest.status === "active"
              const isCompleted = quest.status === "completed"
              const isLocked = quest.status === "locked"
              const isSelected = selectedQuest === quest.id

              return (
                <div
                  key={quest.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  {/* NPC character near the node */}
                  {quest.npc && !isLocked && (
                    <NpcCharacter
                      npc={quest.npc}
                      position={idx % 2 === 0 ? "left" : "right"}
                    />
                  )}

                  {/* Story tooltip on click */}
                  {isSelected && (
                    <StoryTooltip
                      quest={quest}
                      onClose={() => setSelectedQuest(null)}
                    />
                  )}

                  {/* "You are here" marker for active */}
                  {isActive && !isSelected && (
                    <div className="animate-tooltip-float absolute -top-20 left-1/2 flex -translate-x-1/2 flex-col items-center">
                      <div className="whitespace-nowrap rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 font-heading text-sm font-bold text-white shadow-xl">
                        Current Quest!
                      </div>
                      <div className="h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-amber-500" />
                    </div>
                  )}

                  {/* Character at active node */}
                  {isActive && (
                    <div className="animate-tooltip-float absolute -bottom-16 left-1/2 -translate-x-1/2">
                      <QuestCharacter
                        questIndex={idx}
                        isActive
                        isCompleted={false}
                      />
                    </div>
                  )}

                  {/* Evolved character ghost at completed nodes */}
                  {isCompleted && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-50">
                      <QuestCharacter
                        questIndex={idx}
                        isActive={false}
                        isCompleted
                      />
                    </div>
                  )}

                  {/* Quest node circle -- click to open story tooltip */}
                  <button
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                      isCompleted
                        ? `h-20 w-20 bg-gradient-to-br from-emerald-400 to-green-500 border-4 border-yellow-400 text-white shadow-xl hover:scale-110 ${
                            celebrateQuest === quest.id
                              ? "animate-celebration-burst"
                              : ""
                          }`
                        : isActive
                        ? "h-[120px] w-[120px] animate-node-pulse bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-8 ring-amber-300 shadow-2xl shadow-amber-400/40 hover:shadow-2xl hover:shadow-amber-400/60"
                        : `h-20 w-20 bg-muted/70 border-2 border-dashed border-muted-foreground/40 text-muted-foreground/40 grayscale opacity-40 hover:opacity-60 ${
                            shakeQuest === quest.id ? "animate-locked-shake" : ""
                          }`
                    }`}
                    onClick={() => {
                      if (isLocked) {
                        handleLockedClick(quest.id)
                      } else if (isCompleted) {
                        handleCompletedClick(quest.id)
                      } else {
                        setSelectedQuest(isSelected ? null : quest.id)
                      }
                    }}
                    aria-label={`${quest.title} - ${quest.status}`}
                  >
                    {isCompleted ? (
                      <Check className="h-10 w-10" strokeWidth={4} />
                    ) : isActive ? (
                      <span className="text-5xl leading-none">{quest.emoji}</span>
                    ) : (
                      <>
                        <Lock className="absolute h-8 w-8" />
                        <span className="mt-8 text-2xl opacity-50">
                          {quest.emoji}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Floating "PLAY NOW!" button for active quest */}
                  {isActive && !isSelected && (
                    <div className="animate-tooltip-float absolute -top-28 left-1/2 -translate-x-1/2">
                      <button
                        onClick={() => setSelectedQuest(quest.id)}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-heading font-bold text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
                      >
                        <Play className="h-5 w-5 fill-white" />
                        PLAY NOW!
                      </button>
                      {/* Arrow pointing down to node */}
                      <div className="flex justify-center -mt-2">
                        <div className="h-0 w-0 border-x-[12px] border-t-[12px] border-x-transparent border-t-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Reward badge for active quest */}
                  {isActive && !isSelected && (
                    <div className="animate-float absolute -right-16 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-2 font-heading text-sm font-bold text-white shadow-lg">
                      🏆 +{quest.xp} XP
                    </div>
                  )}

                  {/* Quest label + hover details */}
                  <div
                    className={`absolute -bottom-16 left-1/2 w-48 -translate-x-1/2 text-center transition-all ${
                      isActive ? "scale-110" : ""
                    }`}
                  >
                    <p
                      className={`font-heading text-base font-bold leading-tight ${
                        isCompleted
                          ? "text-emerald-700"
                          : isActive
                          ? "text-amber-900"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {quest.title}
                    </p>
                    
                    {/* Hover details for completed nodes */}
                    <div className="group/details">
                      <p
                        className={`mt-0.5 text-sm font-bold cursor-help ${
                          isCompleted
                            ? "text-emerald-600 group-hover/details:hidden"
                            : isActive
                            ? "text-amber-700"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {isCompleted
                          ? `+${quest.xp} XP`
                          : isActive
                          ? `Estimated: ${quest.duration}`
                          : quest.unlockRequirement?.slice(0, 30)}
                      </p>
                      
                      {/* Hidden hover details */}
                      {isCompleted && (
                        <div className="hidden group-hover/details:flex flex-col gap-1 text-xs font-bold text-emerald-600 mt-1">
                          <span>✓ Completed in 15 min</span>
                          <span>✓ Perfect score: 100%</span>
                          <button className="mt-1 rounded-lg bg-emerald-100 px-2 py-1 hover:bg-emerald-200">
                            Replay
                          </button>
                        </div>
                      )}
                      
                      {isLocked && (
                        <div className="group-hover/details:flex hidden flex-col gap-1 text-xs font-bold text-amber-600 mt-1">
                          <span>🔒 {quest.unlockRequirement}</span>
                          <span>⭐⭐⭐ Expert</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completed badge */}
                  {isCompleted && (
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-emerald-500">
                      <Check
                        className="h-5 w-5 text-emerald-600"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Legend                                                        */}
      {/* ============================================================ */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2 shadow-md">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500" />
          <span className="font-bold text-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2 shadow-md">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          <span className="font-bold text-foreground">Active</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2 shadow-md">
          <div className="h-6 w-6 rounded-full bg-muted/70 grayscale" />
          <span className="font-bold text-muted-foreground">Locked</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2 shadow-md">
          <span className="text-lg">💬</span>
          <span className="font-bold text-foreground">Click NPC to talk</span>
        </div>
      </div>
    </div>
  )
}
