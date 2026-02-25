import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Building2, Loader2, Save, Search, Trash2, Truck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function EditPurchase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchaseId = Number(id);
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [shippingCost, setShippingCost] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [additionalPayment, setAdditionalPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [searchState, setSearchState] = useState({
    searchTerm: "",
    showSearchResults: false,
    filteredResults: [],
  });
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!purchaseId) {
      setMessage("Invalid purchase id.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [purchaseRes, materialsRes, productsRes, banksRes] = await Promise.all([
          fetch(API_ROUTES.PURCHASE_BY_ID(purchaseId), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.MATERIALS_ALL, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.PRODUCTS_ALL, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ROUTES.BANK_ACCOUNTS, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const data = await purchaseRes.json().catch(() => ({}));
        const materialsData = await materialsRes.json().catch(() => ({}));
        const productsData = await productsRes.json().catch(() => ({}));
        const banksData = await banksRes.json().catch(() => ([]));
        if (!purchaseRes.ok) throw new Error(data?.error || "Failed to load purchase");
        const row = data?.purchase || data;
        setPurchase(row);
        setMaterials(materialsData?.materials || materialsData || []);
        setProducts(productsData?.products || productsData || []);
        setBankAccounts(Array.isArray(banksData) ? banksData : []);
        setShippingCost(String(Number(row?.shippingCost || 0)));
        setDiscount(String(Number(row?.discount || 0)));
        setTax(String(Number(row?.tax || 0)));
        setAdditionalPayment("0");
        setPaymentMethod("cash");
        setItems(
          (row?.purchaseItems || []).map((item) => ({
            purchaseItemId: item.id,
            rowKey: `existing-${item.id}`,
            itemType: item.itemType,
            productId: item.productId,
            materialId: item.materialId,
            name: item.itemType === "product" ? item.product?.name : item.material?.name,
            quantity: Number(item.quantity || 0),
            receivedQuantity: Number((item.receivedQuantity ?? item.quantity) || 0),
            unitPrice: Number(item.unitPrice || 0),
            batchNumber: item.batchNumber || "",
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
          }))
        );
      } catch (error) {
        setMessage(error.message || "Failed to load purchase");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [purchaseId, token]);

  const totals = useMemo(() => {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
    const discountAmount = (subTotal * Number(discount || 0)) / 100;
    const taxable = subTotal - discountAmount;
    const taxAmount = (taxable * Number(tax || 0)) / 100;
    const grandTotal = taxable + taxAmount + Number(shippingCost || 0);
    return { subTotal, grandTotal };
  }, [items, discount, tax, shippingCost]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setSearchState((prev) => ({ ...prev, showSearchResults: false }));
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSearchInputChange = (value) => {
    const lower = String(value || "").toLowerCase();
    if (!lower) {
      setSearchState({ searchTerm: value, showSearchResults: true, filteredResults: [] });
      return;
    }

    const filteredMaterials = materials
      .filter(
        (m) =>
          String(m.name || "").toLowerCase().includes(lower) ||
          (Array.isArray(m.alternative_names) &&
            m.alternative_names.some((n) => String(n || "").toLowerCase().includes(lower))) ||
          String(m.barcode || "").toLowerCase().includes(lower)
      )
      .map((m) => ({
        type: "material",
        id: m.id,
        name: m.name,
        unitPrice: Number(m.unit_cost || 0),
      }));

    const filteredProducts = products
      .filter(
        (p) =>
          String(p.name || "").toLowerCase().includes(lower) ||
          (Array.isArray(p.alternative_names) &&
            p.alternative_names.some((n) => String(n || "").toLowerCase().includes(lower))) ||
          String(p.barcode || "").toLowerCase().includes(lower)
      )
      .map((p) => ({
        type: "product",
        id: p.id,
        name: p.name,
        unitPrice: Number(p.cost || 0),
      }));

    setSearchState({
      searchTerm: value,
      showSearchResults: true,
      filteredResults: [...filteredMaterials, ...filteredProducts],
    });
  };

  const handleItemSelect = (selected) => {
    const duplicate = items.some((entry) =>
      entry.itemType === selected.type &&
      Number(selected.type === "product" ? entry.productId : entry.materialId) === Number(selected.id)
    );
    if (duplicate) {
      setMessage("This item is already in the purchase.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        purchaseItemId: null,
        rowKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemType: selected.type,
        productId: selected.type === "product" ? Number(selected.id) : null,
        materialId: selected.type === "material" ? Number(selected.id) : null,
        name: selected.name,
        quantity: 1,
        receivedQuantity: 1,
        unitPrice: Number(selected.unitPrice || 0),
        batchNumber: "",
        expiryDate: "",
      },
    ]);
    setSearchState({ searchTerm: "", showSearchResults: false, filteredResults: [] });
    setMessage("");
  };

  const save = async () => {
    setMessage("");
    const payloadItems = items
      .filter((i) => Number(i.quantity) > 0)
      .map((i) => ({
        itemType: i.itemType,
        productId: i.itemType === "product" ? i.productId : null,
        materialId: i.itemType === "material" ? i.materialId : null,
        selectedName: i.name || null,
        selectedQuantity: Number(i.quantity),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        receivedQuantity: Number(i.receivedQuantity ?? i.quantity),
        batchNumber: i.batchNumber || null,
        expiryDate: i.expiryDate || null,
      }));

    if (!payloadItems.length) {
      setMessage("At least one item is required.");
      return;
    }
    if (["bank", "card", "bank_transfer"].includes(String(paymentMethod || "").toLowerCase()) && Number(additionalPayment || 0) > 0 && !bankAccountId) {
      setMessage("Select a bank account for bank/card payment.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(API_ROUTES.PURCHASE_BY_ID(purchaseId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingCost: Number(shippingCost || 0),
          discount: Number(discount || 0),
          tax: Number(tax || 0),
          additionalPayment: Number(additionalPayment || 0),
          paymentMethod,
          bankAccountId: bankAccountId ? Number(bankAccountId) : null,
          items: payloadItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save purchase");
      navigate("/purchase/all");
    } catch (error) {
      setMessage(error.message || "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-gray-700">
          <Loader2 size={18} className="animate-spin" />
          Loading purchase...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl xl:max-w-full space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Truck className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Edit Purchase
                </h1>
                <p className="text-gray-600 mt-1">{purchase?.reference || "-"}</p>
              </div>
            </div>
            <Link to="/purchase/all" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white/70">
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
          {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="text-blue-600" size={20} />
              </div>
              Costs And Payment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Shipping Cost</label>
                <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Discount (%)</label>
                <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tax (%)</label>
                <input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Payment</label>
                <input type="number" min="0" step="0.01" value={additionalPayment} onChange={(e) => setAdditionalPayment(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            {["bank", "card", "bank_transfer"].includes(String(paymentMethod || "").toLowerCase()) && (
              <div className="mt-3 max-w-sm">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Account</label>
                <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <option value="">Select bank account</option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} ({bank.account_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Purchase Items</h2>
            </div>

            <div className="relative mb-5" ref={searchInputRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Material or Product</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items by name or barcode..."
                  value={searchState.searchTerm}
                  onFocus={() =>
                    setSearchState((prev) => ({
                      ...prev,
                      showSearchResults: true,
                      filteredResults:
                        prev.searchTerm.length > 0
                          ? prev.filteredResults
                          : [
                              ...materials.slice(0, 20).map((m) => ({
                                type: "material",
                                id: m.id,
                                name: m.name,
                                unitPrice: Number(m.unit_cost || 0),
                              })),
                              ...products.slice(0, 20).map((p) => ({
                                type: "product",
                                id: p.id,
                                name: p.name,
                                unitPrice: Number(p.cost || 0),
                              })),
                            ],
                    }))
                  }
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2"
                />
              </div>
              {searchState.showSearchResults && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {searchState.filteredResults.length > 0 ? (
                    searchState.filteredResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleItemSelect(result)}
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-indigo-50"
                      >
                        <span className="font-medium text-gray-800">{result.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({result.type})</span>
                        <span className="ml-2 text-xs text-gray-600">Cost: {Number(result.unitPrice || 0).toFixed(2)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-gray-500">No matching items found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/60 bg-white/70">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-left">Qty</th>
                    <th className="p-3 text-left">Received</th>
                    <th className="p-3 text-left">Unit Price</th>
                    <th className="p-3 text-left">Batch</th>
                    <th className="p-3 text-left">Expiry</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.rowKey || item.purchaseItemId || idx} className="border-t border-gray-200">
                      <td className="p-3">
                        {item.name} <span className="text-xs text-gray-500">({item.itemType})</span>
                      </td>
                      <td className="p-3">
                        <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className="w-28 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="number" min="0" step="0.01" value={item.receivedQuantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, receivedQuantity: e.target.value } : x))} className="w-28 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))} className="w-32 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={item.batchNumber} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, batchNumber: e.target.value } : x))} className="w-36 rounded border border-gray-200 px-2 py-1.5" placeholder="Batch no." />
                      </td>
                      <td className="p-3">
                        <input type="date" value={item.expiryDate} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, expiryDate: e.target.value } : x))} className="w-36 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">No items added.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              <span className="mr-4">Subtotal: <b>{totals.subTotal.toFixed(2)}</b></span>
              <span>Estimated Total: <b>{totals.grandTotal.toFixed(2)}</b></span>
            </div>
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-60 inline-flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
