"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AdventureMap } from "@/components/dashboard/adventure-map"

export default function AdventurePage() {
  return (
    <DashboardLayout>
      <AdventureMap />
    </DashboardLayout>
  )
}
