import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Crown } from "lucide-react";

export function PremiumGate({ children, feature }: { children: React.ReactNode; feature: string }) {
  const { isSubscribed } = useAuth();
  const navigate = useNavigate();

  if (isSubscribed) return <>{children}</>;

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-yellow-50 border border-yellow-200">
        <Crown className="h-8 w-8 text-yellow-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Premium Feature</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {feature} is available on the Premium plan. Upgrade to unlock all features.
      </p>
      <button onClick={() => navigate("/subscribe")}
        className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ background: "#df0060" }}>
        Upgrade to Premium
      </button>
      <p className="text-xs text-gray-400 mt-3">MVR 300/month or MVR 2800/year</p>
    </div>
  );
}
