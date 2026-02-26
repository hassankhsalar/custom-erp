import { useEffect, useMemo, useRef, useState } from "react";
import { API_ROUTES } from "../../config";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, ScanLine, Tags, Search, Package, Boxes, DollarSign } from "lucide-react";

const altNames = (item) => (Array.isArray(item?.alternative_names) ? item.alternative_names : []);
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function PrintLabel() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const barcodeHostRef = useRef(null);
  const qrHostRef = useRef(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const [productsRes, materialsRes] = await Promise.all([
        fetch(`${API_ROUTES.PRODUCTS_ALL}?search=`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_ROUTES.MATERIALS}?page=1&limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const productsData = await productsRes.json().catch(() => ({}));
      const materialsData = await materialsRes.json().catch(() => ({}));
      const products = (productsData.products || []).map((p) => ({ ...p, type: "product", price: p.sale_price ?? p.cost }));
      const materials = (materialsData.materials || []).map((m) => ({ ...m, type: "material", price: m.sale_price ?? m.unit_cost }));
      setItems([...products, ...materials]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items.filter((i) =>
      String(i.name || "").toLowerCase().includes(q) ||
      String(i.barcode || "").toLowerCase().includes(q) ||
      altNames(i).some((n) => String(n || "").toLowerCase().includes(q))
    ).slice(0, 20);
  }, [items, query]);

  const pickItem = (item) => {
    setSelected(item);
    setSelectedName(item.name || "");
    setQuery("");
  };

  const waitForRender = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const getCodeSvg = async (mode) => {
    await waitForRender();
    const host = mode === "barcode" ? barcodeHostRef.current : qrHostRef.current;
    const svg = host?.querySelector("svg");
    return svg ? svg.outerHTML : "";
  };

  const print = async (mode) => {
    if (!selected) return;
    setPrinting(true);
    const labelName = selectedName || selected.name || "";
    const price = Number(selected.price || 0).toFixed(2);
    const barcode = String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`);
    const codeSvg = await getCodeSvg(mode);
    const w = window.open("", "_blank", "width=500,height=400");
    if (!w) {
      setPrinting(false);
      return;
    }
    w.document.write(`
      <html>
      <head><title>Print Label</title></head>
      <body style="font-family:Arial,sans-serif;padding:20px;background:#f8fafc;">
        <div style="border:1px solid #111827;padding:12px;max-width:320px;text-align:center;background:#fff;border-radius:8px;">
          <div style="font-size:16px;font-weight:700;line-height:1.3;">${escapeHtml(labelName)}</div>
          <div style="margin-top:8px;font-size:14px;font-weight:600;">Price: ${price}</div>
          <div style="margin-top:10px;display:flex;justify-content:center;">${codeSvg}</div>
          <div style="margin-top:8px;font-size:13px;font-weight:600;letter-spacing:0.3px;">${escapeHtml(barcode)}</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    setPrinting(false);
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
              <Tags className="text-white" size={34} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Print Labels
              </h1>
              <p className="text-gray-600 mt-1">Print barcode or QR labels for products and materials.</p>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Item</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type name or barcode..."
                className="w-full pl-10 pr-3 py-2.5 border border-white/60 bg-white/70 rounded-xl"
              />
            </div>
            {filtered.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white/95 border border-white/70 rounded-xl shadow max-h-56 overflow-auto">
                {filtered.map((i) => (
                  <button
                    key={`${i.type}-${i.id}`}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50/70 flex items-center justify-between"
                    onClick={() => pickItem(i)}
                  >
                    <span className="text-sm text-gray-800">{i.name}</span>
                    <span className="text-xs text-gray-500">{i.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && <p className="mt-3 text-sm text-gray-600">Loading items...</p>}

          {selected && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 font-medium">Label Name</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-white/60 bg-white/70 rounded-xl"
                    />
                    {altNames(selected).length > 0 && (
                      <select onChange={(e) => setSelectedName(e.target.value)} className="px-3 py-2 border border-white/60 bg-white/70 rounded-xl">
                        <option value="">Alt names</option>
                        {altNames(selected).map((n, idx) => (
                          <option key={`alt-${idx}`} value={n}>{n}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <DollarSign size={14} className="text-gray-500" />
                  Price: <span className="font-semibold">{Number(selected.price || 0).toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <ScanLine size={14} className="text-gray-500" />
                  Barcode: <span className="font-semibold">{selected.barcode || "-"}</span>
                </div>
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  {selected.type === "product" ? <Package size={14} className="text-gray-500" /> : <Boxes size={14} className="text-gray-500" />}
                  Type: <span className="capitalize font-semibold">{selected.type}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => print("barcode")}
                    disabled={printing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold disabled:opacity-70"
                  >
                    Barcode
                  </button>
                  <button
                    onClick={() => print("qr")}
                    disabled={printing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold disabled:opacity-70"
                  >
                    QR Code
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Live Preview</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-sm font-bold text-gray-900">{selectedName || selected.name}</div>
                  <div className="mt-1 text-xs text-gray-600">Price: {Number(selected.price || 0).toFixed(2)}</div>
                  <div className="mt-3 flex justify-center">
                    <Barcode
                      value={String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
                      format="CODE128"
                      width={1.5}
                      height={52}
                      displayValue={false}
                      margin={0}
                      renderer="svg"
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold tracking-wide text-gray-800">
                    {String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
          <div ref={barcodeHostRef} style={{ background: "#fff", padding: "2px" }}>
            <Barcode
              value={String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
              format="CODE128"
              width={1.4}
              height={68}
              margin={0}
              renderer="svg"
              displayValue={false}
            />
          </div>
          <div ref={qrHostRef} style={{ background: "#fff", padding: "2px" }}>
            <QRCodeSVG
              value={String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
              size={140}
              marginSize={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
