'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { coachAPI, type Puzzle } from '@/lib/api';
import {
  defaultStartFen,
  parsePgnToMoves,
  type HistoryMove,
} from '@/lib/coach-analysis-utils';

export interface AnalysisLoadPayload {
  rootFen: string;
  moves: HistoryMove[];
  label?: string;
}

type LoadTab = 'fen' | 'pgn' | 'game' | 'puzzle' | 'assignment';

interface StudentRow {
  id: number;
  username: string;
  email?: string;
}

interface AssignmentRow {
  id: number;
  title: string;
  puzzle_count: number;
  puzzles?: Array<{ puzzle_id: number; title: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (payload: AnalysisLoadPayload) => void;
}

const tabBtn = (active: boolean) =>
  `rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  }`;

export function CoachAnalysisLoadModal({ open, onClose, onLoad }: Props) {
  const [tab, setTab] = useState<LoadTab>('fen');
  const [fenInput, setFenInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [games, setGames] = useState<
    Array<{ id: number; started_at: string | null; result: string | null; has_pgn: boolean }>
  >([]);

  const [puzzleQuery, setPuzzleQuery] = useState('');
  const [puzzleResults, setPuzzleResults] = useState<Puzzle[]>([]);
  const [puzzleSearching, setPuzzleSearching] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('fen');
  }, [open]);

  useEffect(() => {
    if (!open || tab !== 'game') return;
    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const res = await api.get('/api/coach/students');
        if (!cancelled) setStudents(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) toast.error('Failed to load students');
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== 'assignment') return;
    let cancelled = false;
    (async () => {
      setAssignmentsLoading(true);
      try {
        const res = await api.get('/api/assignments');
        if (!cancelled) setAssignments(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) toast.error('Failed to load assignments');
      } finally {
        if (!cancelled) setAssignmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  useEffect(() => {
    if (!selectedStudentId) {
      setGames([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setGamesLoading(true);
      try {
        const list = await coachAPI.getStudentGames(selectedStudentId);
        if (!cancelled) setGames(list);
      } catch {
        if (!cancelled) toast.error('Failed to load games');
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId]);

  useEffect(() => {
    const q = puzzleQuery.trim();
    if (q.length < 2) {
      setPuzzleResults([]);
      return;
    }
    let cancelled = false;
    setPuzzleSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(
          `/api/coach/puzzles?include_inactive=true&limit=20&search=${encodeURIComponent(q)}`,
        );
        if (!cancelled) setPuzzleResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setPuzzleResults([]);
      } finally {
        if (!cancelled) setPuzzleSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [puzzleQuery]);

  const finish = useCallback(
    (payload: AnalysisLoadPayload) => {
      onLoad(payload);
      onClose();
      toast.success('Position loaded');
    },
    [onLoad, onClose],
  );

  const loadFen = () => {
    const fen = fenInput.trim();
    if (!fen) {
      toast.error('Enter a FEN string');
      return;
    }
    finish({ rootFen: fen, moves: [], label: 'Custom FEN' });
  };

  const loadPgn = () => {
    const parsed = parsePgnToMoves(pgnInput);
    if (!parsed) {
      toast.error('Could not parse PGN');
      return;
    }
    finish({ ...parsed, label: 'Imported game' });
  };

  const loadStart = () => {
    finish({ rootFen: defaultStartFen(), moves: [], label: 'Starting position' });
  };

  const loadGame = async (gameId: number) => {
    try {
      const g = await coachAPI.getGameForAnalysis(gameId);
      if (!g.pgn?.trim()) {
        toast.error('This game has no PGN yet');
        return;
      }
      const parsed = parsePgnToMoves(g.pgn, g.starting_fen);
      if (!parsed) {
        toast.error('Could not parse game PGN');
        return;
      }
      finish({ ...parsed, label: `Game #${g.id}` });
    } catch {
      toast.error('Failed to load game');
    }
  };

  const loadPuzzleById = async (puzzleId: number, title?: string) => {
    setLoadingPuzzle(true);
    try {
      const p = await coachAPI.getCoachPuzzle(puzzleId);
      finish({ rootFen: p.fen, moves: [], label: title ?? p.title });
    } catch {
      toast.error('Failed to load puzzle');
    } finally {
      setLoadingPuzzle(false);
    }
  };

  if (!open) return null;

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="load-analysis-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="load-analysis-title" className="font-heading text-lg font-bold text-foreground">
            Load position
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border px-4 py-3">
          {(
            [
              ['fen', 'FEN'],
              ['pgn', 'PGN'],
              ['game', 'Student game'],
              ['puzzle', 'Puzzle'],
              ['assignment', 'Assignment'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" className={tabBtn(tab === key)} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={loadStart}
            className="mb-4 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
          >
            Starting position
          </button>

          {tab === 'fen' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">Paste FEN</label>
              <textarea
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              />
              <button
                type="button"
                onClick={loadFen}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Load FEN
              </button>
            </div>
          )}

          {tab === 'pgn' && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">Paste PGN</label>
              <textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder="[Event &quot;?&quot;]&#10;1. e4 e5 2. Nf3 ..."
              />
              <button
                type="button"
                onClick={loadPgn}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Load game
              </button>
            </div>
          )}

          {tab === 'game' && (
            <div className="space-y-3">
              {studentsLoading ? (
                <p className="text-sm text-muted-foreground">Loading students…</p>
              ) : (
                <select
                  value={selectedStudentId ?? ''}
                  onChange={(e) =>
                    setSelectedStudentId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.username}
                    </option>
                  ))}
                </select>
              )}
              {selectedStudentId && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {gamesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading games…</p>
                  ) : games.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No games found.</p>
                  ) : (
                    games.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        disabled={!g.has_pgn}
                        onClick={() => loadGame(g.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:opacity-50"
                      >
                        <span>Game #{g.id}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.result ?? '—'} · {g.has_pgn ? 'PGN' : 'no PGN'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'puzzle' && (
            <div className="space-y-3">
              <input
                type="search"
                value={puzzleQuery}
                onChange={(e) => setPuzzleQuery(e.target.value)}
                placeholder="Search puzzles (min 2 chars)"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              {puzzleSearching && (
                <p className="text-xs text-muted-foreground">Searching…</p>
              )}
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {puzzleResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={loadingPuzzle}
                      onClick={() => loadPuzzleById(p.id, p.title)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                    >
                      {p.title}
                      <span className="ml-2 text-xs capitalize text-muted-foreground">
                        {p.difficulty}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'assignment' && (
            <div className="space-y-3">
              {assignmentsLoading ? (
                <p className="text-sm text-muted-foreground">Loading assignments…</p>
              ) : (
                <>
                  <select
                    value={selectedAssignmentId ?? ''}
                    onChange={(e) =>
                      setSelectedAssignmentId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select assignment</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                  {selectedAssignment?.puzzles && selectedAssignment.puzzles.length > 0 && (
                    <ul className="max-h-48 space-y-1 overflow-y-auto">
                      {selectedAssignment.puzzles.map((p) => (
                        <li key={p.puzzle_id}>
                          <button
                            type="button"
                            disabled={loadingPuzzle}
                            onClick={() => loadPuzzleById(p.puzzle_id, p.title)}
                            className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                          >
                            {p.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
