import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatMVR, formatDateTime } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

type Order = { id: string; order_number: string; total_amount: number; status: string; delivery_option: string; created_at: string; buyer_id: string; delivery_address: string | null; collection_code: string | null };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700", shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Confirm Order", confirmed: "Start Processing", processing: "Mark Shipped", shipped: "Mark Delivered",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { document.title = "Orders — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setActionLoading(order.id);
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    setActionLoading(null);
  }

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);
  const statuses = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Orders</h1><p className="text-sm text-gray-500 mt-0.5">{orders.length} total</p></div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${statusFilter === s ? "text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            style={statusFilter === s ? { background: "#df0060" } : {}}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>{o.status}</span>
                  <span className="text-sm font-medium text-gray-900">#{o.order_number}</span>
                  <span className="text-xs text-gray-400 capitalize">{o.delivery_option}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{formatMVR(o.total_amount)}</span>
                  {expanded === o.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {expanded === o.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div><span className="text-xs text-gray-500">Order Date</span><div className="text-gray-900 text-xs mt-0.5">{formatDateTime(o.created_at)}</div></div>
                    <div><span className="text-xs text-gray-500">Delivery</span><div className="text-gray-900 text-xs mt-0.5 capitalize">{o.delivery_option}</div></div>
                    {o.delivery_address && <div className="col-span-2"><span className="text-xs text-gray-500">Address</span><div className="text-gray-900 text-xs mt-0.5">{o.delivery_address}</div></div>}
                    {o.collection_code && <div><span className="text-xs text-gray-500">Collection Code</span><div className="font-mono font-bold text-gray-900 mt-0.5">{o.collection_code}</div></div>}
                  </div>
                  {NEXT_STATUS[o.status] && (
                    <button onClick={() => advanceStatus(o)} disabled={actionLoading === o.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                      style={{ background: "#df0060" }}>
                      {actionLoading === o.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {NEXT_LABEL[o.status]}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
