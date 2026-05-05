import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatMVR, formatDate } from "@/lib/utils";
import { ShoppingCart, Package, TrendingUp, Clock, Loader2 } from "lucide-react";

type Stats = { totalOrders: number; pendingOrders: number; totalProducts: number; totalRevenue: number };
type RecentOrder = { id: string; order_number: string; total_amount: number; status: string; created_at: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard — Memu Seller";
    if (user) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [ordersRes, productsRes, recentRes] = await Promise.all([
      supabase.from("orders").select("id,total_amount,status").eq("seller_id", user!.id),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user!.id),
      supabase.from("orders").select("id,order_number,total_amount,status,created_at")
        .eq("seller_id", user!.id).order("created_at", { ascending: false }).limit(6),
    ]);
    const allOrders = ordersRes.data ?? [];
    setStats({
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === "pending").length,
      totalProducts: productsRes.count ?? 0,
      totalRevenue: allOrders.filter(o => o.status === "delivered").reduce((s, o) => s + (o.total_amount ?? 0), 0),
    });
    setOrders(recentRes.data ?? []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>;

  const cards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
    { label: "Pending", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    { label: "Products", value: stats?.totalProducts ?? 0, icon: Package, color: "text-green-600 bg-green-50" },
    { label: "Revenue", value: formatMVR(stats?.totalRevenue ?? 0), icon: TrendingUp, color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your store overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-xl font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No orders yet</div>
        ) : orders.map(o => (
          <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0 transition">
            <div>
              <div className="text-sm font-medium text-gray-900">#{o.order_number}</div>
              <div className="text-xs text-gray-400">{formatDate(o.created_at)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>{o.status}</span>
              <span className="text-sm font-medium text-gray-900">{formatMVR(o.total_amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
