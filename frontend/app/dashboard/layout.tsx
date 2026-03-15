// Dashboard layout: apply v0-dashboard-layout fonts (Fredoka + Nunito) only to this route.
import { Fredoka, Nunito } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${fredoka.variable} ${nunito.variable} dashboard-fonts`}>
      {children}
    </div>
  )
}
