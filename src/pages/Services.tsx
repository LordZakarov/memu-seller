import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatMVR, formatDate } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, X, Save, Wrench } from "lucide-react";

type Service = { id: string; title: string; description: string; price: number; pricing_type: string; category: string; status: string; created_at: string };
type Form = { title: string; description: string; price: string; pricing_type: string; category: string };
const emptyForm: Form = { title: "", description: "", price: "", pricing_type: "fixed", category: "Other" };
const CATEGORIES = ["Home Services","Tutoring","Beauty","Tech Repair","Catering","Transport","Other"];
const STATUS_COLORS: Record<string, string> = { active: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", rejected: "bg-red-100 text-red-700" };

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Services — Memu Seller"; if (user) load(); }, [user]);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false });
    setServices(data ?? []);
    setLoading(false);
  }
  async function save() {
    if (!form.title || !form.price) return;
    setSaving(true);
    const payload = { title: form.title, description: form.description, price: Math.round(parseFloat(form.price) * 100), pricing_type: form.pricing_type, category: form.category, seller_id: user!.id, status: "pending" };
    if (editId) {
      await supabase.from("services").update(payload).eq("id", editId);
      setServices(prev => prev.map(s => s.id === editId ? { ...s, ...payload } : s));
    } else {
      const { data } = await supabase.from("services").insert(payload).select().single();
      if (data) setServices(prev => [data, ...prev]);
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Delete this service?")) return;
    await supabase.from("services").delete().eq("id", id);
    setServices(prev => prev.filter(s => s.id !== id));
  }
  function startEdit(s: Service) {
    setForm({ title: s.title, description: s.description ?? "", price: (s.price / 100).toString(), pricing_type: s.pricing_type ?? "fixed", category: s.category ?? "Other" });
    setEditId(s.id); setShowForm(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-semibold text-gray-900">Services</h1><p className="text-sm text-gray-500 mt-0.5">{services.length} listings</p></div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "#df0060" }}>
          <Plus className="h-4 w-4" />Add Service
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{editId ? "Edit Service" : "New Service"}</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Price (MVR)</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Pricing Type</label>
              <select value={form.pricing_type} onChange={e => setForm(p => ({ ...p, pricing_type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white">
                <option value="fixed">Fixed</option><option value="hourly">Per Hour</option><option value="daily">Per Day</option><option value="quote">Quote Only</option>
              </select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#df0060" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : editId ? "Update" : "Add Service"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
        : services.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">No services yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                      <span className="text-xs text-gray-400 capitalize">{s.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                    <p className="text-sm font-medium mt-2" style={{ color: "#df0060" }}>{formatMVR(s.price)} <span className="text-xs text-gray-400 capitalize">/ {s.pricing_type}</span></p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
