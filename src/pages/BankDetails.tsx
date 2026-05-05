import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, Save, Building2 } from "lucide-react";

type BankInfo = { id?: string; bank_name: string; account_name: string; account_number: string; verified: boolean };

export default function BankDetails() {
  const { user } = useAuth();
  const [info, setInfo] = useState<BankInfo>({ bank_name: "", account_name: "", account_number: "", verified: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { document.title = "Bank Details — Memu Seller"; if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("seller_bank_details").select("*").eq("seller_id", user!.id).maybeSingle();
    if (data) setInfo(data);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const payload = { ...info, seller_id: user!.id, updated_at: new Date().toISOString() };
    if (info.id) await supabase.from("seller_bank_details").update(payload).eq("id", info.id);
    else { const { data } = await supabase.from("seller_bank_details").insert(payload).select().single(); if (data) setInfo(d => ({ ...d, id: data.id })); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "#df0060" }} /></div>;

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Bank Details</h1><p className="text-sm text-gray-500 mt-0.5">Required before receiving payouts</p></div>
      {info.verified && <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">✓ Your bank details are verified by admin</div>}
      {!info.verified && info.id && <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">⏳ Awaiting admin verification</div>}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2"><Building2 className="h-5 w-5" style={{ color: "#df0060" }} /><span className="text-sm font-semibold text-gray-900">BML Bank Details</span></div>
        {[
          { label: "Bank Name", key: "bank_name", placeholder: "Bank of Maldives (BML)" },
          { label: "Account Name", key: "account_name", placeholder: "Your full name" },
          { label: "Account Number", key: "account_number", placeholder: "7770001234567" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type="text" placeholder={placeholder} value={(info as Record<string, string>)[key] ?? ""}
              onChange={e => setInfo(p => ({ ...p, [key]: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300" />
          </div>
        ))}
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white w-full justify-center"
          style={{ background: saved ? "#4CAF50" : "#df0060" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Bank Details"}
        </button>
      </div>
    </div>
  );
}
