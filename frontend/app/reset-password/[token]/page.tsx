'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Sparkles } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params?.token || '');

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authAPI.validateResetPasswordToken(token);
        if (cancelled) return;
        setMaskedEmail(data.email);
      } catch (err: unknown) {
        if (cancelled) return;
        const detail =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : undefined;
        setTokenError(detail || 'Invalid or expired reset link');
      } finally {
        if (!cancelled) setLoadingToken(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');

    if (!password || !confirmPassword) {
      const msg = 'Please fill in all required fields.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.resetPassword(token, password);
      toast.success(response.message);
      router.push('/login');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      const fallback = 'Could not reset password. Please try again.';
      setInlineError(detail || fallback);
      toast.error(detail || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} dashboard-fonts min-h-screen flex items-center justify-center p-4`}
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400" />
            <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Torus Chess
            </h1>
            <Sparkles className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border-2 border-border">
          {loadingToken ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p>Verifying reset link...</p>
            </div>
          ) : tokenError ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-card-foreground">Link expired</h2>
              <p className="text-muted-foreground">{tokenError}</p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 font-heading font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-card-foreground mb-2 text-center">
                Choose a new password
              </h2>
              {maskedEmail && (
                <p className="text-center text-muted-foreground text-sm mb-6">
                  Resetting password for <span className="font-semibold text-foreground">{maskedEmail}</span>
                </p>
              )}

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
                  <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground mb-2">
                    New password
                  </label>
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
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
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

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-heading font-semibold text-foreground mb-2"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (inlineError) setInlineError('');
                    }}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50"
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 shadow-md transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>

              <p className="text-center text-muted-foreground mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-heading font-semibold text-emerald-600 hover:text-emerald-700 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
