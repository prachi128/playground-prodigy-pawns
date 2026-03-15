'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { useOnboarding } from '@/hooks/use-onboarding'

interface HelpTooltipProps {
  id: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function HelpTooltip({ id, title, content, position = 'top' }: HelpTooltipProps) {
  const { state, markTooltipSeen } = useOnboarding()
  const [isOpen, setIsOpen] = useState(!state.tooltipsSeen.has(id))
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleGotIt = () => {
    markTooltipSeen(id)
    setIsOpen(false)
  }

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  if (!isOpen) return null

  return (
    <div className="group relative inline-block">
      <button className="rounded-full bg-blue-500 p-1 text-white transition-transform hover:scale-110" aria-label="Help">
        <HelpCircle className="h-4 w-4" />
      </button>
      <div className={`absolute z-40 w-64 rounded-lg bg-white p-4 shadow-lg ${positionClasses[position]} opacity-0 transition-opacity group-hover:opacity-100`}>
        <div className="mb-2 flex items-start justify-between">
          <h3 className="font-heading font-bold text-gray-800">{title}</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600">{content}</p>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="h-3 w-3" />
            Don&apos;t show again
          </label>
          <button onClick={handleGotIt} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-green-500">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
