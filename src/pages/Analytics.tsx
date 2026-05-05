import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatMVR } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type DailyStat = { date: string; orders: number; revenue: number };

export default function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Analytics — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("total_amount,created_at,status").eq("seller_id", user!.id);
    const orders = data ?? [];
    const delivered = orders.filter(o => o.status === "delivered");
    const grouped: Record<string, DailyStat> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      grouped[key] = { date: key, orders: 0, revenue: 0 };
    }
    delivered.forEach(o => {
      const key = o.created_at?.split("T")[0];
      if (key && grouped[key]) { grouped[key].orders += 1; grouped[key].revenue += o.total_amount ?? 0; }
    });
    setStats(Object.values(grouped));
    setTotals({ revenue: delivered.reduce((s, o) => s + (o.total_amount ?? 0), 0), orders: delivered.length });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>;

  const maxRevenue = Math.max(...stats.map(s => s.revenue), 1);

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Analytics</h1><p className="text-sm text-gray-500 mt-0.5">Last 30 days — delivered orders only</p></div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">{formatMVR(totals.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Delivered Orders</p>
          <p className="text-2xl font-semibold text-gray-900">{totals.orders}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h2>
        <div className="flex items-end gap-0.5 h-32">
          {stats.map(s => (
            <div key={s.date} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                {formatMVR(s.revenue)}
              </div>
              <div className="w-full rounded-t-sm" style={{ height: `${Math.max((s.revenue / maxRevenue) * 120, s.revenue > 0 ? 3 : 0)}px`, background: "#df0060", opacity: 0.8 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{stats[0]?.date}</span>
          <span className="text-xs text-gray-400">{stats[stats.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
