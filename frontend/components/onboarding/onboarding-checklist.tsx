'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { useOnboarding } from '@/hooks/use-onboarding'

export function OnboardingChecklist() {
  const { state, markChecklistItem, getChecklistProgress } = useOnboarding()
  const progress = getChecklistProgress()
  const allComplete = progress === 100

  const items = [
    { key: 'firstQuest' as const, label: 'Complete your first quest', emoji: '🎯' },
    { key: 'threePuzzles' as const, label: 'Solve 3 puzzles', emoji: '🧩' },
    { key: 'firstGame' as const, label: 'Win your first game', emoji: '🏆' },
    { key: 'firstBadge' as const, label: 'Earn your first badge', emoji: '🎖️' },
    { key: 'threeStreaks' as const, label: 'Maintain a 3-day streak', emoji: '🔥' },
  ]

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 border-2 border-amber-300">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-lg font-bold text-gray-800">Getting Started</h3>
          <span className="text-sm font-bold text-amber-700">{Math.round(progress)}/100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/50">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ key, label, emoji }) => {
          const isComplete = state.completedChecklist[key]
          return (
            <button
              key={key}
              onClick={() => markChecklistItem(key)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors ${isComplete ? 'bg-white/60 text-gray-800' : 'bg-white hover:bg-white/80 text-gray-800'}`}
            >
              {isComplete ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <Circle className="h-5 w-5 text-gray-300 shrink-0" />}
              <span className={`text-sm font-bold ${isComplete ? 'line-through text-gray-500' : ''}`}>{label}</span>
              <span className="ml-auto text-base">{emoji}</span>
            </button>
          )
        })}
      </div>

      {allComplete && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-100 p-3 border border-green-400">
          <p className="text-center font-heading font-bold text-green-800">You unlocked the New Member badge!</p>
        </div>
      )}
    </div>
  )
}
