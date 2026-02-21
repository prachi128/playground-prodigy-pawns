'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { StarCollector } from '@/components/learn/StarCollector'
import toast from 'react-hot-toast'
import type { PieceTypeCode } from '@/lib/data/basics-levels'

const SLUG_TO_PIECE: Record<string, PieceTypeCode> = {
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  queen: 'q',
  king: 'k',
  pawn: 'p',
}

export default function StarCollectorPiecePage() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params.piece === 'string' ? params.piece.toLowerCase() : ''
  const pieceType = SLUG_TO_PIECE[slug]

  useEffect(() => {
    if (slug && !pieceType) {
      router.replace('/learn/star-collector')
    }
  }, [slug, pieceType, router])

  if (!slug || !pieceType) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <Link
        href="/learn/star-collector"
        className="mb-4 font-heading text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        ← Choose another piece
      </Link>
      <StarCollector
        pieceType={pieceType}
        onAllComplete={() => {
          toast.success('All levels complete! +50 coins, +100 XP saved.')
          router.push('/learn/star-collector')
        }}
      />
    </div>
  )
}
