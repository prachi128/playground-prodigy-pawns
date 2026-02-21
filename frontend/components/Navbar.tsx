// components/Navbar.tsx - Navigation Bar

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Trophy, Sparkles, LogOut, User, Puzzle, Home, LogIn, UserPlus } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Don't show navbar on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/puzzles', label: 'Puzzles', icon: Puzzle },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  // On landing page, only show nav items if user is authenticated
  const isLandingPage = pathname === '/';
  const showNavItems = !isLandingPage || isAuthenticated;

  // Logo target:
  // - Not logged in: landing page
  // - Logged in student: student dashboard
  // - Logged in coach/admin: coach dashboard
  const logoHref = !isAuthenticated
    ? '/'
    : user?.role === 'coach' || user?.role === 'admin'
      ? '/coach'
      : '/dashboard';

  return (
    <nav className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={logoHref} className="flex items-center gap-2 group">
            <Sparkles className="w-8 h-8 text-yellow-300 group-hover:animate-spin" />
            <span className="font-heading text-2xl font-bold text-white">
              Prodigy Pawns
            </span>
          </Link>

          {/* Navigation Links */}
          {showNavItems && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-emerald-700 shadow-lg'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === 'coach' || user?.role === 'admin' ? (
                <Link
                  href="/coach"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold transition-all ${
                    pathname === '/coach'
                      ? 'bg-white text-emerald-700 shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  👨‍🏫 Coach
                </Link>
              ) : null}
            </div>
          )}

          {/* User Menu / Auth Links */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              {/* XP and Level Badge */}
              <div className="hidden sm:flex items-center gap-3 bg-white/20 px-4 py-2 rounded-2xl">
                <div className="text-right">
                  <p className="text-xs text-white/80 font-heading font-medium">Level {user.level}</p>
                  <p className="text-sm text-white font-heading font-bold">{user.total_xp} XP</p>
                </div>
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-heading font-bold text-emerald-800 text-lg shadow-lg">
                  {user.level}
                </div>
              </div>

              {/* User Dropdown */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-heading font-semibold text-white">{user.full_name}</p>
                  <p className="text-xs text-white/80">@{user.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-heading font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold text-white hover:bg-white/20 transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span className="hidden sm:inline">Login</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl font-heading font-semibold shadow-lg hover:bg-white/90 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Sign up</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        {showNavItems && (
          <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-lg'
                      : 'text-white bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'coach' || user?.role === 'admin' ? (
              <Link
                href="/coach"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold whitespace-nowrap transition-all ${
                  pathname === '/coach'
                    ? 'bg-white text-emerald-700 shadow-lg'
                    : 'text-white bg-white/10'
                }`}
              >
                👨‍🏫 Coach
              </Link>
            ) : null}
          </div>
        )}
        {/* Mobile Auth Links (shown on landing page when not authenticated) */}
        {isLandingPage && !isAuthenticated && (
          <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold whitespace-nowrap text-white bg-white/10"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-semibold whitespace-nowrap bg-white text-emerald-700 shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
