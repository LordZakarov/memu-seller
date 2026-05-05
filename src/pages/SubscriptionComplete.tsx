import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function SubscriptionComplete() {
  const [params] = useSearchParams();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    verify();
  }, []);

  async function verify() {
    const transactionId = params.get("transactionId") ?? params.get("transaction_id");
    const state = params.get("state");
    const signature = params.get("signature");
    if (!transactionId || state !== "CONFIRMED") { setStatus("failed"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("verify-bml-subscription-payment", {
        body: { transactionId, state, signature },
      });
      if (error || !data?.success) { setStatus("failed"); return; }
      await refreshProfile();
      setStatus("success");
      setTimeout(() => navigate("/"), 2500);
    } catch { setStatus("failed"); }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
        {status === "loading" && (<><Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: "#df0060" }} /><p className="text-sm text-gray-600">Verifying payment…</p></>)}
        {status === "success" && (<><CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" /><h2 className="text-lg font-semibold text-gray-900 mb-1">Subscribed!</h2><p className="text-sm text-gray-500">Redirecting to your dashboard…</p></>)}
        {status === "failed" && (<><XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" /><h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h2><p className="text-sm text-gray-500 mb-4">Your subscription was not activated.</p><button onClick={() => navigate("/subscribe")} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "#df0060" }}>Try Again</button></>)}
      </div>
    </div>
  );
}
