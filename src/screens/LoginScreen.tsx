import { useState } from 'react';
import { Snowflake, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Field, Button } from '@/components/ui';

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshProfile } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password) {
      setError('ስልክ ቁጥርና የይለፍ ቃል / Phone and password required');
      return;
    }
    if (mode === 'signup' && !ageOk) {
      setError('18+ confirmation required / የ18+ ማረጋገጫ ያስፈልጋል');
      return;
    }
    setBusy(true);
    try {
      const email = `${phone.trim().replace(/[^0-9]/g, '')}@freezerun.et`;
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await refreshProfile();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(
        /already|registered/i.test(msg)
          ? 'መለያ ቀድሞ አለ / Account already exists'
          : /invalid|credentials/i.test(msg)
          ? 'ትክክለኛ መረጃ አልሆነም / Invalid credentials'
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-2xl shadow-cyan-500/40 mb-4">
            <Snowflake size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Freeze<span className="text-cyan-400">Run</span>
          </h1>
          <p className="text-slate-400 mt-1">3D Racing Arena · የውድድር መድረክ</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-slate-900/80 backdrop-blur border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
        >
          <Field
            label="ስልክ ቁጥር / Phone Number"
            type="tel"
            inputMode="tel"
            placeholder="09xxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Field
            label="የይለፍ ቃል / Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === 'signup' && (
            <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/[0.07] transition-colors">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-400/40 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300 leading-snug">
                እድሜዬ ፲፠ ላይ ነው። I confirm I am 18 years or older.
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full py-3 text-base">
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {mode === 'signin' ? 'ግባ · Sign In' : 'መለያ ይክፈቱ · Create Account'}
          </Button>

          <p className="text-center text-sm text-slate-400">
            {mode === 'signin' ? "መለያ የለዎትም? Don't have an account? " : 'መለያ አለዎት? Already registered? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-cyan-400 font-semibold hover:text-cyan-300"
            >
              {mode === 'signin' ? 'ይመዝገቡ · Register' : 'ይግቡ · Sign In'}
            </button>
          </p>

          <div className="flex items-center gap-2 justify-center pt-1 text-xs text-slate-500">
            <ShieldCheck size={14} />
            <span>18+ only · ለአዋቂዎች ብቻ</span>
          </div>
        </form>
      </div>
    </div>
  );
}
