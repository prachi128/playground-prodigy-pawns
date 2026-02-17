'use client'

import { useState, useEffect } from 'react'

interface CoachPromptProps {
  trigger: 'firstLogin' | 'firstQuest' | 'puzzle' | 'idle'
}

const prompts = {
  firstLogin: { message: "Welcome! Let's start with Pawn Power!", action: 'Start First Quest' },
  firstQuest: { message: 'Great work! Ready for a puzzle? Puzzles help you sharpen your tactics!', action: 'Try a Puzzle' },
  puzzle: { message: 'Nice! You are getting good at this. Ready for a real game now?', action: 'Play a Game' },
  idle: { message: 'Ready to play? Try Quick Play to jump into action!', action: 'Quick Play' },
}

export function CoachGuidance({ trigger }: CoachPromptProps) {
  const [isVisible, setIsVisible] = useState(true)
  const prompt = prompts[trigger]

  if (!isVisible) return null

  return (
    <div className="fixed bottom-8 right-8 z-40 max-w-sm animate-bounce">
      <div className="rounded-2xl bg-white shadow-2xl border-2 border-green-400 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-4">
          <div className="flex gap-3">
            <div className="text-4xl">🏅</div>
            <div className="flex-1">
              <p className="font-heading font-bold text-white text-sm">{prompt.message}</p>
              <button onClick={() => setIsVisible(false)} className="mt-2 rounded-lg bg-white/20 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/30">
                {prompt.action}
              </button>
            </div>
            <button onClick={() => setIsVisible(false)} className="text-white/60 hover:text-white text-xl">×</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useCoachPrompts() {
  const [trigger, setTrigger] = useState<CoachPromptProps['trigger'] | null>(null)

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>
    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setTrigger('idle'), 120000)
    }
    document.addEventListener('mousemove', resetIdleTimer)
    document.addEventListener('keypress', resetIdleTimer)
    document.addEventListener('click', resetIdleTimer)
    resetIdleTimer()
    return () => {
      clearTimeout(idleTimer)
      document.removeEventListener('mousemove', resetIdleTimer)
      document.removeEventListener('keypress', resetIdleTimer)
      document.removeEventListener('click', resetIdleTimer)
    }
  }, [])

  return { trigger, setTrigger }
}
