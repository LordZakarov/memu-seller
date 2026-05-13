import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isSubscribed: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const initialised = useRef(false);

  async function fetchProfile(uid: string): Promise<Profile | null> {
    // Only select columns that actually exist on the users table
    // No subscription_status — that's in seller_subscriptions table
    const { data, error } = await supabase
      .from("users")
      .select("id,full_name,phone,email,role,is_active")
      .eq("id", uid)
      .eq("role", "seller")
      .maybeSingle();
    if (error) console.error("fetchProfile error:", error.message);
    return data ?? null;
  }

  async function fetchSubscription(uid: string): Promise<boolean> {
    const { data } = await supabase
      .from("seller_subscriptions")
      .select("id")
      .eq("seller_id", uid)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return !!data;
  }

  async function loadSession(s: Session | null) {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      const [p, sub] = await Promise.all([
        fetchProfile(s.user.id),
        fetchSubscription(s.user.id),
      ]);
      setProfile(p);
      setIsSubscribed(sub);
    } else {
      setProfile(null);
      setIsSubscribed(false);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!initialised.current) return;
      await loadSession(newSession);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      await loadSession(data.session);
      initialised.current = true;
      setLoading(false);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setUser(null); setIsSubscribed(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const [p, sub] = await Promise.all([
        fetchProfile(user.id),
        fetchSubscription(user.id),
      ]);
      setProfile(p);
      setIsSubscribed(sub);
    }
  };

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
