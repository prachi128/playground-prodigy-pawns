'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

/**
 * Shows the main Navbar only when not on the student dashboard.
 * The dashboard has its own sidebar + header, so we hide the top Navbar there.
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  return <Navbar />;
}
