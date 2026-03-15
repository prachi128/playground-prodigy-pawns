import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito } from 'next/font/google'

import './globals.css'

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Prodigy Pawns | Chess Academy for Kids',
  description: 'Learn chess the fun way with interactive lessons, puzzles, and games designed for kids ages 5-15.',
}

export const viewport: Viewport = {
  themeColor: '#4CAF50',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
