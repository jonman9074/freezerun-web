import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { initRaceScene, RACERS } from '@/lib/raceScene';
import type { GameDef } from '@/screens/HomeScreen';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Phase = 'pick' | 'countdown' | 'race' | 'result';

export default function ArenaScreen({
  game,
  stake,
  onExit,
}: {
  game: GameDef;
  stake: number;
  onExit: () => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof initRaceScene> | null>(null);
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [modelsReady, setModelsReady] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [count, setCount] = useState(3);
  const [winner, setWinner] = useState<number | null>(null);
  const [standings, setStandings] = useState<number[]>([]);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const mode = game.id === 'horse-derby' ? 'derby' : 'run';
  const [multiplier, setMultiplier] = useState(2);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => data && setMultiplier(Number(data.value)));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    setModelsReady(false);
    const scene = initRaceScene(mountRef.current, mode);
    sceneRef.current = scene;
    scene.onLoad(() => setModelsReady(true));
    return () => {
      cancelAnimationFrame(rafRef.current);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      startRace();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  function pick(num: number) {
    if (!modelsReady) return;
    setPicked(num);
    setPhase('countdown');
    setCount(3);
  }

  function startRace() {
    setPhase('race');
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setRacing(true);

    // random winner, weighted per-racer base speed
    const speeds = RACERS.map(() => 0.75 + Math.random() * 0.5);
    const fracs = RACERS.map(() => 0);
    const orders: number[] = [];

    const clock = { v: 0 };
    let last = performance.now();
    let leaderFrac = 0;

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      clock.v += dt;

      let lead = -Infinity;
      fracs.forEach((f, i) => {
        if (f >= 1) return;
        const wob = Math.sin(clock.v * 3 + i * 2.3) * 0.04;
        fracs[i] = Math.min(1, f + ((speeds[i] + wob) * dt) / 26);
        if (fracs[i] > lead) lead = fracs[i];
        scene!.setProgress(i, fracs[i]);
      });
      leaderFrac = Math.max(0, lead === -Infinity ? leaderFrac : lead);
      scene!.followLeader(leaderFrac);

      const done = fracs.filter((f) => f >= 1).length;
      fracs.forEach((f, i) => {
        if (f >= 1 && !orders.includes(i + 1)) orders.push(i + 1);
      });

      if (orders.length < RACERS.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        scene!.setRacing(false);
        const w = orders[0];
        setWinner(w);
        setStandings(orders);
        setPhase('result');
        settle(w);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function settle(winnerNum: number) {
    setSettling(true);
    const won = picked === winnerNum;
    if (won) {
      const { error } = await supabase.rpc('apply_balance_change', {
        p_type: 'win',
        p_amount: stake * multiplier,
        p_game: game.titleEn,
        p_details: `Racer #${winnerNum} won · stake ${stake} ETB`,
      });
      if (!error) await refreshProfile();
      setPayoutMsg(
        error
          ? 'ድሎት መመዝገብ አልተቻለምም — እባክዎ ድጋሚ ይሞክሩ · Could not credit win'
          : `+${stake * multiplier} ETB`
      );
    } else {
      setPayoutMsg(`-${stake} ETB`);
    }
    setSettling(false);
  }

  function playAgain() {
    const scene = sceneRef.current;
    scene?.setRacing(false);
    RACERS.forEach((_, i) => scene?.setProgress(i, 0));
    setWinner(null);
    setStandings([]);
    setPayoutMsg(null);
    setPicked(null);
    setPhase('pick');
  }

  const won = winner !== null && picked === winner;

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {/* top overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur border border-white/10 px-4 py-2 text-sm text-white hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={16} /> ወጣ · Exit
        </button>
        <div className="rounded-full bg-black/50 backdrop-blur border border-white/10 px-4 py-2 text-sm text-white">
          {game.titleAm} · {stake} ETB
        </div>
      </div>

      {/* pick overlay */}
      {phase === 'pick' && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-slate-950/40 p-4">
          <div className="w-full max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white text-center mb-1">አሽከርካሪ ይምረጡ</h2>
            <p className="text-sm text-slate-300 text-center mb-6">
              Pick your racer — {game.titleEn}
            </p>
            {!modelsReady && (
              <p className="flex items-center justify-center gap-2 text-sm text-cyan-300 mb-4">
                <Loader2 size={16} className="animate-spin" />
                አሽከርካሪዎች በመጫን ላይ... Loading 3D racers...
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RACERS.map((r) => (
                <button
                  key={r.num}
                  onClick={() => pick(r.num)}
                  disabled={!modelsReady}
                  className={`group rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur p-5 text-center transition-all hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-xl hover:shadow-cyan-500/20 active:scale-95 ${
                    modelsReady ? '' : 'opacity-50 cursor-wait'
                  }`}
                >
                  <span
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full text-2xl font-extrabold text-slate-950 mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `#${r.color.toString(16).padStart(6, '0')}` }}
                  >
                    {r.num}
                  </span>
                  <p className="font-bold text-white">{r.nameAm}</p>
                  <p className="text-xs text-slate-400">{r.nameEn}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            key={count}
            className="text-[9rem] font-black text-white drop-shadow-2xl animate-count-pulse"
          >
            {count === 0 ? 'GO!' : count}
          </div>
        </div>
      )}

      {/* result */}
      {phase === 'result' && winner !== null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-8 text-center shadow-2xl animate-pop-in">
            <p className="text-6xl mb-3">{won ? '🏆' : ' ❄️'}</p>
            <h2
              className={`text-3xl font-extrabold mb-1 ${
                won ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {won ? 'አሸነፉ · You Win!' : 'አልአሸነፉም · You Lost'}
            </h2>
            <p className="text-slate-300 mb-1">
              አሸናፊ፦ አሽከርካሪ #{winner} · Winner: Racer #{winner}
            </p>
            {settling ? (
              <p className="flex items-center justify-center gap-2 text-slate-400 my-4">
                <Loader2 size={16} className="animate-spin" /> በማስላት ላይ...
              </p>
            ) : (
              payoutMsg && (
                <p
                  className={`text-2xl font-bold tabular-nums my-4 ${
                    won ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {payoutMsg}
                </p>
              )
            )}
            {standings.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-6 text-sm text-slate-300 flex items-center justify-center gap-2">
                <span className="text-slate-500">ውጤት · Result:</span>
                {standings.map((n, i) => (
                  <span
                    key={n}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-full font-bold text-xs ${
                      i === 0 ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="ghost" onClick={onExit}>ወደ መነሻ · Home</Button>
              <Button onClick={playAgain}>እንደገና · Play Again</Button>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              ቀሪ ሂሳብዎ · Balance: {(profile?.balance_etb ?? 0).toLocaleString()} ETB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
