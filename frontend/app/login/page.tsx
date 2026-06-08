// app/login/page.tsx - Login Page (Student username vs Parent/Coach email)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Sparkles, Loader2, Zap, Eye, EyeOff } from 'lucide-react';
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
      {isLoading && (
        <div
          className="absolute inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
          style={{
            backgroundColor: '#9dc4b8',
            backgroundImage:
              'linear-gradient(to bottom right, rgba(167, 243, 208, 0.9), rgba(196, 181, 253, 0.8), rgba(191, 219, 254, 0.9))',
          }}
        >
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="text-8xl animate-bounce" style={{ animationDuration: '1s' }}>
                ♟️
              </div>
              <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">Logging you in...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400" />
            <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Prodigy Pawns
            </h1>
            <Sparkles className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-muted-foreground text-lg">Welcome back! ♟️</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border-2 border-border">
          <div className="flex rounded-xl bg-white/20 p-1 mb-6 border-2 border-border">
            <button
              type="button"
              onClick={() => {
                setMode('student');
                setInlineError('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-heading font-bold transition ${
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
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-heading font-bold transition ${
                mode === 'parent_coach'
                  ? 'bg-card text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Parent / Coach
            </button>
          </div>

          <h2 className="font-heading text-2xl font-bold text-card-foreground mb-6 text-center">
            Log In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inlineError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {inlineError}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-heading font-semibold text-foreground mb-2">
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
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50"
                placeholder={mode === 'student' ? 'your_username' : 'your@email.com'}
                autoComplete={mode === 'student' ? 'username' : 'email'}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href={`/forgot-password?type=${mode === 'student' ? 'student' : 'parent_coach'}`}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition"
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
                  className="w-full px-4 py-3 pr-12 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 shadow-md transition disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Log In 🚀'}
            </button>
          </form>

          {mode === 'student' && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border-2 border-border">
              <p className="text-xs font-heading font-semibold text-muted-foreground mb-2">Quick test login:</p>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('alice_chess');
                  setPassword('password123');
                }}
                disabled={isLoading}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                Use Alice&apos;s account (username) →
              </button>
            </div>
          )}

          <p className="text-center text-muted-foreground mt-6">
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
