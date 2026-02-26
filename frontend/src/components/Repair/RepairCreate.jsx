import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Factory, Package, Save, Search, ShoppingBag, Store, Trash2, Truck, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { API_ROUTES } from "../../config";
import { activeOnly } from "../../utils/softDelete";

export default function RepairCreate() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const searchRef = useRef(null);

  const [sourceType, setSourceType] = useState("store");
  const [sourceId, setSourceId] = useState("");
  const [sourceOptions, setSourceOptions] = useState([]);
  const [destination, setDestination] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);

  const [damagedItems, setDamagedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [repairItems, setRepairItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    fetch(API_ROUTES.PURCHASE_DESTINATIONS(sourceType), { headers })
      .then((r) => r.json())
      .then((rows) => {
        const list = activeOnly(Array.isArray(rows) ? rows : []);
        setSourceOptions(list);
        setSourceId(list[0]?.id ? String(list[0].id) : "");
      })
      .catch(() => {
        setSourceOptions([]);
        setSourceId("");
      });
  }, [sourceType]);

  useEffect(() => {
    if (!sourceId) {
      setDamagedItems([]);
      return;
    }
    fetch(API_ROUTES.REPAIR_DAMAGED_ITEMS(sourceType, sourceId), { headers })
      .then((r) => r.json())
      .then((data) => setDamagedItems(activeOnly(Array.isArray(data?.items) ? data.items : [])))
      .catch(() => setDamagedItems([]));
  }, [sourceType, sourceId]);

  useEffect(() => {
    if (!sourceId) {
      setAccounts([]);
      setAccountId("");
      return;
    }
    fetch(`${API_ROUTES.ASSIGNACCOUNT}/entity/${sourceType}/${sourceId}`, { headers })
      .then((r) => r.json())
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setAccounts(list);
        const primary = list.find((x) => x.isPrimary);
        if (primary) setAccountId(String(primary.accountId));
      })
      .catch(() => setAccounts([]));
  }, [sourceType, sourceId]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    const q = value.toLowerCase();
    const results = damagedItems.filter(
      (item) =>
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.barcode || "").toLowerCase().includes(q)
    );
    setSearchResults(results);
    setShowSearch(true);
  };

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const scannerId = "repair-create-scanner";
    let scanner = null;
    let isActive = true;
    let hasScanned = false;

    const start = async () => {
      try {
        setScannerError("");
        scanner = new Html5Qrcode(scannerId);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (hasScanned || !isActive) return;
            hasScanned = true;
            handleSearchChange(String(decodedText || "").trim());
            setScannerOpen(false);
          },
          () => {}
        );
      } catch (error) {
        if (!isActive) return;
        setScannerError(error?.message || "Unable to start camera scanner.");
      }
    };

    start();

    return () => {
      isActive = false;
      if (!scanner) return;
      Promise.resolve()
        .then(async () => {
          if (scanner.isScanning) await scanner.stop();
        })
        .catch(() => {})
        .finally(async () => {
          try {
            await scanner.clear();
          } catch {
            // ignore scanner cleanup errors
          }
        });
    };
  }, [scannerOpen, damagedItems]);

  const addItem = (item) => {
    const exists = repairItems.find((x) => x.itemType === item.itemType && Number(x.itemId) === Number(item.id));
    if (exists) return;
    setRepairItems((prev) => [
      ...prev,
      {
        key: `${item.itemType}:${item.id}`,
        itemType: item.itemType,
        itemId: item.id,
        name: item.name,
        availableQuantity: Number(item.availableQuantity || 0),
        quantity: 1,
      },
    ]);
    setSearchTerm("");
    setShowSearch(false);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    setMessage("");
    if (!sourceId || !destination.trim()) return setMessage("Source and destination are required.");
    if (!repairItems.length) return setMessage("Select at least one item.");

    const invalid = repairItems.find((x) => Number(x.quantity) <= 0 || Number(x.quantity) > Number(x.availableQuantity || 0));
    if (invalid) return setMessage(`Invalid quantity for ${invalid.name}`);

    const bodyItems = repairItems.map((x) => ({
      itemType: x.itemType,
      productId: x.itemType === "product" ? Number(x.itemId) : null,
      materialId: x.itemType === "material" ? Number(x.itemId) : null,
      quantity: Number(x.quantity),
    }));

    const fd = new FormData();
    fd.append("fromType", sourceType);
    fd.append("fromId", sourceId);
    fd.append("destination", destination);
    fd.append("shippingCost", String(Number(shippingCost || 0)));
    fd.append("accountId", accountId || "");
    fd.append("note", note || "");
    fd.append("items", JSON.stringify(bodyItems));
    if (attachment) fd.append("document", attachment);

    try {
      setSaving(true);
      const res = await fetch(API_ROUTES.REPAIRS, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create repair");
      setMessage(data.message || "Repair created");
      setRepairItems([]);
      setDestination("");
      setShippingCost("0");
      setNote("");
      setAttachment(null);
    } catch (error) {
      setMessage(error.message || "Failed to create repair");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6 mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Repair</h1>
        <p className="text-gray-600">Create a mixed product/material repair request from damaged items.</p>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <option value="store">Store</option>
            <option value="shop">Shop</option>
            <option value="factory">Factory</option>
          </select>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <option value="">Select location</option>
            {sourceOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Repair destination" />
          <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Shipping cost" />
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <option value="">Select account for shipping</option>
            {accounts.map((a) => <option key={a.accountId} value={a.accountId}>{a.account?.name || a.account_name || `Account ${a.accountId}`}</option>)}
          </select>
          <textarea rows={1} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Note" />
        </div>

        <div ref={searchRef} className="rounded-xl border border-white/60 bg-white/60 p-3">
          <label className="text-sm font-semibold text-gray-700">Search Damaged Items</label>
          <div className="relative mt-2">
            <input value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 pr-12 py-2" placeholder="Search damaged products/materials" />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 transition-colors"
              title="Scan barcode/QR"
            >
              <Camera size={16} />
            </button>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                {searchResults.map((item) => (
                  <button key={`${item.itemType}-${item.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => addItem(item)} className="w-full text-left px-3 py-2 hover:bg-cyan-50 border-b last:border-b-0">
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({item.itemType}) damaged: {Number(item.availableQuantity || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/60 p-3 space-y-2">
          {repairItems.map((item, idx) => (
            <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-6 text-sm text-gray-800">{item.name} <span className="text-xs text-gray-500">({item.itemType}) damaged: {item.availableQuantity}</span></div>
              <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => setRepairItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className="md:col-span-4 rounded-lg border border-gray-200 bg-white px-2 py-2" />
              <button onClick={() => setRepairItems((prev) => prev.filter((_, i) => i !== idx))} className="md:col-span-2 rounded-lg border border-red-200 text-red-600 px-2 py-2"><Trash2 size={14} /></button>
            </div>
          ))}
          {!repairItems.length && <div className="text-sm text-gray-500">No items selected.</div>}
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-sm ${message ? "text-rose-600" : "text-gray-500"}`}>{message || "Shipping cost will be deducted from selected account."}</p>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-60 inline-flex items-center gap-2">
            <Save size={16} /> {saving ? "Saving..." : "Create Repair"}
          </button>
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 p-4 md:p-6">
          <div className="h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Scan Barcode / QR</h3>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Close scanner"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-black p-3">
              <div id="repair-create-scanner" className="w-full h-full min-h-[320px]" />
            </div>
            {scannerError && <p className="px-4 py-3 text-sm text-red-600">{scannerError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
