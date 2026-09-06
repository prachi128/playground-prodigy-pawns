import { Bot, World } from "@/lib/botData";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Lock, Star, Crown } from "lucide-react";
import { useState } from "react";

interface BotNodeProps {
  bot: Bot;
  world: World;
  index: number;
  isUnlocked?: boolean;
  isCompleted?: boolean;
}

export default function BotNode({ bot, world, index, isUnlocked = true, isCompleted = false }: BotNodeProps) {
  const [, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative flex flex-col items-center cursor-pointer group"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isUnlocked && navigate(`/bot/${bot.id}`)}
    >
      {/* Speech bubble on hover */}
      <AnimatePresence>
        {isHovered && isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute -top-[76px] z-30 w-[190px] md:w-[220px] px-3.5 py-3 rounded-xl text-xs font-body text-center shadow-2xl border border-white/15"
            style={{ backgroundColor: `${world.color}f2` }}
          >
            <span className="text-white font-medium leading-tight block line-clamp-2">
              "{bot.says.substring(0, 80)}…"
            </span>
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-white/15"
              style={{ backgroundColor: `${world.color}f2` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot node - game piece style */}
      <div className="relative">
        {/* Glow platform under the piece */}
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full blur-md ${bot.isBoss ? "w-20 h-4 md:w-24 md:h-5" : "w-14 h-3 md:w-16 md:h-4"}`}
          style={{ backgroundColor: isUnlocked ? `${world.color}50` : "transparent" }}
        />

        {/* The main bubble */}
        <motion.div
          className={`relative rounded-full flex items-center justify-center shadow-xl transition-colors duration-200 ${
            bot.isBoss
              ? "w-20 h-20 md:w-24 md:h-24 text-3xl md:text-4xl border-3"
              : "w-14 h-14 md:w-18 md:h-18 text-2xl md:text-3xl border-2"
          } ${
            isUnlocked
              ? "border-amber-400/40 hover:border-amber-400/80"
              : "border-gray-600/30 grayscale opacity-40"
          }`}
          style={{
            backgroundColor: isUnlocked ? `${world.color}30` : "#1a1a1a60",
            boxShadow: isUnlocked
              ? `0 6px 24px ${world.color}25, inset 0 2px 12px ${world.color}15, 0 0 0 1px ${world.color}20`
              : "none",
          }}
          animate={
            isUnlocked
              ? { y: [0, -4, 0] }
              : {}
          }
          transition={{
            y: { duration: 2.5 + (index % 4) * 0.4, repeat: Infinity, ease: "easeInOut" },
          }}
          whileHover={isUnlocked ? { scale: 1.2, transition: { type: "spring", stiffness: 400, damping: 12 } } : {}}
          whileTap={isUnlocked ? { scale: 0.9 } : {}}
        >
          {isUnlocked ? (
            <span className="drop-shadow-md">{bot.emoji}</span>
          ) : (
            <Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
          )}

          {/* Boss crown */}
          {bot.isBoss && isUnlocked && (
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400 drop-shadow-lg" />
            </motion.div>
          )}

          {/* Boss rotating rings */}
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

          {/* Completed star */}
          {isCompleted && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg border-2 border-amber-300">
              <Star className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Bot name & rating label */}
      <div className="mt-3 text-center">
        <p className={`text-xs md:text-sm font-display font-semibold leading-tight max-w-[100px] md:max-w-[120px] truncate ${
          isUnlocked ? "text-foreground/90" : "text-muted-foreground/50"
        }`}>
          {bot.name.length > 18 ? bot.name.split(" ").slice(0, 2).join(" ") : bot.name}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span
            className="text-xs md:text-sm font-display font-bold"
            style={{ color: isUnlocked ? "#F59E0B" : undefined }}
          >
            {bot.rating}
          </span>
          {bot.isBoss && isUnlocked && (
            <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider border border-amber-500/30">
              Boss
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
