import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#FBF8F1" }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: "#df0060" }}
        >
          M
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#df0060" }} />
          Loading…
        </div>
      </div>
    </div>
  );
}

/** Requires the user to be logged in. Redirects to /login if not.
 *  Pass skipOnboardingCheck={true} on the /onboarding route itself
 *  to prevent an infinite redirect loop.
 */
export function RequireAuth({
  children,
  skipOnboardingCheck = false,
}: {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}) {
  const { session, loading, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!skipOnboardingCheck && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

/** Requires an active subscription. */
export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { session, isSubscribed, loading, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  if (!isSubscribed) return <Navigate to="/subscribe" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
