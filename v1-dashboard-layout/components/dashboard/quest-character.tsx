'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

interface QuestCharacterProps {
  questIndex: number
  isActive: boolean
  isCompleted: boolean
  onAnimationComplete?: () => void
}

/**
 * Character progression:
 * Quest 1-2 (Beginner): Small Pawn ♟
 * Quest 3 (Intermediate): Knight ♞
 * Quest 4 (Advanced): Bishop ♝ 
 * Quest 5 (Expert): Rook ♜
 * Mastery: Queen ♛ (shown on map)
 */

export function QuestCharacter({
  questIndex,
  isActive,
  isCompleted,
  onAnimationComplete,
}: QuestCharacterProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  // Determine character piece based on quest progress
  const getCharacterPiece = () => {
    if (questIndex <= 1) return '♟'   // Pawn (Beginner)
    if (questIndex === 2) return '♞'  // Knight (Intermediate)
    if (questIndex === 3) return '♝'  // Bishop (Advanced)
    if (questIndex === 4) return '♜'  // Rook (Expert)
    return '♛'                         // Queen (Mastery)
  }

  // Determine character size based on progression
  const getSizeClass = () => {
    if (questIndex <= 1) return 'text-4xl'
    if (questIndex === 2) return 'text-5xl'
    if (questIndex === 3) return 'text-5xl'
    if (questIndex === 4) return 'text-6xl'
    return 'text-6xl'
  }

  // Determine special effects based on progression
  const hasWisdomGlow = questIndex >= 3 // Bishop and above
  const hasStrengthAura = questIndex >= 4 // Rook and above

  // Trigger celebration when quest is newly completed
  useEffect(() => {
    if (isCompleted && !showCelebration) {
      setShowCelebration(true)
      const timer = setTimeout(() => {
        setShowCelebration(false)
        onAnimationComplete?.()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isCompleted, showCelebration, onAnimationComplete])

  const piece = getCharacterPiece()
  const sizeClass = getSizeClass()

  return (
    <div className='relative'>
      {/* Wisdom glow (Bishop+) */}
      {hasWisdomGlow && !isActive && (
        <div className='absolute inset-0 -m-4 rounded-full bg-cyan-300/20 blur-lg' />
      )}

      {/* Strength aura (Rook+) */}
      {hasStrengthAura && (
        <div className='absolute inset-0 -m-3 rounded-full border-2 border-red-400/30 blur-sm' />
      )}

      {/* Character piece */}
      <div
        className={`${sizeClass} leading-none ${
          isActive
            ? 'animate-walk'
            : isCompleted
            ? 'animate-check-pop'
            : showCelebration
            ? 'animate-character-celebrate'
            : ''
        }`}
      >
        {piece}
      </div>

      {/* Celebration sparkles */}
      {showCelebration && (
        <>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='animate-sparkle absolute'
              style={{
                left: `${Math.cos((i / 6) * Math.PI * 2) * 30}px`,
                top: `${Math.sin((i / 6) * Math.PI * 2) * 30}px`,
              }}
            >
              <Sparkles className='h-5 w-5 text-amber-400' />
            </div>
          ))}
        </>
      )}

      {/* Confetti burst on completion */}
      {showCelebration && (
        <>
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2
            const distance = 80
            const tx = Math.cos(angle) * distance
            const ty = Math.sin(angle) * distance
            return (
              <div
                key={`confetti-${i}`}
                className='animate-confetti-burst pointer-events-none absolute'
                style={{
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                } as React.CSSProperties}
              >
                {i % 3 === 0 ? '🎉' : i % 3 === 1 ? '⭐' : '✨'}
              </div>
            )
          })}
        </>
      )}

      {/* Evolution label for active/progressed states */}
      {isActive && questIndex >= 3 && (
        <div className='absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cyan-500/30 px-2 py-1 text-xs font-bold text-cyan-700 backdrop-blur-sm'>
          Level {Math.ceil((questIndex + 1) / 1.5)}
        </div>
      )}
    </div>
  )
}
