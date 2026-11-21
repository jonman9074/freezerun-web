import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string;
  balance_etb: number;
  role: 'user' | 'admin';
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  setProfile: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function refreshProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, balance_etb, role')
      .eq('id', session!.user.id)
      .maybeSingle();
    if (!error && data) {
      setProfile({
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        balance_etb: Number(data.balance_etb),
        role: data.role,
      });
    }
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, setProfile, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
