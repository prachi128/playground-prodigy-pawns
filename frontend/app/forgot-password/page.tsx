'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Mail, Sparkles } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError('');

    if (!email.trim()) {
      const msg = 'Please enter your email address.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.trim());
      setSubmitted(true);
      toast.success(response.message);
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      const fallback = 'Something went wrong. Please try again.';
      setInlineError(msg || fallback);
      toast.error(msg || fallback);
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
              Prodigy Pawns
            </h1>
            <Sparkles className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-muted-foreground text-lg">Forgot your password? No worries!</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border-2 border-border">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Mail className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-card-foreground">Check your email</h2>
              <p className="text-muted-foreground">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>,
                we&apos;ve sent password reset instructions. The link expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-heading font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-card-foreground mb-2 text-center">
                Reset password
              </h2>
              <p className="text-center text-muted-foreground text-sm mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

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
                  <label htmlFor="email" className="block text-sm font-heading font-semibold text-foreground mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (inlineError) setInlineError('');
                    }}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50"
                    placeholder="your@email.com"
                    required
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
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
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
