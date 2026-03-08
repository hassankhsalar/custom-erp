import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import { includesLooseNumberInAny } from "../../utils/numberLooseSearch";
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  Package,
  DollarSign,
  Building2,
  Store,
  Factory,
  ShoppingBag,
  FileText,
  AlertCircle,
  X,
  Boxes,
  Coins,
  Camera
} from "lucide-react";

const NewRequisition = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const isEdit = !!id;
  const parentRequisitionId = location.state?.parentRequisitionId || null;
  const sourceOrder = location.state?.requisitionOrder || null;

  const [form, setForm] = useState({
    title: "",
    note: "",
    requestType: "items",
    requestedAmount: "",
    amountPurpose: "",
    currency: "BDT",
    requesterType: "shop",
    requesterId: "",
  });
  const [places, setPlaces] = useState({ shops: [], stores: [], factories: [] });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const requesterOptions = useMemo(() => {
    if (form.requesterType === "shop") return places.shops || [];
    if (form.requesterType === "store") return places.stores || [];
    return places.factories || [];
  }, [form.requesterType, places]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const res = await axios.get(API_ROUTES.REQUISITION_PLACES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data || {};
        setPlaces({
          shops: activeOnly(data.shops || []),
          stores: activeOnly(data.stores || []),
          factories: activeOnly(data.factories || []),
        });
      } catch (error) {
        console.error("Failed to load places", error);
      }
    };
    fetchPlaces();
  }, [token]);

  useEffect(() => {
    if (isEdit || !sourceOrder) return;
    if (sourceOrder.destinationType && sourceOrder.destinationId) {
      setForm((prev) => ({
        ...prev,
        requesterType: sourceOrder.destinationType,
        requesterId: String(sourceOrder.destinationId),
      }));
    }
  }, [isEdit, sourceOrder]);

  useEffect(() => {
    if (!form.requesterId && requesterOptions.length > 0) {
      setForm((prev) => ({ ...prev, requesterId: String(requesterOptions[0].id) }));
    }
  }, [requesterOptions, form.requesterId]);

  useEffect(() => {
    if (!isEdit) return;
    const fetchRequisition = async () => {
      try {
        const res = await axios.get(API_ROUTES.REQUISITION_BY_ID(id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const row = res.data;
        setForm({
          title: row.title || "",
          note: row.note || "",
          requestType: row.requestType || "items",
          requestedAmount: row.requestedAmount || "",
          amountPurpose: row.amountPurpose || "",
          currency: row.currency || "BDT",
          requesterType: row.requesterType,
          requesterId: String(row.requesterId),
        });
        setItems(
          (row.items || []).map((it) => ({
            itemType: it.itemType,
            itemId: it.itemType === "product" ? it.productId : it.materialId,
            name: it.itemType === "product" ? it.product?.name : it.material?.name,
            quantity: it.requestedQty,
          }))
        );
      } catch (error) {
        console.error("Failed to load requisition", error);
      }
    };
    fetchRequisition();
  }, [id, isEdit, token]);

  const handleSearch = async (value) => {
    setSearch(value);
    if (!form.requesterId || value.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await axios.get(API_ROUTES.REQUISITION_ITEM_LOOKUP, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          placeType: form.requesterType,
          placeId: form.requesterId,
          search: value,
        },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      const filteredRows = rows.filter((row) => includesLooseNumberInAny([row.name, row.barcode, row.product?.barcode, row.material?.barcode], value));
      setResults(filteredRows);
    } catch (error) {
      console.error("Item search failed", error);
      setResults([]);
    }
  };

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const scannerId = "requisition-create-scanner";
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
          async (decodedText) => {
            if (hasScanned || !isActive) return;
            hasScanned = true;
            await handleSearch(String(decodedText || "").trim());
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
  }, [scannerOpen, form.requesterId, form.requesterType]);

  const addItem = (row) => {
    const exists = items.find((it) => it.itemType === row.itemType && String(it.itemId) === String(row.itemId));
    if (exists) return;
    setItems((prev) => [
      ...prev,
      {
        itemType: row.itemType,
        itemId: row.itemId,
        name: row.name,
        quantity: 1,
      },
    ]);
    setSearch("");
    setResults([]);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!form.requesterId) {
      alert("Please select requester.");
      return;
    }
    if (form.requestType === "items" && items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    if (form.requestType === "money" && (!form.requestedAmount || parseFloat(form.requestedAmount) <= 0)) {
      alert("Please enter requested amount.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        requesterId: parseInt(form.requesterId, 10),
        parentRequisitionId: parentRequisitionId ? parseInt(parentRequisitionId, 10) : undefined,
        requestedAmount: form.requestType === "money" ? parseFloat(form.requestedAmount || 0) : undefined,
        items: form.requestType === "items" ? items.map((it) => ({
          itemType: it.itemType,
          itemId: parseInt(it.itemId, 10),
          quantity: parseFloat(it.quantity || 0),
        })) : [],
      };
      if (isEdit) {
        await axios.put(API_ROUTES.REQUISITION_BY_ID(id), payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(API_ROUTES.REQUISITIONS, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      navigate("/requisition/list");
    } catch (error) {
      alert(error?.response?.data?.error || "Failed to save requisition");
    } finally {
      setLoading(false);
    }
  };

  const getRequesterIcon = (type) => {
    switch(type) {
      case 'shop': return <ShoppingBag size={18} className="text-purple-500" />;
      case 'store': return <Store size={18} className="text-blue-500" />;
      case 'factory': return <Factory size={18} className="text-amber-500" />;
      default: return <Building2 size={18} className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-indigo-100/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <ClipboardList className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {isEdit ? "Edit Requisition" : "New Requisition"}
                </h1>
                <p className="text-gray-600 mt-2">
                  Create material/product requisition for shop, store, or factory
                </p>
                {!isEdit && parentRequisitionId && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                    <AlertCircle size={14} />
                    Creating child requisition for parent #{parentRequisitionId}
                  </div>
                )}
                {!isEdit && sourceOrder?.requisition?.reference && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <FileText size={14} />
                    Source: {sourceOrder.requisition.reference} / Section {sourceOrder.sectionNo}
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => navigate("/requisition/list")}
              className="flex items-center gap-2 px-6 py-3 bg-white/60 hover:bg-white/80 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60"
            >
              <ArrowLeft size={20} />
              Back to List
            </button>
          </div>
        </div>

        {/* Main Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requisition Info Card */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Requisition Information
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter requisition title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea
                  placeholder="Add any notes or comments..."
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                  rows={4}
                />
              </div>

              {/* Request Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Request Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, requestType: "items" }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      form.requestType === "items"
                        ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105"
                        : "bg-white/60 text-gray-700 hover:bg-white/80 border border-white/60"
                    }`}
                  >
                    <Boxes size={18} />
                    Items
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, requestType: "money" }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      form.requestType === "money"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg scale-105"
                        : "bg-white/60 text-gray-700 hover:bg-white/80 border border-white/60"
                    }`}
                  >
                    <Coins size={18} />
                    Money
                  </button>
                </div>
              </div>

              {form.requestType === "money" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                  <div>
                    <div className="flex gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Requested Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={form.requestedAmount}
                            onChange={(e) => setForm((p) => ({ ...p, requestedAmount: e.target.value }))}
                            className="w-full pl-8 p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                          />
                        </div>
                      </div>
                      <div className="max-w-18 flex items-end">
                        <input
                          type="text"
                          placeholder="e.g., BDT, USD"
                          value={form.currency}
                          readOnly
                          onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm  focus:border-transparent outline-none transition-all duration-300 text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                    <input
                      type="text"
                      placeholder="Reason for money request"
                      value={form.amountPurpose}
                      onChange={(e) => setForm((p) => ({ ...p, amountPurpose: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requester Type</label>
                  <select
                    value={form.requesterType}
                    onChange={(e) => setForm((p) => ({ ...p, requesterType: e.target.value, requesterId: "" }))}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                    disabled={isEdit}
                  >
                    <option value="shop"> Shop</option>
                    <option value="store"> Store</option>
                    <option value="factory"> Factory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requester</label>
                  <select
                    value={form.requesterId}
                    onChange={(e) => setForm((p) => ({ ...p, requesterId: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                    disabled={isEdit}
                  >
                    <option value="">Select {form.requesterType}</option>
                    {requesterOptions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.requesterId && (
                <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2">
                    {getRequesterIcon(form.requesterType)}
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="font-medium text-indigo-700">
                      {requesterOptions.find(r => String(r.id) === form.requesterId)?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Items Card */}
          {form.requestType === "items" && (
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package size={20} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Add Items
                </h2>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-12 p-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-purple-500/30 focus:border-transparent transition-all duration-300"
                  placeholder="Search for products or materials..."
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Scan barcode/QR"
                >
                  <Camera size={18} />
                </button>
              </div>

              {results.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {results.map((row) => (
                    <button
                      type="button"
                      key={`${row.itemType}-${row.itemId}`}
                      onClick={() => addItem(row)}
                      className="w-full p-3 border-b last:border-b-0 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 flex items-center justify-between group transition-all duration-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 group-hover:text-indigo-700">{row.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            row.itemType === 'product' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {row.itemType}
                          </span>
                          <span className="text-xs text-gray-500">Stock: {row.stock}</span>
                        </div>
                      </div>
                      <Plus size={18} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {search.length >= 2 && results.length === 0 && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                  No items found matching "{search}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Item List Table */}
        {form.requestType === "items" && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Package size={20} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Selected Items ({items.length})
                </h2>
              </div>
              {items.length > 0 && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                  {items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)} total quantity
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                  <Package size={48} className="text-gray-300" />
                </div>
                <p className="text-gray-500 text-lg">No items selected yet</p>
                <p className="text-gray-400 text-sm mt-1">Search and add items from the panel above</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Item Name</th>
                      <th className="p-4 text-left font-medium text-gray-700">Type</th>
                      <th className="p-4 text-left font-medium text-gray-700">Quantity</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`${it.itemType}-${it.itemId}`} className="border-t border-white/50 hover:bg-white/30 transition-colors">
                        <td className="p-4 font-medium text-gray-800">{it.name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            it.itemType === 'product' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {it.itemType}
                          </span>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className="w-28 p-2 rounded-lg border border-gray-300 bg-white/70 focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-all duration-300"
                          />
                        </td>
                        <td className="p-4">
                          <button 
                            type="button" 
                            onClick={() => removeItem(idx)} 
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/requisition/list")}
            className="px-6 py-3 rounded-xl bg-white/60 hover:bg-white/80 text-gray-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 flex items-center gap-2"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                {isEdit ? "Update Requisition" : "Create Requisition"}
              </>
            )}
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
              <div id="requisition-create-scanner" className="w-full h-full min-h-[320px]" />
            </div>
            {scannerError && <p className="px-4 py-3 text-sm text-red-600">{scannerError}</p>}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NewRequisition;


