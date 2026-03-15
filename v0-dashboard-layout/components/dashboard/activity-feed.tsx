'use client'

import { useState, useCallback } from 'react'
import { Swords, Target, BookOpen, Trophy, ChevronRight, Share2, RotateCcw, ArrowRight } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'game' | 'puzzle' | 'lesson' | 'achievement'
  title: string
  subtitle?: string
  timestamp: string
  badge: string
  badgeColor: string
  xp: number
  action: string
  actionUrl: string
  icon: React.ReactNode
  stats?: string
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'achievement',
    title: '7-Day Streak!',
    subtitle: 'Consistent learner',
    timestamp: '2 min ago',
    badge: 'Achieved! 🏆',
    badgeColor: 'bg-amber-100 text-amber-700',
    xp: 50,
    action: 'Share',
    actionUrl: '#',
    icon: <Trophy className="h-8 w-8 text-amber-500" />,
  },
  {
    id: '2',
    type: 'game',
    title: 'You beat ChessWhiz42!',
    subtitle: 'Rapid match',
    timestamp: '15 min ago',
    badge: 'Won! 🎉',
    badgeColor: 'bg-green-100 text-green-700',
    xp: 25,
    action: 'View Game',
    actionUrl: '#',
    icon: <Swords className="h-8 w-8 text-orange-500" />,
    stats: 'Checkmate in 8 moves',
  },
  {
    id: '3',
    type: 'puzzle',
    title: 'Knight Fork Puzzle #4821',
    timestamp: '42 min ago',
    badge: 'Solved! ⭐',
    badgeColor: 'bg-blue-100 text-blue-700',
    xp: 10,
    action: 'Try Similar',
    actionUrl: '#',
    icon: <Target className="h-8 w-8 text-cyan-500" />,
    stats: 'In 1:23 • 1 attempt',
  },
  {
    id: '4',
    type: 'lesson',
    title: 'Meet the Bishop',
    subtitle: 'Lesson 3 of 5',
    timestamp: '1h ago',
    badge: 'Complete! 🎓',
    badgeColor: 'bg-purple-100 text-purple-700',
    xp: 40,
    action: 'Next Lesson',
    actionUrl: '#',
    icon: <BookOpen className="h-8 w-8 text-purple-500" />,
    stats: 'In "The Pieces"',
  },
]

export function ActivityFeed() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [activities, setActivities] = useState(mockActivities)
  const [loadingMore, setLoadingMore] = useState(false)

  const filters = ['All', 'Games', 'Puzzles', 'Lessons', 'Achievements']

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true)
    await new Promise(resolve => setTimeout(resolve, 600))
    setLoadingMore(false)
  }, [])

  const filteredActivities = activities.filter(activity => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Games') return activity.type === 'game'
    if (activeFilter === 'Puzzles') return activity.type === 'puzzle'
    if (activeFilter === 'Lessons') return activity.type === 'lesson'
    if (activeFilter === 'Achievements') return activity.type === 'achievement'
    return true
  })

  return (
    <section className="mb-6">
      <div className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-card shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-4">
          <h3 className="font-heading text-2xl font-bold text-white">Recent Adventures 📜</h3>
          <p className="text-xs font-semibold text-white/80">Your latest achievements and activities</p>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 p-4 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-4 py-2 font-bold transition-all ${
                activeFilter === filter
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Activity items */}
        <div className="divide-y divide-gray-100 p-4">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, idx) => (
              <div
                key={activity.id}
                className="animate-activity-slide-in flex items-start gap-4 py-4 transition-all hover:bg-gray-50 rounded-lg px-2"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100">
                  {activity.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-base font-bold text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold animate-badge-flip ${activity.badgeColor}`}>
                      {activity.badge}
                    </span>
                  </div>
                  
                  {activity.subtitle && (
                    <p className="text-sm font-semibold text-gray-500">{activity.subtitle}</p>
                  )}
                  
                  {activity.stats && (
                    <p className="text-xs font-semibold text-gray-500 mt-1">{activity.stats}</p>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                </div>

                {/* XP + Action */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5">
                    <span className="font-heading font-bold text-amber-700">+{activity.xp}</span>
                    <span className="text-sm text-amber-600">XP</span>
                  </div>
                  
                  <button className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200 transition-colors">
                    {activity.action === 'Share' ? (
                      <>
                        <Share2 className="h-3 w-3" />
                        {activity.action}
                      </>
                    ) : activity.action === 'Try Similar' ? (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        {activity.action}
                      </>
                    ) : (
                      <>
                        {activity.action}
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="text-5xl">🎯</div>
              <p className="font-heading text-lg font-bold text-gray-900">Ready for a new adventure?</p>
              <p className="text-sm text-gray-600 max-w-xs">Start with today's puzzle or challenge another player!</p>
              <button className="mt-2 rounded-lg bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600 transition-colors">
                Start Playing!
              </button>
            </div>
          )}
        </div>

        {/* Load more button */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-300 py-3 font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <div className="animate-spinner h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Loading...
              </>
            ) : (
              <>
                <ChevronRight className="h-5 w-5" />
                Load More Activities
              </>
            )}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">Showing {filteredActivities.length} of 156 activities</p>
        </div>
      </div>
    </section>
  )
}
