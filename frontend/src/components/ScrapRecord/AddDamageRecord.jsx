import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, Save, Search, Trash2, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { includesLooseNumber } from "../../utils/numberLooseSearch";
import { useAuth } from "../../context/AuthContext";

export default function AddDamageRecord() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [fromType, setFromType] = useState("store");
  const [fromId, setFromId] = useState("");
  const [sources, setSources] = useState([]);
  const [branchItems, setBranchItems] = useState([]);
  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  useEffect(() => {
    if (!token) return;
    const endpoint =
      fromType === "store"
        ? API_ROUTES.STORES
        : fromType === "shop"
          ? API_ROUTES.SHOPS_ALL
          : API_ROUTES.FACTORY_INVENTORY_FACTORIES;

    fetch(endpoint, { headers })
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.stores)
            ? data.stores
            : Array.isArray(data?.shops)
              ? data.shops
              : Array.isArray(data?.factories)
                ? data.factories
                : [];
        setSources(rows);
        setFromId(rows[0]?.id ? String(rows[0].id) : "");
      })
      .catch(() => {
        setSources([]);
        setFromId("");
      });
  }, [token, fromType, headers]);

  useEffect(() => {
    if (!token || !fromType || !fromId) {
      setBranchItems([]);
      return;
    }
    fetch(API_ROUTES.DAMAGE_BRANCH_ITEMS(fromType, fromId), { headers })
      .then((res) => res.json())
      .then((data) => setBranchItems(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setBranchItems([]));
  }, [token, fromType, fromId, headers]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branchItems.slice(0, 12);
    return branchItems
      .filter(
        (item) =>
          includesLooseNumber(item.name, q) ||
          includesLooseNumber(item.barcode, q)
      )
      .slice(0, 20);
  }, [search, branchItems]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const scannerId = "damage-create-scanner";
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
            setSearch(String(decodedText || "").trim());
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
  }, [scannerOpen]);

  const addItem = (item) => {
    const firstBatch = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches[0] : null;
    if (
      items.some(
        (x) =>
          x.itemType === item.itemType &&
          Number(x.itemId) === Number(item.itemId) &&
          String(x.batchNumber || "") === String(firstBatch?.batchNumber || "") &&
          String(x.expiryDate || "") === String(firstBatch?.expiryDate || "")
      )
    ) {
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        itemType: item.itemType,
        itemId: item.itemId,
        name: item.name,
        availableQuantity: Number(item.availableQuantity || 0),
        batches: Array.isArray(item.batches) ? item.batches : [],
        batchNumber: firstBatch?.batchNumber || "",
        expiryDate: firstBatch?.expiryDate || "",
        quantity: 1,
        lossPerUnit: Number(item.lossPerUnit || 0),
      },
    ]);
  };

  const totalLoss = useMemo(
    () =>
      items.reduce(
        (sum, row) => sum + Number(row.quantity || 0) * Number(row.lossPerUnit || 0),
        0
      ),
    [items]
  );

  const submit = async () => {
    setMessage("");
    if (!fromType || !fromId || !reason.trim()) return setMessage("Source and reason are required.");
    if (!items.length) return setMessage("Select at least one item.");

    const over = items.find((row) => {
      const selectedBatch = (row.batches || []).find(
        (batch) =>
          String(batch.batchNumber || "") === String(row.batchNumber || "") &&
          String(batch.expiryDate || "") === String(row.expiryDate || "")
      );
      const maxQty = selectedBatch ? Number(selectedBatch.quantity || 0) : Number(row.availableQuantity || 0);
      return Number(row.quantity || 0) <= 0 || Number(row.quantity || 0) > maxQty;
    });
    if (over) return setMessage(`Invalid quantity for ${over.name}`);

    const payload = {
      fromType,
      fromId: Number(fromId),
      reason: reason.trim(),
      note: note.trim(),
      items: items.map((row) => ({
        itemType: row.itemType,
        itemId: Number(row.itemId),
        quantity: Number(row.quantity),
        lossPerUnit: Number(row.lossPerUnit || 0),
        batchNumber: row.batchNumber || null,
        expiryDate: row.expiryDate || null,
      })),
    };

    setSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.DAMAGE_RECORDS, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create damage record");
      navigate("/damage-record");
    } catch (error) {
      setMessage(error.message || "Failed to create damage record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <AlertTriangle className="text-white" size={30} />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                New Damage Record
              </h2>
              <p className="text-gray-600">Record product and material damage in one record.</p>
            </div>
          </div>
          {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2" value={fromType} onChange={(e) => setFromType(e.target.value)}>
              <option value="store">Store</option>
              <option value="shop">Shop</option>
              <option value="factory">Factory</option>
            </select>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Select {fromType}</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-12 py-2"
              placeholder="Search product/material by name or barcode"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="Scan barcode/QR"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-white/60 bg-white/70">
            {results.map((item) => (
              <button
                key={`${item.itemType}-${item.itemId}`}
                type="button"
                onClick={() => addItem(item)}
                className="w-full px-3 py-2 text-left border-b last:border-b-0 hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="text-sm">
                  {item.name}
                  <span className="ml-2 text-xs text-gray-500">({item.itemType})</span>
                </span>
                <span className="text-xs text-gray-500">stock: {Number(item.availableQuantity || 0)}</span>
              </button>
            ))}
            {!results.length ? <div className="px-3 py-4 text-sm text-gray-500">No items found.</div> : null}
          </div>
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="space-y-2 max-h-80 overflow-auto rounded-xl border border-white/60 bg-white/70 p-3">
            {items.map((row, idx) => (
              <div key={`${row.itemType}-${row.itemId}-${row.batchNumber || "none"}-${row.expiryDate || "none"}`} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-gray-200 p-2">
                <div className="col-span-4 text-sm">
                  {row.name}
                  <div className="text-xs text-gray-500">{row.itemType} | max {row.availableQuantity}</div>
                </div>
                <select
                  value={`${row.batchNumber || ""}||${row.expiryDate || ""}`}
                  onChange={(e) => {
                    const [batchNumber, expiryDate] = String(e.target.value || "").split("||");
                    setItems((prev) => prev.map((x, i) => i === idx ? { ...x, batchNumber: batchNumber || "", expiryDate: expiryDate || "" } : x));
                  }}
                  className="col-span-3 rounded border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="||">No batch</option>
                  {(row.batches || []).map((batch) => (
                    <option
                      key={`${batch.batchNumber}-${batch.expiryDate || "none"}`}
                      value={`${batch.batchNumber || ""}||${batch.expiryDate || ""}`}
                    >
                      {`${batch.batchNumber} | Exp: ${batch.expiryDate || "N/A"} | Qty: ${Number(batch.quantity || 0)}`}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.quantity}
                  onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                  className="col-span-2 rounded border border-gray-200 px-2 py-1.5 text-sm"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.lossPerUnit}
                  onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, lossPerUnit: e.target.value } : x))}
                  className="col-span-2 rounded border border-gray-200 px-2 py-1.5 text-sm"
                  placeholder="Loss/unit"
                />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="col-span-1 p-2 rounded border hover:bg-red-50 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!items.length ? <div className="text-sm text-gray-500">No selected items.</div> : null}
            </div>

            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
              placeholder="Reason"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
              rows={3}
              placeholder="Note (optional)"
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Total Loss: <span className="font-semibold">{totalLoss.toFixed(2)}</span></div>
              <button onClick={submit} disabled={submitting} className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-red-500 to-orange-500 disabled:opacity-60 inline-flex items-center gap-2">
                <Save size={15} /> {submitting ? "Saving..." : "Create Damage"}
              </button>
            </div>
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
              <div id="damage-create-scanner" className="w-full h-full min-h-[320px]" />
            </div>
            {scannerError && <p className="px-4 py-3 text-sm text-red-600">{scannerError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}



