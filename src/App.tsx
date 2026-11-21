import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import HomeScreen from '@/screens/HomeScreen';
import type { GameDef } from '@/screens/HomeScreen';
import TopBar from '@/components/TopBar';
import GameRulesModal from '@/components/GameRulesModal';
import TicketScreen from '@/screens/TicketScreen';
import ArenaScreen from '@/screens/ArenaScreen';
import AdminScreen from '@/screens/AdminScreen';

type View =
  | { screen: 'home' }
  | { screen: 'tickets'; game: GameDef }
  | { screen: 'arena'; game: GameDef; stake: number }
  | { screen: 'admin' };

function Shell() {
  const { session, profile } = useAuth();
  const [view, setView] = useState<View>({ screen: 'home' });
  const [rulesFor, setRulesFor] = useState<GameDef | null>(null);

  if (!session || !profile) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TopBar
        onAdminDashboard={
          profile.role === 'admin' ? () => setView({ screen: 'admin' }) : undefined
        }
        isAdminDashboard={view.screen === 'admin'}
      />
      {view.screen === 'admin' ? (
        <AdminScreen />
      ) : (
        <>
          {view.screen === 'home' && (
            <HomeScreen onStart={(game) => setRulesFor(game)} />
          )}
          {view.screen === 'tickets' && (
            <TicketScreen
              game={view.game}
              onEnter={(stake) =>
                setView({ screen: 'arena', game: view.game, stake })
              }
              onBack={() => setView({ screen: 'home' })}
            />
          )}
          {view.screen === 'arena' && (
            <ArenaScreen
              game={view.game}
              stake={view.stake}
              onExit={() => setView({ screen: 'home' })}
            />
          )}

          <GameRulesModal
            game={rulesFor}
            onClose={() => setRulesFor(null)}
            onPlay={() => {
              if (rulesFor) {
                setView({ screen: 'tickets', game: rulesFor });
                setRulesFor(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
