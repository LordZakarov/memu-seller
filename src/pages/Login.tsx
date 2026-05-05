import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, Phone } from "lucide-react";

export default function Login() {
  const { session, loading } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { document.title = "Sign in — Memu Seller"; }, []);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!loading && session) return <Navigate to="/" replace />;

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("960") ? `+${digits}` : `+960${digits}`;
  };

  const sendOtp = async () => {
    setError("");
    if (!phone || phone.replace(/\D/g, "").length < 7) { setError("Enter a valid Maldives phone number"); return; }
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: formatPhone(phone) });
    if (e) { setError(e.message); setBusy(false); return; }
    setStep("otp");
    setCountdown(60);
    setBusy(false);
  };

  const verifyOtp = async () => {
    setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    setBusy(true);
    const { error: e } = await supabase.auth.verifyOtp({ phone: formatPhone(phone), token: otp, type: "sms" });
    if (e) { setError(e.message); setBusy(false); return; }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg"
            style={{ background: "#df0060" }}>M</div>
          <h1 className="text-2xl font-semibold text-gray-900">Memu Seller</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your seller account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium">+960</span>
                  <input type="tel" placeholder="7001234" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && sendOtp()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-300"
                    maxLength={7} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={sendOtp} disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "#df0060" }}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Send OTP
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Code sent to <span className="font-medium">+960 {phone}</span></p>
                <button onClick={() => setStep("phone")} className="text-xs mt-1" style={{ color: "#df0060" }}>Change number</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
                <input type="number" placeholder="123456" value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && verifyOtp()}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-300 text-center tracking-widest text-lg font-semibold"
                  maxLength={6} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={verifyOtp} disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "#df0060" }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Sign In
              </button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-gray-400">Resend in {countdown}s</p>
                ) : (
                  <button onClick={sendOtp} className="text-xs" style={{ color: "#df0060" }}>Resend OTP</button>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          By signing in you agree to Memu's Terms & Conditions
        </p>
      </div>
    </div>
  );
}
