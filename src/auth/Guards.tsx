import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
          style={{ background: "#df0060" }}>M</div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#df0060" }} />
          Loading…
        </div>
      </div>
    </div>
  );
}

// Requires logged in
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

// Requires active subscription
export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { session, subscriptionStatus, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (subscriptionStatus !== "active") return <Navigate to="/subscribe" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
