import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/Guards";
import { SellerLayout } from "@/layout/SellerLayout";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/subscription/complete" element={<SubscriptionComplete />} />

          {/* Onboarding — requires login but NOT a completed profile */}
          <Route
            path="/onboarding"
            element={<RequireAuth skipOnboardingCheck><Onboarding /></RequireAuth>}
          />

          {/* Subscribe — requires login */}
          <Route path="/subscribe" element={<RequireAuth><Subscribe /></RequireAuth>} />

          {/* All seller routes */}
          <Route element={<RequireAuth><SellerLayout /></RequireAuth>}>
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
