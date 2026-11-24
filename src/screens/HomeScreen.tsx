import { useEffect, useState } from 'react';
import { Swords, Zap, Play, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface GameDef {
  id: 'freeze-duel' | 'freeze-dash';
  titleAm: string;
  titleEn: string;
  descAm: string;
  descEn: string;
  accent: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'freeze-duel',
    titleAm: '1v1 ፍሪዝ ዱኤል · የገንዘብ ውድድር',
    titleEn: '1v1 Freeze Duel · Stake Match',
    descAm:
      '1ኛ ተጫዋች በብሩ ይገባል፣ 2ኛ ተጫዋች ሲመጣ ውድድሩ ይጀምራል። መጀመሪያ ቀላል ሆኖ እየከበደ ይሄዳል — ቀድሞ ወይም ሳይወድቅ ያለፈ ብሩን ይበላል!',
    descEn:
      '1v1 online stake match. Waits for player 2, starts when matched, ramps difficulty smoothly, and first clean finisher wins the pot.',
    accent: 'from-cyan-500/20 to-blue-600/20 border-cyan-400/40',
  },
  {
    id: 'freeze-dash',
    titleAm: 'ፍሪዝ ዳሽ · ፈጣን ውድድር',
    titleEn: 'Freeze Dash · Arcade Run',
    descAm:
      'ንጹሕ እና ፈጣን የመሰናክል ውድድር። ቀላል ጀምሮ ደረጃ በደረጃ እየከበደ የሚሄድ አጓጊ ጨዋታ።',
    descEn:
      'Clean, fast-paced obstacle & speed run that starts easy and gets progressively more challenging.',
    accent: 'from-emerald-500/20 to-teal-600/20 border-emerald-400/40',
  },
];

export default function HomeScreen({ onStart }: { onStart: (game: GameDef) => void }) {
  const { profile } = useAuth();
  const [multiplier, setMultiplier] = useState<number>(2);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.value !== undefined) {
          const parsed = Number(data.value);
          if (!Number.isNaN(parsed) && parsed > 0) setMultiplier(parsed);
        }
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            እንኳን ደህና መጡ{profile?.full_name ? `፣ ${profile.full_name}` : ''} 👋
          </h1>
          <p className="text-slate-400 mt-1">
            የሚፈልጉትን ጨዋታ ይምረጡ — 1v1 ውድድር ወይም ፍሪዝ ዳሽ
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-400/30 px-3.5 py-1.5 text-xs font-semibold text-cyan-300">
          <ShieldCheck className="w-4 h-4" />
          <span>ገንዘብ ማውጣት ቢያንስ 600 ETB</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {GAMES.map((game) => {
          const isDuel = game.id === 'freeze-duel';
          return (
            <div
              key={game.id}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${game.accent} p-6 shadow-xl transition hover:-translate-y-0.5`}
            >
              <div className="absolute inset-0 bg-slate-950/75 pointer-events-none" />
              <div className="relative flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        isDuel
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950'
                          : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950'
                      }`}
                    >
                      {isDuel ? <Swords className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                      {isDuel ? `1v1 · ${multiplier.toFixed(1)}x ሽልማት` : 'ቀላል -> ከባድ'}
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold text-white">{game.titleAm}</h2>
                  <p className="text-xs font-semibold text-cyan-300/90 mt-0.5">{game.titleEn}</p>
                  <p className="text-slate-300 text-sm leading-relaxed mt-3">{game.descAm}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {isDuel ? '2ኛ ተጫዋች ሲገባ ይጀምራል' : 'ደረጃ እየጨመረ ይከብዳል'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onStart(game)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-950 transition cursor-pointer ${
                      isDuel
                        ? 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110'
                        : 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ጀምር · Start</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500 mt-10">
        18+ · በኃላፊነት ይጫወቱ · Play responsibly
      </p>
    </div>
  );
}
