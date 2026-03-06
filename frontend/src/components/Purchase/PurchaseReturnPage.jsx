import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, Factory, Package, ShoppingBag, Store, Trash2, Truck, Undo2, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { API_ROUTES } from "../../config";
import SearchableSelect from "../common/SearchableSelect";

const lineKey = (itemType, id, batchNumber = "", expiryDate = "") =>
  `${itemType}:${id}:${batchNumber || ""}:${expiryDate || ""}`;

const locationIcon = (type) => {
  if (type === "store") return <Store size={14} />;
  if (type === "shop") return <ShoppingBag size={14} />;
  return <Factory size={14} />;
};

export default function PurchaseReturnPage({ mode = "purchase_return" }) {
  const isDamage = mode === "damage_return";
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const searchInputRef = useRef(null);

  const [suppliers, setSuppliers] = useState([]);
  const [sourceItems, setSourceItems] = useState([]);
  const [damageItems, setDamageItems] = useState([]);
  const [sourceType, setSourceType] = useState("store");
  const [sourceId, setSourceId] = useState("");
  const [sourceOptions, setSourceOptions] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [returnItems, setReturnItems] = useState([]);

  const [searchState, setSearchState] = useState({
    searchTerm: "",
    showSearchResults: false,
    filteredResults: [],
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const [compType, setCompType] = useState("money");
  const [compAmount, setCompAmount] = useState("");
  const [initDestType, setInitDestType] = useState("store");
  const [initDestId, setInitDestId] = useState("");
  const [initDestinations, setInitDestinations] = useState([]);
  const [initCompLines, setInitCompLines] = useState([]);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);


  const [shipModal, setShipModal] = useState({
    open: false,
    returnId: null,
    reference: "",
    destinationType: "store",
    destinationId: "",
    destinationOptions: [],
    lines: [],
    error: "",
    saving: false,
  });

  useEffect(() => {
    const onClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setSearchState((prev) => ({ ...prev, showSearchResults: false }));
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const fetchDestinations = async (type) => {
    const res = await fetch(API_ROUTES.PURCHASE_DESTINATIONS(type), { headers });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };


  useEffect(() => {
    Promise.all([
      fetch(API_ROUTES.SUPPLIERS, { headers }).then((r) => r.json()),
    ])
      .then(([suppliersData]) => {
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      })
      .catch(() => setMessage("Failed to load initial data"));
  }, [isDamage]);

  useEffect(() => {
    fetchDestinations(sourceType)
      .then((rows) => {
        setSourceOptions(rows);
        setSourceId(rows[0]?.id ? String(rows[0].id) : "");
      })
      .catch(() => {
        setSourceOptions([]);
        setSourceId("");
      });
  }, [sourceType]);

  useEffect(() => {
    if (isDamage || !sourceType || !sourceId) {
      setSourceItems([]);
      return;
    }
    fetch(API_ROUTES.PURCHASE_RETURN_SOURCE_ITEMS(sourceType, sourceId), { headers })
      .then((res) => res.json())
      .then((data) => {
        setSourceItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setSourceItems([]));
  }, [isDamage, sourceType, sourceId]);

  useEffect(() => {
    if (!isDamage || !sourceType || !sourceId) {
      setDamageItems([]);
      return;
    }
    fetch(API_ROUTES.PURCHASE_RETURN_DAMAGE_ITEMS(sourceType, sourceId), { headers })
      .then((res) => res.json())
      .then((data) => {
        setDamageItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setDamageItems([]));
  }, [isDamage, sourceType, sourceId]);

  useEffect(() => {
    if (compType !== "items") return;
    fetchDestinations(initDestType)
      .then((rows) => {
        setInitDestinations(rows);
        setInitDestId((prev) => (prev ? prev : rows[0]?.id ? String(rows[0].id) : ""));
      })
      .catch(() => {
        setInitDestinations([]);
        setInitDestId("");
      });
  }, [compType, initDestType]);

  useEffect(() => {
    const mapped = returnItems
      .filter((item) => item.itemType && item.itemId && Number(item.quantity) > 0 && Number(item.unitPrice) > 0)
      .map((item) => ({
        key: lineKey(item.itemType, Number(item.itemId), item.batchNumber, item.expiryDate),
        itemType: item.itemType,
        productId: item.itemType === "product" ? Number(item.itemId) : null,
        materialId: item.itemType === "material" ? Number(item.itemId) : null,
        name: item.name,
        returnQuantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        receiveQuantity: 0,
      }));
    setInitCompLines((prev) =>
      mapped.map((line) => ({
        ...line,
        receiveQuantity: prev.find((p) => p.key === line.key)?.receiveQuantity || 0,
      }))
    );
  }, [returnItems]);

  const handleSearchInputChange = (value) => {
    const lower = value.toLowerCase();
    let results = [];
    let showResults = false;

    if (value.length > 0) {
      const availableRows = isDamage ? damageItems : sourceItems;
      results = availableRows
          .filter((item) =>
            String(item.name || "").toLowerCase().includes(lower) ||
            (item.barcode && String(item.barcode).toLowerCase().includes(lower))
          )
          .map((item) => ({
            type: item.itemType,
            id: item.id,
            name: item.name,
            unitPrice: Number(item.unitPrice || 0),
            availableQuantity: Number(item.availableQuantity || 0),
            batches: Array.isArray(item.batches) ? item.batches : [],
          }));
      showResults = true;
    }

    setSearchState({
      searchTerm: value,
      showSearchResults: showResults,
      filteredResults: results,
    });
  };

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const scannerId = "purchase-return-scanner";
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
            handleSearchInputChange(String(decodedText || "").trim());
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
  }, [scannerOpen, isDamage, sourceItems, damageItems]);

  const handleItemSelect = (selected) => {
    const firstBatch = Array.isArray(selected.batches) && selected.batches.length > 0 ? selected.batches[0] : null;
    setReturnItems((prev) => [
      ...prev,
      {
        uniqueId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemType: selected.type,
        itemId: String(selected.id),
        name: selected.name,
        quantity: "1",
        unitPrice: String(selected.unitPrice || 0),
        availableQuantity: selected.availableQuantity ?? null,
        batches: selected.batches || [],
        batchNumber: firstBatch?.batchNumber || "",
        expiryDate: firstBatch?.expiryDate || "",
      },
    ]);

    setSearchState({
      searchTerm: "",
      showSearchResults: false,
      filteredResults: [],
    });
  };

  const serializeItems = () =>
    returnItems
      .filter((i) => i.itemType && i.itemId && Number(i.quantity) > 0 && Number(i.unitPrice) > 0)
      .map((i) => ({
        itemType: i.itemType,
        productId: i.itemType === "product" ? Number(i.itemId) : null,
        materialId: i.itemType === "material" ? Number(i.itemId) : null,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        isDamaged: isDamage,
        batchNumber: i.batchNumber || null,
        expiryDate: i.expiryDate || null,
      }));

  const handleCreateReturn = async () => {
    setMessage("");
    const items = serializeItems();
    if (!sourceId) return setMessage("Select source location.");
    if (!items.length) return setMessage("Add at least one valid return item.");

    const overLimit = returnItems.find((item) => {
      const selectedBatch = (item.batches || []).find(
        (batch) =>
          String(batch.batchNumber || "") === String(item.batchNumber || "") &&
          String(batch.expiryDate || "") === String(item.expiryDate || "")
      );
      const baseLimit = Number(item.availableQuantity || 0);
      const limit = selectedBatch
        ? Math.min(baseLimit || Number(selectedBatch.quantity || 0), Number(selectedBatch.quantity || 0))
        : baseLimit;
      return (
        item.availableQuantity !== null &&
        item.availableQuantity !== undefined &&
        Number(item.quantity || 0) > limit
      );
    });
    if (overLimit) {
      return setMessage(`Quantity exceeds available stock for ${overLimit.name}`);
    }

    const payload = {
      supplierId: supplierId ? Number(supplierId) : null,
      sourceType,
      sourceId: Number(sourceId),
      items,
      note: note || null,
      compensationType: compType,
    };

    if (compType === "money") {
      const amount = Number(compAmount || 0);
      if (amount <= 0) return setMessage("Compensation amount must be greater than 0.");
      payload.compensationAmount = amount;
      payload.payment_method = "cash";
    } else {
      const receiveItems = initCompLines.filter((x) => Number(x.receiveQuantity) > 0);
      if (receiveItems.length > 0) {
        if (!initDestId) return setMessage("Select destination location for initial shipment.");
        payload.compensationShipments = [
          {
            destinationType: initDestType,
            destinationId: Number(initDestId),
            items: receiveItems.map((x) => ({
              itemType: x.itemType,
              productId: x.productId,
              materialId: x.materialId,
              quantity: Number(x.receiveQuantity),
              unitPrice: Number(x.unitPrice),
            })),
          },
        ];
      }
    }

    try {
      setSubmitting(true);
      const endpoint = isDamage ? API_ROUTES.PURCHASE_DAMAGE_RETURNS_ALL : API_ROUTES.PURCHASE_RETURNS_ALL;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create return");

      setMessage(data?.message || "Return created");
      setReturnItems([]);
      setCompType("money");
      setCompAmount("");
      setInitCompLines([]);
      setNote("");
    } catch (error) {
      setMessage(error.message || "Failed to create return");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddShipmentModal = async (row) => {
    try {
      const destinationType = row.sourceType || "store";
      const destinationOptions = await fetchDestinations(destinationType);
      setShipModal({
        open: true,
        returnId: row.id,
        reference: row.reference,
        destinationType,
        destinationId: destinationOptions[0]?.id ? String(destinationOptions[0].id) : "",
        destinationOptions,
        lines: (row.items || []).map((item) => ({
          key: lineKey(item.itemType, item.itemType === "product" ? item.productId : item.materialId),
          itemType: item.itemType,
          productId: item.productId,
          materialId: item.materialId,
          name: item.product?.name || item.material?.name || "-",
          returnQuantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          receiveQuantity: 0,
        })),
        error: "",
        saving: false,
      });
    } catch (_) {
      setMessage("Failed to open shipment modal");
    }
  };

  const submitShipment = async () => {
    const selected = shipModal.lines.filter((x) => Number(x.receiveQuantity) > 0);
    if (!selected.length) return setShipModal((prev) => ({ ...prev, error: "Set receive qty for at least one item." }));
    if (!shipModal.destinationId) return setShipModal((prev) => ({ ...prev, error: "Select destination location." }));

    const payload = {
      destinationType: shipModal.destinationType,
      destinationId: Number(shipModal.destinationId),
      items: selected.map((x) => ({
        itemType: x.itemType,
        productId: x.productId,
        materialId: x.materialId,
        quantity: Number(x.receiveQuantity),
        unitPrice: Number(x.unitPrice),
      })),
    };

    try {
      setShipModal((prev) => ({ ...prev, saving: true, error: "" }));
      const res = await fetch(API_ROUTES.PURCHASE_RETURN_COMP_SHIPMENTS(shipModal.returnId), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add shipment");
      setShipModal((prev) => ({ ...prev, open: false, saving: false }));
      setMessage("Shipment added.");
    } catch (error) {
      setShipModal((prev) => ({ ...prev, saving: false, error: error.message || "Failed to add shipment" }));
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6 flex items-center gap-4">
          <div className={`p-4 rounded-2xl shadow-lg ${isDamage ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-violet-500 to-indigo-500"}`}>
            {isDamage ? <AlertTriangle className="text-white" size={34} /> : <Undo2 className="text-white" size={34} />}
          </div>
          <div>
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${isDamage ? "bg-gradient-to-r from-red-600 to-orange-600" : "bg-gradient-to-r from-violet-600 to-indigo-600"}`}>
              {isDamage ? "Damage Return" : "Purchase Return"}
            </h1>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <label className="block mb-2 text-sm font-medium text-gray-900">Supplier</label>
              <SearchableSelect 
                options={suppliers.map((s) => ({ label: s.name, value: s.id }))} 
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                inputClassName="px-3 py-2"
              />
            </div>

            <div className="flex flex-col">
              <label className="block mb-2 text-sm font-medium text-gray-900">Source Type</label>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2">
                <option value="store">Store</option>
                <option value="shop">Shop</option>
                <option value="factory">Factory</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="block mb-2 text-sm font-medium text-gray-900">Source Location</label>
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="md:col-span-2 rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                <option value="">Source location</option>
                {sourceOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/50 p-4" ref={searchInputRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Items</label>
            <div className="relative">
              <input
                value={searchState.searchTerm}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => setSearchState((prev) => ({ ...prev, showSearchResults: prev.searchTerm.length > 0 }))}
                placeholder={isDamage ? "Search damaged/scrap items only" : "Search source products/materials by name or barcode"}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 pr-12 py-2"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isDamage ? "text-red-600 hover:bg-red-50" : "text-violet-600 hover:bg-violet-50"
                }`}
                title="Scan barcode/QR"
              >
                <Camera size={16} />
              </button>
            </div>
            {searchState.showSearchResults && searchState.filteredResults.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchState.filteredResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleItemSelect(result)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b last:border-b-0 border-gray-100"
                  >
                    <span className="font-medium text-gray-800">{result.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({result.type})</span>
                    {isDamage && (
                      <span className="ml-2 text-xs text-rose-600">damaged: {Number(result.availableQuantity || 0)}</span>
                    )}
                    {!isDamage && (
                      <span className="ml-2 text-xs text-blue-600">stock: {Number(result.availableQuantity || 0)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-2">
            <div className="font-semibold text-gray-800 flex items-center gap-2"><Package size={16} /> Selected Return Items</div>
            {returnItems.map((item, idx) => (
              <div key={item.uniqueId} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-4 text-sm text-gray-800">{item.name} <span className="text-xs text-gray-500">({item.itemType})</span></div>
                <select
                  value={`${item.batchNumber || ""}||${item.expiryDate || ""}`}
                  onChange={(e) => {
                    const [batchNumber, expiryDate] = String(e.target.value || "").split("||");
                    setReturnItems((prev) =>
                      prev.map((x, i) =>
                        i === idx
                          ? {
                              ...x,
                              batchNumber: batchNumber || "",
                              expiryDate: expiryDate || "",
                            }
                          : x
                      )
                    );
                  }}
                  className="md:col-span-3 rounded-lg border border-gray-200 bg-white px-2 py-2"
                >
                  <option value="||">No batch</option>
                  {(item.batches || []).map((batch) => (
                    <option
                      key={`${batch.batchNumber}-${batch.expiryDate || "none"}`}
                      value={`${batch.batchNumber || ""}||${batch.expiryDate || ""}`}
                    >
                      {`${batch.batchNumber} | Exp: ${batch.expiryDate || "N/A"} | Qty: ${Number(batch.quantity || 0)}`}
                    </option>
                  ))}
                </select>
                {isDamage && (
                  <div className="md:col-span-1 text-xs text-rose-600">damaged: {Number(item.availableQuantity || 0)}</div>
                )}
                <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => setReturnItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className={`${isDamage ? "md:col-span-2" : "md:col-span-2"} rounded-lg border border-gray-200 bg-white px-2 py-2`} placeholder="Return qty" />
                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setReturnItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))} className="md:col-span-2 rounded-lg border border-gray-200 bg-white px-2 py-2" placeholder="Unit price" />
                <button onClick={() => setReturnItems((prev) => prev.filter((_, i) => i !== idx))} className="md:col-span-1 rounded-lg border border-red-200 text-red-600 px-2 py-2"><Trash2 size={14} /></button>
              </div>
            ))}
            {!returnItems.length && <div className="text-sm text-gray-500">No items selected yet.</div>}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-2">
            <div className="font-semibold text-gray-800">Compensation</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select value={compType} onChange={(e) => setCompType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                <option value="money">Money</option>
                <option value="items">Items</option>
              </select>
              {compType === "money" && (
                <input type="number" min="0" step="0.01" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2" placeholder="Compensation amount" />
              )}
            </div>

            {compType === "items" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select value={initDestType} onChange={(e) => setInitDestType(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                    <option value="store">Store</option>
                    <option value="shop">Shop</option>
                    <option value="factory">Factory</option>
                  </select>
                  <select value={initDestId} onChange={(e) => setInitDestId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                    <option value="">Destination location</option>
                    {initDestinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  {initCompLines.map((line) => (
                    <div key={line.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-5 text-sm">{line.name} <span className="text-xs text-gray-500">({line.itemType})</span></div>
                      <div className="md:col-span-2 text-xs text-gray-500">Return: {line.returnQuantity}</div>
                      <div className="md:col-span-2 text-xs text-gray-500">Price: {line.unitPrice}</div>
                      <input type="number" min="0" step="0.01" value={line.receiveQuantity} onChange={(e) => setInitCompLines((prev) => prev.map((x) => x.key === line.key ? { ...x, receiveQuantity: e.target.value } : x))} className="md:col-span-3 rounded-lg border border-gray-200 bg-white px-2 py-2" placeholder="Receive (default 0)" />
                    </div>
                  ))}
                  {!initCompLines.length && <div className="text-sm text-gray-500">Return items will auto-fill here.</div>}
                </div>
              </div>
            )}
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Note" />

          <div className="flex items-center justify-between">
            <p className={`text-sm ${message ? "text-rose-600" : "text-gray-500"}`}>{message || "If all receive quantities are 0, no initial shipment is created."}</p>
            <button onClick={handleCreateReturn} disabled={submitting} className={`px-5 py-2.5 rounded-xl text-white ${isDamage ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"} disabled:opacity-60`}>
              {submitting ? "Submitting..." : "Create Return"}
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
              <div id="purchase-return-scanner" className="w-full h-full min-h-[320px]" />
            </div>
            {scannerError && <p className="px-4 py-3 text-sm text-red-600">{scannerError}</p>}
          </div>
        </div>
      )}

      {shipModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <div className="font-semibold text-gray-800">Add Shipment - {shipModal.reference}</div>
              <button onClick={() => setShipModal((prev) => ({ ...prev, open: false }))} className="text-gray-500">Close</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={shipModal.destinationType}
                  onChange={async (e) => {
                    const type = e.target.value;
                    const options = await fetchDestinations(type);
                    setShipModal((prev) => ({
                      ...prev,
                      destinationType: type,
                      destinationOptions: options,
                      destinationId: options[0]?.id ? String(options[0].id) : "",
                    }));
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2"
                >
                  <option value="store">Store</option>
                  <option value="shop">Shop</option>
                  <option value="factory">Factory</option>
                </select>
                <select value={shipModal.destinationId} onChange={(e) => setShipModal((prev) => ({ ...prev, destinationId: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-2 py-2">
                  <option value="">Destination location</option>
                  {shipModal.destinationOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                {shipModal.lines.map((line) => (
                  <div key={line.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5 text-sm">{line.name} <span className="text-xs text-gray-500">({line.itemType})</span></div>
                    <div className="md:col-span-3 text-xs text-gray-500">Return: {line.returnQuantity}</div>
                    <div className="md:col-span-2 text-xs text-gray-500">Price: {line.unitPrice}</div>
                    <input type="number" min="0" step="0.01" value={line.receiveQuantity} onChange={(e) => setShipModal((prev) => ({ ...prev, lines: prev.lines.map((x) => x.key === line.key ? { ...x, receiveQuantity: e.target.value } : x) }))} className="md:col-span-2 rounded-lg border border-gray-200 bg-white px-2 py-2" placeholder="Receive" />
                  </div>
                ))}
              </div>
              {shipModal.error && <div className="text-sm text-rose-600">{shipModal.error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShipModal((prev) => ({ ...prev, open: false }))} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
                <button onClick={submitShipment} disabled={shipModal.saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">
                  {shipModal.saving ? "Saving..." : "Add Shipment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
