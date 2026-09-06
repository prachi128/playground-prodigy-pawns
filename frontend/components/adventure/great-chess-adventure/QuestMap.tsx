"use client"

import { worlds, GCA_ASSET_BASE } from "@/lib/data/great-chess-adventure/botData"
import { WorldSection } from "./WorldSection"
import { WorldNav } from "./WorldNav"
import { motion } from "framer-motion"
import { Trophy, Map, Users } from "lucide-react"
import { useState, useEffect } from "react"

export function QuestMap() {
  const [activeWorld, setActiveWorld] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      const sections = worlds.map((w) => ({
        id: w.id,
        el: document.getElementById(`world-${w.id}`),
      }))

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].el
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= window.innerHeight / 2) {
            setActiveWorld(sections[i].id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="gca-text min-h-screen overflow-x-hidden font-[family-name:var(--font-nunito)]">
      <WorldNav activeWorld={activeWorld} />

      <header className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-[oklch(0.15_0.02_260)] to-[oklch(0.15_0.02_260)]" />
        <div className="absolute inset-0 opacity-40">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-amber-300"
              style={{
                left: `${(i * 17 + 7) % 100}%`,
                top: `${(i * 23 + 11) % 100}%`,
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 2 + (i % 3),
                repeat: Infinity,
                delay: (i % 5) * 0.4,
              }}
            />
          ))}
        </div>

        <div className="gca-container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6"
          >
            <img
              src={`${GCA_ASSET_BASE}/chess-logo_3f374493.png`}
              alt="The Great Chess Adventure"
              className="mx-auto h-20 w-20 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] md:h-28 md:w-28"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-4 text-4xl font-bold md:text-6xl"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            The Great Chess{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Adventure
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="gca-muted mx-auto mb-8 max-w-2xl text-lg md:text-xl"
          >
            50 friendly challengers await along the golden path.
            <br className="hidden md:block" />
            Every victory unlocks the next chapter of your adventure!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center justify-center gap-6 md:gap-10"
          >
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              <span className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                50 Bots
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                6 Worlds
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-400" />
              <span className="font-semibold" style={{ fontFamily: "var(--font-fredoka)" }}>
                Rating 100–1600
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="gca-card mt-10 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 backdrop-blur-sm"
          >
            <span className="text-3xl">🦉</span>
            <p className="gca-muted text-left text-sm italic md:text-base">
              &ldquo;Ready, little champion? Our adventure begins in the Beginner Forest!&rdquo;
              <br />
              <span className="text-xs not-italic opacity-70">— Wizzy the Owl Wizard</span>
            </p>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 pt-2">
            <div className="h-3 w-1.5 rounded-full bg-amber-400" />
          </div>
        </motion.div>
      </header>

      <main>
        {worlds.map((world, index) => (
          <WorldSection key={world.id} world={world} worldIndex={index} />
        ))}
      </main>

      <section className="relative py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 to-transparent" />
        <div className="gca-container relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-6 block text-6xl">🏆</span>
            <h2
              className="mb-4 text-3xl font-bold md:text-4xl"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              The End… or Just the Beginning!
            </h2>
            <p className="gca-muted mx-auto max-w-xl text-base md:text-lg">
              All 50 friends — bunnies, gummy bears, pirates, robots, aliens, and dragons — are
              cheering for you. The real magic was never the board. It was YOU, growing stronger
              with every single game!
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="gca-container text-center">
          <p className="gca-muted text-sm">
            The Great Chess Adventure • For young champions aged 5–16
          </p>
        </div>
      </footer>
    </div>
  )
}
