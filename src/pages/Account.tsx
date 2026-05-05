import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { Loader2, Save, Moon } from "lucide-react";

export default function Account() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: "", holiday_mode: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = "Account — Memu Seller";
    if (profile) setForm({ full_name: profile.full_name ?? "", holiday_mode: false });
  }, [profile]);

  async function save() {
    setSaving(true);
    await supabase.from("users").update({ full_name: form.full_name }).eq("id", user!.id);
    await supabase.from("seller_profiles").upsert({ seller_id: user!.id, holiday_mode: form.holiday_mode }, { onConflict: "seller_id" });
    await refreshProfile();
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Account</h1><p className="text-sm text-gray-500 mt-0.5">Manage your seller profile</p></div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-pink-300" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="text" value={profile?.phone ?? ""} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-gray-500" />
            <div><div className="text-sm font-medium text-gray-900">Holiday Mode</div><div className="text-xs text-gray-500">Pause your store temporarily</div></div>
          </div>
          <button onClick={() => setForm(p => ({ ...p, holiday_mode: !p.holiday_mode }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.holiday_mode ? "bg-yellow-400" : "bg-gray-200"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.holiday_mode ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white w-full justify-center"
          style={{ background: saved ? "#4CAF50" : "#df0060" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
