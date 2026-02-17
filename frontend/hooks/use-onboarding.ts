'use client'

import { useEffect, useState } from 'react'

export interface OnboardingState {
  hasSeenWelcome: boolean
  completedChecklist: {
    firstQuest: boolean
    threePuzzles: boolean
    firstGame: boolean
    firstBadge: boolean
    threeStreaks: boolean
  }
  tooltipsSeen: Set<string>
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    hasSeenWelcome: false,
    completedChecklist: {
      firstQuest: false,
      threePuzzles: false,
      firstGame: false,
      firstBadge: false,
      threeStreaks: false,
    },
    tooltipsSeen: new Set(),
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.tooltipsSeen && Array.isArray(parsed.tooltipsSeen)) {
          parsed.tooltipsSeen = new Set(parsed.tooltipsSeen)
        } else {
          parsed.tooltipsSeen = new Set()
        }
        setState(parsed)
      }
    } catch {
      // ignore invalid saved state
    }
  }, [])

  const updateState = (updates: Partial<OnboardingState>) => {
    const newState = { ...state, ...updates }
    setState(newState)
    const toSave = {
      ...newState,
      tooltipsSeen: Array.from(newState.tooltipsSeen),
    }
    localStorage.setItem('onboarding-state', JSON.stringify(toSave))
  }

  const markWelcomeSeen = () => {
    updateState({ hasSeenWelcome: true })
  }

  const markChecklistItem = (item: keyof OnboardingState['completedChecklist']) => {
    updateState({
      completedChecklist: {
        ...state.completedChecklist,
        [item]: true,
      },
    })
  }

  const markTooltipSeen = (tooltipId: string) => {
    const newSeen = new Set(state.tooltipsSeen)
    newSeen.add(tooltipId)
    updateState({ tooltipsSeen: newSeen })
  }

  const getChecklistProgress = () => {
    const items = Object.values(state.completedChecklist)
    return (items.filter(Boolean).length / items.length) * 100
  }

  return {
    state,
    markWelcomeSeen,
    markChecklistItem,
    markTooltipSeen,
    getChecklistProgress,
  }
}
