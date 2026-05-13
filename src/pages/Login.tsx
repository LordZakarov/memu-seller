import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import {
  Loader2, Phone, User, Mail, Lock, ArrowRight,
  ChevronLeft, Eye, EyeOff, MessageSquare,
} from "lucide-react";

// ── Flow ──────────────────────────────────────────────────────────────────
//
// SIGN UP (new user):
//   phone → otp-verify → details (name + email + password) → done
//
// SIGN IN (existing user) — two options from the sign-in screen:
//   Option A (password):  phone-or-email + password → done
//   Option B (OTP):       phone → otp-verify → done

type Step =
  | "signin"           // default landing: phone/email + password, or switch to OTP
  | "signup-phone"     // new user: enter phone
  | "signup-otp"       // new user: verify phone OTP
  | "signup-details"   // new user: name + email + password
  | "signin-otp-phone" // existing user chose OTP: enter phone
  | "signin-otp-code"; // existing user chose OTP: enter code

const ROLE = "seller";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("960")) return `+${digits}`;
  if (digits.startsWith("+")) return raw;
  return `+960${digits}`;
}

function Logo() {
  return (
    <div className="flex justify-center mb-8">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
        style={{ background: "#df0060" }}>M</div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 -mt-1 mb-2">
      <ChevronLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

export default function Login() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? "/";

  const [step, setStep] = useState<Step>("signin");

  // Sign-in fields
  const [siIdentifier, setSiIdentifier] = useState(""); // phone or email
  const [siPassword, setSiPassword] = useState("");
  const [showSiPassword, setShowSiPassword] = useState(false);

  // Sign-up fields
  const [suPhone, setSuPhone] = useState("");
  const [suOtp, setSuOtp] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [showSuPassword, setShowSuPassword] = useState(false);

  // OTP login fields
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function go(s: Step) { setStep(s); setError(""); }

  // ── SIGN IN with password ─────────────────────────────────────────────────
  async function handleSignIn() {
    const id = siIdentifier.trim();
    if (!id || !siPassword) { setError("Please enter your phone/email and password"); return; }
    setLoading(true); setError("");

    // Determine if identifier is phone or email
    const isPhone = /^\d/.test(id) || id.startsWith("+");
    let loginEmail = id;

    if (isPhone) {
      // Look up email for this phone+role
      const formatted = formatPhone(id);
      const { data } = await supabase
        .from("users").select("email").eq("phone", formatted).eq("role", ROLE).maybeSingle();
      if (!data?.email) {
        setError("No account found for this phone number. Please sign up.");
        setLoading(false); return;
      }
      loginEmail = data.email;
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: siPassword,
    });

    if (authErr) {
      setError(authErr.message.includes("Invalid login credentials")
        ? "Incorrect password. Try again or use OTP login."
        : authErr.message);
      setLoading(false); return;
    }

    await refreshProfile();
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── SIGN IN with OTP — step 1: send code ─────────────────────────────────
  async function handleOtpLoginPhone() {
    const formatted = formatPhone(otpPhone.trim());
    if (formatted.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number"); return; }
    setLoading(true); setError("");

    // Must be existing user
    const { data: existing } = await supabase
      .from("users").select("id").eq("phone", formatted).eq("role", ROLE).maybeSingle();
    if (!existing) {
      setError("No account found for this number. Please sign up first.");
      setLoading(false); return;
    }

    const { error: e } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (e) { setError(e.message); return; }
    go("signin-otp-code");
  }

  // ── SIGN IN with OTP — step 2: verify code ───────────────────────────────
  async function handleOtpLoginVerify() {
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    const formatted = formatPhone(otpPhone.trim());
    const { error: e } = await supabase.auth.verifyOtp({ phone: formatted, token: otpCode, type: "sms" });
    if (e) { setError(e.message); setLoading(false); return; }
    await refreshProfile();
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── SIGN UP — step 1: enter phone ────────────────────────────────────────
  async function handleSignUpPhone() {
    const formatted = formatPhone(suPhone.trim());
    if (formatted.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number"); return; }
    setLoading(true); setError("");

    const { data: existing } = await supabase
      .from("users").select("id").eq("phone", formatted).eq("role", ROLE).maybeSingle();
    if (existing) {
      setError("This number already has an account. Please sign in.");
      setLoading(false); return;
    }

    const { error: e } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (e) { setError(e.message); return; }
    go("signup-otp");
  }

  // ── SIGN UP — step 2: verify OTP ─────────────────────────────────────────
  async function handleSignUpOtp() {
    if (suOtp.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    const formatted = formatPhone(suPhone.trim());
    const { error: e } = await supabase.auth.verifyOtp({ phone: formatted, token: suOtp, type: "sms" });
    if (e) { setError(e.message); setLoading(false); return; }
    setLoading(false);
    go("signup-details");
  }

  // ── SIGN UP — step 3: name + email + password ────────────────────────────
  async function handleSignUpDetails() {
    if (!suName.trim()) { setError("Please enter your full name"); return; }
    if (!suEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail.trim())) {
      setError("Please enter a valid email address"); return;
    }
    if (!suPassword || suPassword.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    setLoading(true); setError("");

    const formatted = formatPhone(suPhone.trim());

    // Check email uniqueness for this role
    const { data: emailExists } = await supabase
      .from("users").select("id").eq("email", suEmail.trim()).eq("role", ROLE).maybeSingle();
    if (emailExists) {
      setError("This email is already registered for a seller account.");
      setLoading(false); return;
    }

    // Update Supabase Auth email+password (OTP already created the auth user)
    const { error: updateErr } = await supabase.auth.updateUser({
      email: suEmail.trim(),
      password: suPassword,
    });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    // Save profile via SECURITY DEFINER RPC
    const { error: rpcErr } = await supabase.rpc("upsert_my_profile", {
      p_full_name: suName.trim(),
      p_email: suEmail.trim(),
      p_phone: formatted,
      p_role: ROLE,
    });
    if (rpcErr) { setError(rpcErr.message); setLoading(false); return; }

    await refreshProfile();
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  const inputCls = "w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition";
  const btnCls = "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition";

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#FBF8F1", fontFamily: "Lexend, sans-serif" }}>
      <div className="w-full max-w-sm">
        <Logo />

        {/* ── SIGN IN ─────────────────────────────────────────────────── */}
        {step === "signin" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-2">Sign in to your seller account</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone or Email</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={siIdentifier} onChange={e => setSiIdentifier(e.target.value)}
                    placeholder="7XXXXXXX or you@example.com" autoFocus
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type={showSiPassword ? "text" : "password"} value={siPassword}
                    onChange={e => setSiPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSignIn()}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition" />
                  <button type="button" onClick={() => setShowSiPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleSignIn} disabled={loading || !siIdentifier.trim() || !siPassword}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              {/* OTP login option */}
              <button onClick={() => { setOtpPhone(""); go("signin-otp-phone"); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
                <MessageSquare className="h-4 w-4" /> Sign in with OTP instead
              </button>
              <p className="text-center text-sm text-gray-500 pt-1">
                Don't have an account?{" "}
                <button onClick={() => { setSuPhone(""); go("signup-phone"); }}
                  className="font-semibold" style={{ color: "#df0060" }}>Sign up</button>
              </p>
            </div>
          </>
        )}

        {/* ── SIGN IN via OTP — enter phone ───────────────────────────── */}
        {step === "signin-otp-phone" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Sign in with OTP</h1>
              <p className="text-sm text-gray-500 mt-2">We'll send a code to your phone</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <BackButton onClick={() => go("signin")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={otpPhone} onChange={e => setOtpPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleOtpLoginPhone()}
                    placeholder="7XXXXXXX" autoFocus className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">+960 added automatically</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleOtpLoginPhone} disabled={loading || !otpPhone.trim()}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send Code</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── SIGN IN via OTP — enter code ────────────────────────────── */}
        {step === "signin-otp-code" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Enter verification code</h1>
              <p className="text-sm text-gray-500 mt-2">Code sent to {formatPhone(otpPhone.trim())}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <BackButton onClick={() => go("signin-otp-phone")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
                <input type="number" value={otpCode} onChange={e => setOtpCode(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleOtpLoginVerify()}
                  placeholder="123456" autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition text-center tracking-[0.4em] text-lg font-semibold" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleOtpLoginVerify} disabled={loading || otpCode.length < 6}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify &amp; Sign In</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={handleOtpLoginPhone} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          </>
        )}

        {/* ── SIGN UP — enter phone ────────────────────────────────────── */}
        {step === "signup-phone" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Create seller account</h1>
              <p className="text-sm text-gray-500 mt-2">Start with your mobile number</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <BackButton onClick={() => go("signin")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Phone Number <span style={{ color: "#df0060" }}>*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={suPhone} onChange={e => setSuPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSignUpPhone()}
                    placeholder="7XXXXXXX" autoFocus className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">We'll send a verification code. +960 added automatically.</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleSignUpPhone} disabled={loading || !suPhone.trim()}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send Verification Code</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-sm text-gray-500 pt-1">
                Already have an account?{" "}
                <button onClick={() => go("signin")} className="font-semibold" style={{ color: "#df0060" }}>Sign in</button>
              </p>
            </div>
          </>
        )}

        {/* ── SIGN UP — verify OTP ─────────────────────────────────────── */}
        {step === "signup-otp" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Verify your number</h1>
              <p className="text-sm text-gray-500 mt-2">Code sent to {formatPhone(suPhone.trim())}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <BackButton onClick={() => go("signup-phone")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
                <input type="number" value={suOtp} onChange={e => setSuOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleSignUpOtp()}
                  placeholder="123456" autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition text-center tracking-[0.4em] text-lg font-semibold" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleSignUpOtp} disabled={loading || suOtp.length < 6}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify Number</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={handleSignUpPhone} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          </>
        )}

        {/* ── SIGN UP — details ────────────────────────────────────────── */}
        {step === "signup-details" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Complete your profile</h1>
              <p className="text-sm text-gray-500 mt-2">Number verified ✓ — just a few more details</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Full Name <span style={{ color: "#df0060" }}>*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={suName} onChange={e => setSuName(e.target.value)}
                    placeholder="Ahmed Mohamed" autoFocus className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email Address <span style={{ color: "#df0060" }}>*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">For order notifications</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password <span style={{ color: "#df0060" }}>*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type={showSuPassword ? "text" : "password"} value={suPassword}
                    onChange={e => setSuPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSignUpDetails()}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition" />
                  <button type="button" onClick={() => setShowSuPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSuPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={handleSignUpDetails} disabled={loading || !suName.trim() || !suEmail.trim() || !suPassword}
                className={btnCls} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to Memu's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
