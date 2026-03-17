'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BurgerCollector } from '@/components/learn/BurgerCollector'
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

export default function BurgerCollectorPiecePage() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params.piece === 'string' ? params.piece.toLowerCase() : ''
  const pieceType = SLUG_TO_PIECE[slug]

  useEffect(() => {
    if (slug && !pieceType) {
      router.replace('/learn/burger-collector')
    }
  }, [slug, pieceType, router])

  if (!slug || !pieceType) {
    return null
  }

  return (
    <BurgerCollector
      pieceType={pieceType}
      onAllComplete={() => {
        toast.success('All levels complete! +50 coins, +100 XP saved. 🍔')
        router.push('/learn/burger-collector')
      }}
    />
  )
}
