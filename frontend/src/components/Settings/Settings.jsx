import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { Building2, Mail, Phone, MapPin, Image as ImageIcon, FileText, Save, CheckCircle, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <Building2 className="text-white" size={34} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Company Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage company profile information used across reports and print outputs.</p>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <Building2 size={14} />
                Company Name
              </label>
              <input className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <MapPin size={14} />
                Address
              </label>
              <input className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <Phone size={14} />
                Phone
              </label>
              <input className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <Mail size={14} />
                Email
              </label>
              <input className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <ImageIcon size={14} />
                Logo URL
              </label>
              <input className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" value={form.logoUrl} onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                <FileText size={14} />
                Invoice Footer Note
              </label>
              <textarea className="w-full px-3 py-2.5 border border-white/60 bg-white/70 rounded-xl" rows={3} value={form.footerNote} onChange={(e) => setForm((p) => ({ ...p, footerNote: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <button disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-60">
                <Save size={16} />
                {loading ? "Saving..." : "Save Settings"}
              </button>
              {message && (
                <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg ${
                  message.toLowerCase().includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {message.toLowerCase().includes("success") ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {message}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
