'use client'

import { useState } from 'react'
import { ChevronRight, Zap, TrendingUp, Trophy, Lock, Star } from 'lucide-react'
import Link from 'next/link'
import { getRatingBandForLevel, getRatingProgressToNextLevel, getRatingForNextLevel } from '@/lib/utils'

interface LevelCardProps {
  currentLevel: number
  rating: number
  totalXP: number
  userName: string
}

const pieces = [
  { name: 'Pawn', levels: '1-2', unicode: '♙', status: 'completed', color: 'text-emerald-600' },
  { name: 'Knight', levels: '3-5', unicode: '♞', status: 'current', color: 'text-emerald-600' },
  { name: 'Bishop', levels: '6-8', unicode: '♝', status: 'locked', color: 'text-gray-400' },
  { name: 'Rook', levels: '9-11', unicode: '♜', status: 'locked', color: 'text-gray-400' },
  { name: 'Queen', levels: '12-14', unicode: '♛', status: 'locked', color: 'text-gray-400' },
  { name: 'King', levels: '15+', unicode: '♚', status: 'locked', color: 'text-gray-400' },
]

const quickXPOpportunities = [
  { activity: 'Solve 3 puzzles', xp: 30, icon: '🧩' },
  { activity: 'Complete a quest', xp: 50, icon: '🎯' },
  { activity: 'Win a game', xp: 25, icon: '⚔️' },
]

export function LevelCard({ currentLevel = 4, rating = 650, totalXP = 640, userName = 'Player' }: LevelCardProps) {
  const [expandedTab, setExpandedTab] = useState<'benefits' | 'leaderboard' | 'quick' | null>(null)

  // Level is from rating; show progress within current rating band toward next level
  const ratingProgress = getRatingProgressToNextLevel(rating, currentLevel)
  const ratingNext = getRatingForNextLevel(currentLevel)
  const band = getRatingBandForLevel(currentLevel)
  const levelName = `Knight ${(currentLevel % 3) + 1}`
  const nextLevelName = `Knight ${(currentLevel % 3) + 2}`
  const userRank = 47
  const aheadOf = 15

  const getCurrentPiece = () => {
    if (currentLevel <= 2) return pieces[0]
    if (currentLevel <= 5) return pieces[1]
    if (currentLevel <= 8) return pieces[2]
    if (currentLevel <= 11) return pieces[3]
    if (currentLevel <= 14) return pieces[4]
    return pieces[5]
  }

  const currentPiece = getCurrentPiece()

  return (
    <section id="your-level" className="mb-6 scroll-mt-20">
      <div className="overflow-hidden rounded-3xl border-2 border-green-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-green-500 via-teal-500 to-green-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-2xl font-bold text-white">Your Level</h3>
            <Star className="h-6 w-6 fill-yellow-300 text-yellow-300" />
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="text-8xl animate-piece-glow animate-piece-rotate">{currentPiece.unicode}</div>
            <div className="text-center">
              <p className="font-heading text-4xl font-bold text-green-600">{levelName}</p>
              <p className="text-sm font-semibold text-muted-foreground">{currentPiece.name} ({currentLevel})</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Level is based on your rating</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Rating → Level {currentLevel + 1}</span>
              <span className="font-heading text-lg font-bold text-green-600">{ratingProgress}%</span>
            </div>
            <div className="h-6 overflow-hidden rounded-full border-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
              <div className="h-full bg-gradient-to-r from-green-500 via-teal-400 to-emerald-500 transition-all duration-500 animate-xp-bar-fill flex items-center justify-center" style={{ width: `${ratingProgress}%` }}>
                {ratingProgress > 30 && <span className="text-xs font-bold text-white drop-shadow">{rating}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-card-foreground">Rating {rating}{band.max != null ? ` (${band.min}–${band.max})` : ` (${band.min}+)`}</span>
              {ratingNext != null ? (
                <span className="font-heading text-lg font-bold text-orange-600">Reach {ratingNext} for Level {currentLevel + 1}</span>
              ) : (
                <span className="font-heading text-lg font-bold text-emerald-600">Max level!</span>
              )}
            </div>
            {ratingNext != null && ratingNext - rating <= 100 ? (
              <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 p-3">
                <p className="font-heading font-bold text-amber-900">Almost there! Reach rating {ratingNext} for {nextLevelName}!</p>
              </div>
            ) : ratingNext != null ? (
              <div className="rounded-lg bg-gradient-to-r from-teal-50 to-green-50 border-2 border-teal-200 p-3">
                <p className="font-heading font-bold text-teal-900">Win more games to raise your rating and reach Level {currentLevel + 1}!</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Total XP</span>
              <span className="font-heading font-bold text-amber-700">{totalXP.toLocaleString()} XP</span>
            </div>
            <p className="text-xs text-muted-foreground">XP is used for hints and rewards, not for level. Level is based on rating.</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground">Your Journey Through Chess</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {pieces.map((piece) => (
                <div key={piece.name} className="flex flex-col items-center gap-1.5">
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-all ${piece.status === 'completed' ? 'bg-emerald-100 border-2 border-emerald-500' : piece.status === 'current' ? 'bg-gradient-to-br from-green-100 to-teal-100 border-2 border-green-500 animate-piece-glow' : 'bg-gray-100 border-2 border-gray-300'}`}>
                    <span className={piece.color}>{piece.unicode}</span>
                    {piece.status === 'completed' && <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</div>}
                    {piece.status === 'current' && <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"><span className="text-xs">→</span></div>}
                  </div>
                  <p className="text-center font-heading text-xs font-bold text-card-foreground">{piece.name}</p>
                  <p className="text-center text-[10px] text-muted-foreground">{piece.levels}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-gray-300 rounded-full opacity-60" />
          </div>

          <div className="space-y-3">
            <button onClick={() => setExpandedTab(expandedTab === 'benefits' ? null : 'benefits')} className="w-full rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50 p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <span className="font-heading font-bold text-green-900">When you reach {nextLevelName} (by rating)</span>
                </div>
                <ChevronRight className={`h-5 w-5 transition-transform ${expandedTab === 'benefits' ? 'rotate-90' : ''}`} />
              </div>
              {expandedTab === 'benefits' && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-green-700"><Zap className="h-4 w-4" /> +100 XP bonus</p>
                  <p className="flex items-center gap-2 font-semibold text-green-700"><Trophy className="h-4 w-4" /> New badge: Knight Champion</p>
                  <p className="flex items-center gap-2 font-semibold text-green-700"><Star className="h-4 w-4" /> Unlock 5 new puzzles</p>
                  <p className="flex items-center gap-2 font-semibold text-green-700"><Lock className="h-4 w-4" /> New avatar items available</p>
                </div>
              )}
            </button>

            <button onClick={() => setExpandedTab(expandedTab === 'leaderboard' ? null : 'leaderboard')} className="w-full rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-heading font-bold text-blue-900">Leaderboard</span>
                </div>
                <ChevronRight className={`h-5 w-5 transition-transform ${expandedTab === 'leaderboard' ? 'rotate-90' : ''}`} />
              </div>
              {expandedTab === 'leaderboard' && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-semibold text-blue-700">You&apos;re ranked <span className="font-heading text-lg">#{userRank}</span> in your class</p>
                  <p className="font-semibold text-emerald-600">🚀 {aheadOf} XP ahead of Michael</p>
                  <Link href="/leaderboard" className="mt-2 block w-full rounded-lg bg-blue-500 px-4 py-2 text-center font-bold text-white hover:bg-blue-600">View Full Leaderboard</Link>
                </div>
              )}
            </button>

            <button onClick={() => setExpandedTab(expandedTab === 'quick' ? null : 'quick')} className="w-full rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <span className="font-heading font-bold text-amber-900">Quick ways to earn XP</span>
                </div>
                <ChevronRight className={`h-5 w-5 transition-transform ${expandedTab === 'quick' ? 'rotate-90' : ''}`} />
              </div>
              {expandedTab === 'quick' && (
                <div className="mt-3 grid gap-2">
                  {quickXPOpportunities.map((item) => (
                    <a key={item.activity} href="/puzzles" className="rounded-lg border-2 border-amber-300 bg-white p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="font-semibold text-card-foreground">{item.activity}</span>
                        </div>
                        <span className="font-heading font-bold text-amber-600">+{item.xp}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </button>
          </div>

          <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
            <p className="mb-3 font-heading font-bold text-purple-900">Your Stats</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              <div><p className="text-2xl font-heading font-bold text-purple-600">28h</p><p className="text-xs font-semibold text-muted-foreground">Learning Time</p></div>
              <div><p className="text-2xl font-heading font-bold text-purple-600">156</p><p className="text-xs font-semibold text-muted-foreground">Puzzles Solved</p></div>
              <div><p className="text-2xl font-heading font-bold text-purple-600">42</p><p className="text-xs font-semibold text-muted-foreground">Games Played</p></div>
              <div><p className="text-2xl font-heading font-bold text-purple-600">68%</p><p className="text-xs font-semibold text-muted-foreground">Win Rate</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
