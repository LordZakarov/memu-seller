import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, Save, LogOut, Crown, Phone, ChevronLeft } from "lucide-react";

type View = "main" | "change-phone-enter" | "change-phone-otp";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("960")) return `+${digits}`;
  if (digits.startsWith("+")) return raw;
  return `+960${digits}`;
}

export default function Account() {
  const { user, profile, loading, signOut, refreshProfile, isSubscribed } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>("main");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // On mount: if profile not loaded yet, fetch it
  useEffect(() => {
    document.title = "Account — Memu Seller";
    if (!profile && !loading) refreshProfile();
  }, []);

  // Whenever profile arrives (first load or after refresh), populate fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    if (!fullName.trim()) { setSaveError("Name cannot be empty"); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSaveError("Please enter a valid email address"); return;
    }
    setSaving(true); setSaveError("");

    if (email.trim() && email.trim() !== profile?.email) {
      const { data: exists } = await supabase
        .from("users").select("id").eq("email", email.trim()).eq("role", "seller").neq("id", user.id).maybeSingle();
      if (exists) { setSaveError("This email is already used by another account."); setSaving(false); return; }
    }

    const { error } = await supabase.rpc("update_my_profile", {
      p_full_name: fullName.trim(),
      p_email: email.trim() || null,
    });

    if (error) { setSaveError(error.message); setSaving(false); return; }
    await refreshProfile();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function sendPhoneOtp() {
    const formatted = formatPhone(newPhone.trim());
    if (formatted.replace(/\D/g, "").length < 7) { setPhoneError("Enter a valid phone number"); return; }
    setPhoneLoading(true); setPhoneError("");
    const { data: exists } = await supabase
      .from("users").select("id").eq("phone", formatted).eq("role", "seller").maybeSingle();
    if (exists) { setPhoneError("This number is already registered."); setPhoneLoading(false); return; }
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setPhoneLoading(false);
    if (error) { setPhoneError(error.message); return; }
    setView("change-phone-otp");
  }

  async function verifyPhoneOtp() {
    if (otp.length < 6) { setPhoneError("Enter the 6-digit code"); return; }
    setPhoneLoading(true); setPhoneError("");
    const formatted = formatPhone(newPhone.trim());
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" });
    if (error) { setPhoneError(error.message); setPhoneLoading(false); return; }
    await supabase.from("users").update({ phone: formatted, phone_verified: true }).eq("id", user!.id);
    await refreshProfile();
    setPhoneLoading(false); setView("main");
    setNewPhone(""); setOtp("");
  }

  // ── Phone change screens ──────────────────────────────────────────────────
  if (view === "change-phone-enter") return (
    <div className="p-6 max-w-lg">
      <button onClick={() => { setView("main"); setPhoneError(""); setNewPhone(""); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Change Phone Number</h1>
      <p className="text-sm text-gray-500 mb-6">We'll send a verification code to your new number</p>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">New Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendPhoneOtp()}
              placeholder="7XXXXXXX" autoFocus
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition" />
          </div>
          <p className="text-xs text-gray-400 mt-1">+960 added automatically</p>
        </div>
        {phoneError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{phoneError}</p>}
        <button onClick={sendPhoneOtp} disabled={phoneLoading || !newPhone.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "#df0060" }}>
          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
        </button>
      </div>
    </div>
  );

  if (view === "change-phone-otp") return (
    <div className="p-6 max-w-lg">
      <button onClick={() => { setView("change-phone-enter"); setPhoneError(""); setOtp(""); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Enter Verification Code</h1>
      <p className="text-sm text-gray-500 mb-6">Code sent to {formatPhone(newPhone.trim())}</p>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
          <input type="number" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && verifyPhoneOtp()}
            placeholder="123456" autoFocus
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition text-center tracking-[0.4em] text-lg font-semibold" />
        </div>
        {phoneError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{phoneError}</p>}
        <button onClick={verifyPhoneOtp} disabled={phoneLoading || otp.length < 6}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "#df0060" }}>
          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Update Number"}
        </button>
        <button onClick={sendPhoneOtp} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Didn't get a code? <span className="underline">Resend</span>
        </button>
      </div>
    </div>
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !profile) return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {[1,2,3].map(i => (
          <div key={i}>
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ))}
        <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );

  // ── Main view ─────────────────────────────────────────────────────────────
  const initials = profile.full_name?.trim()
    ? profile.full_name.trim().split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your seller profile</p>
      </div>

      {/* Subscription banner */}
      {!isSubscribed ? (
        <div className="mb-4 rounded-2xl p-4 flex items-center gap-3 border border-yellow-200 bg-yellow-50">
          <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">Upgrade to Premium</p>
            <p className="text-xs text-yellow-700 mt-0.5">Unlock ads, analytics & priority support</p>
          </div>
          <button onClick={() => navigate("/subscribe")}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
            style={{ background: "#df0060" }}>Upgrade</button>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl p-4 flex items-center gap-3 border border-green-200 bg-green-50">
          <Crown className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Premium Seller ✓</p>
            <p className="text-xs text-green-700 mt-0.5">All features unlocked</p>
          </div>
        </div>
      )}

      {/* Avatar + name + role */}
      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2"
          style={{ background: "#df0060" }}>
          {initials}
        </div>
        <p className="text-base font-semibold text-gray-900">{profile.full_name || "—"}</p>
        <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>
        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
          Seller
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-300 transition"
            placeholder="Your full name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-300 transition"
            placeholder="you@example.com" />
          <p className="text-xs text-gray-400 mt-1">Used for order notifications</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
          <div className="flex gap-2">
            <input type="text" value={profile.phone ?? ""} disabled
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500" />
            <button onClick={() => { setView("change-phone-enter"); setPhoneError(""); }}
              className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition whitespace-nowrap">
              Change
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">OTP verification required to change</p>
        </div>

        {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}

        <button onClick={saveProfile} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-60"
          style={{ background: saved ? "#4CAF50" : "#df0060" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <button onClick={async () => { await signOut(); navigate("/login"); }}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 bg-white flex items-center justify-center gap-2 hover:bg-red-50 transition">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}
