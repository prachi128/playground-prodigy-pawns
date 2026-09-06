import { worlds } from "@/lib/botData";
import WorldSection from "@/components/WorldSection";
import WorldNav from "@/components/WorldNav";
import { motion } from "framer-motion";
import { Trophy, Map, Users } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * The Great Chess Adventure - Quest Map
 * Design: Winding Trail Board Game — Neo-Whimsical Game UI
 * A vertical scrolling quest map with 50 bots across 6 themed worlds
 */
export default function Home() {
  const [activeWorld, setActiveWorld] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const sections = worlds.map((w) => ({
        id: w.id,
        el: document.getElementById(`world-${w.id}`),
      }));

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].el;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2) {
            setActiveWorld(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      {/* World navigation sidebar */}
      <WorldNav activeWorld={activeWorld} />

      {/* Hero Section */}
      <header className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated starfield background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-background to-background" />
        <div className="absolute inset-0 opacity-40">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-300 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container text-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6"
          >
            <img
              src="/manus-storage/chess-logo_3f374493.png"
              alt="The Great Chess Adventure"
              className="w-20 h-20 md:w-28 md:h-28 mx-auto drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4"
          >
            The Great Chess{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Adventure
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-lg md:text-xl font-body text-foreground/70 mb-8 max-w-2xl mx-auto"
          >
            50 friendly challengers await along the golden path.
            <br className="hidden md:block" />
            Every victory unlocks the next chapter of your adventure!
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center justify-center gap-6 md:gap-10"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span className="font-display font-semibold text-foreground">50 Bots</span>
            </div>
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-400" />
              <span className="font-display font-semibold text-foreground">6 Worlds</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="font-display font-semibold text-foreground">Rating 100–1600</span>
            </div>
          </motion.div>

          {/* Wizzy intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50"
          >
            <span className="text-3xl">🦉</span>
            <p className="text-sm md:text-base font-body text-foreground/80 text-left italic">
              "Ready, little champion? Our adventure begins in the Beginner Forest!"
              <br />
              <span className="text-xs text-muted-foreground not-italic">— Wizzy the Owl Wizard</span>
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-amber-400" />
          </div>
        </motion.div>
      </header>

      {/* Quest Map - All Worlds */}
      <main>
        {worlds.map((world, index) => (
          <WorldSection key={world.id} world={world} worldIndex={index} />
        ))}
      </main>

      {/* Ending celebration */}
      <section className="relative py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 to-background" />
        <div className="relative z-10 container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-6xl mb-6 block">🏆</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              The End… or Just the Beginning!
            </h2>
            <p className="text-base md:text-lg font-body text-foreground/70 max-w-xl mx-auto">
              All 50 friends — bunnies, gummy bears, pirates, robots, aliens, and dragons — are cheering for you.
              The real magic was never the board. It was YOU, growing stronger with every single game!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="container text-center">
          <p className="text-sm font-body text-muted-foreground">
            The Great Chess Adventure • For young champions aged 5–16
          </p>
        </div>
      </footer>
    </div>
  );
}
