import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import {
  Loader2, LogOut, Crown, Pencil, Save, X,
  Phone, Mail, User, ChevronLeft, Check,
} from "lucide-react";

type View = "main" | "change-phone-1" | "change-phone-2";

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

  // Edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saved, setSaved] = useState(false);

  // Phone change
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneErr, setPhoneErr] = useState("");

  useEffect(() => {
    document.title = "Account — Memu Seller";
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  function startEdit() {
    setName(profile?.full_name ?? "");
    setEmail(profile?.email ?? "");
    setSaveErr(""); setSaved(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false); setSaveErr("");
  }

  async function saveProfile() {
    if (!name.trim()) { setSaveErr("Name cannot be empty"); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSaveErr("Enter a valid email address"); return;
    }
    setSaving(true); setSaveErr("");

    if (email.trim() && email.trim() !== profile?.email) {
      const { data: ex } = await supabase
        .from("users").select("id").eq("email", email.trim()).eq("role", "seller").neq("id", user!.id).maybeSingle();
      if (ex) { setSaveErr("This email is already used by another account."); setSaving(false); return; }
    }

    const { error } = await supabase.rpc("update_my_profile", {
      p_full_name: name.trim(),
      p_email: email.trim() || null,
    });
    if (error) { setSaveErr(error.message); setSaving(false); return; }

    await refreshProfile();
    setSaving(false); setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Phone change ──────────────────────────────────────────────────────────
  async function sendPhoneOtp() {
    const fmt = formatPhone(newPhone.trim());
    if (fmt.replace(/\D/g, "").length < 7) { setPhoneErr("Enter a valid phone number"); return; }
    setPhoneLoading(true); setPhoneErr("");
    const { data: ex } = await supabase
      .from("users").select("id").eq("phone", fmt).eq("role", "seller").maybeSingle();
    if (ex) { setPhoneErr("This number is already registered."); setPhoneLoading(false); return; }
    const { error } = await supabase.auth.signInWithOtp({ phone: fmt });
    setPhoneLoading(false);
    if (error) { setPhoneErr(error.message); return; }
    setView("change-phone-2");
  }

  async function verifyPhoneOtp() {
    if (otp.length < 6) { setPhoneErr("Enter the 6-digit code"); return; }
    setPhoneLoading(true); setPhoneErr("");
    const fmt = formatPhone(newPhone.trim());
    const { error } = await supabase.auth.verifyOtp({ phone: fmt, token: otp, type: "sms" });
    if (error) { setPhoneErr(error.message); setPhoneLoading(false); return; }
    await supabase.from("users").update({ phone: fmt, phone_verified: true }).eq("id", user!.id);
    await refreshProfile();
    setPhoneLoading(false);
    setView("main"); setNewPhone(""); setOtp("");
  }

  // ── Phone change screens ──────────────────────────────────────────────────
  if (view === "change-phone-1") return (
    <div className="p-6 max-w-lg">
      <button onClick={() => { setView("main"); setPhoneErr(""); setNewPhone(""); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Change Phone Number</h1>
      <p className="text-sm text-gray-500 mb-5">Enter your new number — we'll send a code to verify it</p>
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
        {phoneErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{phoneErr}</p>}
        <button onClick={sendPhoneOtp} disabled={phoneLoading || !newPhone.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
          style={{ background: "#df0060" }}>
          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
        </button>
      </div>
    </div>
  );

  if (view === "change-phone-2") return (
    <div className="p-6 max-w-lg">
      <button onClick={() => { setView("change-phone-1"); setPhoneErr(""); setOtp(""); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Verify New Number</h1>
      <p className="text-sm text-gray-500 mb-5">Code sent to {formatPhone(newPhone.trim())}</p>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
          <input type="number" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && verifyPhoneOtp()}
            placeholder="123456" autoFocus
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition text-center tracking-[0.4em] text-lg font-semibold" />
        </div>
        {phoneErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{phoneErr}</p>}
        <button onClick={verifyPhoneOtp} disabled={phoneLoading || otp.length < 6}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
          style={{ background: "#df0060" }}>
          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Update Number"}
        </button>
        <button onClick={sendPhoneOtp}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Didn't get a code? <span className="underline">Resend</span>
        </button>
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 max-w-lg space-y-4">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {[1,2,3].map(i => <div key={i}><div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" /><div className="h-10 bg-gray-100 rounded-xl animate-pulse" /></div>)}
      </div>
    </div>
  );

  if (!profile) return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Account</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
        <p className="text-sm text-gray-500">Could not load your profile.</p>
        <button onClick={refreshProfile} className="text-sm font-medium" style={{ color: "#df0060" }}>Retry</button>
      </div>
      <button onClick={async () => { await signOut(); navigate("/login"); }}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 bg-white flex items-center justify-center gap-2 hover:bg-red-50 transition">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );

  const initials = profile.full_name?.trim()
    ? profile.full_name.trim().split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Account</h1>
          <p className="text-sm text-gray-500">Manage your seller profile</p>
        </div>
        {!editing && (
          <button onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
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
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "#df0060" }}>Upgrade</button>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl p-4 flex items-center gap-3 border border-green-200 bg-green-50">
          <Crown className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div><p className="text-sm font-semibold text-green-800">Premium Seller ✓</p>
            <p className="text-xs text-green-700 mt-0.5">All features unlocked</p></div>
        </div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center mb-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2"
          style={{ background: "#df0060" }}>{initials}</div>
        <p className="text-base font-semibold text-gray-900">{profile.full_name || "—"}</p>
        <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>
        <span className="mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">Seller</span>
        {saved && (
          <span className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
            <Check className="h-3.5 w-3.5" /> Profile saved
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
            <User className="h-3.5 w-3.5 text-gray-400" /> Full Name
          </label>
          {editing ? (
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-300 transition" />
          ) : (
            <p className="text-sm text-gray-900 px-1">{profile.full_name || <span className="text-gray-400">Not set</span>}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
            <Mail className="h-3.5 w-3.5 text-gray-400" /> Email Address
          </label>
          {editing ? (
            <>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-300 transition" />
              <p className="text-xs text-gray-400 mt-1">Used for order notifications</p>
            </>
          ) : (
            <p className="text-sm text-gray-900 px-1">{profile.email || <span className="text-gray-400">Not set</span>}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
            <Phone className="h-3.5 w-3.5 text-gray-400" /> Phone Number
          </label>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-gray-900 px-1">{profile.phone || <span className="text-gray-400">Not set</span>}</p>
            {editing && (
              <button onClick={() => { setView("change-phone-1"); setPhoneErr(""); setNewPhone(""); }}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Change
              </button>
            )}
          </div>
          {editing && <p className="text-xs text-gray-400 mt-1">OTP verification required to change</p>}
        </div>

        {saveErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveErr}</p>}

        {editing && (
          <div className="flex gap-2 pt-1">
            <button onClick={saveProfile} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-60"
              style={{ background: "#df0060" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={cancelEdit}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <button onClick={async () => { await signOut(); navigate("/login"); }}
        className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 bg-white flex items-center justify-center gap-2 hover:bg-red-50 transition">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}
