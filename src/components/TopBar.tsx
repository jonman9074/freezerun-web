import { useState, useRef, useEffect } from 'react';
import {
  Snowflake,
  Wallet,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
  History,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { WalletModal } from '@/components/WalletModal';
import { TransactionsModal } from '@/components/TransactionsModal';

export const MIN_WITHDRAWAL_ETB = 600;

type MenuTab = 'profile' | 'balance' | 'admin' | 'transactions' | 'rules' | null;

interface TopBarProps {
  onAdminDashboard?: () => void;
  isAdminDashboard?: boolean;
}

export default function TopBar({ onAdminDashboard, isAdminDashboard = false }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>(null);
  const [walletModal, setWalletModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!profile) return null;

  const balanceNum = Number(profile.balance ?? 0);
  const canWithdraw = balanceNum >= MIN_WITHDRAWAL_ETB;

  const handleWithdrawClick = () => {
    setMenuOpen(false);
    if (!canWithdraw) {
      const remaining = Math.max(0, MIN_WITHDRAWAL_ETB - balanceNum).toFixed(2);
      setWithdrawNotice(
        `ገንዘብ ማውጣት የሚቻለው ቢያንስ ${MIN_WITHDRAWAL_ETB} ETB ሲደርሱ ብቻ ነው። የአሁኑ ባላንስዎ ${balanceNum.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ETB ነው (ተጨማሪ ${remaining} ETB ያስፈልጋል)።`
      );
      return;
    }
    setWithdrawNotice(null);
    setWalletModal('withdraw');
  };

  const menuItems: { key: MenuTab; label: string; sub: string; show: boolean }[] = [
    { key: 'profile', label: 'መገለጫ እና አድራሻ', sub: 'Profile & Address', show: true },
    { key: 'balance', label: 'የሂሳብ ሚዛን', sub: 'Wallet Balance', show: true },
    {
      key: 'admin',
      label: isAdminDashboard ? 'ወደ ጨዋታ ተመለስ' : 'የአስተዳዳሪ ዳሽቦርድ',
      sub: isAdminDashboard ? 'Back to Arena' : 'Admin Panel',
      show: profile.role === 'admin',
    },
    { key: 'transactions', label: 'ግብይቶች', sub: 'Transactions', show: true },
    { key: 'rules', label: 'ህጎች እና መመሪያ', sub: 'Rules & Help', show: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20 shrink-0">
              <Snowflake className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-white tracking-tight truncate">
              FreezeRun
            </span>
          </div>

          {/* Right Controls: Balance + Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setWithdrawNotice(null);
                setWalletModal('deposit');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 px-3 py-1.5 text-xs sm:text-sm font-bold text-cyan-300 transition cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>
                {balanceNum.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ETB
              </span>
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-white transition cursor-pointer"
              >
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-extrabold">
                  {(profile.full_name || 'U').slice(0, 2).toUpperCase()}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-sm font-bold text-white truncate">
                      {profile.full_name || 'ተጫዋች'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{profile.phone || profile.role}</p>
                  </div>

                  {menuItems
                    .filter((item) => item.show)
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          if (item.key === 'admin' && onAdminDashboard) {
                            onAdminDashboard();
                          } else if (item.key === 'transactions') {
                            setTxModalOpen(true);
                          } else {
                            setActiveTab(item.key);
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-100">{item.label}</div>
                          <div className="text-[11px] text-slate-400">{item.sub}</div>
                        </div>
                        {item.key === 'admin' && <Shield className="w-4 h-4 text-amber-400" />}
                        {item.key === 'transactions' && <History className="w-4 h-4 text-cyan-400" />}
                        {item.key === 'profile' && <UserIcon className="w-4 h-4 text-slate-400" />}
                      </button>
                    ))}

                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleWithdrawClick}
                      className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                        canWithdraw
                          ? 'hover:bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">ገንዘብ አውጣ · Withdraw</div>
                        <div className="text-[11px]">
                          {canWithdraw
                            ? 'ዝግጁ ነው (ቢያንስ 600 ETB)'
                            : `ቢያንስ ${MIN_WITHDRAWAL_ETB} ETB ያስፈልጋል`}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ውጣ · Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {withdrawNotice && (
          <div className="bg-amber-500/15 border-t border-amber-400/30 px-4 py-2.5 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{withdrawNotice}</span>
              <button
                type="button"
                onClick={() => setWithdrawNotice(null)}
                className="ml-auto text-amber-300 underline font-bold cursor-pointer"
              >
                ዝጋ
              </button>
            </div>
          </div>
        )}
      </header>

      {activeTab && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl">
            <h3 className="text-lg font-extrabold mb-3">
              {activeTab === 'profile' && 'መገለጫ · Profile'}
              {activeTab === 'balance' && 'የሂሳብ ሚዛን · Balance'}
              {activeTab === 'rules' && 'ህጎች እና የገንዘብ ማውጣት መመሪያ'}
            </h3>

            {activeTab === 'profile' && (
              <div className="space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-400">ስም：</span> {profile.full_name || '-'}</p>
                <p><span className="text-slate-400">ስልክ：</span> {profile.phone || '-'}</p>
                <p><span className="text-slate-400">ደረጃ：</span> {profile.role}</p>
              </div>
            )}

            {activeTab === 'balance' && (
              <div className="space-y-3 text-sm text-slate-300">
                <p className="text-2xl font-black text-cyan-300">
                  {balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                </p>
                <p className="text-xs text-slate-400">
                  ገንዘብ ማውጣት የሚቻለው ባላንስዎ ቢያንስ {MIN_WITHDRAWAL_ETB} ETB ሲደርስ ብቻ ነው።
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(null);
                    handleWithdrawClick();
                  }}
                  className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2.5 text-xs transition cursor-pointer"
                >
                  ገንዘብ ለማውጣት ሞክር (ቢያንስ 600 ETB)
                </button>
              </div>
            )}

            {activeTab === 'rules' && (
              <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5 leading-relaxed">
                <li>1v1 ፍሪዝ ዱኤል፡ 1ኛ ተጫዋች በገንዘቡ ይገባል፣ 2ኛ ተጫዋች ሲገባ ውድድሩ ይጀምራል።</li>
                <li>መጀመሪያ ቀላል ሆኖ ወደ ፊት እየሄዱ ሲሄዱ ፍጥነትና መሰናክሎች እየከበዱ ይሄዳሉ።</li>
                <li>ሳይወድቁ ቀድመው ያለፉ የውድድሩን ገንዘብ ያሸንፋሉ።</li>
                <li>ገንዘብ ማውጣት የሚቻለው ቢያንስ {MIN_WITHDRAWAL_ETB} ETB ሲደርሱ ብቻ ነው።</li>
              </ul>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                ዝጋ · Close
              </button>
            </div>
          </div>
        </div>
      )}

      {walletModal && (
        <WalletModal
          mode={walletModal === 'withdraw' && !canWithdraw ? 'deposit' : walletModal}
          onClose={() => setWalletModal(null)}
        />
      )}

      {txModalOpen && (
        <TransactionsModal onClose={() => setTxModalOpen(false)} />
      )}
    </>
  );
}
