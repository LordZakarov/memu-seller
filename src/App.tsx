import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { SellerLayout } from "@/layout/SellerLayout";
import Login from "@/pages/Login";
import Subscribe from "@/pages/Subscribe";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Services from "@/pages/Services";
import Orders from "@/pages/Orders";
import Analytics from "@/pages/Analytics";
import BankDetails from "@/pages/BankDetails";
import Account from "@/pages/Account";
import Reviews from "@/pages/Reviews";
import Notifications from "@/pages/Notifications";
import Ads from "@/pages/Ads";
import SubscriptionComplete from "@/pages/SubscriptionComplete";
import { Loader2 } from "lucide-react";

// Gate: if logged in but not subscribed → go to /subscribe
function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { isSubscribed, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>;
  if (!isSubscribed) return <Navigate to="/subscribe" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/subscription/complete" element={<SubscriptionComplete />} />
          <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />
          <Route
            element={
              <RequireAuth>
                <SubscriptionGate>
                  <SellerLayout />
                </SubscriptionGate>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/services" element={<Services />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ads" element={<Ads />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/bank" element={<BankDetails />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
