import { useEffect, useState } from 'react';
import { Snowflake, Trophy, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface GameDef {
  id: 'freeze-run' | 'horse-derby';
  titleAm: string;
  titleEn: string;
  descAm: string;
  descEn: string;
  accent: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'freeze-run',
    titleAm: 'ፍሪዝ ሩጫ',
    titleEn: 'Freeze Run',
    descAm: 'በበረዶ መንገድ ላይ የሚሮጡ 4 ተወዳዳሪዎች። አንዱን ይምረጡ።',
    descEn: '4 racers on an ice track. Pick your runner and sprint to the finish.',
    accent: 'from-cyan-500/30 to-sky-600/10 border-cyan-400/30',
  },
  {
    id: 'horse-derby',
    titleAm: 'የፈረስ ግልቢያ ውድድር',
    titleEn: 'Horse Derby',
    descAm: '4 ፈረሶች በአሸዋማ መስክ ይደወላሉ። የእርስዎ ፈረስ ማን ነው?',
    descEn: '4 horses battle on the dirt track. Back the one you believe in.',
    accent: 'from-amber-500/30 to-orange-600/10 border-amber-400/30',
  },
];

export default function HomeScreen({ onStart }: { onStart: (game: GameDef) => void }) {
  const { profile } = useAuth();
  const [multiplier, setMultiplier] = useState(2);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => data && setMultiplier(Number(data.value)));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          ሰላም{profile?.full_name ? `, ${profile.full_name}` : ''}! 👋
        </h1>
        <p className="text-slate-400 mt-1">ጨዋታ ይምረጡ · Choose a game to begin</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br ${game.accent} p-6 transition-transform hover:-translate-y-1 duration-200`}
          >
            <div className="absolute inset-0 bg-slate-950/70" />
            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                    game.id === 'freeze-run'
                      ? 'bg-gradient-to-br from-cyan-400 to-sky-600 shadow-cyan-500/30'
                      : 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/30'
                  }`}
                >
                  {game.id === 'freeze-run' ? (
                    <Snowflake size={28} className="text-white" />
                  ) : (
                    <Trophy size={28} className="text-white" />
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  {multiplier.toFixed(1)}x
                </span>
              </div>

              <h2 className="text-xl font-bold text-white">{game.titleAm}</h2>
              <p className="text-cyan-300/90 text-sm font-semibold mb-2">{game.titleEn}</p>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">{game.descAm}</p>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed -mt-4">{game.descEn}</p>

              <button
                onClick={() => onStart(game)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-sky-400 hover:shadow-cyan-400/40 active:scale-95"
              >
                <Play size={18} fill="currentColor" />
                ጀምር · Start
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-600 mt-10">
        18+ · በሀብታትዎ ተጠያቂነት ይጫወቱ · Play responsibly
      </p>
    </div>
  );
}
