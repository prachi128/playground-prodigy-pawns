"use client"

import { worlds } from "@/lib/data/great-chess-adventure/botData"
import { motion } from "framer-motion"

interface WorldNavProps {
  activeWorld?: number
}

export function WorldNav({ activeWorld }: WorldNavProps) {
  const scrollToWorld = (worldId: number) => {
    const el = document.getElementById(`world-${worldId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-2 lg:flex"
    >
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />

      {worlds.map((world) => (
        <button
          key={world.id}
          type="button"
          onClick={() => scrollToWorld(world.id)}
          className="group relative"
          title={world.name}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg transition-all duration-200 ${
              activeWorld === world.id
                ? "scale-110 shadow-lg"
                : "opacity-60 hover:scale-105 hover:opacity-100"
            }`}
            style={{
              backgroundColor: activeWorld === world.id ? `${world.color}40` : `${world.color}20`,
              borderColor: activeWorld === world.id ? world.color : `${world.color}40`,
            }}
          >
            {world.icon}
          </div>

          <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="gca-card whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-lg">
              {world.name}
            </div>
          </div>
        </button>
      ))}
    </motion.nav>
  )
}
