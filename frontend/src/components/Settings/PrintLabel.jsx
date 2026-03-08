import { useEffect, useMemo, useRef, useState } from "react";
import { API_ROUTES } from "../../config";
import { includesLooseNumber } from "../../utils/numberLooseSearch";
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
  const [previewMode, setPreviewMode] = useState("barcode");
  const barcodeHostRef = useRef(null);
  const qrHostRef = useRef(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSheetForm, setShowSheetForm] = useState(false);
  const [sheet, setSheet] = useState({
    mode: "barcode",
    pageSize: "A4",
    orientation: "portrait",
    pageWidthMm: 210,
    pageHeightMm: 297,
    marginMm: 8,
    gapXmm: 4,
    gapYmm: 4,
    labelWidthMm: 50,
    labelHeightMm: 35,
    codeWidthMm: 34,
    codeHeightMm: 14,
    qrSizeMm: 22,
    copies: 24,
    fillPage: true,
    showName: true,
    showPrice: true,
    showCode: true,
    showType: false,
  });

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
      includesLooseNumber(i.name, q) ||
      includesLooseNumber(i.barcode, q) ||
      altNames(i).some((n) => includesLooseNumber(n, q))
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

  const updateSheet = (key, value) => {
    setSheet((prev) => ({ ...prev, [key]: value }));
  };

  const getPageSize = () => {
    const preset = {
      A5: { w: 148, h: 210 },
      A4: { w: 210, h: 297 },
      A3: { w: 297, h: 420 },
      LETTER: { w: 215.9, h: 279.4 },
      LEGAL: { w: 215.9, h: 355.6 },
      TABLOID: { w: 279.4, h: 431.8 },
    };
    const base =
      sheet.pageSize === "CUSTOM"
        ? { w: Math.max(Number(sheet.pageWidthMm) || 210, 50), h: Math.max(Number(sheet.pageHeightMm) || 297, 50) }
        : (preset[sheet.pageSize] || preset.A4);
    const portrait = sheet.orientation === "portrait";
    return portrait ? base : { w: base.h, h: base.w };
  };

  const computeCapacity = () => {
    const { w, h } = getPageSize();
    const innerW = Math.max(w - sheet.marginMm * 2, 1);
    const innerH = Math.max(h - sheet.marginMm * 2, 1);
    const cols = Math.max(Math.floor((innerW + sheet.gapXmm) / (sheet.labelWidthMm + sheet.gapXmm)), 1);
    const rows = Math.max(Math.floor((innerH + sheet.gapYmm) / (sheet.labelHeightMm + sheet.gapYmm)), 1);
    return { cols, rows, capacity: cols * rows };
  };

  const printSheet = async () => {
    if (!selected) return;
    setPrinting(true);
    const labelName = selectedName || selected.name || "";
    const price = Number(selected.price || 0).toFixed(2);
    const code = String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`);
    const mode = sheet.mode;
    const codeSvg = await getCodeSvg(mode);
    const { capacity } = computeCapacity();
    const total = sheet.fillPage ? capacity : Math.max(Number(sheet.copies) || 1, 1);
    const labelsHtml = Array.from({ length: total }).map(() => `
      <div class="label">
        ${sheet.showName ? `<div class="line name">${escapeHtml(labelName)}</div>` : ""}
        ${sheet.showType ? `<div class="line type">${escapeHtml(String(selected.type || ""))}</div>` : ""}
        ${sheet.showPrice ? `<div class="line price">Price: ${escapeHtml(price)}</div>` : ""}
        <div class="code-wrap ${mode === "qr" ? "qr-wrap" : "barcode-wrap"}">${codeSvg}</div>
        ${sheet.showCode ? `<div class="line code">${escapeHtml(code)}</div>` : ""}
      </div>
    `).join("");
    const page = getPageSize();
    const codeStyle = mode === "qr"
      ? `width:${sheet.qrSizeMm}mm;height:${sheet.qrSizeMm}mm;`
      : `width:${sheet.codeWidthMm}mm;height:${sheet.codeHeightMm}mm;`;
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) {
      setPrinting(false);
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>Sheet Print Preview</title>
          <style>
            @page { size: ${page.w}mm ${page.h}mm; margin: ${sheet.marginMm}mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #eef2f7; color: #111827; }
            .toolbar { position: sticky; top: 0; z-index: 10; padding: 10px 14px; background: #0f172a; color: #fff; display: flex; gap: 10px; align-items: center; }
            .toolbar button { border: 0; background: #22c55e; color: #0b1220; border-radius: 6px; font-weight: 700; padding: 8px 12px; cursor: pointer; }
            .toolbar small { opacity: 0.9; }
            .sheet { width: ${page.w}mm; min-height: ${page.h}mm; margin: 12px auto; background: #fff; padding: ${sheet.marginMm}mm; display: grid; grid-template-columns: repeat(auto-fill, minmax(${sheet.labelWidthMm}mm, ${sheet.labelWidthMm}mm)); grid-auto-rows: ${sheet.labelHeightMm}mm; gap: ${sheet.gapYmm}mm ${sheet.gapXmm}mm; align-content: start; justify-content: start; }
            .label { width: ${sheet.labelWidthMm}mm; height: ${sheet.labelHeightMm}mm; border: 1px solid #d1d5db; border-radius: 2mm; padding: 2mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; }
            .line { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .name { font-size: 2.8mm; font-weight: 700; }
            .type, .price { font-size: 2.4mm; }
            .code { font-size: 2.3mm; letter-spacing: 0.08em; font-weight: 700; }
            .code-wrap { display: flex; align-items: center; justify-content: center; margin: 1.2mm 0; ${codeStyle} }
            .code-wrap svg { width: 100% !important; height: 100% !important; }
            @media print {
              body { background: #fff; }
              .toolbar { display: none; }
              .sheet { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button onclick="window.print()">Print</button>
            <small>Preview: ${escapeHtml(sheet.pageSize)} (${page.w}mm x ${page.h}mm) | Labels: ${total}</small>
          </div>
          <div class="sheet">${labelsHtml}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
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
                  <button
                    onClick={() => setShowSheetForm((v) => !v)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold"
                  >
                    {showSheetForm ? "Hide Sheet Print" : "Sheet Print"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
                  <div className="inline-flex rounded-xl border border-white/60 bg-white/70 p-1">
                    <button
                      onClick={() => setPreviewMode("barcode")}
                      className={`px-3 py-1.5 text-sm rounded-lg ${previewMode === "barcode" ? "bg-blue-500 text-white" : "text-gray-700"}`}
                    >
                      Barcode
                    </button>
                    <button
                      onClick={() => setPreviewMode("qr")}
                      className={`px-3 py-1.5 text-sm rounded-lg ${previewMode === "qr" ? "bg-emerald-500 text-white" : "text-gray-700"}`}
                    >
                      QR Code
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-sm font-bold text-gray-900">{selectedName || selected.name}</div>
                  <div className="mt-1 text-xs text-gray-600">Price: {Number(selected.price || 0).toFixed(2)}</div>
                  <div className="mt-3 flex justify-center">
                    {previewMode === "barcode" ? (
                      <Barcode
                        value={String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
                        format="CODE128"
                        width={1.5}
                        height={52}
                        displayValue={false}
                        margin={0}
                        renderer="svg"
                      />
                    ) : (
                      <QRCodeSVG
                        value={String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
                        size={120}
                        marginSize={0}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-xs font-semibold tracking-wide text-gray-800">
                    {String(selected.barcode || `${String(selected.type || "item").toUpperCase()}-${selected.id || "NA"}`)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selected && showSheetForm && (
            <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Sheet Print Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm text-gray-700">
                  Mode
                  <select value={sheet.mode} onChange={(e) => updateSheet("mode", e.target.value)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl">
                    <option value="barcode">Barcode</option>
                    <option value="qr">QR Code</option>
                  </select>
                </label>
                <label className="text-sm text-gray-700">
                  Page Size
                  <select value={sheet.pageSize} onChange={(e) => updateSheet("pageSize", e.target.value)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl">
                    <option value="A5">A5</option>
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="LETTER">Letter</option>
                    <option value="LEGAL">Legal</option>
                    <option value="TABLOID">Tabloid</option>
                    <option value="CUSTOM">Custom (mm)</option>
                  </select>
                </label>
                <label className="text-sm text-gray-700">
                  Orientation
                  <select value={sheet.orientation} onChange={(e) => updateSheet("orientation", e.target.value)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl">
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>
                {sheet.pageSize === "CUSTOM" && (
                  <>
                    <label className="text-sm text-gray-700">
                      Page Width (mm)
                      <input type="number" min="50" value={sheet.pageWidthMm} onChange={(e) => updateSheet("pageWidthMm", Number(e.target.value) || 50)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                    </label>
                    <label className="text-sm text-gray-700">
                      Page Height (mm)
                      <input type="number" min="50" value={sheet.pageHeightMm} onChange={(e) => updateSheet("pageHeightMm", Number(e.target.value) || 50)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                    </label>
                  </>
                )}
                <label className="text-sm text-gray-700">
                  Margin (mm)
                  <input type="number" min="0" value={sheet.marginMm} onChange={(e) => updateSheet("marginMm", Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
                <label className="text-sm text-gray-700">
                  Gap X (mm)
                  <input type="number" min="0" value={sheet.gapXmm} onChange={(e) => updateSheet("gapXmm", Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
                <label className="text-sm text-gray-700">
                  Gap Y (mm)
                  <input type="number" min="0" value={sheet.gapYmm} onChange={(e) => updateSheet("gapYmm", Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
                <label className="text-sm text-gray-700">
                  Label Width (mm)
                  <input type="number" min="10" value={sheet.labelWidthMm} onChange={(e) => updateSheet("labelWidthMm", Number(e.target.value) || 10)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
                <label className="text-sm text-gray-700">
                  Label Height (mm)
                  <input type="number" min="10" value={sheet.labelHeightMm} onChange={(e) => updateSheet("labelHeightMm", Number(e.target.value) || 10)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
                {sheet.mode === "barcode" ? (
                  <>
                    <label className="text-sm text-gray-700">
                      Barcode Width (mm)
                      <input type="number" min="10" value={sheet.codeWidthMm} onChange={(e) => updateSheet("codeWidthMm", Number(e.target.value) || 10)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                    </label>
                    <label className="text-sm text-gray-700">
                      Barcode Height (mm)
                      <input type="number" min="5" value={sheet.codeHeightMm} onChange={(e) => updateSheet("codeHeightMm", Number(e.target.value) || 5)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                    </label>
                  </>
                ) : (
                  <label className="text-sm text-gray-700">
                    QR Size (mm)
                    <input type="number" min="10" value={sheet.qrSizeMm} onChange={(e) => updateSheet("qrSizeMm", Number(e.target.value) || 10)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                  </label>
                )}
                <label className="text-sm text-gray-700">
                  Copies
                  <input type="number" min="1" value={sheet.copies} onChange={(e) => updateSheet("copies", Number(e.target.value) || 1)} className="mt-1 w-full px-3 py-2 border border-white/60 bg-white/80 rounded-xl" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sheet.fillPage} onChange={(e) => updateSheet("fillPage", e.target.checked)} /> Fill whole page</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sheet.showName} onChange={(e) => updateSheet("showName", e.target.checked)} /> Show name</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sheet.showPrice} onChange={(e) => updateSheet("showPrice", e.target.checked)} /> Show price</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sheet.showCode} onChange={(e) => updateSheet("showCode", e.target.checked)} /> Show code</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sheet.showType} onChange={(e) => updateSheet("showType", e.target.checked)} /> Show type</label>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-600">
                  Capacity/Page: {computeCapacity().capacity} labels ({computeCapacity().cols} x {computeCapacity().rows})
                </p>
                <button
                  onClick={printSheet}
                  disabled={printing}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold disabled:opacity-70"
                >
                  Process & Preview
                </button>
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



