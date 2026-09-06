import { worlds } from "@/lib/botData";
import { motion } from "framer-motion";

interface WorldNavProps {
  activeWorld?: number;
}

export default function WorldNav({ activeWorld }: WorldNavProps) {
  const scrollToWorld = (worldId: number) => {
    const el = document.getElementById(`world-${worldId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-2"
    >
      {/* Trail line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />

      {worlds.map((world) => (
        <button
          key={world.id}
          onClick={() => scrollToWorld(world.id)}
          className="relative group"
          title={world.name}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-200 border-2 ${
              activeWorld === world.id
                ? "scale-110 shadow-lg"
                : "opacity-60 hover:opacity-100 hover:scale-105"
            }`}
            style={{
              backgroundColor: activeWorld === world.id ? `${world.color}40` : `${world.color}20`,
              borderColor: activeWorld === world.id ? world.color : `${world.color}40`,
            }}
          >
            {world.icon}
          </div>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-display font-semibold text-foreground whitespace-nowrap shadow-lg">
              {world.name}
            </div>
          </div>
        </button>
      ))}
    </motion.nav>
  );
}
