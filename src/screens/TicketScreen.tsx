import { useEffect, useState } from 'react';
import { ArrowLeft, Ticket, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import type { GameDef } from '@/screens/HomeScreen';

const TICKETS = [50, 100, 500, 1000];

export default function TicketScreen({
  game,
  onEnter,
  onBack,
}: {
  game: GameDef;
  onEnter: (stake: number) => void;
  onBack: () => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const [multiplier, setMultiplier] = useState(2);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => data && setMultiplier(Number(data.value)));
  }, []);
  const [stake, setStake] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = profile?.balance_etb ?? 0;
  const affordable = stake !== null && stake <= balance;

  async function buyTicket() {
    if (stake === null) return;
    if (stake > balance) {
      setError('ቀሪ ሂሳብ አልበቃም · Insufficient balance — use "ገንዘብ ለማስገባት" to top up');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcErr } = await supabaseSafeBet(stake, game.titleEn);
    if (rpcErr) {
      setError(
        /insufficient/i.test(rpcErr)
          ? 'ቀሪ ሂሳብ አልበቃም · Insufficient balance'
          : 'ስህተት ተከስቷል · Something went wrong'
      );
      setBusy(false);
      return;
    }
    await refreshProfile();
    onEnter(stake);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={18} /> ተመለስ · Back
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-xl shadow-cyan-500/30 mb-4">
          <Ticket size={30} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">ትኬት ይግዙ</h1>
        <p className="text-cyan-300 font-semibold">Buy Ticket — {game.titleEn}</p>
        <p className="text-sm text-slate-400 mt-2">
          ድሎት መጠን፦ ውርርድ × {multiplier.toFixed(1)} · Payout: stake × {multiplier.toFixed(1)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {TICKETS.map((amt) => {
          const disabled = amt > balance;
          return (
            <button
              key={amt}
              onClick={() => !disabled && setStake(amt)}
              disabled={disabled}
              className={`relative rounded-2xl border p-5 text-center transition-all active:scale-95 ${
                stake === amt
                  ? 'border-cyan-400 bg-cyan-400/15 shadow-lg shadow-cyan-500/20'
                  : disabled
                  ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40'
              }`}
            >
              {stake === amt && (
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center">
                  <Check size={14} className="text-slate-950" strokeWidth={3} />
                </span>
              )}
              <p className="text-2xl font-extrabold text-white tabular-nums">{amt}</p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">ETB</p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 tabular-nums">
                wins {(amt * multiplier).toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between mb-6 text-sm">
        <span className="text-slate-400">ቀሪ ሂሳብ · Balance</span>
        <span className="font-bold text-emerald-300 tabular-nums">{balance.toLocaleString()} ETB</span>
      </div>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 mb-4">
          {error}
        </p>
      )}

      <Button
        onClick={buyTicket}
        disabled={stake === null || !affordable || busy}
        className="w-full py-4 text-lg"
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : null}
        {stake === null ? 'ትኬት ይምረጡ · Select a ticket' : `${stake} ETB — ግዢ · Buy`}
      </Button>
    </div>
  );
}

async function supabaseSafeBet(amount: number, game: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('apply_balance_change', {
    p_type: 'bet',
    p_amount: amount,
    p_game: game,
  });
  return { error: error?.message ?? null };
}
