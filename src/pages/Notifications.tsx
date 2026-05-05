import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatDateTime } from "@/lib/utils";
import { Loader2, Bell } from "lucide-react";

type Notif = { id: string; title: string; body: string; read: boolean; created_at: string };

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Notifications — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    setNotifs(data ?? []);
    setLoading(false);
    // Mark all as read
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
  }

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Notifications</h1></div>
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
        : notifs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className={`bg-white rounded-xl border p-4 ${!n.read ? "border-pink-200" : "border-gray-200"}`}
                style={!n.read ? { background: "#fff8fb" } : {}}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? "bg-gray-300" : "bg-pink-500"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
