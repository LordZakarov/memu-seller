import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, Phone, User, Mail, ArrowRight, ChevronLeft } from "lucide-react";

// ── Steps ──────────────────────────────────────────────────────────────────
// 1. PHONE   — user enters phone number
// 2. DETAILS — new user only: collect name + email before sending OTP
// 3. OTP     — enter the 6-digit code sent via MsgOwl

type Step = "phone" | "details" | "otp";

function formatPhone(raw: string): string {
  // Ensure Maldivian numbers get +960 prefix
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("960")) return `+${digits}`;
  if (digits.startsWith("+")) return raw;
  return `+960${digits}`;
}

export default function Login() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: Check if phone exists ────────────────────────────────────────
  async function handlePhoneSubmit() {
    const formatted = formatPhone(phone.trim());
    if (formatted.length < 8) { setError("Enter a valid phone number"); return; }
    setLoading(true); setError("");

    // Check if this phone already has an account
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("phone", formatted)
      .maybeSingle();

    setLoading(false);

    if (existing) {
      // Returning user — go straight to OTP
      setIsNewUser(false);
      await sendOtp(formatted);
    } else {
      // New user — collect details first
      setIsNewUser(true);
      setStep("details");
    }
  }

  // ── Step 2 (new users only): Validate details then send OTP ──────────────
  async function handleDetailsSubmit() {
    if (!fullName.trim()) { setError("Please enter your name"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email"); return;
    }
    // Check email uniqueness if provided
    if (email.trim()) {
      const { data: emailExists } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();
      if (emailExists) {
        setError("An account with this email already exists"); return;
      }
    }
    setError("");
    await sendOtp(formatPhone(phone.trim()));
  }

  // ── Send OTP via Supabase (MsgOwl hook handles delivery) ─────────────────
  async function sendOtp(formattedPhone: string) {
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setStep("otp");
  }

  // ── Step 3: Verify OTP ────────────────────────────────────────────────────
  async function handleOtpSubmit() {
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");

    const formattedPhone = formatPhone(phone.trim());
    const { data, error: e } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "sms",
    });

    if (e || !data.user) {
      setError(e?.message ?? "Invalid code, please try again");
      setLoading(false); return;
    }

    // For new users: create their profile row now
    if (isNewUser) {
      await supabase.from("users").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: formattedPhone,
        role: "seller",        // ← change to "buyer" in buyer app
        is_active: true,
        phone_verified: true,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });

    }

    await refreshProfile();
    setLoading(false);
    navigate(from, { replace: true });
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function resendOtp() {
    setOtp(""); setError("");
    await sendOtp(formatPhone(phone.trim()));
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#FBF8F1", fontFamily: "Lexend, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
            style={{ background: "#df0060" }}
          >
            M
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            {step === "phone" && "Welcome to Memu"}
            {step === "details" && "Create your account"}
            {step === "otp" && "Enter verification code"}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === "phone" && "Enter your phone number to continue"}
            {step === "details" && "Just a few details before we send your code"}
            {step === "otp" && `Code sent to ${formatPhone(phone.trim())}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">

          {/* ── STEP 1: Phone ── */}
          {step === "phone" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePhoneSubmit()}
                    placeholder="7XXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition focus:border-pink-400"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Maldives numbers — +960 added automatically</p>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handlePhoneSubmit}
                disabled={loading || !phone.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: "#df0060" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}

          {/* ── STEP 2: Details (new users only) ── */}
          {step === "details" && (
            <>
              <button
                onClick={() => { setStep("phone"); setError(""); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 -mt-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Full Name <span style={{ color: "#df0060" }}>*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ahmed Mohamed"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition focus:border-pink-400"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email Address
                  <span className="text-gray-400 font-normal ml-1">(for order notifications)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleDetailsSubmit()}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition focus:border-pink-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Optional but recommended</p>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleDetailsSubmit}
                disabled={loading || !fullName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: "#df0060" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Code <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}

          {/* ── STEP 3: OTP ── */}
          {step === "otp" && (
            <>
              <button
                onClick={() => { setStep(isNewUser ? "details" : "phone"); setError(""); setOtp(""); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 -mt-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">6-Digit Code</label>
                <input
                  type="number"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleOtpSubmit()}
                  placeholder="123456"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition focus:border-pink-400 text-center tracking-[0.4em] text-lg font-semibold"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleOtpSubmit}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: "#df0060" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & Sign In <ArrowRight className="h-4 w-4" /></>}
              </button>

              <button
                onClick={resendOtp}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 pt-1"
              >
                Didn't receive a code? <span className="underline">Resend</span>
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to Memu's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
