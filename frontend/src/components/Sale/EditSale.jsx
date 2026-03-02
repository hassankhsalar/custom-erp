import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ArrowLeft, Save, Search, ShoppingCart, X, Store, User, CreditCard, Landmark, Wallet, Receipt, Package } from "lucide-react";

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sale details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <ShoppingCart className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Edit Sale
                </h1>
                <p className="text-gray-600 mt-2">Modify items, stock impact, and payment details</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/sale/all")}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/60"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div className="px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                <p className="text-sm font-medium text-gray-700">Reference</p>
                <p className="text-lg font-bold text-amber-600">{sale?.reference || `ID: ${id}`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 space-y-5">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Store className="text-amber-600" size={20} />
                </div>
                Sale Settings
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Store size={16} className="text-gray-500" />
                  Shop
                </label>
                <input
                  value={`${sale?.shop?.name || "-"} (ID: ${shopId})`}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100/80 border border-gray-200/60 rounded-xl text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-gray-500" />
                  Customer ID (optional)
                </label>
                <input
                  type="number"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300"
                />
              </div>
            </div>

            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Receipt size={20} className="text-amber-600" />
                Totals
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-gray-800">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-bold text-gray-800">${Number(discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50/60 to-orange-50/60 rounded-xl border border-white/60">
                  <span className="text-gray-700 font-medium">Grand Total</span>
                  <span className="font-bold text-amber-700">${grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <span className="text-gray-600">Due</span>
                  <span className="font-bold text-red-600">${due.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <span className="text-gray-600">Over / Under</span>
                  <span className={`font-bold ${overUnder >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    ${overUnder.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <ShoppingCart className="text-amber-600" size={20} />
                  </div>
                  Sale Items ({cartItems.length})
                </h2>
              </div>
              {cartItems.length === 0 ? (
                <div className="text-center py-8 bg-white/30 rounded-xl border border-white/50">
                  <Package size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No items in this sale</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Search size={16} className="text-gray-500" />
                      Search Items
                    </label>
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300 placeholder:text-gray-400"
                        placeholder="Name / barcode / brand"
                      />
                    </div>
                    {showSearchResults && (
                      <div className="mt-2 backdrop-blur-lg bg-white/90 border border-white/60 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                        {searchResults.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">No matching items</div>
                        ) : (
                          searchResults.map((item) => (
                            <button
                              type="button"
                              key={`${item.type}-${item.id}`}
                              className="w-full text-left px-3 py-2 border-b border-white/30 last:border-b-0 hover:bg-white/50 transition-colors"
                              onClick={() => handleAddToCart(item)}
                              disabled={Number(item.shop_stock || 0) <= 0}
                            >
                              <div className="font-medium text-gray-800">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.type} | {item.barcode || "-"} | Stock: {item.shop_stock}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="overflow-auto rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Item</th>
                          <th className="p-3 text-left font-medium text-gray-700">Batch</th>
                          <th className="p-3 text-left font-medium text-gray-700">Price</th>
                          <th className="p-3 text-left font-medium text-gray-700">Qty</th>
                          <th className="p-3 text-left font-medium text-gray-700">Total</th>
                          <th className="p-3 text-left font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item, index) => (
                          <tr key={`${item.type}-${item.itemId}-${index}`} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3">
                              <div className="font-medium text-gray-800">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.type} | {item.barcode || "-"} | {item.unit || "unit"}
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={`${item.batchNumber || ""}||${item.expiryDate || ""}`}
                                onChange={(e) => handleBatchChange(index, e.target.value)}
                                className="min-w-44 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                            <td className="p-3">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="w-24 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                max={item.batchAvailable || 1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                                className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                              <div className="text-xs text-gray-500 mt-1">Available: {item.batchAvailable || 0}</div>
                            </td>
                            <td className="p-3 font-semibold text-emerald-700">${Number(item.totalPrice || 0).toFixed(2)}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
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
                </>
              )}
            </div>

            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="text-blue-600" size={20} />
                </div>
                Payment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>

                {(paymentType === "card" || paymentType === "bank") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Landmark size={14} />
                      Bank Account
                    </label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Wallet size={14} />
                      Cash Register
                    </label>
                    <select
                      value={cashRegisterId}
                      onChange={(e) => setCashRegisterId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Save Sale Changes</h3>
              <p className="text-gray-600">Review all details before updating this sale</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/sale/all")}
                className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Sale Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
