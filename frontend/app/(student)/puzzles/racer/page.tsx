// app/(student)/puzzles/racer/page.tsx - Puzzle Racer for kids

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Trophy, Clock, Play, RotateCcw, Star, UserPlus, Copy, Home } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { puzzleAPI, Puzzle, puzzleRacerRoomsAPI, PuzzleRaceRoomState, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

/** Fixed race duration: 2.5 minutes */
const RACE_DURATION_SECONDS = 2 * 60 + 30;
const COUNTDOWN_SECONDS = 10;

const TRACK_MAX_SCORE = 15;
const CAR_EMOJIS = ['🏎️', '🚗', '🚙', '🚕', '🚌', '🛵', '🚲'];

export type RacerParticipant = {
  id: number | string;
  name: string;
  isYou: boolean;
  score: number;
  carIndex: number;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getParticipantCarEmoji(participant: RacerParticipant, carAssignments: Record<number, number>, fallbackIdx: number): string {
  const assigned = carAssignments[participant.id as number];
  if (assigned !== undefined) return CAR_EMOJIS[assigned % CAR_EMOJIS.length];
  return CAR_EMOJIS[fallbackIdx % CAR_EMOJIS.length];
}

export default function PuzzleRacerPage() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<'lobby' | 'countdown' | 'racing' | 'ended'>('lobby');
  const [puzzlePool, setPuzzlePool] = useState<Puzzle[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [loadingPool, setLoadingPool] = useState(false);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [movesMade, setMovesMade] = useState<string[]>([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);

  const [participants, setParticipants] = useState<RacerParticipant[]>([]);
  const [roomState, setRoomState] = useState<PuzzleRaceRoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [raceBootstrapped, setRaceBootstrapped] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isNitroBoostActive, setIsNitroBoostActive] = useState(false);
  const [racerDisplayName, setRacerDisplayName] = useState('');
  const [raceOngoing, setRaceOngoing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const roomInitRef = useRef(false);
  const skippedPuzzleIdsRef = useRef<Set<number>>(new Set());
  const nitroTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownSoundRef = useRef<AudioContext | null>(null);
  const countdownPlayedForRef = useRef<number | null>(null);
  const goPlayedRef = useRef(false);
  const racerDisplayNameRef = useRef(racerDisplayName);
  racerDisplayNameRef.current = racerDisplayName;
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverOffsetRef = useRef(0); // ms: serverTime - clientTime
  const bootstrapLockRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const hasJoinedRef = useRef(hasJoinedRoom);
  hasJoinedRef.current = hasJoinedRoom;

  const carAssignments: Record<number, number> = roomState?.car_assignments ?? {};
  const selectedCarIndex = user?.id != null ? (carAssignments[user.id] ?? 0) : 0;

  // Keep invite link in sync with current URL (including room param)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInviteLink(window.location.href);
    }
  }, [searchParams]);

  // Non-host players: leave the room when navigating away or closing the tab during a race
  useEffect(() => {
    const fireLeave = () => {
      const room = roomStateRef.current;
      const racing = phaseRef.current === 'racing' || phaseRef.current === 'countdown';
      if (room?.id && !isHostRef.current && hasJoinedRef.current && racing) {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/puzzle-racer/rooms/${room.id}/leave`;
        try {
          fetch(url, { method: 'POST', credentials: 'include', keepalive: true });
        } catch {
          // best-effort
        }
      }
    };
    const onBeforeUnload = () => fireLeave();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      fireLeave();
    };
  }, []);

  // Initialize editable racer name from profile and sync to backend
  useEffect(() => {
    if (!user) return;
    const name = user.full_name?.split(' ')[0] ?? user.username ?? 'You';
    setRacerDisplayName(name);
    if (roomState?.id && name.trim()) {
      puzzleRacerRoomsAPI.setName(roomState.id, name.trim()).catch(() => {});
    }
  }, [user?.id, user?.full_name, user?.username, roomState?.id]);

  // Keep "you" participant name in sync with editable racer name
  useEffect(() => {
    if (!racerDisplayName.trim()) return;
    setParticipants((prev) =>
      prev.map((p) => (p.isYou ? { ...p, name: racerDisplayName.trim() } : p))
    );
  }, [racerDisplayName]);

  const playCountdownBeep = useCallback((kind: 'tick' | 'go', number?: number) => {
    if (typeof window === 'undefined') return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!countdownSoundRef.current) {
        countdownSoundRef.current = new Ctx();
      }
      const ctx = countdownSoundRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      if (kind === 'go') {
        // Ascending two-tone fanfare for GO
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(i === 0 ? 660 : 880, now + i * 0.12);
          gain.gain.setValueAtTime(0.0001, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.25);
        }
      } else {
        // Deep drum-like hit for each number
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        // High click layer
        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(800, now);
        clickGain.gain.setValueAtTime(0.0001, now);
        clickGain.gain.exponentialRampToValueAtTime(0.15, now + 0.005);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        click.connect(clickGain);
        clickGain.connect(ctx.destination);
        click.start(now);
        click.stop(now + 0.08);
      }

      // Speech synthesis for number readout
      if (typeof window.speechSynthesis !== 'undefined') {
        const text = kind === 'go' ? 'Go!' : String(number ?? '');
        if (text) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = kind === 'go' ? 1.3 : 1.1;
          utter.pitch = kind === 'go' ? 1.4 : 0.9;
          utter.volume = 0.8;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      }
    } catch {
      // ignore audio failures
    }
  }, []);

  // Track room param to detect navigation to a different invite link
  const roomParam = searchParams.get('room');
  const prevRoomParamRef = useRef(roomParam);
  useEffect(() => {
    if (prevRoomParamRef.current !== roomParam) {
      prevRoomParamRef.current = roomParam;
      roomInitRef.current = false;
    }
  }, [roomParam]);

  // Create or fetch room on first load once user is known
  useEffect(() => {
    if (roomInitRef.current) return;
    if (!user?.id) return;
    roomInitRef.current = true;

    const doInit = async () => {
      try {
        // Compute server-client clock offset for timer sync
        try {
          const before = Date.now();
          const serverNow = await puzzleRacerRoomsAPI.getServerTime();
          const after = Date.now();
          const rtt = after - before;
          const serverMs = new Date(serverNow).getTime();
          serverOffsetRef.current = serverMs - (before + rtt / 2);
        } catch {
          serverOffsetRef.current = 0;
        }

        const roomIdFromUrl = searchParams.get('room');
        let shouldCreateNew = !roomIdFromUrl;

        if (roomIdFromUrl) {
          try {
            const existing = await puzzleRacerRoomsAPI.get(roomIdFromUrl);
            const youAreHost = existing.host_user_id === user.id;

            if (existing.status === 'waiting') {
              setRoomState(existing);
              setIsHost(youAreHost);
              setHasJoinedRoom(youAreHost);
            } else if (youAreHost) {
              setRoomState(existing);
              setIsHost(true);
              setHasJoinedRoom(true);
              if (existing.status === 'finished') {
                setPhase('ended');
                setRaceBootstrapped(true);
              }
            } else if (existing.status === 'racing' || existing.status === 'finished') {
              const isParticipant = existing.participants.includes(user.id);
              setRoomState(existing);
              setIsHost(false);
              if (isParticipant && existing.status === 'racing') {
                setHasJoinedRoom(true);
              } else {
                setRaceOngoing(true);
              }
            }
          } catch {
            shouldCreateNew = true;
          }
        }

        if (shouldCreateNew) {
          const created = await puzzleRacerRoomsAPI.create();
          setRoomState(created);
          setIsHost(true);
          setHasJoinedRoom(true);
          router.replace(`?room=${created.id}`);
        }
      } catch (e) {
        console.error(e);
        toast.error('Could not join puzzle race room');
      }
    };

    void doInit();
  }, [user?.id, router, searchParams]);

  // Poll room state if we have a room
  useEffect(() => {
    if (!roomState?.id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const latest = await puzzleRacerRoomsAPI.get(roomState.id);
        if (!cancelled) {
          setRoomState(latest);
          // Sync other players' scores from server
          if (latest.scores && (phaseRef.current === 'racing' || phaseRef.current === 'ended')) {
            const serverScores = latest.scores;
            setParticipants((prev) =>
              prev.map((p) =>
                p.isYou ? p : { ...p, score: serverScores[p.id as number] ?? p.score }
              )
            );
          }
          // Server transitioned to finished — end the race locally
          if (latest.status === 'finished' && phaseRef.current === 'racing') {
            setPhase('ended');
          }
          // Non-participant watching an ongoing race: keep them locked out
          setRaceOngoing((prev) => {
            if (!prev) return false;
            // Room reset to lobby — allow re-joining the new cycle
            if (latest.status === 'waiting') {
              setPhase('lobby');
              setHasJoinedRoom(false);
              return false;
            }
            return true;
          });
        }
      } catch {
        // ignore polling errors
      }
    };
    const interval = setInterval(tick, 1000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomState?.id]);

  const loadNextPuzzle = useCallback(() => {
    if (puzzlePool.length === 0) return;

    // Find next puzzle that wasn't skipped by this player
    let next: Puzzle | null = null;
    let nextIndex = poolIndex;
    for (let attempt = 0; attempt < puzzlePool.length; attempt++) {
      const idx = (poolIndex + attempt) % puzzlePool.length;
      const candidate = puzzlePool[idx];
      if (!skippedPuzzleIdsRef.current.has(candidate.id)) {
        next = candidate;
        nextIndex = idx;
        break;
      }
    }

    if (!next) {
      toast('No more unskipped puzzles left in this race.', { icon: '🏁' });
      setPhase('ended');
      return;
    }

    setPoolIndex(nextIndex + 1);
    setCurrentPuzzle(next);
    setGame(new Chess(next.fen));
    setMovesMade([]);
    setShowCorrect(false);
    setShowWrong(false);
    startTimeRef.current = Date.now();
  }, [puzzlePool, poolIndex]);

  const skipCurrentPuzzle = useCallback(() => {
    if (!currentPuzzle) return;
    skippedPuzzleIdsRef.current.add(currentPuzzle.id);
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    // Record a non-solved attempt for analytics, then move on
    puzzleAPI
      .submitAttempt(currentPuzzle.id, {
        is_solved: false,
        moves_made: '',
        time_taken: timeTaken,
        hints_used: 0,
      })
      .catch(() => {
        // Non-blocking: skipping should still move to next puzzle
      })
      .finally(() => {
        loadNextPuzzle();
        toast('Skipped! Moving to next puzzle.', { icon: '⏭️' });
      });
  }, [currentPuzzle, loadNextPuzzle]);

  const bootstrapRace = useCallback(async (freshStart = false) => {
    if (raceBootstrapped) return;
    if (bootstrapLockRef.current) return;
    bootstrapLockRef.current = true;
    setLoadingPool(true);
    try {
      const list = await puzzleAPI.getAll('beginner');
      const shuffled = shuffle(list);
      if (shuffled.length === 0) {
        toast.error('No puzzles available. Try again later!');
        return;
      }
      // Build participants from room state so all real players appear in the list
      if (roomState && user?.id) {
        const uniqueIds = Array.from(new Set(roomState.participants));
        const names = roomState.racer_names ?? {};
        const participantsData = await Promise.all(
          uniqueIds.map(async (id, index) => {
            if (id === user.id) {
              const myName = racerDisplayNameRef.current.trim() || user.full_name?.split(' ')[0] || user.username || 'You';
              return {
                id,
                name: myName,
                isYou: true as const,
                score: 0,
                carIndex: index,
              };
            }
            if (names[id]) {
              return {
                id,
                name: names[id],
                isYou: false as const,
                score: 0,
                carIndex: index,
              };
            }
            try {
              const other = await usersAPI.getById(id);
              const name = other.full_name?.split(' ')[0] ?? other.username;
              return {
                id,
                name,
                isYou: false as const,
                score: 0,
                carIndex: index,
              };
            } catch {
              return {
                id,
                name: `Player ${index + 1}`,
                isYou: false as const,
                score: 0,
                carIndex: index,
              };
            }
          })
        );
        setParticipants(participantsData);
      } else {
        // Fallback: just show current user
        const myId = user?.id ?? 'you';
        const myName = racerDisplayNameRef.current.trim() || user?.full_name?.split(' ')[0] || 'You';
        setParticipants([
          { id: myId, name: myName, isYou: true, score: 0, carIndex: 0 },
        ]);
      }
      setPuzzlePool(shuffled);
      setPuzzlesSolved(0);
      setTotalXP(0);
      setPoolIndex(1);
      skippedPuzzleIdsRef.current.clear();
      setShowCorrect(false);
      setShowWrong(false);
      const first = shuffled[0];
      setCurrentPuzzle(first);
      setGame(new Chess(first.fen));
      setMovesMade([]);
      startTimeRef.current = Date.now();

      // Sync timing with server
      if (!freshStart && roomState?.race_end_at) {
        const raw = roomState.race_end_at;
        const utcStr = raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z';
        const raceEndMs = new Date(utcStr).getTime();
        const nowServer = Date.now() + serverOffsetRef.current;
        const remainingSec = Math.floor((raceEndMs - nowServer) / 1000);

        if (remainingSec <= 0) {
          setPhase('ended');
        } else if (remainingSec > RACE_DURATION_SECONDS) {
          // Still in countdown
          const countdownLeft = remainingSec - RACE_DURATION_SECONDS;
          setCountdown(Math.min(countdownLeft, COUNTDOWN_SECONDS));
          setPhase('countdown');
        } else {
          // Race in progress
          setTimeLeft(remainingSec);
          setCountdown(0);
          setPhase('racing');
        }
      } else {
        setCountdown(COUNTDOWN_SECONDS);
        setPhase('countdown');
      }
      setRaceBootstrapped(true);
    } catch (e) {
      console.error(e);
      toast.error('Could not load puzzles');
    } finally {
      setLoadingPool(false);
      bootstrapLockRef.current = false;
    }
  }, [user?.id, user?.full_name, roomState, raceBootstrapped]);

  // Keep lobby participants in sync with room state (so track shows before race starts)
  useEffect(() => {
    if (!roomState || !user?.id) return;
    if (raceBootstrapped) return; // once race starts, bootstrapRace owns participants list
    const uniqueIds = Array.from(new Set(roomState.participants ?? []));
    if (uniqueIds.length === 0) return;
    const names = roomState.racer_names ?? {};
    let cancelled = false;
    (async () => {
      const data = await Promise.all(
        uniqueIds.map(async (id, index) => {
          if (id === user.id) {
            const myName = racerDisplayNameRef.current.trim() || user.full_name?.split(' ')[0] || user.username || 'You';
            return { id, name: myName, isYou: true as const, score: 0, carIndex: index };
          }
          if (names[id]) {
            return { id, name: names[id], isYou: false as const, score: 0, carIndex: index };
          }
          try {
            const other = await usersAPI.getById(id);
            const name = other.full_name?.split(' ')[0] ?? other.username;
            return { id, name, isYou: false as const, score: 0, carIndex: index };
          } catch {
            return { id, name: `Player ${index + 1}`, isYou: false as const, score: 0, carIndex: index };
          }
        })
      );
      if (!cancelled) setParticipants(data);
    })().catch(() => {
      // ignore
    });
    return () => {
      cancelled = true;
    };
  }, [roomState, user?.id, user?.full_name, user?.username, raceBootstrapped]);

  // Host click: start the room then bootstrap race locally
  const handleStartClick = useCallback(async () => {
    if (!roomState?.id) return;
    try {
      const updated = await puzzleRacerRoomsAPI.start(roomState.id);
      setRoomState(updated);
      await bootstrapRace(true);
    } catch (e: any) {
      const message = e?.response?.data?.detail ?? 'Could not start race';
      toast.error(message);
    }
  }, [roomState?.id, bootstrapRace]);

  // Auto-bootstrap: when room status is racing and not yet bootstrapped (guest join or host rejoin)
  useEffect(() => {
    if (!roomState) return;
    if (!hasJoinedRoom) return;
    if (raceBootstrapped) return;
    if (roomState.status !== 'racing') return;
    void bootstrapRace();
  }, [roomState, hasJoinedRoom, raceBootstrapped, bootstrapRace]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    countdownPlayedForRef.current = null;
    goPlayedRef.current = false;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setPhase('racing');
          setTimeLeft(RACE_DURATION_SECONDS);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase]);

  // Countdown sound (tick each number, "go" at zero)
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown < 0) return;
    if (countdownPlayedForRef.current === countdown) return;
    countdownPlayedForRef.current = countdown;
    if (countdown > 0) {
      playCountdownBeep('tick', countdown);
    } else if (!goPlayedRef.current) {
      goPlayedRef.current = true;
      playCountdownBeep('go');
    }
  }, [phase, countdown, playCountdownBeep]);

  // Race timer
  useEffect(() => {
    if (phase !== 'racing' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('ended');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLeft]);

  // Reset nitro when race is not active
  useEffect(() => {
    if (phase === 'racing') return;
    setIsNitroBoostActive(false);
    if (nitroTimeoutRef.current) {
      clearTimeout(nitroTimeoutRef.current);
      nitroTimeoutRef.current = null;
    }
  }, [phase]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!game || !currentPuzzle || showCorrect || showWrong) return false;
      try {
        const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (move === null) return false;
        const newMoves = [...movesMade, `${sourceSquare}${targetSquare}`];
        setMovesMade(newMoves);
        setGame(new Chess(game.fen()));
        const solutionMoves = currentPuzzle.moves.split(' ');
        const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const lastMoveStr = `${sourceSquare}${targetSquare}`;
        const moveIdx = newMoves.length - 1;
        const expectedMove = solutionMoves[moveIdx];
        const thisMoveCorrect = expectedMove &&
          (lastMoveStr === expectedMove || lastMoveStr === expectedMove.replace(/[+=]/, ''));

        if (!thisMoveCorrect) {
          puzzleAPI
            .submitAttempt(currentPuzzle.id, {
              is_solved: false,
              moves_made: newMoves.join(' '),
              time_taken: timeTaken,
              hints_used: 0,
            })
            .catch(() => {});
          loadNextPuzzle();
          return true;
        }

        const isComplete = newMoves.length >= solutionMoves.length;
        if (isComplete) {
          setPuzzlesSolved((s) => s + 1);
          setParticipants((prev) =>
            prev.map((p) => (p.isYou ? { ...p, score: p.score + 1 } : p))
          );
          if (roomState?.id) {
            puzzleRacerRoomsAPI.updateScore(roomState.id).catch(() => {});
          }
          setIsNitroBoostActive(true);
          if (nitroTimeoutRef.current) clearTimeout(nitroTimeoutRef.current);
          nitroTimeoutRef.current = setTimeout(() => {
            setIsNitroBoostActive(false);
          }, 750);
          puzzleAPI
            .submitAttempt(currentPuzzle.id, {
              is_solved: true,
              moves_made: newMoves.join(' '),
              time_taken: timeTaken,
              hints_used: 0,
            })
            .then((result) => {
              setTotalXP((x) => x + (result.xp_earned ?? 0));
              if (user && result.xp_earned) {
                updateUser({ total_xp: user.total_xp + result.xp_earned });
              }
            })
            .catch(() => {});
          loadNextPuzzle();
        }
        return true;
      } catch {
        return false;
      }
    },
    [game, currentPuzzle, movesMade, showCorrect, showWrong, user, updateUser, loadNextPuzzle]
  );

  // Join room handler for guests
  const handleJoinRoom = useCallback(async () => {
    if (!roomState?.id || hasJoinedRoom) return;
    try {
      const updated = await puzzleRacerRoomsAPI.join(roomState.id);
      setRoomState(updated);
      setHasJoinedRoom(true);
      toast.success('Joined the race!');
      // Send current racer name after joining so other players see it
      const name = racerDisplayNameRef.current.trim();
      if (name) {
        puzzleRacerRoomsAPI.setName(roomState.id, name).catch(() => {});
      }
    } catch (e: any) {
      const message = e?.response?.data?.detail ?? 'Could not join race';
      toast.error(message);
    }
  }, [roomState?.id, hasJoinedRoom]);

  const handleExitRace = useCallback(() => {
    router.push('/puzzles');
  }, [router]);

  // ==================== LOADING SCREEN ====================
  if (!roomState || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">🏎️</span>
          </div>
          <p className="font-heading text-lg font-bold text-purple-700">Setting up your race room…</p>
        </div>
      </div>
    );
  }

  // ==================== RACE ONGOING (non-participant) SCREEN ====================
  if (raceOngoing) {
    const raceFinished = roomState?.status === 'finished';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
        <div className="flex flex-col items-center gap-6 bg-white/90 rounded-3xl shadow-2xl p-10 max-w-md mx-auto text-center">
          <div className="text-6xl animate-bounce">{raceFinished ? '🏆' : '🏁'}</div>
          <h2 className="font-heading text-2xl font-bold text-gray-800">
            {raceFinished ? 'Race Has Ended' : 'Race is Ongoing'}
          </h2>
          <p className="text-gray-600 text-lg">
            {raceFinished
              ? 'This race has finished. You can go back and start a new one!'
              : 'A race is currently in progress. Please wait until it finishes before joining.'}
          </p>
          {!raceFinished && (
            <div className="flex items-center gap-2 text-purple-600">
              <div className="h-5 w-5 rounded-full border-3 border-purple-400 border-t-transparent animate-spin" />
              <span className="font-medium">Waiting for race to end…</span>
            </div>
          )}
          <button
            onClick={() => router.push('/puzzles')}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-heading font-bold py-2.5 px-6 shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Puzzles
          </button>
        </div>
      </div>
    );
  }

  // ==================== ENDED SCREEN ====================
  if (phase === 'ended') {
    const sortedStandings = [...participants].sort((a, b) => b.score - a.score);
    const winner = sortedStandings[0];
    const isWinner = winner?.isYou;

    return (
      <div className="mx-auto max-w-4xl px-4 pt-2 pb-4 relative">
        <style jsx global>{`
          @keyframes confettiFall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(105vh) rotate(720deg); opacity: 0.3; }
          }
          @keyframes trophyBounce {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.15) rotate(-5deg); }
            50% { transform: scale(1.25) rotate(0deg); }
            75% { transform: scale(1.15) rotate(5deg); }
          }
          @keyframes starPop {
            0% { transform: scale(0) rotate(-30deg); opacity: 0; }
            60% { transform: scale(1.3) rotate(10deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes slideUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Confetti — only for the winner */}
        {isWinner && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899', '#3b82f6'][i % 7],
                  animation: `confettiFall ${2 + Math.random() * 3}s ${Math.random() * 2}s linear forwards`,
                  borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                }}
              />
            ))}
          </div>
        )}

        <div className="rounded-3xl border-4 border-purple-300 bg-gradient-to-b from-purple-50 to-pink-50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-6 py-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1px, transparent 1px)',
              backgroundSize: '60px 60px, 80px 80px, 40px 40px',
            }} />
            <div className="relative flex items-center justify-center gap-4">
              <span className="text-5xl" style={{ animation: 'trophyBounce 1.5s ease-in-out infinite' }}>🏆</span>
              <div>
                <h1 className="font-heading text-3xl font-black text-white drop-shadow-lg">Race Complete!</h1>
                <div className="flex justify-center gap-1 mt-1">
                  {['⭐', '🌟', '✨', '🌟', '⭐'].map((star, i) => (
                    <span key={i} className="text-lg" style={{ animation: `starPop 0.5s ${0.2 + i * 0.15}s ease-out both` }}>
                      {star}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-5xl" style={{ animation: 'trophyBounce 1.5s 0.3s ease-in-out infinite' }}>🏆</span>
            </div>
          </div>

          {/* Winner + stats */}
          <div className="p-5">
            {winner && isWinner && (
              <div className="flex flex-col sm:flex-row items-center gap-4" style={{ animation: 'slideUp 0.4s 0.3s ease-out both' }}>
                <div className="flex-1 text-center rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 p-4 shadow-md">
                  <span className="text-5xl block mb-1">{getParticipantCarEmoji(winner, carAssignments, winner.carIndex)}</span>
                  <p className="font-heading text-2xl font-black text-amber-800">
                    🥇 {winner.name} (you)
                  </p>
                  <p className="font-heading text-base font-bold text-amber-600 mt-1">Champion!</p>
                </div>
                <div className="flex sm:flex-col gap-3 flex-shrink-0" style={{ animation: 'slideUp 0.4s 0.5s ease-out both' }}>
                  <div className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-sky-100 px-5 py-3 text-center shadow-sm">
                    <p className="font-heading text-3xl font-black text-cyan-600">{winner.score}</p>
                    <p className="font-heading text-xs font-bold text-cyan-700 uppercase tracking-wide">Solved</p>
                  </div>
                  <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 px-5 py-3 text-center shadow-sm">
                    <p className="font-heading text-3xl font-black text-amber-600">+{totalXP}</p>
                    <p className="font-heading text-xs font-bold text-amber-700 uppercase tracking-wide">XP</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loser view: own stats highlighted + winner line */}
            {winner && !isWinner && (() => {
              const me = sortedStandings.find(p => p.isYou);
              return (
                <div style={{ animation: 'slideUp 0.4s 0.3s ease-out both' }}>
                  {me && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-4" style={{ animation: 'slideUp 0.4s 0.3s ease-out both' }}>
                      <div className="flex-1 text-center rounded-2xl border-3 border-purple-400 bg-gradient-to-r from-purple-100 via-white to-purple-100 p-5 shadow-lg ring-2 ring-purple-300">
                        <span className="text-5xl block mb-1">{getParticipantCarEmoji(me, carAssignments, me.carIndex)}</span>
                        <p className="font-heading text-2xl font-black text-purple-800">{me.name} (you)</p>
                      </div>
                      <div className="flex sm:flex-col gap-3 flex-shrink-0" style={{ animation: 'slideUp 0.4s 0.5s ease-out both' }}>
                        <div className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-sky-100 px-5 py-3 text-center shadow-sm">
                          <p className="font-heading text-3xl font-black text-cyan-600">{me.score}</p>
                          <p className="font-heading text-xs font-bold text-cyan-700 uppercase tracking-wide">Solved</p>
                        </div>
                        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 px-5 py-3 text-center shadow-sm">
                          <p className="font-heading text-3xl font-black text-amber-600">+{totalXP}</p>
                          <p className="font-heading text-xs font-bold text-amber-700 uppercase tracking-wide">XP</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-center font-heading text-lg font-bold text-amber-700" style={{ animation: 'slideUp 0.4s 0.6s ease-out both' }}>
                    🥇 {winner.name} is the winner. Great Effort!
                  </p>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5" style={{ animation: 'slideUp 0.4s 0.7s ease-out both' }}>
              <button
                onClick={async () => {
                  setCurrentPuzzle(null);
                  setGame(null);
                  setPuzzlePool([]);
                  setPuzzlesSolved(0);
                  setTotalXP(0);
                  setRaceBootstrapped(false);
                  bootstrapLockRef.current = false;
                  if (roomState?.id) {
                    try {
                      const updated = await puzzleRacerRoomsAPI.reset(roomState.id);
                      setRoomState(updated);
                      setHasJoinedRoom(true);
                      const name = racerDisplayNameRef.current.trim();
                      if (name) {
                        puzzleRacerRoomsAPI.setName(roomState.id, name).catch(() => {});
                      }
                    } catch {
                      toast.error('Could not rejoin room');
                    }
                  }
                  setPhase('lobby');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-heading font-bold py-3 px-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-lg"
              >
                <RotateCcw className="h-5 w-5" />
                Re-join Match
              </button>
              <Link
                href="/puzzles"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-white font-heading font-bold py-3 px-6 text-purple-700 hover:bg-purple-50 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Puzzles
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN SCREEN (LOBBY + COUNTDOWN OVERLAY + RACING) ====================
  const roomParticipantsCount = roomState?.participants?.length ?? 0;
  const isReadyToStart = roomParticipantsCount >= 2;
  const canHostStart =
    isHost && hasJoinedRoom && isReadyToStart && !loadingPool && (roomState?.status ?? 'waiting') === 'waiting';

  const lobbyGame = game ?? new Chess();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col overflow-y-auto relative">
      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative text-center px-6">
            <p className="font-heading text-2xl font-bold text-white/90 mb-6 tracking-wider uppercase"
              style={{ animation: 'countdownSubtitlePulse 2s ease-in-out infinite' }}
            >
              {countdown > 3 ? 'Get Ready!' : countdown >= 1 ? 'Almost there…' : '🏁 GO! 🏁'}
            </p>

            <div className="relative flex items-center justify-center" style={{ height: '14rem' }}>
              {/* Expanding ring behind the number */}
              <div
                key={`ring-${countdown}`}
                className="absolute rounded-full border-4 border-white/30"
                style={{
                  width: '10rem',
                  height: '10rem',
                  animation: 'countdownRingExpand 0.9s ease-out forwards',
                }}
              />
              {/* The number itself */}
              <span
                key={countdown}
                className="block font-heading font-black text-white relative"
                style={{
                  fontSize: countdown === 0 ? '10rem' : '13rem',
                  lineHeight: 1,
                  textShadow: countdown <= 3
                    ? '0 0 60px rgba(255,100,100,0.8), 0 0 120px rgba(255,50,50,0.4), 0 10px 40px rgba(0,0,0,0.6)'
                    : '0 0 40px rgba(255,255,255,0.4), 0 10px 40px rgba(0,0,0,0.55)',
                  animation: 'countdownNumberPop 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </span>
            </div>

            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: i < (10 - countdown + 1) ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                    transition: 'background-color 0.3s ease',
                    boxShadow: i < (10 - countdown + 1) ? '0 0 6px #fbbf24' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes countdownNumberPop {
          0% {
            transform: scale(2.5) rotate(-8deg);
            opacity: 0;
            filter: blur(8px);
          }
          40% {
            transform: scale(0.92) rotate(2deg);
            opacity: 1;
            filter: blur(0);
          }
          60% {
            transform: scale(1.08) rotate(-1deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0);
          }
        }
        @keyframes countdownRingExpand {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
            border-width: 4px;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
            border-width: 1px;
          }
        }
        @keyframes countdownSubtitlePulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes puzzleRacerRoadFlow {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-36px);
          }
        }
        @keyframes puzzleRacerCenterDashFlow {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -34px 0;
          }
        }
        @keyframes puzzleRacerNitroBurst {
          0% {
            transform: translateY(-50%) scale(1);
            filter: drop-shadow(0 0 0 rgba(56, 189, 248, 0));
          }
          40% {
            transform: translateY(-50%) scale(1.2);
            filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.95));
          }
          100% {
            transform: translateY(-50%) scale(1.05);
            filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.55));
          }
        }
      `}</style>

      {/* Main content: Lichess-style layout (board + lanes under it, right panel) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem] gap-2 pl-2 sm:pl-3 pr-2 sm:pr-3 pt-0">
        {/* Left: Board + lanes */}
        <div className="min-w-0 flex flex-col items-center gap-2">
          {phase !== 'racing' ? (
            <div className="flex flex-col items-center min-h-0 gap-3 w-full">
              {/* Initial state chessboard (non-interactive in lobby) */}
              <div className="relative rounded-2xl border-2 border-border bg-card p-1 shadow-xl">
                <div
                  className="w-full"
                  style={{
                    maxWidth: 'min(1040px, calc(100vw - 1rem), calc(100vh - 10rem))',
                  }}
                >
                  <Chessboard
                    key={lobbyGame.fen()}
                    options={{
                      position: lobbyGame.fen(),
                      arePiecesDraggable: false,
                      boardStyle: { borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
                      darkSquareStyle: { backgroundColor: 'hsl(var(--primary))' },
                      lightSquareStyle: { backgroundColor: 'hsl(var(--primary) / 0.15)' },
                    }}
                  />
                </div>
              </div>
            </div>
          ) : loadingPuzzle || (!currentPuzzle && puzzlePool.length === 0) ? (
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-heading font-semibold text-muted-foreground">Loading puzzle…</p>
            </div>
          ) : currentPuzzle && game ? (
            <div className="flex flex-col items-center min-h-0 gap-2">
              <div className="relative rounded-2xl border-2 border-border bg-card p-1 shadow-xl">
                {(showCorrect || showWrong) && (
                  <div
                    className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl ${
                      showCorrect ? 'bg-green-500/90' : 'bg-red-500/90'
                    }`}
                  >
                    <span className="font-heading text-2xl font-bold text-white">
                      {showCorrect ? 'Correct!' : 'Not quite!'}
                    </span>
                  </div>
                )}
                <div
                  className="w-full"
                  style={{
                    // Keep board large but fully within viewport on small screens
                    maxWidth: 'min(1040px, calc(100vw - 1rem), calc(100vh - 8rem))',
                  }}
                >
                  <Chessboard
                    key={game.fen()}
                    options={{
                      position: game.fen(),
                      boardOrientation: game.turn() === 'w' ? 'white' : 'black',
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                      boardStyle: { borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
                      darkSquareStyle: { backgroundColor: 'hsl(var(--primary))' },
                      lightSquareStyle: { backgroundColor: 'hsl(var(--primary) / 0.15)' },
                    }}
                  />
                </div>
              </div>
              <div className="h-2" />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
              <p className="font-heading font-semibold text-muted-foreground">Loading next puzzle…</p>
            </div>
          )}

          {/* Lanes under the board (Lichess-style) */}
          {participants.length > 0 && (
            <div className="relative w-full max-w-[1040px] overflow-hidden rounded-none border border-border bg-white p-3 shadow-[0_14px_35px_rgba(0,0,0,0.1)]">
              {/* F1 curb edges */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[6px]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #ef4444 0 14px, #f8fafc 14px 28px)',
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #ef4444 0 14px, #f8fafc 14px 28px)',
                }}
              />
              <div className="space-y-1">
                {[...participants]
                  .sort((a, b) => {
                    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
                    return b.score - a.score;
                  })
                  .map((p) => {
                    const pos = Math.min((p.score / TRACK_MAX_SCORE) * 100, 100);
                    return (
                      <div key={p.id} className="flex items-center gap-1">
                        <span
                          className={`w-24 truncate text-sm font-heading font-bold ${
                            p.isYou ? 'text-amber-700' : 'text-gray-800'
                          }`}
                          title={p.name}
                        >
                          {p.name}
                          {p.isYou ? ' (you)' : ''}
                        </span>
                        <div className="relative flex-1 h-11 rounded-none border border-white/10 overflow-hidden bg-[#1a1f2b]">
                          {/* Tarmac texture */}
                          <div
                            className="absolute inset-0 opacity-55"
                            style={{
                              backgroundImage:
                                'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))',
                            }}
                          />
                          <div
                            className={`absolute inset-y-0 -left-[36px] w-[calc(100%+72px)] opacity-35 will-change-transform ${
                              phase === 'racing' ? 'animate-[puzzleRacerRoadFlow_600ms_linear_infinite]' : ''
                            }`}
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 18px, rgba(255,255,255,0.01) 18px 36px)',
                              backgroundSize: '36px 100%',
                            }}
                          />
                          {/* Dashed center line */}
                          <div
                            className={`absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 opacity-80 ${
                              phase === 'racing' ? 'animate-[puzzleRacerCenterDashFlow_680ms_linear_infinite]' : ''
                            }`}
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(90deg, rgba(248,250,252,0.85) 0 16px, transparent 16px 34px)',
                            }}
                          />
                          {/* Finish marker strip */}
                          <div
                            className="pointer-events-none absolute right-0 top-0 h-full w-5 border-l border-white/30"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(180deg, #0b0f14 0 6px, #f8fafc 6px 12px)',
                            }}
                          />
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 transition-all ease-out ${
                              p.isYou && isNitroBoostActive
                                ? 'duration-200 animate-[puzzleRacerNitroBurst_420ms_ease-out]'
                                : 'duration-500'
                            }`}
                            style={{ left: `max(8px, ${pos}% - 12px)` }}
                          >
                            <span className="text-4xl leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                              {getParticipantCarEmoji(p, carAssignments, p.carIndex)}
                            </span>
                          </div>
                        </div>
                        <span className="w-6 text-right text-sm font-heading font-bold text-gray-800">
                          {p.score}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right: lobby controls + compact standings */}
        {participants.length > 0 && (
          <div className="min-w-0 flex flex-col gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h1 className="font-heading text-xl font-bold text-foreground">Puzzle Racer</h1>
                    {phase === 'racing' && (
                      <p className="font-heading text-sm font-semibold text-muted-foreground">
                        Race in progress! Keep solving to move ahead.
                      </p>
                    )}
                  </div>
                  <span className="text-2xl leading-none">🏎️</span>
                </div>

                {phase === 'racing' && (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
                    <p className="text-xl font-heading font-extrabold text-amber-900">
                      Remaining Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                )}

                <div className="mt-2 flex flex-col gap-2">
                  {phase !== 'racing' && !isHost && (
                    <button
                      onClick={handleJoinRoom}
                      disabled={hasJoinedRoom}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold py-2.5 px-5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-default"
                    >
                      {hasJoinedRoom ? 'Joined! Waiting for host…' : 'Join Race'}
                    </button>
                  )}

                  {phase !== 'racing' && isHost && (
                    <button
                      onClick={handleStartClick}
                      disabled={!canHostStart}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold py-2.5 px-5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPool ? (
                        'Loading…'
                      ) : (
                        <>
                          <Play className="h-5 w-5" />
                          Start Race
                        </>
                      )}
                    </button>
                  )}

                  {phase !== 'racing' && (isHost ? (
                    <p className="text-sm font-heading text-muted-foreground text-center">
                      {isReadyToStart
                        ? 'At least 2 racers joined. You can start!'
                        : 'Waiting for other players to join...'}
                    </p>
                  ) : (
                    <p className="text-sm font-heading text-muted-foreground text-center">
                      The host will start once everyone joins.
                    </p>
                  ))}
                </div>

                {phase !== 'racing' && (
                <div className="mt-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-heading font-semibold text-amber-900">
                    <UserPlus className="h-4 w-4" />
                    <span>Invite link</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 overflow-hidden rounded-lg border border-amber-200 bg-white px-2 py-1.5">
                      <p className="truncate text-sm text-amber-900/80">
                        {inviteLink || 'Link will appear here'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!inviteLink) return;
                          await navigator.clipboard.writeText(inviteLink);
                          toast.success('Invite link copied!');
                        } catch {
                          toast.error('Could not copy link');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-heading font-bold text-white shadow hover:bg-amber-600"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                </div>
                )}

                {phase === 'racing' && (
                  <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center justify-between">
                    <p className="font-heading font-bold text-emerald-900">Score</p>
                    <p className="text-xl font-heading font-extrabold text-emerald-900">{puzzlesSolved}</p>
                  </div>
                )}

                {phase === 'racing' && (
                  <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-heading font-bold text-cyan-900">Current puzzle</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-sm font-heading font-bold text-cyan-800 border border-cyan-200">
                        #{poolIndex}
                      </span>
                    </div>
                    {game && (
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-heading font-bold ${
                        game.turn() === 'w'
                          ? 'bg-white border border-gray-300 text-gray-900'
                          : 'bg-gray-900 border border-gray-700 text-white'
                      }`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full border ${
                          game.turn() === 'w' ? 'bg-white border-gray-400' : 'bg-gray-900 border-gray-500'
                        }`} />
                        {game.turn() === 'w' ? 'White to move' : 'Black to move'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={skipCurrentPuzzle}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-heading font-bold text-amber-800 hover:bg-amber-100"
                    >
                      ⏭️ Skip puzzle
                    </button>
                  </div>
                )}

                {phase !== 'racing' && (
                <div className="mt-3 rounded-2xl border border-border bg-card p-2 space-y-1.5">
                  <label className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">
                    Your racer name
                  </label>
                  <input
                    type="text"
                    value={racerDisplayName}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 16);
                      setRacerDisplayName(val);
                      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
                      nameDebounceRef.current = setTimeout(() => {
                        const trimmed = val.trim();
                        if (trimmed && roomState?.id) {
                          puzzleRacerRoomsAPI.setName(roomState.id, trimmed).catch(() => {});
                        }
                      }, 400);
                    }}
                    placeholder="Enter racer name"
                    className="w-full rounded-lg border-2 border-amber-300 bg-background px-2.5 py-1.5 text-base font-heading font-semibold text-foreground outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                )}

                {phase !== 'racing' && (
                <div className="mt-3 rounded-2xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">
                      Choose your car
                    </p>
                    <span className="text-sm font-heading font-semibold text-muted-foreground">
                      {CAR_EMOJIS[selectedCarIndex]}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CAR_EMOJIS.map((car, idx) => {
                      const takenByOther = Object.entries(carAssignments).some(
                        ([uid, cidx]) => cidx === idx && Number(uid) !== user?.id
                      );
                      if (takenByOther) return null;
                      return (
                        <button
                          key={`${car}-${idx}`}
                          type="button"
                          onClick={async () => {
                            if (!roomState?.id) return;
                            try {
                              const updated = await puzzleRacerRoomsAPI.selectCar(roomState.id, idx);
                              setRoomState(updated);
                            } catch {
                              toast.error('Could not select that car');
                            }
                          }}
                          className={`rounded-lg border px-0 py-2.5 text-4xl leading-none transition-all ${
                            selectedCarIndex === idx
                              ? 'border-amber-400 bg-amber-50 shadow-sm'
                              : 'border-border bg-background hover:bg-muted'
                          }`}
                          aria-label={`Select car ${idx + 1}`}
                          title={`Select ${car}`}
                        >
                          {car}
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-heading font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
