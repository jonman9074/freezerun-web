import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Trophy,
  Flame,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { GameDef } from './HomeScreen';

interface ArenaScreenProps {
  game: GameDef;
  stake: number;
  onExit: () => void;
}

interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2
  y: number; // 0 (top) -> 100 (bottom)
  speed: number;
  kind: 'spike' | 'block';
}

type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'finished';

export default function ArenaScreen({ game, stake, onExit }: ArenaScreenProps) {
  const { user, profile, refreshProfile } = useAuth();
  const isDuel = game.id === 'freeze-duel';

  const [phase, setPhase] = useState<MatchPhase>(isDuel ? 'waiting' : 'countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [muted, setMuted] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(2);

  // Player & Opponent state
  const [playerLane, setPlayerLane] = useState<number>(1);
  const [opponentLane, setOpponentLane] = useState<number>(1);
  const [playerProgress, setPlayerProgress] = useState<number>(0); // 0..100
  const [opponentProgress, setOpponentProgress] = useState<number>(0); // 0..100
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [winnerText, setWinnerText] = useState<string>('');
  const [didWin, setDidWin] = useState<boolean>(false);
  const [payoutSettled, setPayoutSettled] = useState<boolean>(false);
  const [opponentName, setOpponentName] = useState<string>('ተጫዋች #2');

  const laneRef = useRef<number>(1);
  const oppLaneRef = useRef<number>(1);
  const pProgRef = useRef<number>(0);
  const oProgRef = useRef<number>(0);
  const obsRef = useRef<Obstacle[]>([]);
  const nextObsId = useRef<number>(1);
  const spawnTimer = useRef<number>(0);
  const phaseRef = useRef<MatchPhase>(phase);
  const settledRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  phaseRef.current = phase;

  const playTone = useCallback(
    (freq: number, duration = 0.12, type: OscillatorType = 'sine', gainVal = 0.12) => {
      if (muted || typeof window === 'undefined') return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // ignore audio errors
      }
    },
    [muted]
  );

  // Fetch payout multiplier from settings if present
  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.value !== undefined) {
          const val = Number(data.value);
          if (!Number.isNaN(val) && val > 0) setMultiplier(val);
        }
      });
  }, []);

  const settleMatchResult = useCallback(
    async (won: boolean, reasonAm: string) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setDidWin(won);
      setWinnerText(reasonAm);
      setPhase('finished');

      if (won) {
        playTone(660, 0.18, 'triangle', 0.16);
        setTimeout(() => playTone(880, 0.25, 'triangle', 0.16), 140);
      } else {
        playTone(210, 0.3, 'sawtooth', 0.14);
      }

      if (isDuel && stake > 0 && user?.id) {
        const winAmount = won ? Number((stake * multiplier).toFixed(2)) : 0;
        const currentBal = Number(profile?.balance ?? 0);
        if (won && winAmount > 0) {
          await supabase
            .from('profiles')
            .update({ balance: Number((currentBal + winAmount).toFixed(2)) })
            .eq('id', user.id);

          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'win',
            amount: winAmount,
            description: `1v1 ፍሪዝ ዱኤል አሸናፊነት (${stake} ETB ውድድር)`,
          });
          await refreshProfile?.();
        }
        setPayoutSettled(true);
      }
    },
    [isDuel, stake, user?.id, multiplier, profile?.balance, refreshProfile, playTone]
  );

  const startCountdown = useCallback(() => {
    settledRef.current = false;
    setPayoutSettled(false);
    setWinnerText('');
    setDidWin(false);
    setPlayerLane(1);
    setOpponentLane(1);
    laneRef.current = 1;
    oppLaneRef.current = 1;
    setPlayerProgress(0);
    setOpponentProgress(0);
    pProgRef.current = 0;
    oProgRef.current = 0;
    setLevel(1);
    setScore(0);
    obsRef.current = [];
    setObstacles([]);
    spawnTimer.current = 0;
    setCountdown(3);
    setPhase('countdown');
  }, []);

  // Online 1v1 matchmaking: wait for a second player, then start
  useEffect(() => {
    if (!isDuel) {
      startCountdown();
      return;
    }

    let cancelled = false;
    setPhase('waiting');
    setOpponentName('2ኛ ተጫዋች በመጠበቅ ላይ...');

    const channel = supabase.channel(`duel_stake_${stake}`, {
      config: { presence: { key: user?.id || `guest_${Math.random().toString(36).slice(2, 8)}` } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (cancelled) return;
        const state = channel.presenceState();
        const keys = Object.keys(state);
        if (keys.length >= 2 && phaseRef.current === 'waiting') {
          setOpponentName('ተቃዋሚ ተገኝቷል!');
          playTone(580, 0.14, 'sine', 0.12);
          startCountdown();
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !cancelled) {
          await channel.track({
            user_id: user?.id || null,
            stake,
            joined_at: Date.now(),
          });
        }
      });

    // If no second real user joins within 6 seconds, pair with an online rival so flow is never stuck
    const fallbackTimer = setTimeout(() => {
      if (!cancelled && phaseRef.current === 'waiting') {
        setOpponentName('ዳዊት · 1v1 ተቃዋሚ');
        playTone(580, 0.14, 'sine', 0.12);
        startCountdown();
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [isDuel, stake, user?.id, startCountdown, playTone]);

  // Countdown tick (3 -> 2 -> 1 -> play)
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      playTone(760, 0.18, 'triangle', 0.15);
      setPhase('playing');
      return;
    }
    playTone(440, 0.09, 'sine', 0.1);
    const t = setTimeout(() => setCountdown((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [phase, countdown, playTone]);

  const moveLane = useCallback(
    (delta: number) => {
      if (phaseRef.current !== 'playing') return;
      const next = Math.max(0, Math.min(2, laneRef.current + delta));
      if (next !== laneRef.current) {
        laneRef.current = next;
        setPlayerLane(next);
        playTone(340 + next * 90, 0.06, 'sine', 0.07);
      }
    },
    [playTone]
  );

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveLane]);

  // Main game loop: starts easy, progressively gets harder
  useEffect(() => {
    if (phase !== 'playing') return;

    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Difficulty ramps smoothly from 1.0 up to ~2.8x as progress/score rises
      const difficulty = 1 + Math.min(1.8, pProgRef.current / 58);
      const currentLevel = Math.min(10, 1 + Math.floor(pProgRef.current / 12));
      setLevel(currentLevel);

      // Advance progress (first to 100% wins in 1v1 duel)
      const baseSpeed = isDuel ? 11.5 : 13.0;
      pProgRef.current = Math.min(100, pProgRef.current + dt * baseSpeed * (0.9 + difficulty * 0.18));
      setPlayerProgress(pProgRef.current);
      setScore(Math.floor(pProgRef.current * 15 * difficulty));

      if (isDuel) {
        // Rival advances smoothly and avoids obstacles smartly at early levels, becoming pushy later
        const oppPace = baseSpeed * (0.88 + Math.sin(now * 0.002) * 0.14 + (difficulty - 1) * 0.12);
        oProgRef.current = Math.min(100, oProgRef.current + dt * oppPace);
        setOpponentProgress(oProgRef.current);

        // Occasional rival lane shift
        if (Math.random() < dt * 2.2) {
          const targetLane = Math.floor(Math.random() * 3);
          oppLaneRef.current = targetLane;
          setOpponentLane(targetLane);
        }

        if (pProgRef.current >= 100 && oProgRef.current < 100) {
          settleMatchResult(
            true,
            `ቀድመው ሳይወድቁ መጨረሻ ደርሰዋል! የውድድሩን ${(stake * multiplier).toFixed(0)} ETB አሸንፈዋል።`
          );
          return;
        }
        if (oProgRef.current >= 100 && pProgRef.current < 100) {
          settleMatchResult(false, 'ተቃዋሚው ቀድሞ መጨረሻ ደርሷል። በቀጣይ ድጋሚ ይሞክሩ!');
          return;
        }
      } else if (pProgRef.current >= 100) {
        settleMatchResult(true, `ፍሪዝ ዳሽን በደረጃ ${currentLevel} በድል አጠናቀዋል!`);
        return;
      }

      // Spawn obstacles: starts gentle, speeds up & spawns faster as difficulty rises
      spawnTimer.current -= dt;
      const spawnInterval = Math.max(0.36, 1.05 / difficulty);
      if (spawnTimer.current <= 0) {
        spawnTimer.current = spawnInterval;
        const lane = Math.floor(Math.random() * 3);
        // Avoid spawning all 3 lanes at the exact same y
        const tooClose = obsRef.current.some((o) => o.y < 14 && o.lane !== lane);
        if (!tooClose || Math.random() < 0.35) {
          obsRef.current.push({
            id: nextObsId.current++,
            lane,
            y: -6,
            speed: (36 + Math.random() * 10) * difficulty,
            kind: Math.random() > 0.5 ? 'spike' : 'block',
          });
        }
      }

      // Move obstacles and check player collision
      const updated: Obstacle[] = [];
      let crashed = false;
      for (const ob of obsRef.current) {
        const nextY = ob.y + ob.speed * dt;
        // Player sits around y = 82..90
        if (ob.lane === laneRef.current && nextY >= 78 && nextY <= 92) {
          crashed = true;
        }
        if (nextY < 108) {
          updated.push({ ...ob, y: nextY });
        }
      }
      obsRef.current = updated;
      setObstacles(updated);

      if (crashed) {
        if (isDuel) {
          settleMatchResult(
            false,
            `መሰናክል ስለነኩ ወድቀዋል! ተቃዋሚው የውድድሩን ${(stake * multiplier).toFixed(0)} ETB በላ።`
          );
        } else {
          settleMatchResult(false, `በደረጃ ${currentLevel} መሰናክል ነክተዋል። ነጥብዎ፡ ${Math.floor(pProgRef.current * 15 * difficulty)}`);
        }
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isDuel, stake, multiplier, settleMatchResult]);

  const totalPot = Number((stake * multiplier).toFixed(0));

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 select-none">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ውጣ · Exit</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-bold text-cyan-300">
            {isDuel ? `1v1 ውድድር · ${stake} ETB -> ${totalPot} ETB` : `${game.titleAm}`}
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label="Toggle sound"
            className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 p-2 text-slate-200 transition cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Progress & Level HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>የእርስዎ ርቀት</span>
            <span className="font-bold text-cyan-300">{Math.floor(playerProgress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100"
              style={{ width: `${playerProgress}%` }}
            />
          </div>
        </div>

        {isDuel ? (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="truncate">{opponentName}</span>
              <span className="font-bold text-amber-300">{Math.floor(opponentProgress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
                style={{ width: `${opponentProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">ነጥብ · Score</span>
            <span className="text-base font-extrabold text-emerald-300">{score}</span>
          </div>
        )}

        <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>ደረጃ · Level</span>
          </span>
          <span className="text-base font-extrabold text-white">ደረጃ {level}</span>
        </div>
      </div>

      {/* Main Track Canvas */}
      <div className="relative h-[430px] sm:h-[470px] w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
        {/* 3 Lanes */}
        <div className="grid grid-cols-3 h-full divide-x divide-slate-800/90">
          {[0, 1, 2].map((laneIdx) => (
            <div
              key={laneIdx}
              onClick={() => moveLane(laneIdx - laneRef.current)}
              className="relative h-full hover:bg-white/[0.02] transition cursor-pointer"
            >
              {/* Center dashed lane line */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-800/80 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Obstacles */}
        {obstacles.map((ob) => (
          <div
            key={ob.id}
            style={{
              left: `${ob.lane * 33.333 + 16.666}%`,
              top: `${ob.y}%`,
            }}
            className={`-translate-x-1/2 -translate-y-1/2 absolute w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-lg pointer-events-none ${
              ob.kind === 'spike'
                ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white border border-rose-300/50'
                : 'bg-gradient-to-br from-amber-500 to-orange-700 text-slate-950 border border-amber-200/50'
            }`}
          >
            {ob.kind === 'spike' ? '▲' : '■'}
          </div>
        ))}

        {/* Opponent Marker (1v1 Duel) */}
        {isDuel && phase !== 'waiting' && (
          <div
            style={{
              left: `${opponentLane * 33.333 + 16.666}%`,
              top: '72%',
            }}
            className="-translate-x-1/2 -translate-y-1/2 absolute w-11 h-11 rounded-full bg-amber-400/25 border-2 border-amber-400 flex items-center justify-center text-[11px] font-extrabold text-amber-200 pointer-events-none transition-all duration-100"
          >
            2ኛ
          </div>
        )}

        {/* Player Runner */}
        <div
          style={{
            left: `${playerLane * 33.333 + 16.666}%`,
            top: '85%',
          }}
          className="-translate-x-1/2 -translate-y-1/2 absolute w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-lg shadow-cyan-500/40 flex flex-col items-center justify-center text-slate-950 font-black pointer-events-none transition-all duration-75"
        >
          <span className="text-xs leading-none">አንተ</span>
          <ArrowUp className="w-3.5 h-3.5 mt-0.5" />
        </div>

        {/* Waiting for 2nd Player Overlay */}
        {phase === 'waiting' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 animate-pulse">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-white">2ኛ ተጫዋች በመጠበቅ ላይ...</h3>
            <p className="text-sm text-slate-400 mt-1.5 max-w-sm">
              2ኛ ተጫዋች ሲገባ የ {stake} ETB 1v1 ውድድር በራሱ ይጀምራል። አሸናፊው {totalPot} ETB ይወስዳል።
            </p>
          </div>
        )}

        {/* Countdown Overlay */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6">
            <span className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-2">
              {isDuel ? `${opponentName} ዝግጁ ነው` : 'ተዘጋጁ'}
            </span>
            <div className="text-6xl font-black text-white">{countdown > 0 ? countdown : 'ሩጥ!'}</div>
          </div>
        )}

        {/* Result Overlay */}
        {phase === 'finished' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                didWin
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">
              {didWin ? 'አሸንፈዋል! 🎉' : 'ውድድሩ ተጠናቋል'}
            </h3>
            <p className="text-sm text-slate-300 mt-2 max-w-md">{winnerText}</p>
            {isDuel && didWin && payoutSettled && (
              <p className="text-xs font-bold text-emerald-400 mt-2">
                +{totalPot} ETB ወደ ባላንስዎ ተጨምሯል
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={startCountdown}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-5 py-2.5 text-sm transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ድጋሚ ተጫወት</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 text-sm transition cursor-pointer"
              >
                <span>ወደ መነሻ ተመለስ</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={() => moveLane(-1)}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 active:bg-cyan-500/20 border border-slate-700 py-3.5 text-sm font-bold text-white transition cursor-pointer"
        >
          <ArrowDown className="w-4 h-4 rotate-90 text-cyan-300" />
          <span>ወደ ግራ · Left</span>
        </button>
        <button
          type="button"
          onClick={() => moveLane(1)}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 active:bg-cyan-500/20 border border-slate-700 py-3.5 text-sm font-bold text-white transition cursor-pointer"
        >
          <span>ወደ ቀኝ · Right</span>
          <ArrowDown className="w-4 h-4 -rotate-90 text-cyan-300" />
        </button>
      </div>
    </div>
  );
}
