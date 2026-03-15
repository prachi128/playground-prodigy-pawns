'use client'

import { X, ChevronLeft } from "lucide-react"
import { AdventureMap } from "./adventure-map"

interface QuestMapModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QuestMapModal({ isOpen, onClose }: QuestMapModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-600 transition-all hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label="Close map"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-amber-200 bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4 shadow-sm">
            <button
              onClick={onClose}
              className="mb-2 flex items-center gap-2 font-heading text-sm font-bold text-white transition-all hover:gap-3"
            >
              <ChevronLeft className="h-5 w-5" />
              Collapse Map
            </button>
            <h2 className="font-heading text-2xl font-bold text-white">
              Full Adventure Map
            </h2>
            <p className="text-sm font-bold text-white/80">
              Explore your complete learning journey
            </p>
          </div>

          {/* Map content */}
          <div className="p-6">
            <AdventureMap />
          </div>
        </div>
      </div>
    </>
  )
}
