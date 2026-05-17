import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; full_name: string; phone: string | null; email: string | null; is_active: boolean };

type AuthState = {
  session: Session | null; user: User | null; profile: Profile | null;
  loading: boolean; isSubscribed: boolean;
  signOut: () => Promise<void>; refreshProfile: () => Promise<void>;
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
    const { data, error } = await supabase.from("users").select("id,full_name,phone,email,is_active").eq("id", uid).maybeSingle();
    if (error) console.error("fetchProfile error:", error.message);
    return data ?? null;
  }

  async function fetchSubscription(uid: string): Promise<boolean> {
    const { data } = await supabase.from("seller_subscriptions").select("id")
      .eq("seller_id", uid).eq("status", "active").gt("expires_at", new Date().toISOString()).maybeSingle();
    return !!data;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        const [p, sub] = await Promise.all([fetchProfile(s.user.id), fetchSubscription(s.user.id)]);
        setProfile(p); setIsSubscribed(sub);
      }
      initialised.current = true;
      setLoading(false);
    });

    // Never set loading=true here — causes inactivity loading hang
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!initialised.current) return;
      setSession(newSession); setUser(newSession?.user ?? null);
      if (newSession?.user) {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          const [p, subscribed] = await Promise.all([fetchProfile(newSession.user.id), fetchSubscription(newSession.user.id)]);
          setProfile(p); setIsSubscribed(subscribed);
        }
      } else {
        setProfile(null); setIsSubscribed(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setUser(null); setIsSubscribed(false);
  };

  const refreshProfile = async () => {
    if (user) setProfile(await fetchProfile(user.id));
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
