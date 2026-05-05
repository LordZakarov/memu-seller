import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  TrendingUp, Megaphone, Star, Building2, Bell, User, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Products", to: "/products", icon: Package },
  { label: "Services", to: "/services", icon: Wrench },
  { label: "Orders", to: "/orders", icon: ShoppingCart },
  { label: "Analytics", to: "/analytics", icon: TrendingUp },
  { label: "Advertisements", to: "/ads", icon: Megaphone },
  { label: "Reviews & Q&A", to: "/reviews", icon: Star },
  { label: "Bank Details", to: "/bank", icon: Building2 },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Account", to: "/account", icon: User },
];

export function SellerLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "#df0060" }}>M</div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Memu Seller</div>
            <div className="text-xs text-gray-400">sell.memu.mv</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition group",
                isActive ? "font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
              style={({ isActive }) => isActive ? { background: "#fff0f5", color: "#df0060" } : {}}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ color: "#df0060" }}>
              {profile?.full_name?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || "Seller"}</div>
              <div className="text-xs text-gray-400">{profile?.phone}</div>
            </div>
            <button onClick={async () => { await signOut(); navigate("/login"); }}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
