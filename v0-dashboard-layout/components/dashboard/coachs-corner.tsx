"use client"

import { CheckCircle2, Circle, BookOpen, Target, Video } from "lucide-react"

const homework = [
  { label: "Watch Rook Endgames video", done: true, icon: Video, emoji: "\uD83C\uDFAC" },
  { label: "Solve 5 Knight Fork Puzzles", done: true, icon: Target, emoji: "\uD83E\uDDE9" },
  { label: "Play 1 Rated Game", done: false, icon: BookOpen, emoji: "\u2694\uFE0F" },
  { label: "Review your last loss", done: false, icon: BookOpen, emoji: "\uD83D\uDD0D" },
]

export function CoachsCorner() {
  const completedCount = homework.filter((h) => h.done).length
  const progressPct = Math.round((completedCount / homework.length) * 100)

  return (
    <section className="mb-6">
      <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3">
          <h3 className="font-heading text-lg font-bold text-white">
            {"Coach's Corner \uD83C\uDFC5"}
          </h3>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-6">
          {/* Coach avatar + speech bubble */}
          <div className="flex gap-4 sm:min-w-[280px]">
            <div className="shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-emerald-400 sm:h-24 sm:w-24">
                <img
                  src="/images/coach-avatar.jpg"
                  alt="Coach Alex"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-1.5 text-center font-heading text-sm font-bold text-emerald-700">
                Coach Alex
              </p>
            </div>

            <div className="relative flex-1">
              <div className="absolute -left-2 top-5 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-emerald-100" />
              <div className="rounded-2xl rounded-tl-sm bg-emerald-100 p-4">
                <p className="text-base font-bold leading-relaxed text-emerald-900">
                  {"Great job on the Knight forks, Alex! \uD83C\uDF89 Today, watch the Rook Endgames video. You're doing amazing!"}
                </p>
              </div>
            </div>
          </div>

          {/* Homework checklist */}
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wide">
                {"Homework \uD83D\uDCDD"}
              </p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-heading text-sm font-bold text-emerald-700">
                {completedCount}/{homework.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {homework.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-200 hover:shadow-sm ${
                    item.done
                      ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50"
                      : "border-border bg-card"
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 animate-check-pop text-emerald-500" />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className="text-lg">{item.emoji}</span>
                  <p
                    className={`flex-1 text-base font-bold ${
                      item.done
                        ? "text-emerald-700 line-through decoration-emerald-400/60"
                        : "text-card-foreground"
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-4 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm font-bold text-muted-foreground">
                {progressPct}% complete -- finish all to earn a Coach Star! {"\u2B50"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
