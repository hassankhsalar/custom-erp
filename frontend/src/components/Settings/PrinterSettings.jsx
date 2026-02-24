import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const defaultPrinter = {
  pageWidth: 80,
  pageHeight: 210,
  marginTop: 5,
  marginRight: 5,
  marginBottom: 5,
  marginLeft: 5,
  fontSize: 12,
};

export default function PrinterSettings() {
  const [tab, setTab] = useState("barcode");
  const [barcode, setBarcode] = useState(defaultPrinter);
  const [invoice, setInvoice] = useState(defaultPrinter);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchOne = async (key, setter) => {
    const token = localStorage.getItem("token");
    const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY(key), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const row = await res.json();
    if (row?.value) setter((prev) => ({ ...prev, ...row.value }));
  };

  useEffect(() => {
    fetchOne("barcode_printer", setBarcode);
    fetchOne("pos_invoice_printer", setInvoice);
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = localStorage.getItem("token");
      await Promise.all([
        fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("barcode_printer"), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ value: barcode }),
        }),
        fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("pos_invoice_printer"), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ value: invoice }),
        }),
      ]);
      setMessage("Saved printer settings");
    } catch (e) {
      setMessage("Failed to save printer settings");
    } finally {
      setSaving(false);
    }
  };

  const current = tab === "barcode" ? barcode : invoice;
  const setCurrent = tab === "barcode" ? setBarcode : setInvoice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-6 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Printer Settings</h1>
        <div className="flex gap-2 mb-6">
          <button className={`px-4 py-2 rounded-lg ${tab === "barcode" ? "bg-indigo-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("barcode")}>Barcode Printer</button>
          <button className={`px-4 py-2 rounded-lg ${tab === "invoice" ? "bg-indigo-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("invoice")}>POS Invoice Printer</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["pageWidth", "Page Width (mm)"],
            ["pageHeight", "Page Height (mm)"],
            ["marginTop", "Margin Top"],
            ["marginRight", "Margin Right"],
            ["marginBottom", "Margin Bottom"],
            ["marginLeft", "Margin Left"],
            ["fontSize", "Font Size"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-sm text-gray-700">{label}</label>
              <input
                type="number"
                value={current[key]}
                onChange={(e) => setCurrent((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
          {message && <span className="text-sm text-gray-700">{message}</span>}
        </div>
      </div>
    </div>
  );
}
