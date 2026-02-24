import { useEffect, useMemo, useState } from "react";
import { API_ROUTES } from "../../config";

const altNames = (item) => (Array.isArray(item?.alternative_names) ? item.alternative_names : []);

export default function PrintLabel() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    const load = async () => {
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
    setQuery(item.name || "");
  };

  const print = () => {
    if (!selected) return;
    const labelName = selectedName || selected.name || "";
    const price = Number(selected.price || 0).toFixed(2);
    const barcode = selected.barcode || "-";
    const w = window.open("", "_blank", "width=500,height=400");
    if (!w) return;
    w.document.write(`
      <html>
      <head><title>Print Label</title></head>
      <body style="font-family:Arial,sans-serif;padding:20px;">
        <div style="border:1px solid #000;padding:12px;max-width:320px;">
          <div style="font-size:18px;font-weight:700;">${labelName}</div>
          <div style="margin-top:8px;font-size:14px;">Price: ${price}</div>
          <div style="margin-top:8px;font-size:14px;">Barcode: ${barcode}</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-6 max-w-3xl">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Print Label</h1>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product/material"
            className="w-full px-3 py-2 border rounded-lg"
          />
          {filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow max-h-56 overflow-auto">
              {filtered.map((i) => (
                <button key={`${i.type}-${i.id}`} className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => pickItem(i)}>
                  {i.name} <span className="text-xs text-gray-500">({i.type})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm text-gray-700">Name</label>
              <div className="flex gap-2 mt-1">
                <input value={selectedName} onChange={(e) => setSelectedName(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
                {altNames(selected).length > 0 && (
                  <select onChange={(e) => setSelectedName(e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="">Alt names</option>
                    {altNames(selected).map((n, idx) => (
                      <option key={`alt-${idx}`} value={n}>{n}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-700">Price: {Number(selected.price || 0).toFixed(2)}</div>
            <div className="text-sm text-gray-700">Barcode: {selected.barcode || "-"}</div>
            <button onClick={print} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Print Label</button>
          </div>
        )}
      </div>
    </div>
  );
}
