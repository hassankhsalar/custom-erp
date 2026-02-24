import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  Printer,
  Save,
  AlertCircle,
  CheckCircle,
  Settings,
  Maximize2,
  Minimize2,
  Ruler,
  Type,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

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
  const [messageType, setMessageType] = useState("");

  const fetchOne = async (key, setter) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY(key), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const row = await res.json();
      if (row?.value) setter((prev) => ({ ...prev, ...row.value }));
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
    }
  };

  useEffect(() => {
    fetchOne("barcode_printer", setBarcode);
    fetchOne("pos_invoice_printer", setInvoice);
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setMessageType("");
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
      setMessage("Printer settings saved successfully");
      setMessageType("success");
    } catch (e) {
      setMessage("Failed to save printer settings");
      setMessageType("error");
    } finally {
      setSaving(false);
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
    }
  };

  const current = tab === "barcode" ? barcode : invoice;
  const setCurrent = tab === "barcode" ? setBarcode : setInvoice;

  const handleReset = () => {
    if (tab === "barcode") {
      setBarcode(defaultPrinter);
    } else {
      setInvoice(defaultPrinter);
    }
  };

  const printerFields = [
    { key: "pageWidth", label: "Page Width", unit: "mm", icon: <Maximize2 size={16} />, description: "Width of the paper" },
    { key: "pageHeight", label: "Page Height", unit: "mm", icon: <Minimize2 size={16} />, description: "Height of the paper" },
    { key: "marginTop", label: "Margin Top", unit: "mm", icon: <Ruler size={16} />, description: "Top margin space" },
    { key: "marginRight", label: "Margin Right", unit: "mm", icon: <Ruler size={16} />, description: "Right margin space" },
    { key: "marginBottom", label: "Margin Bottom", unit: "mm", icon: <Ruler size={16} />, description: "Bottom margin space" },
    { key: "marginLeft", label: "Margin Left", unit: "mm", icon: <Ruler size={16} />, description: "Left margin space" },
    { key: "fontSize", label: "Font Size", unit: "pt", icon: <Type size={16} />, description: "Text size in points" },
  ];

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto max-w-4xl">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <Printer className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Printer Settings
              </h1>
              <p className="text-gray-600 mt-2">Configure barcode and invoice printer preferences</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-white/40 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("barcode")}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  tab === "barcode" 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-white/50"
                }`}
              >
                <Printer size={18} />
                Barcode Printer
              </button>
              <button
                onClick={() => setTab("invoice")}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  tab === "invoice" 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-white/50"
                }`}
              >
                <Printer size={18} />
                POS Invoice Printer
              </button>
            </div>
          </div>

          {/* Settings Form */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Settings size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {tab === "barcode" ? "Barcode Printer" : "POS Invoice Printer"} Configuration
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white/60 hover:bg-white/80 rounded-lg transition-colors border border-white/60"
              >
                Reset to Default
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {printerFields.map(({ key, label, unit, icon, description }) => (
                <div key={key} className="group">
                  <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                    <span className="p-1 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-md group-hover:from-blue-500/20 group-hover:to-cyan-500/20 transition-all">
                      {icon}
                    </span>
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={current[key]}
                      onChange={(e) => setCurrent((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))}
                      className="w-full px-4 py-2.5 pr-12 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                      min="0"
                      step="1"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 font-medium">
                      {unit}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
              ))}
            </div>

            {/* Preview Section */}
            <div className="mt-8 p-4 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-white/60 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Printer size={14} className="text-blue-500" />
                Preview Settings
              </h3>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="px-3 py-1.5 bg-white/60 rounded-lg">
                  <span className="text-gray-600">Paper Size: </span>
                  <span className="font-semibold text-gray-800">{current.pageWidth}mm × {current.pageHeight}mm</span>
                </div>
                <div className="px-3 py-1.5 bg-white/60 rounded-lg">
                  <span className="text-gray-600">Margins: </span>
                  <span className="font-semibold text-gray-800">
                    T:{current.marginTop} R:{current.marginRight} B:{current.marginBottom} L:{current.marginLeft}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-white/60 rounded-lg">
                  <span className="text-gray-600">Font Size: </span>
                  <span className="font-semibold text-gray-800">{current.fontSize}pt</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Settings
                  </>
                )}
              </button>
              
              {message && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  messageType === "success" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {messageType === "success" ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                  <span className="text-sm">{message}</span>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50/30 border border-blue-200 rounded-xl">
              <p className="text-sm text-gray-600 flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>
                  These settings apply to thermal printer formatting. Adjust margins to ensure content fits properly on the paper.
                  Standard receipt paper is typically 80mm wide.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}