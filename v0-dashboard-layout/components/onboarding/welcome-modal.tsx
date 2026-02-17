'use client'

import { useState } from 'react'
import { ChevronRight, Play } from 'lucide-react'
import { useOnboarding } from '@/hooks/use-onboarding'

export function WelcomeModal() {
  const { state, markWelcomeSeen } = useOnboarding()
  const [currentScreen, setCurrentScreen] = useState(0)

  if (state.hasSeenWelcome) return null

  const screens = [
    {
      title: 'Welcome to Prodigy Pawns!',
      subtitle: "Let's start your chess adventure!",
      content: "🎉 Get ready to become a chess master with fun quests, puzzles, and games designed just for you!",
      emoji: '♟️',
    },
    {
      title: 'Meet Your Dashboard',
      subtitle: 'This is your home base!',
      content: 'Track your XP, maintain your streak, and complete daily quests. Everything starts here!',
      emoji: '📊',
    },
    {
      title: 'Start Your Journey',
      subtitle: 'Complete quests to level up!',
      content: 'Click on the Adventure tab to see the full map and start your first quest now!',
      emoji: '🗺️',
    },
  ]

  const screen = screens[currentScreen]
  const isLast = currentScreen === screens.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center text-6xl">{screen.emoji}</div>
        <h2 className="font-heading text-2xl font-bold text-gray-dark">{screen.title}</h2>
        <p className="mt-2 text-sm font-semibold text-gray-medium">{screen.subtitle}</p>
        <p className="mt-4 text-base text-gray-medium">{screen.content}</p>

        <div className="mt-8 flex gap-3">
          {currentScreen > 0 && (
            <button
              onClick={() => setCurrentScreen(currentScreen - 1)}
              className="flex-1 rounded-xl border-2 border-gray-light px-4 py-3 font-bold text-gray-dark transition-colors hover:bg-gray-light"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                markWelcomeSeen()
              } else {
                setCurrentScreen(currentScreen + 1)
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-medium to-green-light px-4 py-3 font-bold text-white transition-transform hover:scale-105"
          >
            {isLast ? (
              <>
                <Play className="h-5 w-5" /> Let's Go!
              </>
            ) : (
              <>
                Next <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {screens.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentScreen ? 'w-8 bg-green-medium' : 'w-2 bg-gray-light'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
