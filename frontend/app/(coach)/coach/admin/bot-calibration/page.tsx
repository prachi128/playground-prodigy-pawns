'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, CheckCircle2, Loader2, PlayCircle, RefreshCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { adminBotsAPI, type BotCalibrationRunRow, type BotCoverageRow, type BotProfileRow } from '@/lib/api';

type RunMode = '50' | '80';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d';

function parseSummary(summaryJson?: string | null): Record<string, unknown> | null {
  if (!summaryJson) return null;
  try {
    const v = JSON.parse(summaryJson);
    return typeof v === 'object' && v ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export default function AdminBotCalibrationPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<BotProfileRow[]>([]);
  const [coverage50, setCoverage50] = useState<Record<string, BotCoverageRow>>({});
  const [coverage80, setCoverage80] = useState<Record<string, BotCoverageRow>>({});
  const [lastRunByBot, setLastRunByBot] = useState<Record<string, BotCalibrationRunRow>>({});
  const [runHistory, setRunHistory] = useState<BotCalibrationRunRow[]>([]);
  const [busyBotId, setBusyBotId] = useState<string | null>(null);
  const [historyFilterBotId, setHistoryFilterBotId] = useState<string>('all');
  const [historyDateRange, setHistoryDateRange] = useState<DateRangeFilter>('all');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [profileRows, cov50, cov80, recentRuns] = await Promise.all([
        adminBotsAPI.listProfiles(),
        adminBotsAPI.getCalibrationCoverage(50),
        adminBotsAPI.getCalibrationCoverage(80),
        adminBotsAPI.listRecentCalibrationRuns({ limit: 100 }),
      ]);
      setProfiles(profileRows);
      setCoverage50(Object.fromEntries((cov50.rows || []).map((r) => [r.bot_id, r])));
      setCoverage80(Object.fromEntries((cov80.rows || []).map((r) => [r.bot_id, r])));
      setRunHistory(recentRuns.runs || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bot calibration data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    load();
  }, [isAuthenticated, user, router, load]);

  const runCalibration = async (profile: BotProfileRow, mode: RunMode) => {
    const minSamples = mode === '50' ? 50 : 80;
    setBusyBotId(profile.bot_id);
    try {
      const created = await adminBotsAPI.createCalibrationRun({
        profile_version_id: null,
        run_type: mode === '50' ? 'live_sample' : 'benchmark',
      });
      const executed = await adminBotsAPI.executeCalibrationRun(created.id, {
        target_rating: profile.target_rating,
        sample_source: 'games',
        games_scope: 'persona',
        min_samples: minSamples,
        tolerance: 75,
        games_limit: 5000,
      });
      setLastRunByBot((prev) => ({ ...prev, [profile.bot_id]: executed }));
      const verdict = executed.acceptance_passed ? 'passed' : 'did not pass yet';
      toast.success(`${profile.display_name} calibration ${verdict} (${minSamples} sample gate)`);
      await load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Calibration run failed';
      toast.error(detail);
    } finally {
      setBusyBotId(null);
    }
  };

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.target_rating - b.target_rating),
    [profiles]
  );
  const profileVersionToBotId = useMemo(() => {
    const out: Record<number, string> = {};
    for (const r of runHistory) {
      const summary = parseSummary(r.summary_json);
      const sourceMeta = (summary?.source_meta ?? {}) as Record<string, unknown>;
      const maybeBot = sourceMeta?.bot_id;
      if (typeof maybeBot === 'string' && r.profile_version_id) {
        out[r.profile_version_id] = maybeBot;
      }
    }
    return out;
  }, [runHistory]);
  const recentHistoryRows = useMemo(() => runHistory.slice(0, 20), [runHistory]);
  const filteredHistoryRows = useMemo(() => {
    const now = Date.now();
    const withDateRange = recentHistoryRows.filter((r) => {
      if (historyDateRange === 'all') return true;
      const createdAtMs = new Date(r.created_at).getTime();
      if (!Number.isFinite(createdAtMs)) return false;
      const days = historyDateRange === '7d' ? 7 : historyDateRange === '30d' ? 30 : 90;
      return createdAtMs >= now - days * 24 * 60 * 60 * 1000;
    });
    if (historyFilterBotId === 'all') return withDateRange;
    return withDateRange.filter((r) => {
      const summary = parseSummary(r.summary_json);
      const botFromSummary = (summary?.bot_id as string | undefined) || ((summary?.source_meta as Record<string, unknown> | undefined)?.bot_id as string | undefined);
      return (botFromSummary || '').toLowerCase() === historyFilterBotId.toLowerCase();
    });
  }, [recentHistoryRows, historyFilterBotId, historyDateRange]);

  const copySummaryJson = async (run: BotCalibrationRunRow) => {
    const payload = run.summary_json || '{}';
    try {
      await navigator.clipboard.writeText(payload);
      toast.success(`Copied summary for run #${run.id}`);
    } catch {
      toast.error('Failed to copy summary');
    }
  };

  const copyCompactReport = async (run: BotCalibrationRunRow) => {
    const summary = parseSummary(run.summary_json);
    const sourceMeta = (summary?.source_meta as Record<string, unknown> | undefined) || {};
    const botId =
      (summary?.bot_id as string | undefined) ||
      (sourceMeta.bot_id as string | undefined) ||
      'unknown';
    const samples = typeof summary?.calibration_samples === 'number' ? summary.calibration_samples : 'n/a';
    const target = typeof summary?.target_rating === 'number' ? summary.target_rating : 'n/a';
    const ci = `${run.confidence_low ?? '-'} to ${run.confidence_high ?? '-'}`;
    const verdict = run.acceptance_passed ? 'PASS' : 'NOT PASS';
    const text = [
      `Bot calibration report`,
      `Run ID: ${run.id}`,
      `Bot: ${botId}`,
      `Type: ${run.run_type}`,
      `Target rating: ${target}`,
      `Estimated rating: ${run.estimated_rating ?? '-'}`,
      `Confidence interval: ${ci}`,
      `Samples: ${samples}`,
      `Verdict: ${verdict}`,
      `Created: ${new Date(run.created_at).toLocaleString()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied compact report for run #${run.id}`);
    } catch {
      toast.error('Failed to copy compact report');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading bot calibration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6">
        <Link href="/coach" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="font-heading flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Bot className="h-5 w-5" />
          </span>
          Admin - Bot calibration
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          Run 50-game directional checks and 80-game confidence checks. This page uses completed in-app bot games and calls the admin calibration endpoints.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          Refresh data
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Bot</th>
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Games (50 gate)</th>
                <th className="px-4 py-3 text-left font-semibold">Games (80 gate)</th>
                <th className="px-4 py-3 text-left font-semibold">Latest result</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((p) => {
                const c50 = coverage50[p.bot_id];
                const c80 = coverage80[p.bot_id];
                const run = lastRunByBot[p.bot_id];
                const summary = parseSummary(run?.summary_json);
                const samples = typeof summary?.calibration_samples === 'number' ? (summary.calibration_samples as number) : null;
                const busy = busyBotId === p.bot_id;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">{p.bot_id}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{p.target_rating}</td>
                    <td className="px-4 py-3">
                      {c50 ? (
                        <span className={c50.ready ? 'text-emerald-600' : 'text-amber-600'}>
                          {c50.finished_games} {c50.ready ? '(ready)' : `(${c50.remaining_to_target} left)`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c80 ? (
                        <span className={c80.ready ? 'text-emerald-600' : 'text-amber-600'}>
                          {c80.finished_games} {c80.ready ? '(ready)' : `(${c80.remaining_to_target} left)`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!run ? (
                        <span className="text-xs text-muted-foreground">No run yet</span>
                      ) : (
                        <div className="text-xs">
                          <p className="font-medium">
                            {run.estimated_rating ?? '-'} ({run.confidence_low ?? '-'} to {run.confidence_high ?? '-'})
                          </p>
                          <p className="text-muted-foreground">samples: {samples ?? '-'}</p>
                          <p className={`inline-flex items-center gap-1 ${run.acceptance_passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {run.acceptance_passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {run.acceptance_passed ? 'Pass' : 'Not passed'}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runCalibration(p, '50')}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          Run 50-game check
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runCalibration(p, '80')}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/50 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          Run 80-game check
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedProfiles.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No bot profiles found. Create profiles first in admin bots API.</p>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent calibration runs</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label htmlFor="history-bot-filter" className="text-muted-foreground">Bot:</label>
            <select
              id="history-bot-filter"
              value={historyFilterBotId}
              onChange={(e) => setHistoryFilterBotId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All bots</option>
              {sortedProfiles.map((p) => (
                <option key={p.bot_id} value={p.bot_id}>
                  {p.display_name} ({p.bot_id})
                </option>
              ))}
            </select>
            <label htmlFor="history-date-filter" className="ml-2 text-muted-foreground">Range:</label>
            <select
              id="history-date-filter"
              value={historyDateRange}
              onChange={(e) => setHistoryDateRange(e.target.value as DateRangeFilter)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Run ID</th>
                <th className="px-4 py-3 text-left font-semibold">Bot</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Estimate</th>
                <th className="px-4 py-3 text-left font-semibold">Samples</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryRows.map((r) => {
                const summary = parseSummary(r.summary_json);
                const samples = typeof summary?.calibration_samples === 'number' ? (summary.calibration_samples as number) : '-';
                const botId =
                  ((summary?.source_meta as Record<string, unknown> | undefined)?.bot_id as string | undefined) ||
                  (r.profile_version_id ? profileVersionToBotId[r.profile_version_id] : undefined) ||
                  '-';
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">#{r.id}</td>
                    <td className="px-4 py-3">{botId}</td>
                    <td className="px-4 py-3">{r.run_type}</td>
                    <td className="px-4 py-3">
                      {r.estimated_rating ?? '-'} ({r.confidence_low ?? '-'} to {r.confidence_high ?? '-'})
                    </td>
                    <td className="px-4 py-3">{samples}</td>
                    <td className="px-4 py-3">
                      <span className={r.acceptance_passed ? 'text-emerald-600' : 'text-rose-600'}>
                        {r.acceptance_passed ? 'Pass' : r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void copyCompactReport(r)}
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          Copy compact report
                        </button>
                        <button
                          type="button"
                          onClick={() => void copySummaryJson(r)}
                          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          Copy summary JSON
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredHistoryRows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No calibration runs yet.</p>
        )}
      </div>
    </div>
  );
}

