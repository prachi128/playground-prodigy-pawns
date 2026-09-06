import { useParams, useLocation } from "wouter";
import { getBotById, getWorldForBot, getAllBots } from "@/lib/botData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Swords, Star, Brain, MessageCircle, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function BotDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const botId = parseInt(params.id || "1");
  const bot = getBotById(botId);
  const world = getWorldForBot(botId);
  const allBots = getAllBots();
  const currentIndex = allBots.findIndex((b) => b.id === botId);
  const prevBot = currentIndex > 0 ? allBots[currentIndex - 1] : null;
  const nextBot = currentIndex < allBots.length - 1 ? allBots[currentIndex + 1] : null;

  if (!bot || !world) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl font-display text-foreground">Bot not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">Back to Quest Map</Button>
        </div>
      </div>
    );
  }

  const handleChallenge = () => {
    toast.success(`Challenge against ${bot.name} initiated!`, {
      description: "Connect this to your chess engine to start the game.",
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-12">
        <img src={world.bgImage} alt="" className="w-full h-full object-cover" />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-b ${world.bgGradient}`} />

      <div className="relative z-10 container py-6 md:py-8 max-w-3xl mx-auto">
        {/* Top nav */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />Quest Map
          </Button>
          <div className="flex items-center gap-1">
            {prevBot && (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/bot/${prevBot.id}`)} className="text-foreground/60 hover:text-foreground">
                <ChevronLeft className="w-4 h-4" /><span className="hidden md:inline ml-1">{prevBot.emoji}</span>
              </Button>
            )}
            {nextBot && (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/bot/${nextBot.id}`)} className="text-foreground/60 hover:text-foreground">
                <span className="hidden md:inline mr-1">{nextBot.emoji}</span><ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>

        {/* Quest Encounter Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: `2px solid ${world.color}50` }}
        >
          {/* Card header with world color band */}
          <div
            className="px-6 md:px-8 pt-6 md:pt-8 pb-4"
            style={{ background: `linear-gradient(135deg, ${world.color}20, ${world.color}08)` }}
          >
            <div className="flex items-start gap-5 md:gap-6">
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl shadow-xl shrink-0"
                style={{ backgroundColor: `${world.color}25`, border: `2px solid ${world.color}50` }}
              >
                {bot.emoji}
                {bot.isBoss && (
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Crown className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-lg" />
                  </motion.div>
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-body text-muted-foreground">Level {bot.id}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-sm font-body" style={{ color: world.color }}>{world.icon} {world.name}</span>
                  {bot.isBoss && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                      World Boss
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">{bot.name}</h1>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-display font-bold text-amber-400 text-xl">Rating {bot.rating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 md:px-8 py-6 bg-card/90 backdrop-blur-xl">
            <div className="grid gap-5 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl p-5 border"
                style={{ backgroundColor: `${world.color}08`, borderColor: `${world.color}20` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5" style={{ color: world.color }} />
                  <h3 className="font-display font-semibold text-foreground">Personality</h3>
                </div>
                <p className="font-body text-foreground/80 leading-relaxed">{bot.personality}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl p-5 border"
                style={{ backgroundColor: `${world.color}08`, borderColor: `${world.color}20` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-semibold text-foreground">Play Style</h3>
                </div>
                <p className="font-body text-foreground/80 leading-relaxed">{bot.playStyle}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl p-5 border border-amber-500/20 bg-amber-500/5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-semibold text-foreground">After the game…</h3>
                </div>
                <p className="font-body text-foreground/80 leading-relaxed italic text-lg">"{bot.says}"</p>
              </motion.div>
            </div>

            {/* Challenge Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="lg"
                onClick={handleChallenge}
                className="w-full h-14 text-lg font-display font-bold rounded-xl shadow-xl text-white border-0"
                style={{ backgroundColor: world.color, boxShadow: `0 8px 30px ${world.color}40` }}
              >
                <Swords className="w-5 h-5 mr-2" />
                Challenge {bot.name.split(" ")[0]}!
              </Button>
            </motion.div>

            {/* Bottom nav */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/30">
              {prevBot ? (
                <button onClick={() => navigate(`/bot/${prevBot.id}`)} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{prevBot.name}</span>
                  <span className="sm:hidden">{prevBot.emoji} Prev</span>
                </button>
              ) : <div />}
              {nextBot ? (
                <button onClick={() => navigate(`/bot/${nextBot.id}`)} className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
                  <span className="hidden sm:inline">{nextBot.name}</span>
                  <span className="sm:hidden">Next {nextBot.emoji}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : <div />}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
