import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, User, Mail, ArrowRight } from "lucide-react";

/**
 * Onboarding — shown once after first OTP login.
 * Creates or updates the users row with full_name + email.
 * Works for both buyer and seller apps (just change `role` default below).
 */
export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!fullName.trim()) { setError("Please enter your name"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address"); return;
    }
    setSaving(true); setError("");
    try {
      // Upsert into users table
      const { error: upsertErr } = await supabase.from("users").upsert({
        id: user!.id,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: user!.phone ?? "",
        // Change to "buyer" in the buyer app
        role: "seller",
        is_active: true,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (upsertErr) { setError(upsertErr.message); setSaving(false); return; }

      // Also update email in Supabase Auth if provided
      if (email.trim()) {
        await supabase.auth.updateUser({ email: email.trim() });
      }

      await refreshProfile();
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#FBF8F1" }}
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
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "Lexend, sans-serif" }}>
            Welcome to Memu
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Tell us a bit about yourself to get started
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          {/* Full Name */}
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
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Ahmed Mohamed"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition"
                style={{ fontFamily: "Lexend, sans-serif" }}
                onFocus={e => e.target.style.borderColor = "#df0060"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                autoFocus
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Email Address
              <span className="text-gray-400 font-normal ml-1">(for order confirmations)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition"
                style={{ fontFamily: "Lexend, sans-serif" }}
                onFocus={e => e.target.style.borderColor = "#df0060"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Optional but recommended</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !fullName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 mt-2"
            style={{ background: "#df0060", fontFamily: "Lexend, sans-serif" }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Get Started <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to Memu's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
