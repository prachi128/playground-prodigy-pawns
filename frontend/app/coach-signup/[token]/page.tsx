'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, ShieldCheck, Sparkles, Lock } from 'lucide-react';

export default function CoachInviteSignupPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const token = String(params?.token || '');

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authAPI.getCoachInvite(token);
        if (cancelled) return;
        setInviteEmail(data.email);
        setExpiresAt(data.expires_at);
      } catch (err: unknown) {
        if (cancelled) return;
        const detail =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : undefined;
        setInviteError(detail || 'Invalid or expired invite link');
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (!form.full_name.trim() || !form.username.trim() || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const response = await authAPI.signupCoach({
        email: inviteEmail,
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
        invite_token: token,
      });
      login(response.user);
      toast.success('Coach account created');
      router.push('/coach');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border border-border bg-card px-8 py-10 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading invite…</p>
          </div>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-bold text-destructive">Invite not valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">{inviteError}</p>
          <Link href="/login" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-coach-shell className="coach-fonts min-h-screen bg-[hsl(var(--gray-light))]">
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-8 py-6">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-bold text-foreground">Coach invite signup</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete your profile to activate your coach account.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Invite expires: {new Date(expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-5 rounded-xl border border-border bg-muted/35 p-3">
              <div className="flex items-start gap-2.5 text-sm">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  This invite is tied to one email and can be used only once.
                </p>
              </div>
            </div>

          <div className="mb-6 text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use these details to sign in to the coach console.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="coach_username"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Email *</label>
              <input
                type="email"
                value={inviteEmail}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-border bg-muted px-4 py-3 text-muted-foreground"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Password * (min 6)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Creating account...' : 'Sign up as coach'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}

