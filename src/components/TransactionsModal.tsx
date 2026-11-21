import { useEffect, useState } from 'react';
import { Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui';

interface Tx {
  id: string;
  type: string;
  amount_etb: number;
  game: string | null;
  details: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, { am: string; en: string }> = {
  bet: { am: 'ውርርድ', en: 'Bet' },
  win: { am: 'ድሎት', en: 'Win' },
  deposit: { am: 'ገቢ', en: 'Deposit' },
  withdrawal: { am: 'ወጪ', en: 'Withdrawal' },
};

export default function TransactionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[] | null>(null);

  useEffect(() => {
    if (open && user) {
      supabase
        .from('transactions')
        .select('id, type, amount_etb, game, details, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data }) => setRows(data ?? []));
    }
  }, [open, user]);

  return (
    <Modal open={open} onClose={onClose} title="ግብይቶች · Transactions" wide>
      {rows === null ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="animate-spin text-cyan-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 py-8">ግብይት የለም · No transactions yet</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {rows.map((tx) => {
            const isOut = tx.amount_etb < 0;
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 px-4 py-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isOut ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {isOut ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {TYPE_LABEL[tx.type]?.am} <span className="text-slate-400">· {TYPE_LABEL[tx.type]?.en}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {tx.game ? `${tx.game} — ` : ''}
                    {tx.details ?? ''}
                    {' '}
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-bold tabular-nums shrink-0 ${
                    isOut ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {tx.amount_etb > 0 ? '+' : ''}
                  {tx.amount_etb.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>ዝጋ · Close</Button>
      </div>
    </Modal>
  );
}
