import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatMVR, formatDate } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, X, Save, Package } from "lucide-react";

// ── Types matching the actual `products` table schema ──────────────────────
type Product = {
  id: string;
  title: string;
  description: string | null;
  price_mvr: number;          // was: price
  stock: number;              // was: stock_quantity
  category: string;
  approval_status: string;    // was: status
  is_active: boolean;
  created_at: string;
};

type Form = {
  title: string;
  description: string;
  price_mvr: string;
  stock: string;
  category: string;
};

const CATEGORIES = [
  "Electronics", "Clothing", "Food & Beverages", "Home & Garden",
  "Health & Beauty", "Sports", "Books", "Toys", "Other",
];

const emptyForm: Form = {
  title: "", description: "", price_mvr: "", stock: "", category: "Other",
};

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Products — Memu Seller";
    if (user) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("products")
      .select("id,title,description,price_mvr,stock,category,approval_status,is_active,created_at")
      .eq("seller_id", user!.id)
      .order("created_at", { ascending: false });

    if (err) console.error("Products load error:", err.message);
    setProducts(data ?? []);
    setLoading(false);
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.price_mvr || isNaN(parseFloat(form.price_mvr))) {
      setError("Please enter a valid price"); return;
    }
    setSaving(true); setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      // price_mvr stored as actual MVR decimal (NOT laari) — matches schema type numeric
      price_mvr: parseFloat(parseFloat(form.price_mvr).toFixed(2)),
      stock: parseInt(form.stock) || 0,
      category: form.category,
      seller_id: user!.id,
      // New listings go to pending approval
      approval_status: "pending",
      is_active: false,
      // Required non-nullable fields
      images: [],
    };

    if (editId) {
      const { error: e } = await supabase
        .from("products")
        .update({
          title: payload.title,
          description: payload.description,
          price_mvr: payload.price_mvr,
          stock: payload.stock,
          category: payload.category,
        })
        .eq("id", editId);

      if (e) { setError(e.message); setSaving(false); return; }
      setProducts(prev =>
        prev.map(p => p.id === editId ? { ...p, ...payload } : p)
      );
    } else {
      const { data, error: e } = await supabase
        .from("products")
        .insert(payload)
        .select("id,title,description,price_mvr,stock,category,approval_status,is_active,created_at")
        .single();

      if (e) { setError(e.message); setSaving(false); return; }
      if (data) setProducts(prev => [data, ...prev]);
    }

    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error: e } = await supabase.from("products").delete().eq("id", id);
    if (e) { alert(e.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  function startEdit(p: Product) {
    setForm({
      title: p.title,
      description: p.description ?? "",
      price_mvr: p.price_mvr?.toString() ?? "",
      stock: p.stock?.toString() ?? "0",
      category: p.category ?? "Other",
    });
    setEditId(p.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setError("");
  }

  const STATUS_COLORS: Record<string, string> = {
    approved:  "bg-green-100 text-green-700",
    pending:   "bg-yellow-100 text-yellow-700",
    rejected:  "bg-red-100 text-red-700",
    inactive:  "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} listing{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: "#df0060" }}
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editId ? "Edit Product" : "New Product"}
            </h3>
            <button onClick={closeForm}>
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300"
                placeholder="Product name"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300 resize-none"
                placeholder="Describe your product"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price (MVR) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_mvr}
                onChange={e => setForm(p => ({ ...p, price_mvr: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition"
              style={{ background: "#df0060" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : editId ? "Update" : "Add Product"}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">No products yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first product to start selling</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Product", "Price (MVR)", "Stock", "Status", "Added", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">{p.title}</div>
                    <div className="text-xs text-gray-400 capitalize">{p.category}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {p.price_mvr != null ? `MVR ${Number(p.price_mvr).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.stock ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
