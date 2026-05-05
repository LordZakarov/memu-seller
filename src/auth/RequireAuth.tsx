import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} />
    </div>
  );
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
