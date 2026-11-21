import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Inbox,
  Wallet,
  Ban,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

interface PendingRow {
  kind: 'deposit' | 'withdrawal';
  id: string;
  user_id: string;
  phone: string;
  amount_etb: number;
  method: string | null;
  sender_identifier: string | null;
  reference: string | null;
  screenshot_path: string | null;
  destination: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  phone: string;
  full_name: string | null;
  balance_etb: number;
  blocked: boolean;
  created_at: string;
}

type Tab = 'requests' | 'users' | 'settings';

export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>('requests');
  const [rows, setRows] = useState<PendingRow[] | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [payout, setPayout] = useState('');

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('admin_pending_requests');
    if (rpcErr) {
      setError('የአስተዳደር መብት የለም · Not authorized as admin');
      setRows([]);
      return;
    }
    setRows((data ?? []) as PendingRow[]);
    const { data: u } = await supabase.rpc('admin_list_users');
    setUsers((u ?? []) as UserRow[]);
  }, []);

  useEffect(() => {
    load();
    supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'payout_multiplier')
      .maybeSingle()
      .then(({ data }) => data && setPayout(String(data.value)));
  }, [load]);

  async function toggleBlock(u: UserRow) {
    setBusyId(u.id);
    setError(null);
    setNotice(null);
    const { error: rpcErr } = await supabase.rpc('admin_set_blocked', {
      p_user_id: u.id,
      p_blocked: !u.blocked,
    });
    if (rpcErr) setError('ስህተት ተከስቷል · Could not update user');
    else setNotice(u.blocked ? `${u.phone} ተከፍቷል · unblocked` : `${u.phone} ተዘግቷል · blocked`);
    setBusyId(null);
    await load();
  }

  async function savePayout() {
    const val = Number(payout);
    if (!val || val < 1) {
      setError('ትክክለኛ መጠን ያስገቡ / Enter a multiplier of 1 or more');
      return;
    }
    setError(null);
    const { error: rpcErr } = await supabase.rpc('admin_set_setting', {
      p_key: 'payout_multiplier',
      p_value: val,
    });
    if (rpcErr) setError('ስህተት ተከስቷል · Could not save setting');
    else setNotice(`ተቀምጧል · Payout multiplier set to ${val}x`);
    await load();
  }

  async function resolve(row: PendingRow, approve: boolean) {
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    const fn = row.kind === 'deposit' ? 'admin_resolve_deposit' : 'admin_resolve_withdrawal';
    const { error: rpcErr } = await supabase.rpc(fn, {
      p_request_id: row.id,
      p_approve: approve,
    });
    if (rpcErr) {
      setError('ስህተት ተከስቷል · Could not process the request');
    } else {
      setNotice(
        approve
          ? row.kind === 'deposit'
            ? `ተቀብለናል · Deposit of ${row.amount_etb} ETB credited to ${row.phone}`
            : `ተከፍሏል · Withdrawal of ${row.amount_etb} ETB marked paid for ${row.phone}`
          : `ተከልክሏል · ${row.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected${row.kind === 'withdrawal' ? ' and refunded' : ''}`
      );
    }
    setBusyId(null);
    await load();
  }

  async function viewScreenshot(row: PendingRow) {
    if (!row.screenshot_path) return;
    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(row.screenshot_path, 600);
    setScreenshotUrl(data?.signedUrl ?? null);
  }

  async function saveBalance() {
    if (!editingUser) return;
    const val = Number(newBalance);
    if (!val || val < 0) {
      setError('ትክክለኛ መጠን ያስገቡ / Enter a valid non-negative amount');
      return;
    }
    setBusyId(editingUser.id);
    setError(null);
    const { error: rpcErr } = await supabase.rpc('admin_set_balance', {
      p_user_id: editingUser.id,
      p_new_balance: val,
    });
    if (rpcErr) setError('ስህተት ተከስቷል · Could not update balance');
    else setNotice(`ተቀይሟል · ${editingUser.phone} balance set to ${val} ETB`);
    setBusyId(null);
    setEditingUser(null);
    setNewBalance('');
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setTab('requests')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'requests' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Inbox size={16} /> ጥያቄዎች · Requests
            {rows && rows.length > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                {rows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'users' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Users size={16} /> ተጠቃሚዎች · Users
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'settings' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Settings size={16} /> ቅንብሮች · Settings
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            {notice}
          </p>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {rows === null ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-cyan-400" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Inbox size={36} className="mx-auto mb-3 opacity-50" />
                ጥያቄ የለም · No pending requests
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={`${row.kind}-${row.id}`}
                  className="rounded-2xl bg-slate-900 border border-white/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wide rounded-full px-2.5 py-0.5 ${
                            row.kind === 'deposit'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-sky-500/15 text-sky-400'
                          }`}
                        >
                          {row.kind === 'deposit' ? 'ገቢ · Deposit' : 'ወጪ · Withdrawal'}
                        </span>
                        <span className="text-sm text-slate-400">{row.phone}</span>
                      </div>
                      <p className="text-2xl font-extrabold tabular-nums">
                        {row.amount_etb.toLocaleString()} <span className="text-sm text-slate-400">ETB</span>
                      </p>
                      {row.kind === 'deposit' && (
                        <p className="text-sm text-slate-400 mt-1">
                          {row.method === 'telebirr' ? 'Telebirr' : 'CBE'} · from{' '}
                          {row.sender_identifier}
                          {row.reference && ` · Ref: ${row.reference}`}
                        </p>
                      )}
                      {row.kind === 'withdrawal' && (
                        <p className="text-sm text-slate-400 mt-1">
                          Pay to: {row.destination}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {row.kind === 'deposit' && row.screenshot_path && (
                        <Button
                          variant="ghost"
                          onClick={() => viewScreenshot(row)}
                          className="text-sm py-2"
                        >
                          ደረሰኝ · Receipt
                        </Button>
                      )}
                      <Button
                        variant="success"
                        onClick={() => resolve(row, true)}
                        disabled={busyId === row.id}
                        className="text-sm py-2"
                      >
                        <CheckCircle2 size={16} /> አጽድቅ · Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => resolve(row, false)}
                        disabled={busyId === row.id}
                        className="text-sm py-2"
                      >
                        <XCircle size={16} /> አትቀበል · Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-2">
            {users === null ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-cyan-400" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-12 text-slate-500">ተጠቃሚ የለም · No users</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-white/10 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{u.phone}</p>
                    <p className="text-sm text-slate-400">{u.full_name || '—'}</p>
                    <p className="text-xs text-slate-500">
                      joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-bold tabular-nums text-emerald-300">
                      <Wallet size={16} /> {u.balance_etb.toLocaleString()} ETB
                    </span>
                    {u.blocked && (
                      <span className="rounded-full bg-rose-500/15 text-rose-400 text-xs font-bold px-2.5 py-1">
                        የታገደ · Blocked
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      className="text-sm py-2"
                      onClick={() => {
                        setEditingUser(u);
                        setNewBalance(String(u.balance_etb));
                      }}
                    >
                      ቀይር · Edit
                    </Button>
                    <Button
                      variant={u.blocked ? 'success' : 'danger'}
                      className="text-sm py-2"
                      onClick={() => toggleBlock(u)}
                      disabled={busyId === u.id}
                    >
                      <Ban size={14} />
                      {u.blocked ? 'ክፈት · Unblock' : 'አግድ · Block'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 max-w-md">
            <h3 className="font-bold text-white mb-1">የድሎት መጠን · Payout Multiplier</h3>
            <p className="text-sm text-slate-400 mb-4">
              Winning players receive stake × this value. Defaults to 2.0x.
              አሸናፊዎች ውርርድ × ይህንን መጠን ያገኛሉ።
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="0.1"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                className="w-32 rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />
              <Button onClick={savePayout}>አረጋግጥ · Save</Button>
            </div>
            <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Applies to both games immediately.
            </p>
          </div>
        )}

      {/* screenshot viewer */}
      {screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setScreenshotUrl(null)}
        >
          <img
            src={screenshotUrl}
            alt="Receipt"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* edit balance modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl animate-pop-in">
            <h3 className="text-lg font-bold mb-1">ቀሪ ሂሳብ ቀይር · Set Balance</h3>
            <p className="text-sm text-slate-400 mb-4">{editingUser.phone}</p>
            <div className="mb-4">
              <span className="block text-sm font-medium text-slate-300 mb-1.5">
                አዲስ መጠን / New Balance (ETB)
              </span>
              <input
                type="number"
                min="0"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />
              <p className="text-xs text-slate-500 mt-2">
                The difference is logged as an adjustment transaction.
                ልዩነቱ እንደ ማስተካከያ ይመዘገባል።
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                ሰርዝ · Cancel
              </Button>
              <Button onClick={saveBalance} disabled={busyId === editingUser.id}>
                {busyId === editingUser.id && <Loader2 size={16} className="animate-spin" />}
                አረጋግጥ · Save
              </Button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}
