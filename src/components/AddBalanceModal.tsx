import { useRef, useState } from 'react';
import { Upload, Phone, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/Modal';
import { Field, Button } from '@/components/ui';

const AMOUNTS = [50, 100, 500, 1000];

export default function AddBalanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [amount, setAmount] = useState<number>(100);
  const [sender, setSender] = useState('');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    setError(null);
    if (!sender.trim()) {
      setError('የከፋይ ስልክ/ሒሳብ ያስፈልጋል / Sender phone/account required');
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { data: req, error } = await supabase
        .from('deposit_requests')
        .insert({
          method,
          sender_identifier: sender.trim(),
          amount_etb: amount,
          reference: reference.trim() || null,
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;

      let screenshotPath: string | null = null;
      if (file && req?.id) {
        const ext = file.name.split('.').pop() || 'png';
        screenshotPath = `${userId}/${req.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('receipts')
          .upload(screenshotPath, file, { upsert: true });
        if (upErr) throw upErr;
        await supabase
          .from('deposit_requests')
          .update({ screenshot_path: screenshotPath })
          .eq('id', req.id);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(false);
    setSender('');
    setReference('');
    setFile(null);
    setAmount(100);
  }

  return (
    <Modal open={open} onClose={onClose} title="ገንዘብ ለማስገባት · Add Balance" wide>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-4xl">✅</p>
          <p className="text-white font-semibold">ጥያቄዎ ተልኳል · Request sent</p>
          <p className="text-sm text-slate-400">
            After the admin confirms your payment, your balance will be updated.
            ክፍያዎ ካረጋገጠ በኋላ ቀሪ ሂሳብዎ ይሞላል።
          </p>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>ዝጋ · Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('telebirr')}
              className={`flex items-center gap-2 rounded-xl border p-3.5 transition-all ${
                method === 'telebirr'
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <Phone size={18} className="text-cyan-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Telebirr</p>
                <p className="text-xs text-slate-400 tabular-nums">0990005099</p>
              </div>
            </button>
            <button
              onClick={() => setMethod('cbe')}
              className={`flex items-center gap-2 rounded-xl border p-3.5 transition-all ${
                method === 'cbe'
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <Building2 size={18} className="text-sky-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">CBE Bank</p>
                <p className="text-xs text-slate-400 tabular-nums">1000745883234</p>
              </div>
            </button>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-300 mb-1.5">መጠን / Amount (ETB)</span>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`rounded-xl border py-2.5 font-bold tabular-nums transition-all ${
                    amount === a
                      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="የከፋዩ ስልክ/ሒሳብ / Sender Phone or Account"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="09xxxxxxxx / CBE account"
          />
          <Field
            label="የደረሰኝ ቁጥር / Receipt Ref (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. TB12345678"
          />

          <div>
            <span className="block text-sm font-medium text-slate-300 mb-1.5">
              የደረሰኝ ስክሪንሾት / Receipt Screenshot (optional)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-4 text-sm text-slate-300 hover:bg-white/10 hover:border-cyan-400/40 transition-colors"
            >
              <Upload size={16} />
              {file ? file.name : 'ፋይል ይምረጡ · Choose file'}
            </button>
          </div>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>ሰርዝ · Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              ላክ · Submit
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
