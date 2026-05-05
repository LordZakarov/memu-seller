import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";

const PLANS = [
  { id: "monthly", label: "Monthly", price: 300, period: "/ month", save: "" },
  { id: "annual", label: "Annual", price: 2800, period: "/ year", save: "Save MVR 800" },
];

export default function Subscribe() {
  const { user, refreshProfile, signOut } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const plan = PLANS.find(p => p.id === selected)!;
      // Create BML subscription payment via edge function
      const { data, error: fnErr } = await supabase.functions.invoke("create-bml-subscription-payment", {
        body: { user_id: user.id, plan: selected, amount_mvr: plan.price },
      });
      if (fnErr || !data?.payment_url) throw new Error(fnErr?.message ?? "Failed to create payment");

      if (isIOS) {
        // iOS: open in Safari (no Apple IAP)
        window.open(data.payment_url, "_blank");
      } else {
        // Android/Web: redirect in same window
        window.location.href = data.payment_url;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setLoading(false);
  };

  const perks = [
    "List unlimited products & services",
    "Receive orders from buyers across Maldives",
    "Analytics & revenue tracking",
    "Priority support",
    "Advertise your store",
  ];

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-3"
            style={{ background: "#df0060" }}>M</div>
          <h1 className="text-xl font-semibold text-gray-900">Subscribe to Sell</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">Choose a plan to start selling on Memu</p>
        </div>

        {/* Perks */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What you get</p>
          <div className="space-y-2">
            {perks.map(p => (
              <div key={p} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#df0060" }} />
                <span className="text-sm text-gray-700">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={`p-4 rounded-xl border-2 text-left transition ${selected === plan.id ? "border-primary" : "border-gray-200 bg-white"}`}
              style={selected === plan.id ? { borderColor: "#df0060", background: "#fff0f5" } : {}}>
              <div className="text-sm font-semibold text-gray-900">{plan.label}</div>
              <div className="text-lg font-bold mt-1" style={{ color: "#df0060" }}>MVR {plan.price}</div>
              <div className="text-xs text-gray-500">{plan.period}</div>
              {plan.save && <div className="text-xs font-medium mt-1" style={{ color: "#4CAF50" }}>{plan.save}</div>}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</p>}

        {isIOS && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
            <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">Payment will open in Safari. After completing, return here and refresh.</p>
          </div>
        )}

        <button onClick={handleSubscribe} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 mb-3"
          style={{ background: "#df0060" }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Preparing payment…" : `Subscribe ${selected === "monthly" ? "Monthly" : "Annually"}`}
        </button>

        <button onClick={refreshProfile}
          className="w-full py-2 rounded-xl text-sm text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition mb-3">
          I already paid — refresh status
        </button>

        <button onClick={signOut} className="w-full text-xs text-gray-400 hover:text-gray-600 transition">
          Sign out
        </button>
      </div>
    </div>
  );
}
