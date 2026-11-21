import { useEffect, useRef, useState } from 'react';
import {
  Snowflake,
  Wallet,
  UserCircle,
  ChevronDown,
  User,
  PlusCircle,
  Banknote,
  Receipt,
  ScrollText,
  ShieldCheck,
  LogOut,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/Modal';
import { Field, Button } from '@/components/ui';
import ProfileModal from '@/components/ProfileModal';
import AddBalanceModal from '@/components/AddBalanceModal';
import ClaimModal from '@/components/ClaimModal';
import TransactionsModal from '@/components/TransactionsModal';
import RulesModal from '@/components/RulesModal';

type Panel = 'profile' | 'balance' | 'claim' | 'transactions' | 'rules' | null;

export default function TopBar({
  onAdminDashboard,
  isAdminDashboard = false,
}: {
  onAdminDashboard?: () => void;
  isAdminDashboard?: boolean;
}) {
  const { profile, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items: { key: Panel; icon: typeof User; label: string; sub: string }[] = [
    { key: 'profile', icon: User, label: 'መገለጫ እና የይለፍ ቃል', sub: 'Profile & Password' },
    { key: 'balance', icon: PlusCircle, label: 'ገንዘብ ለማስገባት', sub: 'Add Balance' },
    { key: 'claim', icon: Banknote, label: 'ገንዘብ ለማስወጣት', sub: 'Claim' },
    { key: 'transactions', icon: Receipt, label: 'ግብይቶች', sub: 'Transactions' },
    { key: 'rules', icon: ScrollText, label: 'ህጎች እና ፲፠+', sub: 'Rules & 18+' },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center shrink-0">
              <Snowflake size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight truncate">
              Freeze<span className="text-cyan-400">Run</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5" ref={menuRef}>
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/30 pl-3 pr-4 py-1.5">
              <Wallet size={16} className="text-emerald-400" />
              <span className="text-emerald-300 font-bold tabular-nums">
                {(profile?.balance_etb ?? 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-emerald-400/80 text-xs font-semibold">ETB</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center text-white text-xs font-bold">
                  {(profile?.phone ?? 'U').slice(-2)}
                </span>
                <span className="hidden sm:block text-sm text-slate-200 max-w-[120px] truncate">
                  {profile?.full_name || user?.email?.split('@')[0]?.replace(/\D/g, '') || 'User'}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-pop-in origin-top-right">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                    <UserCircle size={36} className="text-cyan-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {profile?.full_name || 'Player'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{profile?.phone}</p>
                    </div>
                  </div>
                  {onAdminDashboard && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onAdminDashboard();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/10 transition-colors text-left border-b border-white/5"
                    >
                      <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                      <span>
                        <span className="block text-sm text-amber-300">የአስተዳደር ዳሽቦርድ</span>
                        <span className="block text-xs text-slate-400">Admin Dashboard</span>
                      </span>
                    </button>
                  )}
                  {items.map(({ key, icon: Icon, label, sub }) => (
                    <button
                      key={sub}
                      onClick={() => {
                        setMenuOpen(false);
                        setPanel(key);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                    >
                      <Icon size={18} className="text-cyan-400 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm text-white">{label}</span>
                        <span className="block text-xs text-slate-400">{sub}</span>
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await supabase.auth.signOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 transition-colors text-left border-t border-white/10"
                  >
                    <LogOut size={18} className="text-rose-400 shrink-0" />
                    <span>
                      <span className="block text-sm text-rose-300">ውጣ</span>
                      <span className="block text-xs text-slate-400">Log Out</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ProfileModal open={panel === 'profile'} onClose={() => setPanel(null)} />
      <AddBalanceModal open={panel === 'balance'} onClose={() => setPanel(null)} />
      <ClaimModal open={panel === 'claim'} onClose={() => setPanel(null)} />
      <TransactionsModal open={panel === 'transactions'} onClose={() => setPanel(null)} />
      <RulesModal open={panel === 'rules'} onClose={() => setPanel(null)} />
    </>
  );
}
