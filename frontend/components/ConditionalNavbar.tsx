'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

/**
 * Shows the main Navbar only when not on student, coach, or parent app routes.
 * Student/coach/parent route groups render their own app chrome.
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Routes that use the dashboard theme (sidebar + header)
  const studentAppRoutes = ['/dashboard', '/play', '/leaderboard', '/adventure', '/learn', '/progress', '/settings', '/puzzles', '/assignments', '/chess-game', '/profile', '/beat-the-bot'];
  // Hide main Navbar on all coach-group routes
  const coachAppRoutes = ['/coach', '/admin'];
  // Hide main Navbar on all parent-group routes
  const parentAppRoutes = ['/parent'];

  if (studentAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  if (coachAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  if (parentAppRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }
  
  return <Navbar />;
}
