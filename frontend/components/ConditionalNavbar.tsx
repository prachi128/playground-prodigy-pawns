'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

/**
 * Shows the main Navbar only when not on student app routes.
 * Student app routes (dashboard, play, leaderboard) have their own sidebar + header,
 * so we hide the top Navbar there.
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Routes that use the dashboard theme (sidebar + header) — only Dashboard header is used on these
  const studentAppRoutes = ['/dashboard', '/play', '/leaderboard', '/adventure', '/learn', '/progress', '/settings', '/puzzles', '/chess-game', '/profile', '/beat-the-bot'];
  
  if (studentAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  
  return <Navbar />;
}
