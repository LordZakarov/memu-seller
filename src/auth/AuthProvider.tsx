import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type SellerProfile = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
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
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Track if we've completed the initial session check
  const initialised = useRef(false);

  async function fetchProfile(uid: string): Promise<SellerProfile | null> {
    const { data } = await supabase
      .from("users")
      .select("id,full_name,phone,email,role,is_active,subscription_status")
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
    // 1. Subscribe to auth changes FIRST so we don't miss events
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Skip INITIAL_SESSION — we handle that below with getSession()
      // Only process subsequent events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
      if (!initialised.current) return;
      await loadSession(newSession);
    });

    // 2. Then do the one-time initial session hydration
    supabase.auth.getSession().then(async ({ data }) => {
      await loadSession(data.session);
      initialised.current = true;
      setLoading(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  const isSubscribed = profile?.subscription_status === "active";
  // User needs onboarding if logged in but has no profile row, or profile has no name
  const needsOnboarding = !!user && (!profile || !profile.full_name?.trim());

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      isSubscribed, needsOnboarding,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
