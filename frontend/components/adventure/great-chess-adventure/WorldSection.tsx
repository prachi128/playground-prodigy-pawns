"use client"

import { type World } from "@/lib/data/great-chess-adventure/botData"
import { BotNode } from "./BotNode"
import { motion } from "framer-motion"

interface WorldSectionProps {
  world: World
  worldIndex: number
}

const worldGates = [
  { icon: "🍬", label: "Enter the Candy Kingdom" },
  { icon: "🏴‍☠️", label: "Sail to the Pirate Cove" },
  { icon: "🤖", label: "Enter Robot City" },
  { icon: "🚀", label: "Blast off to the Star Galaxy" },
  { icon: "🐉", label: "Climb the Dragon Mountains" },
]

export function WorldSection({ world, worldIndex }: WorldSectionProps) {
  const isEven = worldIndex % 2 === 0
  const rows: (typeof world.bots)[] = []
  const botsPerRow = 4
  for (let i = 0; i < world.bots.length; i += botsPerRow) {
    rows.push(world.bots.slice(i, i + botsPerRow))
  }

  return (
    <section id={`world-${world.id}`} className="relative py-16 md:py-24">
      <div className="absolute inset-0 overflow-hidden">
        <img src={world.bgImage} alt="" className="h-full w-full object-cover opacity-20" />
        <div className={`absolute inset-0 bg-gradient-to-b ${world.bgGradient}`} />
      </div>

      <div className="gca-container relative z-10 mb-12">
        <motion.div
          initial={{ opacity: 0, x: isEven ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className={`flex items-center gap-4 ${isEven ? "" : "justify-end"}`}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow-xl md:h-20 md:w-20 md:text-5xl"
            style={{
              backgroundColor: `${world.color}30`,
              border: `2px solid ${world.color}60`,
              boxShadow: `0 4px 30px ${world.color}30`,
            }}
          >
            {world.icon}
          </div>
          <div className={isEven ? "" : "text-right"}>
            <h2
              className="text-3xl font-bold md:text-4xl"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              {world.name}
            </h2>
            <p className="gca-muted mt-1 text-sm md:text-base">
              Ratings {world.ratingRange} • {world.bots.length} Challengers
            </p>
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`gca-muted mt-4 max-w-xl text-base md:text-lg ${isEven ? "" : "ml-auto text-right"}`}
        >
          {world.description}
        </motion.p>
      </div>

      <div className="gca-container relative z-10 mx-auto max-w-5xl">
        {rows.map((row, rowIdx) => {
          const isRowReversed = rowIdx % 2 !== 0
          const displayRow = isRowReversed ? [...row].reverse() : row

          return (
            <div key={rowIdx} className="relative">
              {rowIdx > 0 && (
                <div
                  className={`flex ${isRowReversed ? "ml-[12%] justify-start" : "mr-[12%] justify-end"}`}
                >
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="h-10 w-1.5 origin-top rounded-full"
                    style={{
                      background: `linear-gradient(to bottom, #F59E0B80, ${world.color}60)`,
                      boxShadow: "0 0 8px #F59E0B40",
                    }}
                  />
                </div>
              )}

              <div className="relative">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  className={`absolute left-[8%] right-[8%] top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                    isRowReversed ? "origin-right" : "origin-left"
                  }`}
                  style={{
                    background: `linear-gradient(90deg, ${isRowReversed ? "transparent" : "#F59E0B60"}, #F59E0B90, ${isRowReversed ? "#F59E0B60" : "transparent"})`,
                    boxShadow: "0 0 12px #F59E0B30, 0 0 4px #F59E0B50",
                  }}
                />

                <div className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 flex -translate-y-1/2 justify-between px-[10%]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-amber-400/40"
                      style={{ boxShadow: "0 0 4px #F59E0B40" }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-around py-8 md:py-10">
                  {displayRow.map((bot, idx) => {
                    const globalIdx = rowIdx * botsPerRow + idx
                    return (
                      <BotNode
                        key={bot.id}
                        bot={bot}
                        world={world}
                        index={globalIdx}
                        isUnlocked={true}
                        isCompleted={false}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {worldIndex < 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 mt-16 flex flex-col items-center"
        >
          <div
            className="h-12 w-1.5 rounded-full"
            style={{
              background: `linear-gradient(to bottom, ${world.color}60, #F59E0B80)`,
              boxShadow: "0 0 8px #F59E0B30",
            }}
          />

          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] text-3xl shadow-2xl md:h-24 md:w-24 md:text-4xl"
              style={{
                background: `radial-gradient(circle, #F59E0B20, ${world.color}30)`,
                borderColor: "#F59E0B80",
                boxShadow: "0 0 30px #F59E0B30, inset 0 0 20px #F59E0B10",
              }}
            >
              {worldGates[worldIndex].icon}
            </div>
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-400/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <p
            className="mt-3 text-sm font-semibold text-amber-400/80"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {worldGates[worldIndex].label}
          </p>

          <div
            className="h-12 w-1.5 rounded-full"
            style={{
              background: "linear-gradient(to bottom, #F59E0B80, transparent)",
              boxShadow: "0 0 8px #F59E0B20",
            }}
          />
        </motion.div>
      )}
    </section>
  )
}
