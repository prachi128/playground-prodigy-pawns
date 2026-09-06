import { World } from "@/lib/botData";
import BotNode from "./BotNode";
import { motion } from "framer-motion";

interface WorldSectionProps {
  world: World;
  worldIndex: number;
}

// Themed gate icons for each world transition
const worldGates = [
  { icon: "🍬", label: "Enter the Candy Kingdom" },
  { icon: "🏴‍☠️", label: "Sail to the Pirate Cove" },
  { icon: "🤖", label: "Enter Robot City" },
  { icon: "🚀", label: "Blast off to the Star Galaxy" },
  { icon: "🐉", label: "Climb the Dragon Mountains" },
];

export default function WorldSection({ world, worldIndex }: WorldSectionProps) {
  const isEven = worldIndex % 2 === 0;

  // Create a winding path layout - bots alternate direction in rows
  const rows: (typeof world.bots)[] = [];
  const botsPerRow = 4;
  for (let i = 0; i < world.bots.length; i += botsPerRow) {
    rows.push(world.bots.slice(i, i + botsPerRow));
  }

  return (
    <section id={`world-${world.id}`} className="relative py-16 md:py-24">
      {/* Background image with overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={world.bgImage}
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${world.bgGradient}`} />
      </div>

      {/* World header */}
      <div className="relative z-10 container mb-12">
        <motion.div
          initial={{ opacity: 0, x: isEven ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className={`flex items-center gap-4 ${isEven ? "" : "justify-end"}`}
        >
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-4xl md:text-5xl shadow-xl"
            style={{ backgroundColor: `${world.color}30`, border: `2px solid ${world.color}60`, boxShadow: `0 4px 30px ${world.color}30` }}
          >
            {world.icon}
          </div>
          <div className={isEven ? "" : "text-right"}>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {world.name}
            </h2>
            <p className="text-sm md:text-base font-body text-muted-foreground mt-1">
              Ratings {world.ratingRange} • {world.bots.length} Challengers
            </p>
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`mt-4 text-base md:text-lg font-body text-foreground/70 max-w-xl ${isEven ? "" : "ml-auto text-right"}`}
        >
          {world.description}
        </motion.p>
      </div>

      {/* Bot trail - winding golden path */}
      <div className="relative z-10 container max-w-5xl mx-auto">
        {rows.map((row, rowIdx) => {
          const isRowReversed = rowIdx % 2 !== 0;
          const displayRow = isRowReversed ? [...row].reverse() : row;

          return (
            <div key={rowIdx} className="relative">
              {/* Vertical golden trail connector between rows */}
              {rowIdx > 0 && (
                <div className={`flex ${isRowReversed ? "justify-start ml-[12%]" : "justify-end mr-[12%]"}`}>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="w-1.5 h-10 rounded-full origin-top"
                    style={{
                      background: `linear-gradient(to bottom, #F59E0B80, ${world.color}60)`,
                      boxShadow: "0 0 8px #F59E0B40",
                    }}
                  />
                </div>
              )}

              {/* Horizontal golden trail line behind bots */}
              <div className="relative">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  className={`absolute top-1/2 left-[8%] right-[8%] h-1.5 -translate-y-1/2 rounded-full ${isRowReversed ? "origin-right" : "origin-left"}`}
                  style={{
                    background: `linear-gradient(90deg, ${isRowReversed ? "transparent" : "#F59E0B60"}, #F59E0B90, ${isRowReversed ? "#F59E0B60" : "transparent"})`,
                    boxShadow: "0 0 12px #F59E0B30, 0 0 4px #F59E0B50",
                  }}
                />

                {/* Dotted trail markers */}
                <div className="absolute top-1/2 left-[8%] right-[8%] -translate-y-1/2 flex justify-between px-[10%] pointer-events-none">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-amber-400/40"
                      style={{ boxShadow: "0 0 4px #F59E0B40" }}
                    />
                  ))}
                </div>

                {/* Bot nodes in this row */}
                <div className="flex justify-around items-center py-8 md:py-10">
                  {displayRow.map((bot, idx) => {
                    const globalIdx = rowIdx * botsPerRow + idx;
                    return (
                      <BotNode
                        key={bot.id}
                        bot={bot}
                        world={world}
                        index={globalIdx}
                        isUnlocked={true}
                        isCompleted={false}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* World gate / themed transition */}
      {worldIndex < 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 flex flex-col items-center mt-16"
        >
          {/* Trail leading to gate */}
          <div
            className="w-1.5 h-12 rounded-full"
            style={{
              background: `linear-gradient(to bottom, ${world.color}60, #F59E0B80)`,
              boxShadow: "0 0 8px #F59E0B30",
            }}
          />

          {/* The gate itself */}
          <div className="relative">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-2xl border-3"
              style={{
                background: `radial-gradient(circle, #F59E0B20, ${world.color}30)`,
                borderColor: "#F59E0B80",
                boxShadow: "0 0 30px #F59E0B30, inset 0 0 20px #F59E0B10",
              }}
            >
              {worldGates[worldIndex].icon}
            </div>
            {/* Rotating ring */}
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-400/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Gate label */}
          <p className="mt-3 text-sm font-display font-semibold text-amber-400/80">
            {worldGates[worldIndex].label}
          </p>

          {/* Trail continuing from gate */}
          <div
            className="w-1.5 h-12 rounded-full"
            style={{
              background: `linear-gradient(to bottom, #F59E0B80, transparent)`,
              boxShadow: "0 0 8px #F59E0B20",
            }}
          />
        </motion.div>
      )}
    </section>
  );
}
