import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ClipboardList, Search, Plus, Trash2, Save } from "lucide-react";

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
        setPlaces(res.data || { shops: [], stores: [], factories: [] });
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
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Item search failed", error);
      setResults([]);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-indigo-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">{isEdit ? "Edit Requisition" : "New Requisition"}</h1>
            <p className="text-gray-600">Create material/product requisition for shop/store/factory</p>
            {!isEdit && parentRequisitionId && (
              <p className="text-sm text-emerald-700 mt-1">
                Creating child requisition for parent #{parentRequisitionId}
              </p>
            )}
            {!isEdit && sourceOrder?.requisition?.reference && (
              <p className="text-sm text-indigo-700 mt-1">
                Source production order: {sourceOrder.requisition.reference} / Section {sourceOrder.sectionNo}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Requisition Info</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Title (optional)"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
            />
            <textarea
              placeholder="Note"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
              rows={4}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.requestType}
                onChange={(e) => setForm((p) => ({ ...p, requestType: e.target.value }))}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
              >
                <option value="items">items</option>
                <option value="money">money</option>
              </select>
              <input
                type="text"
                placeholder="Currency (e.g. BDT, USD)"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
              />
            </div>
            {form.requestType === "money" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Requested amount"
                  value={form.requestedAmount}
                  onChange={(e) => setForm((p) => ({ ...p, requestedAmount: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
                />
                <input
                  type="text"
                  placeholder="Amount purpose"
                  value={form.amountPurpose}
                  onChange={(e) => setForm((p) => ({ ...p, amountPurpose: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.requesterType}
                onChange={(e) => setForm((p) => ({ ...p, requesterType: e.target.value, requesterId: "" }))}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
                disabled={isEdit}
              >
                <option value="shop">Shop</option>
                <option value="store">Store</option>
                <option value="factory">Factory</option>
              </select>
              <select
                value={form.requesterId}
                onChange={(e) => setForm((p) => ({ ...p, requesterId: e.target.value }))}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white/70"
                disabled={isEdit}
              >
                {requesterOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {form.requestType === "items" && (
        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Add Items</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 p-3 rounded-xl border border-gray-300 bg-white/70"
              placeholder="Search item..."
            />
          </div>
          {results.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded-xl bg-white">
              {results.map((row) => (
                <button
                  type="button"
                  key={`${row.itemType}-${row.itemId}`}
                  onClick={() => addItem(row)}
                  className="w-full p-3 border-b text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.itemType} | stock: {row.stock}</p>
                  </div>
                  <Plus size={16} className="text-indigo-600" />
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {form.requestType === "items" && (
      <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Item List ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">No items selected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Quantity</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.itemType}-${it.itemId}`} className="border-t">
                    <td className="p-3">{it.name}</td>
                    <td className="p-3">{it.itemType}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="w-28 p-2 rounded-lg border border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-600">
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

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold flex items-center gap-2"
        >
          <Save size={18} />
          {loading ? "Saving..." : isEdit ? "Update Requisition" : "Create Requisition"}
        </button>
      </div>
    </div>
  );
};

export default NewRequisition;
