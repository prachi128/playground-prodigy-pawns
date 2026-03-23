'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { adminAPI, type CoachInvite } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Loader2, Plus, Shield } from 'lucide-react';

export default function CoachInvitesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<CoachInvite[]>([]);
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminAPI.listCoachInvites();
      setInvites(rows);
    } catch {
      toast.error('Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    void loadInvites();
  }, [isAuthenticated, user, router, loadInvites]);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Coach email is required');
      return;
    }
    setCreating(true);
    try {
      const created = await adminAPI.createCoachInvite({
        email: email.trim(),
        expires_in_days: Math.max(1, Math.min(60, parseInt(days, 10) || 7)),
      });
      setInvites((prev) => [created, ...prev]);
      await navigator.clipboard.writeText(created.invite_url);
      toast.success('Invite created and copied');
      setEmail('');
      setDays('7');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const revokeInvite = async (id: number) => {
    try {
      await adminAPI.revokeCoachInvite(id);
      setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: false } : i)));
      toast.success('Invite revoked');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to revoke invite');
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success('Invite link copied');
  };

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6">
        <Link
          href="/coach"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="font-heading flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Shield className="h-5 w-5" />
          </span>
          Admin - coach invites
        </h1>
      </div>

      <form onSubmit={createInvite} className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Coach Email Restriction
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="coach@example.com"
              required
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              If set, only this email can use the invite.
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Invite Validity (Days)
            </span>
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="7"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Example: 7 means the invite expires in 7 days.
            </span>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create invite
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Invite</th>
                  <th className="px-4 py-3 text-left font-semibold">Email Restriction</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiry</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {i.token.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{i.email || '-'}</td>
                    <td className="px-4 py-3">
                      {i.used_at ? 'Used' : i.is_active ? 'Active' : 'Revoked'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(i.expires_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => void copyLink(i.invite_url)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/60"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy link
                        </button>
                        {!i.used_at && i.is_active && (
                          <button
                            type="button"
                            onClick={() => void revokeInvite(i.id)}
                            className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invites.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No coach invites yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

