import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { formatDate } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, X, Save, Package, ImagePlus, XCircle, ChevronDown, ChevronUp, Star } from "lucide-react";

type Product = {
  id: string; title: string; description: string | null;
  price_mvr: number; original_price_mvr: number | null; stock: number;
  category: string; approval_status: string; is_active: boolean;
  images: string[]; brand: string | null; sku: string | null;
  weight_grams: number | null; dimensions: string | null; ingredients: string | null;
  sizes: string[]; colors: string[]; material: string | null;
  delivery_seller_to_buyer: boolean; delivery_buyer_collects: boolean;
  delivery_locker: boolean; delivery_fee_mvr: number | null;
  rating_avg: number | null; rating_count: number | null;
  created_at: string;
};

type Form = {
  title: string; description: string; price_mvr: string; original_price_mvr: string;
  stock: string; category: string; brand: string; sku: string;
  weight_grams: string; dimensions: string; ingredients: string;
  sizes: string; colors: string; material: string;
  delivery_seller_to_buyer: boolean; delivery_buyer_collects: boolean;
  delivery_locker: boolean; delivery_fee_mvr: string;
};

const CATEGORIES = ["Electronics","Clothing","Food & Beverages","Home & Garden","Health & Beauty","Sports","Books","Toys","Other"];

const emptyForm: Form = {
  title: "", description: "", price_mvr: "", original_price_mvr: "", stock: "", category: "Other",
  brand: "", sku: "", weight_grams: "", dimensions: "", ingredients: "",
  sizes: "", colors: "", material: "",
  delivery_seller_to_buyer: true, delivery_buyer_collects: false, delivery_locker: false,
  delivery_fee_mvr: "",
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Products — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("products")
      .select("id,title,description,price_mvr,original_price_mvr,stock,category,approval_status,is_active,images,brand,sku,weight_grams,dimensions,ingredients,sizes,colors,material,delivery_seller_to_buyer,delivery_buyer_collects,delivery_locker,delivery_fee_mvr,rating_avg,rating_count,created_at")
      .eq("seller_id", user!.id)
      .order("created_at", { ascending: false });
    if (err) console.error("Load error:", err.message);
    setProducts(data ?? []);
    setLoading(false);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const allowed = 5 - existingImages.length - imageFiles.length;
    const toAdd = files.slice(0, allowed);
    setImageFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => { const r = new FileReader(); r.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string]); r.readAsDataURL(f); });
    e.target.value = "";
  }

  async function uploadImages(productId: string): Promise<string[]> {
    if (!imageFiles.length) return [];
    setUploadingImages(true);
    const urls: string[] = [];
    try {
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop();
        const path = `${user!.id}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
        if (upErr) { console.error("Image upload error:", upErr.message); continue; }
        const { data: u } = supabase.storage.from("product-images").getPublicUrl(path);
        if (u?.publicUrl) urls.push(u.publicUrl);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingImages(false);
    }
    return urls;
  }

  function parseList(s: string): string[] {
    return s.split(",").map(x => x.trim()).filter(Boolean);
  }

  function buildPayload(f: Form) {
    const hasDelivery = f.delivery_seller_to_buyer || f.delivery_buyer_collects || f.delivery_locker;
    if (!hasDelivery) throw new Error("Select at least one delivery method");
    return {
      title: f.title.trim(),
      description: f.description.trim() || null,
      price_mvr: parseFloat(f.price_mvr),
      original_price_mvr: f.original_price_mvr ? parseFloat(f.original_price_mvr) : null,
      stock: parseInt(f.stock) || 0,
      category: f.category,
      brand: f.brand.trim() || null,
      sku: f.sku.trim() || null,
      weight_grams: f.weight_grams ? parseInt(f.weight_grams) : null,
      dimensions: f.dimensions.trim() || null,
      ingredients: f.ingredients.trim() || null,
      sizes: parseList(f.sizes),
      colors: parseList(f.colors),
      material: f.material.trim() || null,
      delivery_seller_to_buyer: f.delivery_seller_to_buyer,
      delivery_buyer_collects: f.delivery_buyer_collects,
      delivery_locker: f.delivery_locker,
      delivery_fee_mvr: f.delivery_fee_mvr ? parseFloat(f.delivery_fee_mvr) : null,
    };
  }

  async function save() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.price_mvr || isNaN(parseFloat(form.price_mvr))) { setError("Please enter a valid price"); return; }
    setSaving(true); setError("");
    try {
      const payload = buildPayload(form);
      if (editId) {
        const newUrls = await uploadImages(editId);
        const allImages = [...existingImages, ...newUrls];
        const { error: e } = await supabase.from("products").update({ ...payload, images: allImages }).eq("id", editId);
        if (e) { setError(e.message); return; }
        setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...payload, images: allImages } : p));
      } else {
        const { data: inserted, error: e } = await supabase.from("products")
          .insert({ ...payload, seller_id: user!.id, approval_status: "approved", is_active: true, images: [] })
          .select("id,title,description,price_mvr,original_price_mvr,stock,category,approval_status,is_active,images,brand,sku,weight_grams,dimensions,ingredients,sizes,colors,material,delivery_seller_to_buyer,delivery_buyer_collects,delivery_locker,delivery_fee_mvr,rating_avg,rating_count,created_at")
          .single();
        if (e) { setError(e.message); return; }
        if (imageFiles.length && inserted) {
          const urls = await uploadImages(inserted.id);
          if (urls.length) {
            await supabase.from("products").update({ images: urls }).eq("id", inserted.id);
            inserted.images = urls;
          }
        }
        if (inserted) setProducts(prev => [inserted, ...prev]);
      }
      closeForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error: e } = await supabase.from("products").delete().eq("id", id);
    if (e) { alert(e.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  function startEdit(p: Product) {
    setForm({
      title: p.title, description: p.description ?? "",
      price_mvr: p.price_mvr?.toString() ?? "",
      original_price_mvr: p.original_price_mvr?.toString() ?? "",
      stock: p.stock?.toString() ?? "0", category: p.category ?? "Other",
      brand: p.brand ?? "", sku: p.sku ?? "",
      weight_grams: p.weight_grams?.toString() ?? "",
      dimensions: p.dimensions ?? "", ingredients: p.ingredients ?? "",
      sizes: (p.sizes ?? []).join(", "), colors: (p.colors ?? []).join(", "),
      material: p.material ?? "",
      delivery_seller_to_buyer: p.delivery_seller_to_buyer ?? true,
      delivery_buyer_collects: p.delivery_buyer_collects ?? false,
      delivery_locker: p.delivery_locker ?? false,
      delivery_fee_mvr: p.delivery_fee_mvr?.toString() ?? "",
    });
    setExistingImages(p.images ?? []);
    setImageFiles([]); setImagePreviews([]);
    setEditId(p.id); setShowForm(true); setShowAdvanced(false);
  }

  function closeForm() {
    setShowForm(false); setEditId(null); setForm(emptyForm); setError("");
    setImageFiles([]); setImagePreviews([]); setExistingImages([]); setShowAdvanced(false);
  }

  const STATUS_COLORS: Record<string, string> = {
    approved: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
  };

  const totalImages = existingImages.length + imageFiles.length;
  const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300";
  const F = (key: keyof Form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });
  const chk = (key: keyof Form, label: string, desc: string) => (
    <button type="button" onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
      className={`p-3 rounded-xl border-2 text-left transition ${form[key] ? "border-pink-400 bg-pink-50" : "border-gray-200 bg-white"}`}>
      <div className={`text-xs font-semibold mb-0.5 ${form[key] ? "" : "text-gray-700"}`} style={form[key] ? { color: "#df0060" } : {}}>{label}</div>
      <div className="text-xs text-gray-400">{desc}</div>
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} listing{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "#df0060" }}>
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{editId ? "Edit Product" : "New Product"}</h3>
            <button onClick={closeForm}><X className="h-4 w-4 text-gray-400" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" {...F("title")} className={inp} placeholder="Product name" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea {...F("description")} rows={3} className={inp + " resize-none"} placeholder="Describe your product — buyers can search by this" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price (MVR) *</label>
              <input type="number" min="0" step="0.01" {...F("price_mvr")} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Original Price (MVR) <span className="text-gray-400">for sale</span></label>
              <input type="number" min="0" step="0.01" {...F("original_price_mvr")} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" min="0" {...F("stock")} className={inp} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp + " bg-white"}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
              <input type="text" {...F("brand")} className={inp} placeholder="e.g. Nike, Samsung" />
            </div>

            {/* Delivery */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-2">Delivery Methods * <span className="text-gray-400 font-normal">(select all that apply)</span></label>
              <div className="grid grid-cols-3 gap-2">
                {chk("delivery_seller_to_buyer", "Home Delivery", "Courier to buyer")}
                {chk("delivery_buyer_collects", "Collection Point", "Buyer picks up")}
                {chk("delivery_locker", "Locker Pickup", "Nearest locker")}
              </div>
              {(form.delivery_seller_to_buyer || form.delivery_locker) && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Fee (MVR)</label>
                  <input type="number" min="0" step="0.01" {...F("delivery_fee_mvr")} className={inp} placeholder="0.00 for free delivery" />
                </div>
              )}
            </div>

            {/* Advanced toggle */}
            <div className="col-span-2">
              <button type="button" onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAdvanced ? "Hide" : "Show"} additional details (SKU, size, colour, weight…)
              </button>
            </div>

            {showAdvanced && <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                <input type="text" {...F("sku")} className={inp} placeholder="Stock keeping unit" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Weight (grams)</label>
                <input type="number" min="0" {...F("weight_grams")} className={inp} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dimensions</label>
                <input type="text" {...F("dimensions")} className={inp} placeholder="20cm × 10cm × 5cm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Material / Pattern</label>
                <input type="text" {...F("material")} className={inp} placeholder="100% Cotton, Floral" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sizes <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input type="text" {...F("sizes")} className={inp} placeholder="S, M, L, XL" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Colors <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input type="text" {...F("colors")} className={inp} placeholder="Red, Blue, Black" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Ingredients / Contents</label>
                <textarea {...F("ingredients")} rows={2} className={inp + " resize-none"} placeholder="For food, cosmetics, supplements etc." />
              </div>
            </>}

            {/* Images */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-2">Photos <span className="text-gray-400 font-normal">({totalImages}/5)</span></label>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, i) => (
                  <div key={`e-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {imagePreviews.map((src, i) => (
                  <div key={`n-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setImageFiles(prev => prev.filter((_, idx) => idx !== i)); setImagePreviews(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute top-0.5 right-0.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {totalImages < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-pink-300 hover:text-pink-400 transition">
                    <ImagePlus className="h-5 w-5" /><span className="text-xs">Add</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <p className="text-xs text-gray-400 mt-1.5">Up to 5 photos. JPG, PNG or WEBP.</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-3 p-3 bg-red-50 rounded-lg">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || uploadingImages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition"
              style={{ background: "#df0060" }}>
              {(saving || uploadingImages) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {uploadingImages ? "Uploading…" : saving ? "Saving…" : editId ? "Update" : "Add Product"}
            </button>
            <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">No products yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{["Product","Price","Stock","Rating","Status","Added",""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package className="h-4 w-4 text-gray-400" /></div>}
                      <div>
                        <div className="font-medium text-gray-900 max-w-[180px] truncate">{p.title}</div>
                        <div className="text-xs text-gray-400">{p.brand ? `${p.brand} · ` : ""}{p.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                    MVR {Number(p.price_mvr).toFixed(2)}
                    {p.original_price_mvr && <div className="text-xs text-gray-400 line-through">MVR {Number(p.original_price_mvr).toFixed(2)}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.stock ?? 0}</td>
                  <td className="px-4 py-3">
                    {p.rating_count ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-amber-400" />
                        <span className="text-xs text-gray-700">{Number(p.rating_avg).toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({p.rating_count})</span>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(p)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
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
