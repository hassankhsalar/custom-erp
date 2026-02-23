import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ArrowLeft, Save, Search, ShoppingCart, X } from "lucide-react";

const getItemType = (saleItem) => (saleItem?.productId ? "product" : "material");

export default function EditSale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shopId, setShopId] = useState("");
  const [shopItems, setShopItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState("cash");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [cashRegisters, setCashRegisters] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const res = await fetch(API_ROUTES.BANK_ACCOUNTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBankAccounts(Array.isArray(data) ? data : []);
      } catch {
        setBankAccounts([]);
      }
    };
    if (token) fetchAux();
  }, [token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(API_ROUTES.SHOP_SALES_DETAILS_BY_ID(id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load sale");
        if (!data?.canEdit) throw new Error("You do not have permission to edit this sale");

        setSale(data);
        setShopId(String(data.shopId));
        setCustomerId(data.customerId ? String(data.customerId) : "");
        setDiscount(Number(data.discount || 0));
        setPaymentType(String(data.paymentType || "cash").toLowerCase());
        setBankAccountId(data.bankAccountId ? String(data.bankAccountId) : "");
        setPaidAmount(Number(data.paidAmount || 0));

        const itemsRes = await fetch(API_ROUTES.SHOP_SALES_ITEMS(data.shopId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const itemsData = await itemsRes.json();
        if (!itemsRes.ok) throw new Error(itemsData.error || "Failed to load shop items");
        const normalizedShopItems = Array.isArray(itemsData) ? itemsData : [];
        setShopItems(normalizedShopItems);

        const mapped = (data.saleItems || []).map((si) => {
          const type = getItemType(si);
          const itemId = si.productId || si.materialId;
          const lookup = normalizedShopItems.find((x) => x.id === itemId && x.type === type);
          const batches = Array.isArray(lookup?.batches) ? lookup.batches : [];
          const selectedBatch = batches.find(
            (b) =>
              String(b.batchNumber || "") === String(si.batchNumber || "") &&
              String(b.expiryDate || "") === String(si.expiryDate || "")
          );
          const fallbackAvailable = Number(lookup?.shop_stock || 0);
          const quantity = Number(si.quantity || 0);
          return {
            itemId,
            type,
            name: lookup?.name || si.product?.name || si.material?.name || `Item ${itemId}`,
            quantity,
            unitPrice: Number(si.unitPrice || 0),
            totalPrice: Number(si.totalPrice || 0),
            barcode: lookup?.barcode || si.product?.barcode || si.material?.barcode || "",
            unit: lookup?.unit || si.product?.unit || si.material?.unit || "unit",
            shop_stock: fallbackAvailable,
            batches,
            batchNumber: si.batchNumber || null,
            expiryDate: si.expiryDate || null,
            batchAvailable: Math.max(Number(selectedBatch?.quantity || 0), fallbackAvailable, quantity),
            warrantyEnabled: Boolean(si.warrantyStartDate || si.warrantyEndDate),
            warrantyExpiryDate: si.warrantyEndDate ? new Date(si.warrantyEndDate).toISOString().slice(0, 10) : "",
            warrantyNotes: si.warrantyNotes || "",
          };
        });
        setCartItems(mapped);
      } catch (err) {
        alert(err.message || "Failed to load sale");
        navigate("/sale/all");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [id, token, navigate]);

  useEffect(() => {
    if (!shopId) {
      setCashRegisters([]);
      setCashRegisterId("");
      return;
    }
    const run = async () => {
      try {
        const res = await fetch(API_ROUTES.SHOP_SALES_CASH_REGISTERS(shopId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setCashRegisters(list);
        if (paymentType === "cash" && !cashRegisterId && list.length === 1) {
          setCashRegisterId(String(list[0].id));
        }
      } catch {
        setCashRegisters([]);
      }
    };
    if (token) run();
  }, [shopId, paymentType, cashRegisterId, token]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = shopItems.filter(
      (item) =>
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.barcode || "").toLowerCase().includes(q) ||
        String(item.brand || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q)
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  const handleAddToCart = (item) => {
    const selectedBatch = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches[0] : null;
    const existingIndex = cartItems.findIndex(
      (cartItem) =>
        cartItem.itemId === item.id &&
        cartItem.type === item.type &&
        String(cartItem.batchNumber || "") === String(selectedBatch?.batchNumber || "") &&
        String(cartItem.expiryDate || "") === String(selectedBatch?.expiryDate || "")
    );
    if (existingIndex !== -1) {
      const updated = [...cartItems];
      const nextQty = updated[existingIndex].quantity + 1;
      if (nextQty > Number(updated[existingIndex].batchAvailable || 0)) {
        alert(`Insufficient stock for ${item.name}`);
        return;
      }
      updated[existingIndex].quantity = nextQty;
      updated[existingIndex].totalPrice = nextQty * Number(updated[existingIndex].unitPrice || 0);
      setCartItems(updated);
    } else {
      const unitPrice = Number(item.sale_price || 0);
      if (unitPrice <= 0) {
        alert(`${item.name} has no sale price set`);
        return;
      }
      setCartItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          type: item.type,
          name: item.name,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
          barcode: item.barcode,
          unit: item.unit,
          shop_stock: Number(item.shop_stock || 0),
          batches: item.batches || [],
          batchNumber: selectedBatch?.batchNumber || null,
          expiryDate: selectedBatch?.expiryDate || null,
          batchAvailable: Number(selectedBatch?.quantity || item.shop_stock || 0),
          warrantyEnabled: false,
          warrantyExpiryDate: "",
          warrantyNotes: "",
        },
      ]);
    }
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleUpdateQuantity = (index, quantity) => {
    const qty = Number(quantity || 0);
    if (qty < 1) return;
    const updated = [...cartItems];
    const maxQty = Number(updated[index].batchAvailable || 0);
    if (qty > maxQty) {
      alert(`Insufficient stock for ${updated[index].name}`);
      return;
    }
    updated[index].quantity = qty;
    updated[index].totalPrice = qty * Number(updated[index].unitPrice || 0);
    setCartItems(updated);
  };

  const handlePriceChange = (index, price) => {
    const p = Number(price || 0);
    const updated = [...cartItems];
    updated[index].unitPrice = p;
    updated[index].totalPrice = p * Number(updated[index].quantity || 0);
    setCartItems(updated);
  };

  const handleRemove = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index, value) => {
    const updated = [...cartItems];
    if (!value || value === "||") {
      updated[index].batchNumber = null;
      updated[index].expiryDate = null;
      updated[index].batchAvailable = Math.max(Number(updated[index].shop_stock || 0), Number(updated[index].quantity || 1));
      updated[index].quantity = Math.min(Number(updated[index].quantity || 1), Number(updated[index].batchAvailable || 1));
      updated[index].quantity = Math.max(1, Number(updated[index].quantity || 1));
      updated[index].totalPrice = Number(updated[index].quantity || 0) * Number(updated[index].unitPrice || 0);
      setCartItems(updated);
      return;
    }
    const [batchNumber, expiryDateRaw] = String(value).split("||");
    const selected = (updated[index].batches || []).find(
      (b) => b.batchNumber === batchNumber && String(b.expiryDate || "") === String(expiryDateRaw || "")
    );
    if (!selected) return;
    updated[index].batchNumber = selected.batchNumber;
    updated[index].expiryDate = selected.expiryDate || null;
    updated[index].batchAvailable = Math.max(Number(selected.quantity || 0), Number(updated[index].quantity || 1));
    updated[index].quantity = Math.min(Number(updated[index].quantity || 1), Number(updated[index].batchAvailable || 1));
    updated[index].quantity = Math.max(1, Number(updated[index].quantity || 1));
    updated[index].totalPrice = Number(updated[index].quantity || 0) * Number(updated[index].unitPrice || 0);
    setCartItems(updated);
  };

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    [cartItems]
  );
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));
  const due = Math.max(0, grandTotal - (Number(paidAmount) || 0));
  const overUnder = (Number(paidAmount) || 0) - grandTotal;

  const validateForm = () => {
    if (!sale) return false;
    if (cartItems.length === 0) {
      alert("At least one item is required");
      return false;
    }
    if (Number(discount) < 0) {
      alert("Discount cannot be negative");
      return false;
    }
    if (Number(paidAmount) < 0) {
      alert("Paid amount cannot be negative");
      return false;
    }
    if (["bank", "card"].includes(paymentType) && Number(paidAmount) > 0 && !bankAccountId) {
      alert("Select bank account for bank/card payment");
      return false;
    }
    if (paymentType === "cash" && Number(paidAmount) > 0 && !cashRegisterId) {
      alert("Select cash register for cash payment");
      return false;
    }
    for (const item of cartItems) {
      if (!item.itemId || !["product", "material"].includes(item.type)) {
        alert("Invalid item detected");
        return false;
      }
      if (Number(item.quantity) <= 0 || Number(item.unitPrice) <= 0) {
        alert(`Invalid quantity/price for ${item.name}`);
        return false;
      }
      if (item.warrantyEnabled && !item.warrantyExpiryDate) {
        alert(`Warranty expiry date required for ${item.name}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        customerId: customerId ? Number(customerId) : null,
        discount: Math.max(0, Number(discount) || 0),
        paymentType,
        bankAccountId: ["bank", "card"].includes(paymentType) && bankAccountId ? Number(bankAccountId) : null,
        cashRegisterId: paymentType === "cash" && cashRegisterId ? Number(cashRegisterId) : null,
        paidAmount: Number(paidAmount) || 0,
        items: cartItems.map((item) => ({
          itemId: Number(item.itemId),
          type: item.type,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          selectedName: item.name || null,
          selectedUnit: item.unit || null,
          selectedQuantity: Number(item.quantity),
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate || null,
          warrantyEnabled: Boolean(item.warrantyEnabled),
          warrantyExpiryDate: item.warrantyEnabled ? item.warrantyExpiryDate || null : null,
          warrantyNotes: item.warrantyEnabled ? item.warrantyNotes || null : null,
        })),
      };

      const res = await fetch(API_ROUTES.SHOP_SALES_BY_ID(id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sale");
      alert("Sale updated successfully.");
      navigate("/sale/all");
    } catch (err) {
      alert(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading sale details...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate("/sale/all")}
          className="px-3 py-2 rounded border bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Sales
        </button>

        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <h1 className="text-2xl font-bold">Edit Sale {sale?.reference ? `(${sale.reference})` : ""}</h1>
          <p className="text-sm text-gray-600 mt-1">Modify items, stock impact, and payment details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Shop</label>
              <input
                value={`${sale?.shop?.name || "-"} (ID: ${shopId})`}
                disabled
                className="w-full border rounded p-2 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Customer ID (optional)</label>
              <input
                type="number"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Search Items</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full border rounded p-2 pl-9"
                  placeholder="Name / barcode / brand"
                />
              </div>
              {showSearchResults && (
                <div className="mt-2 border rounded max-h-64 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No matching items</div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        type="button"
                        key={`${item.type}-${item.id}`}
                        className="w-full text-left px-3 py-2 border-b hover:bg-gray-50"
                        onClick={() => handleAddToCart(item)}
                        disabled={Number(item.shop_stock || 0) <= 0}
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.type} | {item.barcode || "-"} | Stock: {item.shop_stock}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={18} />
              <h2 className="font-semibold">Items</h2>
            </div>
            {cartItems.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center">No items in this sale</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Item</th>
                      <th className="p-2">Batch</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, index) => (
                      <tr key={`${item.type}-${item.itemId}-${index}`} className="border-b">
                        <td className="p-2">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">
                            {item.type} | {item.barcode || "-"} | {item.unit || "unit"}
                          </div>
                        </td>
                        <td className="p-2">
                          <select
                            value={`${item.batchNumber || ""}||${item.expiryDate || ""}`}
                            onChange={(e) => handleBatchChange(index, e.target.value)}
                            className="border rounded p-1 min-w-44"
                          >
                            <option value="||">No batch</option>
                            {(item.batches || []).map((batch) => (
                              <option
                                key={`${batch.batchNumber}-${batch.expiryDate || "none"}`}
                                value={`${batch.batchNumber}||${batch.expiryDate || ""}`}
                              >
                                {batch.batchNumber} | Exp: {batch.expiryDate || "N/A"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            className="border rounded p-1 w-24"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            max={item.batchAvailable || 1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                            className="border rounded p-1 w-20"
                          />
                          <div className="text-xs text-gray-500 mt-1">Available: {item.batchAvailable || 0}</div>
                        </td>
                        <td className="p-2 font-medium">${Number(item.totalPrice || 0).toFixed(2)}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => handleRemove(index)}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
              </select>
            </div>

            {(paymentType === "card" || paymentType === "bank") && (
              <div>
                <label className="block text-sm font-medium mb-2">Bank Account</label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {paymentType === "cash" && (
              <div>
                <label className="block text-sm font-medium mb-2">Cash Register</label>
                <select
                  value={cashRegisterId}
                  onChange={(e) => setCashRegisterId(e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="">Select cash register</option>
                  {cashRegisters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Discount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Paid Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
            <div className="p-2 rounded bg-gray-50">Subtotal: ${subtotal.toFixed(2)}</div>
            <div className="p-2 rounded bg-gray-50">Discount: ${Number(discount || 0).toFixed(2)}</div>
            <div className="p-2 rounded bg-gray-50">Grand Total: ${grandTotal.toFixed(2)}</div>
            <div className="p-2 rounded bg-gray-50">Due: ${due.toFixed(2)}</div>
            <div className="p-2 rounded bg-gray-50">Over/Under: ${overUnder.toFixed(2)}</div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Sale Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
