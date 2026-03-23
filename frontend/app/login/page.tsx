// app/login/page.tsx - Login Page (matches student dashboard theme)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);
      login(response.user);
      setTimeout(() => {
        toast.success(`Welcome back, ${response.user.full_name}! 🎉`);
      }, 100);
      const redirectPath = response.user.role === 'coach' || response.user.role === 'admin'
        ? '/coach'
        : response.user.role === 'parent'
        ? '/parent'
        : '/dashboard';
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} dashboard-fonts min-h-screen flex items-center justify-center p-4 relative`}
      style={{
        backgroundColor: '#9dc4b8',
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.2) 1.5px, transparent 0),
          radial-gradient(circle at 1px 1px, rgba(30, 64, 175, 0.08) 1px, transparent 0),
          linear-gradient(to bottom right, rgba(167, 243, 208, 0.85), rgba(196, 181, 253, 0.75), rgba(191, 219, 254, 0.85))
        `,
        backgroundSize: '32px 32px, 24px 24px, 100% 100%',
        backgroundPosition: '0 0, 12px 12px, 0 0',
      }}
    >
      {/* Full-page loader overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
          style={{
            backgroundColor: '#9dc4b8',
            backgroundImage: 'linear-gradient(to bottom right, rgba(167, 243, 208, 0.9), rgba(196, 181, 253, 0.8), rgba(191, 219, 254, 0.9))',
          }}
        >
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="text-8xl animate-bounce" style={{ animationDuration: '1s' }}>
                ♟️
              </div>
              <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-amber-400 animate-pulse" style={{ animationDelay: '0s' }} />
              <Sparkles className="absolute -top-2 -right-6 w-6 h-6 text-emerald-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <Sparkles className="absolute -bottom-2 -left-6 w-7 h-7 text-primary-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
              <Sparkles className="absolute -bottom-4 -right-4 w-8 h-8 text-orange-400 animate-pulse" style={{ animationDelay: '0.9s' }} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-heading text-2xl font-bold text-foreground">
                Logging you in...
              </p>
              <p className="text-lg text-muted-foreground font-semibold animate-pulse">
                Get ready to play! 🎮
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md">
        {/* Logo/Title - matches dashboard header gradient feel */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400" />
            <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Prodigy Pawns
            </h1>
            <Sparkles className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-muted-foreground text-lg">
            Welcome back, young chess master! ♟️
          </p>
        </div>

        {/* Login Card - dashboard card style (bg-card, border-border, rounded-xl) */}
        <div className="bg-card rounded-2xl shadow-xl p-8 border-2 border-border">
          <h2 className="font-heading text-2xl font-bold text-card-foreground mb-6 text-center">
            Log In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-heading font-semibold text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit - same gradient as dashboard header */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 shadow-md hover:shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Log In 🚀'
              )}
            </button>
          </form>

          {/* Quick Login - dashboard muted style */}
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border-2 border-border">
            <p className="text-xs font-heading font-semibold text-muted-foreground mb-2">Quick Test Login:</p>
            <button
              onClick={() => {
                setEmail('alice@prodigypawns.com');
                setPassword('password123');
              }}
              disabled={isLoading}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Alice&apos;s Account →
            </button>
          </div>

          <p className="text-center text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-heading font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
