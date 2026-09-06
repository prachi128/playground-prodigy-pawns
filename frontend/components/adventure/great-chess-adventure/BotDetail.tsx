"use client"

import { useRouter } from "next/navigation"
import {
  getBotById,
  getWorldForBot,
  getAllBots,
} from "@/lib/data/great-chess-adventure/botData"
import { AdventureButton } from "./AdventureButton"
import {
  ArrowLeft,
  ArrowRight,
  Swords,
  Star,
  Brain,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
} from "lucide-react"
import { motion } from "framer-motion"
import toast from "react-hot-toast"

interface BotDetailProps {
  botId: number
}

export function BotDetail({ botId }: BotDetailProps) {
  const router = useRouter()
  const bot = getBotById(botId)
  const world = getWorldForBot(botId)
  const allBots = getAllBots()
  const currentIndex = allBots.findIndex((b) => b.id === botId)
  const prevBot = currentIndex > 0 ? allBots[currentIndex - 1] : null
  const nextBot = currentIndex < allBots.length - 1 ? allBots[currentIndex + 1] : null

  if (!bot || !world) {
    return (
      <div className="gca-text flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-fredoka)" }}>
            Bot not found
          </p>
          <AdventureButton
            onClick={() => router.push("/adventure/great-chess-adventure")}
            className="mt-4"
          >
            Back to Quest Map
          </AdventureButton>
        </div>
      </div>
    )
  }

  const handleChallenge = () => {
    toast.success(`Challenge against ${bot.name} initiated!`, {
      duration: 4000,
    })
    toast("Connect this to your chess engine to start the game.", { icon: "♟️", duration: 5000 })
  }

  return (
    <div className="gca-text relative min-h-screen overflow-hidden font-[family-name:var(--font-nunito)]">
      <div className="absolute inset-0 opacity-12">
        <img src={world.bgImage} alt="" className="h-full w-full object-cover" />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-b ${world.bgGradient}`} />

      <div className="gca-container relative z-10 mx-auto max-w-3xl py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <AdventureButton
            variant="ghost"
            onClick={() => router.push("/adventure/great-chess-adventure")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quest Map
          </AdventureButton>
          <div className="flex items-center gap-1">
            {prevBot && (
              <AdventureButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/adventure/great-chess-adventure/bot/${prevBot.id}`)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1 hidden md:inline">{prevBot.emoji}</span>
              </AdventureButton>
            )}
            {nextBot && (
              <AdventureButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/adventure/great-chess-adventure/bot/${nextBot.id}`)}
              >
                <span className="mr-1 hidden md:inline">{nextBot.emoji}</span>
                <ChevronRight className="h-4 w-4" />
              </AdventureButton>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden rounded-2xl shadow-2xl"
          style={{ border: `2px solid ${world.color}50` }}
        >
          <div
            className="px-6 pb-4 pt-6 md:px-8 md:pt-8"
            style={{ background: `linear-gradient(135deg, ${world.color}20, ${world.color}08)` }}
          >
            <div className="flex items-start gap-5 md:gap-6">
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-xl md:h-24 md:w-24 md:text-5xl"
                style={{ backgroundColor: `${world.color}25`, border: `2px solid ${world.color}50` }}
              >
                {bot.emoji}
                {bot.isBoss && (
                  <motion.div
                    className="absolute -right-2 -top-2"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Crown className="h-6 w-6 fill-amber-400 text-amber-400 drop-shadow-lg" />
                  </motion.div>
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="gca-muted text-sm">Level {bot.id}</span>
                  <span className="gca-muted opacity-40">•</span>
                  <span className="text-sm" style={{ color: world.color }}>
                    {world.icon} {world.name}
                  </span>
                  {bot.isBoss && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      World Boss
                    </span>
                  )}
                </div>
                <h1
                  className="mb-2 text-2xl font-bold md:text-3xl"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  {bot.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span
                    className="text-xl font-bold text-amber-400"
                    style={{ fontFamily: "var(--font-fredoka)" }}
                  >
                    Rating {bot.rating}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="gca-card px-6 py-6 backdrop-blur-xl md:px-8">
            <div className="mb-8 grid gap-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border p-5"
                style={{ backgroundColor: `${world.color}08`, borderColor: `${world.color}20` }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5" style={{ color: world.color }} />
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                    Personality
                  </h3>
                </div>
                <p className="gca-muted leading-relaxed">{bot.personality}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl border p-5"
                style={{ backgroundColor: `${world.color}08`, borderColor: `${world.color}20` }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Swords className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                    Play Style
                  </h3>
                </div>
                <p className="gca-muted leading-relaxed">{bot.playStyle}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-amber-400" />
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                    After the game…
                  </h3>
                </div>
                <p className="gca-muted text-lg italic leading-relaxed">
                  &ldquo;{bot.says}&rdquo;
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AdventureButton
                size="lg"
                onClick={handleChallenge}
                className="w-full rounded-xl border-0 font-bold text-white shadow-xl"
                style={{ backgroundColor: world.color, boxShadow: `0 8px 30px ${world.color}40` }}
              >
                <Swords className="mr-2 h-5 w-5" />
                Challenge {bot.name.split(" ")[0]}!
              </AdventureButton>
            </motion.div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
              {prevBot ? (
                <button
                  type="button"
                  onClick={() => router.push(`/adventure/great-chess-adventure/bot/${prevBot.id}`)}
                  className="gca-muted flex items-center gap-2 text-sm transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{prevBot.name}</span>
                  <span className="sm:hidden">{prevBot.emoji} Prev</span>
                </button>
              ) : (
                <div />
              )}
              {nextBot ? (
                <button
                  type="button"
                  onClick={() => router.push(`/adventure/great-chess-adventure/bot/${nextBot.id}`)}
                  className="gca-muted flex items-center gap-2 text-sm transition-colors hover:text-white"
                >
                  <span className="hidden sm:inline">{nextBot.name}</span>
                  <span className="sm:hidden">Next {nextBot.emoji}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
