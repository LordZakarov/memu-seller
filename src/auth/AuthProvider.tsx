import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SellerProfile = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  subscription_status: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: SellerProfile | null;
  loading: boolean;
  isSubscribed: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string): Promise<SellerProfile | null> {
    const { data } = await supabase
      .from("users")
      .select("id,full_name,phone,role,is_active,subscription_status")
      .eq("id", uid)
      .maybeSingle();
    return data ?? null;
  }

  async function loadSession(s: Session | null) {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const p = await fetchProfile(s.user.id);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await loadSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setLoading(true);
      await loadSession(newSession);
      setLoading(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setUser(null);
  };

  const refreshProfile = async () => {
    if (user) { const p = await fetchProfile(user.id); setProfile(p); }
  };

  const isSubscribed = profile?.subscription_status === "active";

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isSubscribed, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
