// app/login/page.tsx - Split layout, single viewport (no scroll)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

type LoginMode = 'student' | 'parent_coach';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [mode, setMode] = useState<LoginMode>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');

    if (!identifier || !password) {
      const msg = 'Please fill in all required fields.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login(identifier.trim(), password);
      login(response.user);
      setTimeout(() => {
        toast.success(`Welcome back, ${response.user.full_name}! 🎉`);
      }, 100);
      const redirectPath =
        response.user.role === 'coach' || response.user.role === 'admin'
          ? '/coach/play'
          : response.user.role === 'parent'
            ? '/parent'
            : '/dashboard';
      router.push(redirectPath);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      const fallback = 'Login failed. Please try again.';
      setInlineError(msg || fallback);
      toast.error(msg || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} dashboard-fonts h-dvh overflow-hidden flex relative`}
    >
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-sm z-50 flex items-center justify-center bg-background/60">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mx-auto" />
            <p className="font-heading text-lg font-bold text-foreground">Logging you in...</p>
          </div>
        </div>
      )}

      {/* Left — chess graphic */}
      <div className="hidden md:flex md:w-[42%] lg:w-1/2 h-full min-h-0 relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 shrink-0">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.15) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.15) 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
          }}
        />
        <div className="relative z-10 flex flex-col h-full min-h-0 p-6 lg:p-8">
          <div className="flex gap-2 text-2xl lg:text-3xl opacity-90 shrink-0">
            <span>♜</span>
            <span>♞</span>
            <span>♝</span>
            <span>♛</span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center py-4">
            <div className="relative w-full max-w-[280px] lg:max-w-xs aspect-square max-h-[min(42vh,320px)]">
              <Image
                src="/images/play-chess.jpg"
                alt="Kids playing chess"
                fill
                className="object-cover rounded-2xl shadow-2xl"
                priority
                sizes="(max-width: 1024px) 42vw, 50vw"
              />
              <div className="absolute -bottom-2 -right-2 text-5xl lg:text-6xl drop-shadow-lg">♟️</div>
              <div className="absolute -top-1 -left-1 text-4xl lg:text-5xl drop-shadow-lg">♚</div>
            </div>
          </div>

          <div className="text-white shrink-0">
            <p className="font-heading text-xl lg:text-2xl font-bold leading-snug">
              Every move is a new adventure.
            </p>
            <p className="mt-1.5 text-emerald-100 text-sm lg:text-base">
              Puzzles, bots, and real games — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 h-full min-h-0 min-w-0 flex items-center justify-center px-5 py-4 sm:px-8 bg-background overflow-hidden">
        <div className="w-full max-w-sm">
          <div className="mb-4 sm:mb-5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Log in</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {mode === 'student'
                ? 'Use your username and password.'
                : 'Use your email and password.'}
            </p>
          </div>

          <div className="flex rounded-lg bg-muted/50 p-1 mb-4 border border-border">
            <button
              type="button"
              onClick={() => {
                setMode('student');
                setInlineError('');
              }}
              className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-heading font-bold transition ${
                mode === 'student'
                  ? 'bg-card text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Student
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('parent_coach');
                setInlineError('');
              }}
              className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-heading font-bold transition ${
                mode === 'parent_coach'
                  ? 'bg-card text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Parent / Coach
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {inlineError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {inlineError}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-heading font-semibold text-foreground mb-1">
                {mode === 'student' ? 'Username' : 'Email'}
              </label>
              <input
                id="identifier"
                type={mode === 'student' ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (inlineError) setInlineError('');
                }}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                placeholder={mode === 'student' ? 'your_username' : 'your@email.com'}
                autoComplete={mode === 'student' ? 'username' : 'email'}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href={`/forgot-password?type=${mode === 'student' ? 'student' : 'parent_coach'}`}
                  className="text-xs sm:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (inlineError) setInlineError('');
                  }}
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 pr-10 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-2.5 px-5 rounded-lg hover:from-emerald-700 hover:to-green-600 shadow-md transition disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-heading font-semibold text-emerald-600 hover:text-emerald-700">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
