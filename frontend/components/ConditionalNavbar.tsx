'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

/**
 * Shows the main Navbar only when not on student or coach app routes.
 * Student routes use their own sidebar + header; coach routes use the coach header only.
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Routes that use the dashboard theme (sidebar + header)
  const studentAppRoutes = ['/dashboard', '/play', '/leaderboard', '/adventure', '/learn', '/progress', '/settings', '/puzzles', '/chess-game', '/profile', '/beat-the-bot'];
  // Coach app has its own header — hide main Navbar there too
  const coachAppRoutes = ['/coach'];

  if (studentAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  if (coachAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  
  return <Navbar />;
}
