import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import {
  Loader2, Phone, User, Mail, Lock,
  ArrowRight, ChevronLeft, Eye, EyeOff, MessageSquare,
} from "lucide-react";

// ── Flow ──────────────────────────────────────────────────────────────────
// SIGN IN:    email + password  |  OTP option
// SIGN UP:    name + phone + email + password → OTP verify phone → signUp → done
// FORGOT:     phone → OTP verify → new password
// OTP LOGIN:  phone → OTP code → done

type Screen =
  | "signin"
  | "signup-form"
  | "signup-otp"
  | "signin-otp-phone"
  | "signin-otp-code"
  | "forgot-phone"
  | "forgot-otp"
  | "forgot-newpass";

const ROLE = "seller";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("960")) return `+${digits}`;
  if (digits.startsWith("+")) return raw;
  return `+960${digits}`;
}

function Logo() {
  return (
    <div className="flex justify-center mb-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
        style={{ background: "#df0060" }}>M</div>
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3">
      <ChevronLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function PwInput({ value, onChange, onEnter, label, hint }: {
  value: string; onChange: (v: string) => void; onEnter?: () => void; label: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type={show ? "text" : "password"} value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onEnter?.()}
          placeholder="••••••••"
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition" />
        <button type="button" onClick={() => setShow(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function OtpBox({ value, onChange, onEnter }: {
  value: string; onChange: (v: string) => void; onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
      <input type="number" value={value}
        onChange={e => onChange(e.target.value.slice(0, 6))}
        onKeyDown={e => e.key === "Enter" && onEnter?.()}
        placeholder="123456" autoFocus
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition text-center tracking-[0.4em] text-lg font-semibold" />
    </div>
  );
}

const inputCls = "w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition";
const btnPrimary = "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition";
const btnSecondary = "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition";

export default function Login() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? "/";

  const [screen, setScreen] = useState<Screen>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sign in fields
  const [siPhone, setSiPhone] = useState("");
  const [siPw, setSiPw] = useState("");

  // Sign up fields
  const [suName, setSuName] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suOtp, setSuOtp] = useState("");

  // OTP login
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Forgot password
  const [fpPhone, setFpPhone] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpPw, setFpPw] = useState("");
  const [fpPw2, setFpPw2] = useState("");

  function go(s: Screen) { setScreen(s); setError(""); }

  // ── SIGN IN with phone+password ─────────────────────────────────────────
  async function handleSignIn() {
    if (!siPhone.trim() || !siPw) { setError("Enter your phone number and password"); return; }
    setLoading(true); setError("");

    const fmt = formatPhone(siPhone.trim());
    const { error: e } = await supabase.auth.signInWithPassword({ phone: fmt, password: siPw });

    if (e) {
      setError(
        e.message.includes("Invalid login credentials")
          ? "Incorrect password. Use OTP to sign in instead."
          : e.message
      );
      setLoading(false); return;
    }
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── OTP SIGN IN ───────────────────────────────────────────────────────────
  async function handleOtpSend() {
    const fmt = formatPhone(otpPhone.trim());
    if (fmt.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number"); return; }
    setLoading(true); setError("");

    const { data: exists } = await supabase.rpc("phone_exists", { p_phone: fmt });
    if (!exists) { setError("No account found for this number."); setLoading(false); return; }

    const { error: e } = await supabase.auth.signInWithOtp({ phone: fmt });
    setLoading(false);
    if (e) { setError(e.message); return; }
    go("signin-otp-code");
  }

  async function handleOtpVerify() {
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    const fmt = formatPhone(otpPhone.trim());
    const { error: e } = await supabase.auth.verifyOtp({ phone: fmt, token: otpCode, type: "sms" });
    if (e) { setError(e.message); setLoading(false); return; }
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── SIGN UP — validate form, send OTP ────────────────────────────────────
  async function handleSignUpSend() {
    if (!suName.trim()) { setError("Enter your full name"); return; }
    const fmt = formatPhone(suPhone.trim());
    if (fmt.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number"); return; }
    if (!suEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suEmail.trim())) {
      setError("Enter a valid email address"); return;
    }
    if (!suPw || suPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");

    const { data: phoneEx } = await supabase.rpc("phone_exists", { p_phone: fmt });
    if (phoneEx) { setError("This number already has an account. Sign in instead."); setLoading(false); return; }

    const { data: emailEx } = await supabase.rpc("email_exists", { p_email: suEmail.trim() });
    if (emailEx) { setError("This email already has an account. Sign in instead."); setLoading(false); return; }

    const { error: e } = await supabase.auth.signInWithOtp({ phone: fmt });
    setLoading(false);
    if (e) { setError(e.message); return; }
    go("signup-otp");
  }

  // ── SIGN UP — verify OTP, create account ─────────────────────────────────
  async function handleSignUpVerify() {
    if (suOtp.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    const fmt = formatPhone(suPhone.trim());

    try {
      // Step 1: Verify phone OTP
      const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
        phone: fmt, token: suOtp, type: "sms",
      });
      if (otpErr) { setError(otpErr.message); setLoading(false); return; }
      if (!otpData.user) { setError("Verification failed. Please try again."); setLoading(false); return; }

      // Step 2: Save profile row while phone session is active
      const { error: rpcErr } = await supabase.rpc("upsert_my_profile", {
        p_full_name: suName.trim(),
        p_email: suEmail.trim(),
        p_phone: fmt,
      });
      if (rpcErr) { setError("Failed to save profile: " + rpcErr.message); setLoading(false); return; }

      // Step 3: Set password on the current OTP session
      // Use timeout so it never hangs
      await Promise.race([
        supabase.auth.updateUser({ password: suPw }),
        new Promise(r => setTimeout(r, 2000)),
      ]);

      // Step 4: Navigate — AuthProvider handles profile loading via onAuthStateChange
      setLoading(false);
      navigate(from, { replace: true });

    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ── FORGOT — send OTP ─────────────────────────────────────────────────────
  async function handleForgotSend() {
    const fmt = formatPhone(fpPhone.trim());
    if (fmt.replace(/\D/g, "").length < 7) { setError("Enter a valid phone number"); return; }
    setLoading(true); setError("");
    const { data: exists } = await supabase.rpc("phone_exists", { p_phone: fmt });
    if (!exists) { setError("No account found for this number."); setLoading(false); return; }
    const { error: e } = await supabase.auth.signInWithOtp({ phone: fmt });
    setLoading(false);
    if (e) { setError(e.message); return; }
    go("forgot-otp");
  }

  // ── FORGOT — verify OTP ───────────────────────────────────────────────────
  async function handleForgotVerify() {
    if (fpOtp.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    const fmt = formatPhone(fpPhone.trim());
    const { error: e } = await supabase.auth.verifyOtp({ phone: fmt, token: fpOtp, type: "sms" });
    if (e) { setError(e.message); setLoading(false); return; }
    setLoading(false);
    go("forgot-newpass");
  }

  // ── FORGOT — save new password ────────────────────────────────────────────
  async function handleForgotSave() {
    if (!fpPw || fpPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (fpPw !== fpPw2) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.updateUser({ password: fpPw });
    if (e) { setError(e.message); setLoading(false); return; }
    setLoading(false);
    navigate(from, { replace: true });
  }

  const Err = () => error
    ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "#FBF8F1", fontFamily: "Lexend, sans-serif" }}>
      <div className="w-full max-w-sm">
        <Logo />

        {/* ── SIGN IN ── */}
        {screen === "signin" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to your seller account</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={siPhone} onChange={e => setSiPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSignIn()}
                    placeholder="7XXXXXXX" autoFocus className={inputCls} />
                </div>
              </div>
              <PwInput value={siPw} onChange={setSiPw} onEnter={handleSignIn} label="Password" />
              <Err />
              <button onClick={handleSignIn} disabled={loading || !siPhone.trim() || !siPw}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={() => { setOtpPhone(""); go("signin-otp-phone"); }} className={btnSecondary}>
                <MessageSquare className="h-4 w-4" /> Sign in with OTP instead
              </button>
              <div className="flex items-center justify-between pt-1 text-xs">
                <button onClick={() => { setFpPhone(""); go("forgot-phone"); }}
                  className="text-gray-400 hover:text-gray-600">Forgot password?</button>
                <span className="text-gray-400">No account?{" "}
                  <button onClick={() => go("signup-form")}
                    className="font-semibold" style={{ color: "#df0060" }}>Sign up</button>
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── SIGN UP FORM ── */}
        {screen === "signup-form" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Create seller account</h1>
              <p className="text-sm text-gray-500 mt-1">Fill in your details to get started</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("signin")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name <span style={{ color: "#df0060" }}>*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={suName} onChange={e => setSuName(e.target.value)}
                    placeholder="Ahmed Mohamed" autoFocus className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number <span style={{ color: "#df0060" }}>*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={suPhone} onChange={e => setSuPhone(e.target.value)}
                    placeholder="7XXXXXXX" className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">+960 added automatically — used for verification</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address <span style={{ color: "#df0060" }}>*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                </div>
              </div>
              <PwInput value={suPw} onChange={setSuPw} onEnter={handleSignUpSend}
                label="Password *" hint="At least 6 characters" />
              <Err />
              <button onClick={handleSignUpSend}
                disabled={loading || !suName.trim() || !suPhone.trim() || !suEmail.trim() || !suPw}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify &amp; Create Account</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-xs text-gray-400">A verification code will be sent to your phone</p>
            </div>
          </>
        )}

        {/* ── SIGN UP OTP ── */}
        {screen === "signup-otp" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Verify your number</h1>
              <p className="text-sm text-gray-500 mt-1">Code sent to <span className="font-medium">{formatPhone(suPhone.trim())}</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("signup-form")} />
              <OtpBox value={suOtp} onChange={setSuOtp} onEnter={handleSignUpVerify} />
              <Err />
              <button onClick={handleSignUpVerify} disabled={loading || suOtp.length < 6}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify &amp; Create Account</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={handleSignUpSend} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          </>
        )}

        {/* ── OTP SIGN IN — phone ── */}
        {screen === "signin-otp-phone" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Sign in with OTP</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your registered phone number</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("signin")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={otpPhone} onChange={e => setOtpPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleOtpSend()}
                    placeholder="7XXXXXXX" autoFocus className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">+960 added automatically</p>
              </div>
              <Err />
              <button onClick={handleOtpSend} disabled={loading || !otpPhone.trim()}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send Code</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── OTP SIGN IN — code ── */}
        {screen === "signin-otp-code" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Enter code</h1>
              <p className="text-sm text-gray-500 mt-1">Sent to <span className="font-medium">{formatPhone(otpPhone.trim())}</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("signin-otp-phone")} />
              <OtpBox value={otpCode} onChange={setOtpCode} onEnter={handleOtpVerify} />
              <Err />
              <button onClick={handleOtpVerify} disabled={loading || otpCode.length < 6}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify &amp; Sign In</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={handleOtpSend} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT — phone ── */}
        {screen === "forgot-phone" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Reset password</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your registered phone number</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("signin")} />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={fpPhone} onChange={e => setFpPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleForgotSend()}
                    placeholder="7XXXXXXX" autoFocus className={inputCls} />
                </div>
                <p className="text-xs text-gray-400 mt-1">We'll send a code to this number</p>
              </div>
              <Err />
              <button onClick={handleForgotSend} disabled={loading || !fpPhone.trim()}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send Code</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT — OTP ── */}
        {screen === "forgot-otp" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Enter code</h1>
              <p className="text-sm text-gray-500 mt-1">Sent to <span className="font-medium">{formatPhone(fpPhone.trim())}</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <Back onClick={() => go("forgot-phone")} />
              <OtpBox value={fpOtp} onChange={setFpOtp} onEnter={handleForgotVerify} />
              <Err />
              <button onClick={handleForgotVerify} disabled={loading || fpOtp.length < 6}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Verify</span><ArrowRight className="h-4 w-4" /></>}
              </button>
              <button onClick={handleForgotSend} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT — new password ── */}
        {screen === "forgot-newpass" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">New password</h1>
              <p className="text-sm text-gray-500 mt-1">Choose a new password for your account</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <PwInput value={fpPw} onChange={setFpPw} label="New Password *" hint="At least 6 characters" />
              <PwInput value={fpPw2} onChange={setFpPw2} onEnter={handleForgotSave} label="Confirm Password *" />
              <Err />
              <button onClick={handleForgotSave} disabled={loading || !fpPw || !fpPw2}
                className={btnPrimary} style={{ background: "#df0060" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Save New Password</span><ArrowRight className="h-4 w-4" /></>}
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
