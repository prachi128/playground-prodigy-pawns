"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StarShopPreview } from "@/components/dashboard/star-shop"

export default function StarShopPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  useEffect(() => {
    useAuthStore.getState().loadSession()
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-600" />
          <p className="font-semibold text-gray-600">Loading Star Shop…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="pb-10 pt-2">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Home
        </Link>
        <header className="mb-6 text-center sm:text-left">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-card-foreground">Star Shop</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Turn XP into stars, then collect accessories, board themes, trails, and companions. What you equip shows up on your avatar and in your games.
          </p>
        </header>
        <StarShopPreview mode="full" />
      </div>
    </DashboardLayout>
  )
}
