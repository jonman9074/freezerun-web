import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/Modal';
import { Field, Button } from '@/components/ui';

export default function ClaimModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('ትክክለኛ መጠን ያስገቡ / Enter a valid amount');
      return;
    }
    if (profile && amt > profile.balance_etb) {
      setError('ቀሪ ሂሳብ አልበቃም / Insufficient balance');
      return;
    }
    if (!destination.trim()) {
      setError('የመቀበያ ስልክ/ሒሳብ ያስፈልጋል / Destination required');
      return;
    }
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc('apply_balance_change', {
        p_type: 'withdrawal',
        p_amount: amt,
        p_details: `Claim to ${destination.trim()}`,
      });
      if (rpcErr) throw rpcErr;
      const { error: reqErr } = await supabase.from('withdrawal_requests').insert({
        amount_etb: amt,
        destination: destination.trim(),
      });
      if (reqErr) throw reqErr;
      await refreshProfile();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ገንዘብ ለማስወጣት · Claim" wide>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-4xl">🏦</p>
          <p className="text-white font-semibold">ጥያቄዎ ተልኳል · Request sent</p>
          <p className="text-sm text-slate-400">
            Your claim is pending review. The amount was deducted from your balance.
            መጠኑ ከቀሪ ሂሳብዎ ተቀንሷል።
          </p>
          <Button variant="ghost" onClick={() => { setDone(false); onClose(); }}>ዝጋ · Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-emerald-300">ያለዎት / Available</span>
            <span className="font-bold text-emerald-300 tabular-nums">
              {(profile?.balance_etb ?? 0).toLocaleString()} ETB
            </span>
          </div>
          <Field
            label="መጠን / Amount (ETB)"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500"
          />
          <Field
            label="የመቀበያ ስልክ ወይም ሒሳብ / Destination Phone or Account"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="09xxxxxxxx"
          />
          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>ሰርዝ · Cancel</Button>
            <Button variant="success" onClick={submit} disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              ጠይቅ · Request
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
