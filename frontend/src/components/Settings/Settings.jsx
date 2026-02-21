import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const defaultCompany = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  footerNote: "",
};

export default function Settings() {
  const [form, setForm] = useState(defaultCompany);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const row = await res.json();
      if (row?.value) setForm({ ...defaultCompany, ...row.value });
    } catch (_) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setMessage("Saved successfully");
    } catch (err) {
      setMessage(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-6 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">General Settings</h1>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Company Name</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Address</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm text-gray-700">Phone</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Logo URL</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.logoUrl} onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Invoice Footer Note</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={form.footerNote} onChange={(e) => setForm((p) => ({ ...p, footerNote: e.target.value }))} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <button disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Saving..." : "Save Settings"}
            </button>
            {message && <span className="text-sm text-gray-700">{message}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
