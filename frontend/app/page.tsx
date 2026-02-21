import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center gap-3">
            <span className="text-5xl animate-float" style={{ animationDelay: "0s" }}>
              ♟️
            </span>
            <span className="text-5xl animate-float" style={{ animationDelay: "0.3s" }}>
              ✨
            </span>
            <span className="text-5xl animate-float" style={{ animationDelay: "0.6s" }}>
              ♟️
            </span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            Chess is an{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent">
              adventure
            </span>
            !
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600 dark:text-gray-300 font-medium">
            Solve puzzles, beat the bot, level up, and climb the leaderboard.{" "}
            <span className="text-emerald-600 dark:text-emerald-400 font-heading">
              It&apos;s free and super fun.
            </span>
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-4 font-heading text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-100"
            >
              Start your adventure
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-emerald-500 bg-white px-8 py-4 font-heading text-lg font-bold text-emerald-600 transition-all hover:bg-emerald-50 dark:border-emerald-400 dark:bg-gray-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200/80 bg-white/60 py-16 dark:border-gray-700/50 dark:bg-gray-800/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            What you can do
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                emoji: "🧩",
                title: "Puzzle it out",
                copy: "Train your brain with cool chess puzzles and earn XP.",
              },
              {
                emoji: "🤖",
                title: "Beat the bot",
                copy: "Play against a friendly robot and get stronger every game.",
              },
              {
                emoji: "⭐",
                title: "Level up",
                copy: "Collect XP, unlock levels, and show off your progress.",
              },
              {
                emoji: "🏆",
                title: "Climb the board",
                copy: "See your name on the leaderboard and race with friends.",
              },
            ].map((card, i) => (
              <div
                key={card.title}
                className="animate-bounce-in rounded-3xl border-2 border-gray-200/80 bg-gradient-to-br from-white to-gray-50/80 p-6 shadow-md dark:border-gray-600/50 dark:from-gray-800/80 dark:to-gray-900/80"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 text-4xl">{card.emoji}</div>
                <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {card.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 p-10 text-center dark:from-emerald-500/20 dark:via-green-500/20 dark:to-teal-500/20">
          <p className="font-heading text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Ready to play?
          </p>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Join Prodigy Pawns — it&apos;s free.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-4 font-heading text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-100"
          >
            Sign up free
          </Link>
        </div>
      </section>
    </div>
  );
}
