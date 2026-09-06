"use client"

import { type Bot, type World } from "@/lib/data/great-chess-adventure/botData"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Lock, Star, Crown } from "lucide-react"
import { useState } from "react"

interface BotNodeProps {
  bot: Bot
  world: World
  index: number
  isUnlocked?: boolean
  isCompleted?: boolean
}

export function BotNode({
  bot,
  world,
  index,
  isUnlocked = true,
  isCompleted = false,
}: BotNodeProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="group relative flex cursor-pointer flex-col items-center"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isUnlocked && router.push(`/adventure/great-chess-adventure/bot/${bot.id}`)}
    >
      <AnimatePresence>
        {isHovered && isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute -top-[76px] z-30 w-[190px] rounded-xl border border-white/15 px-3.5 py-3 text-center text-xs shadow-2xl md:w-[220px]"
            style={{ backgroundColor: `${world.color}f2` }}
          >
            <span className="block font-medium leading-tight text-white line-clamp-2">
              &ldquo;{bot.says.substring(0, 80)}&hellip;&rdquo;
            </span>
            <div
              className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/15"
              style={{ backgroundColor: `${world.color}f2` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full blur-md ${
            bot.isBoss ? "h-4 w-20 md:h-5 md:w-24" : "h-3 w-14 md:h-4 md:w-16"
          }`}
          style={{ backgroundColor: isUnlocked ? `${world.color}50` : "transparent" }}
        />

        <motion.div
          className={`relative flex items-center justify-center rounded-full shadow-xl transition-colors duration-200 ${
            bot.isBoss
              ? "h-20 w-20 border-[3px] text-3xl md:h-24 md:w-24 md:text-4xl"
              : "h-14 w-14 border-2 text-2xl md:h-[4.5rem] md:w-[4.5rem] md:text-3xl"
          } ${
            isUnlocked
              ? "border-amber-400/40 hover:border-amber-400/80"
              : "border-gray-600/30 opacity-40 grayscale"
          }`}
          style={{
            backgroundColor: isUnlocked ? `${world.color}30` : "#1a1a1a60",
            boxShadow: isUnlocked
              ? `0 6px 24px ${world.color}25, inset 0 2px 12px ${world.color}15, 0 0 0 1px ${world.color}20`
              : "none",
          }}
          animate={isUnlocked ? { y: [0, -4, 0] } : {}}
          transition={{
            y: { duration: 2.5 + (index % 4) * 0.4, repeat: Infinity, ease: "easeInOut" },
          }}
          whileHover={
            isUnlocked ? { scale: 1.2, transition: { type: "spring", stiffness: 400, damping: 12 } } : {}
          }
          whileTap={isUnlocked ? { scale: 0.9 } : {}}
        >
          {isUnlocked ? (
            <span className="drop-shadow-md">{bot.emoji}</span>
          ) : (
            <Lock className="h-5 w-5 text-gray-500 md:h-6 md:w-6" />
          )}

          {bot.isBoss && isUnlocked && (
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-lg md:h-6 md:w-6" />
            </motion.div>
          )}

          {bot.isBoss && isUnlocked && (
            <>
              <motion.div
                className="absolute -inset-1.5 rounded-full border-2 border-amber-400/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -inset-3 rounded-full border border-dashed border-amber-400/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
            </>
          )}

          {isCompleted && (
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-400 shadow-lg">
              <Star className="h-3.5 w-3.5 fill-amber-900 text-amber-900" />
            </div>
          )}
        </motion.div>
      </div>

      <div className="mt-3 text-center">
        <p
          className={`max-w-[100px] truncate font-semibold leading-tight md:max-w-[120px] ${
            isUnlocked ? "gca-text/90 text-sm" : "text-sm text-gray-500/50"
          }`}
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          {bot.name.length > 18 ? bot.name.split(" ").slice(0, 2).join(" ") : bot.name}
        </p>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span
            className="text-xs font-bold md:text-sm"
            style={{ color: isUnlocked ? "#F59E0B" : undefined, fontFamily: "var(--font-fredoka)" }}
          >
            {bot.rating}
          </span>
          {bot.isBoss && isUnlocked && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 md:text-[10px]">
              Boss
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
