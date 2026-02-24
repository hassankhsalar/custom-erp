import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Factory, Package, Plus, ShoppingBag, Store, Trash2, Undo2 } from "lucide-react";
import { API_ROUTES } from "../../config";

const getLocationIcon = (type) => {
  if (type === "store") return <Store size={16} />;
  if (type === "shop") return <ShoppingBag size={16} />;
  return <Factory size={16} />;
};

const blankReturnItem = () => ({
  itemType: "product",
  itemId: "",
  quantity: "",
  unitPrice: "",
  searchTerm: "",
});

const blankShipment = () => ({
  destinationType: "store",
  destinationId: "",
  items: [blankReturnItem()],
});

export default function PurchaseReturnPage({ mode = "purchase_return" }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [sourceType, setSourceType] = useState("store");
  const [sourceId, setSourceId] = useState("");
  const [sourceOptions, setSourceOptions] = useState([]);

  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [returnItems, setReturnItems] = useState([blankReturnItem()]);

  const [compensationType, setCompensationType] = useState("money");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [shipments, setShipments] = useState([blankShipment()]);
  const [shipmentDestinations, setShipmentDestinations] = useState({ 0: [] });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [existingReturns, setExistingReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  const token = localStorage.getItem("token");
  const isDamageReturn = mode === "damage_return";

  const catalog = useMemo(
    () => ({
      product: products.map((x) => ({ id: x.id, name: x.name })),
      material: materials.map((x) => ({ id: x.id, name: x.name })),
    }),
    [products, materials]
  );

  const fetchSourceOptions = async (type) => {
    const res = await fetch(API_ROUTES.PURCHASE_DESTINATIONS(type), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch locations");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  const fetchInitial = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [supplierRes, productRes, materialRes] = await Promise.all([
      fetch(API_ROUTES.SUPPLIERS, { headers }),
      fetch(API_ROUTES.PRODUCTS_ALL, { headers }),
      fetch(API_ROUTES.MATERIALS, { headers }),
    ]);
    const [supplierData, productData, materialData] = await Promise.all([
      supplierRes.json(),
      productRes.json(),
      materialRes.json(),
    ]);

    setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    setProducts(productData?.products || productData || []);
    setMaterials(materialData?.materials || materialData || []);
  };

  const fetchReturns = async () => {
    setLoadingReturns(true);
    try {
      const res = await fetch(`${API_ROUTES.PURCHASE_RETURNS_ALL}?returnType=${isDamageReturn ? "damage_return" : "purchase_return"}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setExistingReturns(data?.returns || []);
    } catch (_) {
      setExistingReturns([]);
    } finally {
      setLoadingReturns(false);
    }
  };

  useEffect(() => {
    fetchInitial().catch(() => setMessage("Failed to load suppliers/items"));
    fetchReturns();
  }, [isDamageReturn]);

  useEffect(() => {
    fetchSourceOptions(sourceType)
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
    shipments.forEach((shipment, shipmentIndex) => {
      fetchSourceOptions(shipment.destinationType)
        .then((rows) => {
          setShipmentDestinations((prev) => ({ ...prev, [shipmentIndex]: rows }));
          setShipments((prev) =>
            prev.map((x, idx) =>
              idx !== shipmentIndex
                ? x
                : {
                    ...x,
                    destinationId: x.destinationId
                      ? String(x.destinationId)
                      : (rows[0]?.id ? String(rows[0].id) : ""),
                  }
            )
          );
        })
        .catch(() => {
          setShipmentDestinations((prev) => ({ ...prev, [shipmentIndex]: [] }));
        });
    });
  }, [shipments.map((x) => x.destinationType).join("|")]);

  const addReturnItem = () => setReturnItems((prev) => [...prev, blankReturnItem()]);
  const removeReturnItem = (index) =>
    setReturnItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const updateReturnItem = (index, key, value) => {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: value,
              ...(key === "itemType" ? { itemId: "", searchTerm: "" } : {}),
            }
          : item
      )
    );
  };

  const addShipment = () => setShipments((prev) => [...prev, blankShipment()]);
  const removeShipment = (index) =>
    setShipments((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const updateShipment = (index, key, value) => {
    setShipments((prev) =>
      prev.map((shipment, i) =>
        i === index
          ? {
              ...shipment,
              [key]: value,
              ...(key === "destinationType" ? { destinationId: "" } : {}),
            }
          : shipment
      )
    );
  };

  const updateShipmentItem = (shipmentIndex, itemIndex, key, value) => {
    setShipments((prev) =>
      prev.map((shipment, i) =>
        i !== shipmentIndex
          ? shipment
          : {
              ...shipment,
              items: shipment.items.map((item, idx) =>
                idx === itemIndex
                  ? {
                      ...item,
                      [key]: value,
                      ...(key === "itemType" ? { itemId: "", searchTerm: "" } : {}),
                    }
                  : item
              ),
            }
      )
    );
  };

  const addShipmentItem = (shipmentIndex) => {
    setShipments((prev) =>
      prev.map((shipment, i) =>
        i === shipmentIndex ? { ...shipment, items: [...shipment.items, blankReturnItem()] } : shipment
      )
    );
  };

  const removeShipmentItem = (shipmentIndex, itemIndex) => {
    setShipments((prev) =>
      prev.map((shipment, i) => {
        if (i !== shipmentIndex) return shipment;
        if (shipment.items.length <= 1) return shipment;
        return { ...shipment, items: shipment.items.filter((_, idx) => idx !== itemIndex) };
      })
    );
  };

  const serializeReturnItems = (items) =>
    items
      .filter((item) => Number(item.quantity) > 0 && Number(item.unitPrice) > 0 && item.itemId)
      .map((item) => ({
        itemType: item.itemType,
        productId: item.itemType === "product" ? Number(item.itemId) : null,
        materialId: item.itemType === "material" ? Number(item.itemId) : null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        isDamaged: isDamageReturn,
      }));

  const handleSubmit = async () => {
    setMessage("");
    const serializedReturnItems = serializeReturnItems(returnItems);
    if (!sourceId) return setMessage("Select a source location.");
    if (!serializedReturnItems.length) return setMessage("Add at least one valid return item.");

    const payload = {
      supplierId: supplierId ? Number(supplierId) : null,
      sourceType,
      sourceId: Number(sourceId),
      note: note || null,
      items: serializedReturnItems,
      compensationType,
    };

    if (compensationType === "money") {
      payload.compensationAmount = Number(compensationAmount || 0);
      payload.payment_method = "cash";
    } else {
      const serializedShipments = shipments
        .filter((shipment) => shipment.destinationId)
        .map((shipment) => ({
          destinationType: shipment.destinationType,
          destinationId: Number(shipment.destinationId),
          items: serializeReturnItems(shipment.items),
        }))
        .filter((shipment) => shipment.items.length);

      if (!serializedShipments.length) {
        return setMessage("Add at least one valid compensation shipment with specific location.");
      }
      payload.compensationShipments = serializedShipments;
    }

    try {
      setSubmitting(true);
      const endpoint = isDamageReturn ? API_ROUTES.PURCHASE_DAMAGE_RETURNS_ALL : API_ROUTES.PURCHASE_RETURNS_ALL;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create return");

      setMessage(data?.message || "Return created successfully");
      setReturnItems([blankReturnItem()]);
      setCompensationType("money");
      setCompensationAmount("");
      setShipments([blankShipment()]);
      setNote("");
      fetchReturns();
    } catch (error) {
      setMessage(error.message || "Failed to create return");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOptions = (itemType, searchTerm) =>
    catalog[itemType].filter((x) =>
      x.name.toLowerCase().includes(String(searchTerm || "").toLowerCase())
    );

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="relative w-full mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl shadow-lg ${isDamageReturn ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-violet-500 to-indigo-500"}`}>
              {isDamageReturn ? <AlertTriangle className="text-white" size={34} /> : <Undo2 className="text-white" size={34} />}
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold bg-clip-text text-transparent ${isDamageReturn ? "bg-gradient-to-r from-red-600 to-orange-600" : "bg-gradient-to-r from-violet-600 to-indigo-600"}`}>
                {isDamageReturn ? "Damage Return" : "Purchase Return"}
              </h1>
              <p className="text-gray-600 mt-2">Create independent item returns with exact source and destination locations.</p>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Source Type</label>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                <option value="store">Store</option>
                <option value="shop">Shop</option>
                <option value="factory">Factory</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Source Location</label>
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                <option value="">Select location</option>
                {sourceOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Package size={16} /> Return Items</h3>
              <button onClick={addReturnItem} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm">
                <Plus size={14} /> Add Item
              </button>
            </div>
            {returnItems.map((item, index) => (
              <div key={`return-item-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select value={item.itemType} onChange={(e) => updateReturnItem(index, "itemType", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2">
                    <option value="product">Product</option>
                    <option value="material">Material</option>
                  </select>
                </div>
                <div className="md:col-span-4 relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Item Search</label>
                  <input
                    value={item.searchTerm}
                    onChange={(e) => updateReturnItem(index, "searchTerm", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2"
                    placeholder={`Search ${item.itemType}...`}
                  />
                  {item.searchTerm && (
                    <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                      {filteredOptions(item.itemType, item.searchTerm).slice(0, 20).map((opt) => (
                        <button
                          key={`${item.itemType}-${opt.id}`}
                          onClick={() => updateReturnItem(index, "itemId", String(opt.id))}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 ${String(item.itemId) === String(opt.id) ? "bg-indigo-100" : ""}`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateReturnItem(index, "quantity", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price</label>
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateReturnItem(index, "unitPrice", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2" />
                </div>
                <div className="md:col-span-2">
                  <button onClick={() => removeReturnItem(index)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-600 px-3 py-2">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                <select value={compensationType} onChange={(e) => setCompensationType(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
                  <option value="money">Money</option>
                  <option value="items">Items</option>
                </select>
              </div>
              {compensationType === "money" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                  <input type="number" min="0" step="0.01" value={compensationAmount} onChange={(e) => setCompensationAmount(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2" />
                </div>
              )}
            </div>

            {compensationType === "items" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={addShipment} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm">
                    <Plus size={14} /> Add Shipment
                  </button>
                </div>
                {shipments.map((shipment, shipmentIndex) => (
                  <div key={`shipment-${shipmentIndex}`} className="rounded-xl border border-emerald-100 bg-white/70 p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Destination Type</label>
                        <select value={shipment.destinationType} onChange={(e) => updateShipment(shipmentIndex, "destinationType", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2">
                          <option value="store">Store</option>
                          <option value="shop">Shop</option>
                          <option value="factory">Factory</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Specific Location</label>
                        <select value={shipment.destinationId} onChange={(e) => updateShipment(shipmentIndex, "destinationId", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2">
                          <option value="">Select location</option>
                          {(shipmentDestinations[shipmentIndex] || []).map((d) => (
                            <option key={`dest-${shipmentIndex}-${d.id}`} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {shipment.items.map((item, itemIndex) => (
                      <div key={`shipment-item-${shipmentIndex}-${itemIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                          <select value={item.itemType} onChange={(e) => updateShipmentItem(shipmentIndex, itemIndex, "itemType", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2">
                            <option value="product">Product</option>
                            <option value="material">Material</option>
                          </select>
                        </div>
                        <div className="md:col-span-4 relative">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Item Search</label>
                          <input
                            value={item.searchTerm}
                            onChange={(e) => updateShipmentItem(shipmentIndex, itemIndex, "searchTerm", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2"
                            placeholder={`Search ${item.itemType}...`}
                          />
                          {item.searchTerm && (
                            <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                              {filteredOptions(item.itemType, item.searchTerm).slice(0, 20).map((opt) => (
                                <button
                                  key={`comp-${shipmentIndex}-${item.itemType}-${opt.id}`}
                                  onClick={() => updateShipmentItem(shipmentIndex, itemIndex, "itemId", String(opt.id))}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 ${String(item.itemId) === String(opt.id) ? "bg-emerald-100" : ""}`}
                                >
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Qty</label>
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateShipmentItem(shipmentIndex, itemIndex, "quantity", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price</label>
                          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateShipmentItem(shipmentIndex, itemIndex, "unitPrice", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2" />
                        </div>
                        <div className="md:col-span-2">
                          <button onClick={() => removeShipmentItem(shipmentIndex, itemIndex)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-600 px-3 py-2">
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between">
                      <button onClick={() => addShipmentItem(shipmentIndex)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 text-emerald-700 px-3 py-1.5 text-sm">
                        <Plus size={14} /> Add Item
                      </button>
                      <button onClick={() => removeShipment(shipmentIndex)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm">
                        <Trash2 size={14} /> Remove Shipment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2" />
          </div>

          <div className="flex items-center justify-between">
            <p className={`text-sm ${message ? "text-rose-600" : "text-gray-500"}`}>{message || "Submit to create return and post stock/account effects."}</p>
            <button onClick={handleSubmit} disabled={submitting} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-white ${isDamageReturn ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"} disabled:opacity-60`}>
              {submitting ? "Submitting..." : isDamageReturn ? "Create Damage Return" : "Create Purchase Return"}
            </button>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{isDamageReturn ? "Recent Damage Returns" : "Recent Purchase Returns"}</h3>
          {loadingReturns ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/60">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Source</th>
                    <th className="p-3 text-left">Supplier</th>
                    <th className="p-3 text-left">Value</th>
                    <th className="p-3 text-left">Compensation</th>
                    <th className="p-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {existingReturns.map((row) => (
                    <tr key={row.id} className="border-t border-white/50">
                      <td className="p-3 font-semibold text-gray-800">{row.reference}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {getLocationIcon(row.sourceType)}
                          {row.sourceType} #{row.sourceId}
                        </span>
                      </td>
                      <td className="p-3">{row.supplier?.name || "-"}</td>
                      <td className="p-3">${Number(row.totalReturnValue || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                          {row.compensationType} / {row.compensationStatus}
                        </span>
                      </td>
                      <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!existingReturns.length && (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={6}>No returns found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
