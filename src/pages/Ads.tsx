import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatDate, formatMVR } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";

type Ad = { id: string; title: string; type: string; amount: number; status: string; starts_at: string; ends_at: string };

export default function Ads() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "banner", amount: "", starts_at: "", ends_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Ads — Memu Seller"; if (user) load(); }, [user]);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("advertisements").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
    setAds(data ?? []); setLoading(false);
  }
  async function submit() {
    if (!form.title || !form.amount) return;
    setSaving(true);
    const { data } = await supabase.from("advertisements").insert({ ...form, amount: Math.round(parseFloat(form.amount) * 100), seller_id: user!.id, status: "pending" }).select().single();
    if (data) setAds(prev => [data, ...prev]);
    setShowForm(false); setForm({ title: "", type: "banner", amount: "", starts_at: "", ends_at: "" }); setSaving(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Advertisements</h1><p className="text-sm text-gray-500 mt-0.5">Boost your store visibility</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "#df0060" }}><Plus className="h-4 w-4" />New Ad</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold">New Advertisement</h3><button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Ad Title</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white">
                <option value="banner">Banner</option><option value="featured">Featured Listing</option><option value="spotlight">Store Spotlight</option>
              </select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Budget (MVR)</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#df0060" }}>{saving ? "Submitting…" : "Submit for Approval"}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
        : ads.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">No ads yet</div>
        : <div className="space-y-2">
          {ads.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500 capitalize">{a.type} · {a.starts_at ? formatDate(a.starts_at) : "—"} → {a.ends_at ? formatDate(a.ends_at) : "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === "active" ? "bg-green-100 text-green-700" : a.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{a.status}</span>
                <span className="text-sm font-medium text-gray-900">{formatMVR(a.amount)}</span>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
