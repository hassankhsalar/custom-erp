import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function ShopPOS() {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopId, setShopId] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch all shops
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(API_ROUTES.SHOP_SALES_SHOPS, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch shops");
        return res.json();
      })
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching shops:", err);
        setShops([]);
      });
  }, [navigate]);

  // ✅ Fetch products for a selected shop
  useEffect(() => {
    if (!shopId) {
      setProducts([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ROUTES.SHOP_SALES_PRODUCTS(shopId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching products:", err);
        setProducts([]);
      });
  }, [shopId]);

  console.log(products);

  // ✅ Add new blank sale item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        searchQuery: "",
        filteredProducts: [],
        showSuggestions: false,
      },
    ]);
  };

  // ✅ Remove item
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Handle inline value change
  const handleChangeItem = (index, field, value) => {
    const updated = [...items];
    if (field === "quantity" || field === "unitPrice") {
      updated[index][field] = Math.max(0, parseFloat(value) || 0);
    } else if (field === "searchQuery") {
      updated[index][field] = value;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // ✅ Handle search query for product suggestions
  const handleSearchProduct = (index, query) => {
    const updated = [...items];
    updated[index].searchQuery = query;
    
    if (!query.trim()) {
      updated[index].showSuggestions = false;
      updated[index].filteredProducts = [];
      setItems(updated);
      return;
    }

    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );

    updated[index].showSuggestions = true;
    updated[index].filteredProducts = filtered;
    setItems(updated);
  };

  // ✅ Select product from suggestions
  const handleSelectProduct = (index, product) => {
    const updated = [...items];
    updated[index].productId = product.id;
    updated[index].unitPrice = product.sale_price || 0;
    updated[index].searchQuery = product.name;
    updated[index].showSuggestions = false;
    updated[index].filteredProducts = [];
    setItems(updated);
  };

  // ✅ Close suggestions when clicking outside
  const handleBlur = (index) => {
    setTimeout(() => {
      const updated = [...items];
      updated[index].showSuggestions = false;
      setItems(updated);
    }, 200);
  };

  // ✅ Validate form before submission
  const validateForm = () => {
    if (!shopId) {
      alert("⚠️ Please select a shop.");
      return false;
    }
    
    if (items.length === 0) {
      alert("⚠️ Please add at least one item.");
      return false;
    }

    const invalidItems = items.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      alert("⚠️ Please select a product for all items.");
      return false;
    }

    if (discount < 0) {
      alert("⚠️ Discount cannot be negative.");
      return false;
    }

    const itemsWithInvalidQuantities = items.filter(item => item.quantity <= 0);
    if (itemsWithInvalidQuantities.length > 0) {
      alert("⚠️ Quantity must be greater than 0 for all items.");
      return false;
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stock < item.quantity) {
        alert(`⚠️ Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        return false;
      }
    }

    return true;
  };

  // ✅ Submit sale
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      shopId: parseInt(shopId),
      customer: customer.trim() || null,
      paymentType,
      discount: Math.max(0, parseFloat(discount) || 0),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    const token = localStorage.getItem("token");
    if (!token) {
      alert("❌ Authentication required. Please log in again.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_ROUTES.SHOP_SALES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Shop sale completed successfully!");
        setItems([]);
        setDiscount(0);
        setCustomer("");
        setPaymentType("cash");
        setShopId("");
        // Optionally navigate to sales list or receipt
        // navigate("/shop-sales/all");
      } else {
        alert("❌ Error: " + (data.error || "Something went wrong"));
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grandTotal = Math.max(0, total - (parseFloat(discount) || 0));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🏪 Shop POS System</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop + Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Shop *</label>
            <select
              className="border p-2 rounded w-full"
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                setItems([]); // Clear items when shop changes
              }}
              required
            >
              <option value="">Select Shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <input
              type="text"
              placeholder="Customer Name (optional)"
              className="border p-2 rounded w-full"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>
        </div>

        {/* Items */}
        <div className="border rounded p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">🛍️ Sale Items</h3>
            <span className="text-sm text-gray-600">
              {items.length} item(s)
            </span>
          </div>
          
          {items.map((item, idx) => {
            const selectedProduct = products.find(p => p.id === item.productId);
            const availableStock = selectedProduct ? selectedProduct.stock : 0;
            
            return (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center relative p-3 border rounded bg-white"
              >
                {/* 🔍 Search Input */}
                <div className="md:col-span-2 relative">
                  <input
                    type="text"
                    className="border p-2 rounded w-full"
                    placeholder="Search Product"
                    value={item.searchQuery || ""}
                    onChange={(e) => handleSearchProduct(idx, e.target.value)}
                    onBlur={() => handleBlur(idx)}
                    required
                  />
                  {item.showSuggestions && (
                    <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded mt-1">
                      {item.filteredProducts.length > 0 ? (
                        item.filteredProducts.map((p) => (
                          <li
                            key={p.id}
                            onClick={() => handleSelectProduct(idx, p)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                          >
                            <div className="font-medium">{p.name}</div>
                            <div className="text-sm text-gray-600">
                              Stock: {p.stock} | Price: ${p.sale_price || 0}
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="p-2 text-gray-500">No products found</li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="h-full">
                  <label className="text-xs" htmlFor="quantity">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={availableStock}
                    className="border p-2 rounded w-full"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) =>
                      handleChangeItem(idx, "quantity", e.target.value)
                    }
                    required
                  />
                  {selectedProduct && (
                    <div className="text-xs text-gray-500 mt-1">
                      Available: {availableStock}
                    </div>
                  )}
                </div>

                <div className="h-full">
                  <label className="text-xs" htmlFor="Unit Price">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border p-2 rounded w-full bg-gray-100"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    readOnly
                  />
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-right font-semibold flex-1">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="bg-red-500 text-white p-1 rounded hover:bg-red-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            disabled={!shopId}
          >
            ➕ Add Item
          </button>
        </div>

        {/* Totals & Payment */}
        <div className="space-y-4 p-4 border rounded bg-white">
          <div className="flex justify-between items-center">
            <span>Subtotal:</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>Discount:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="border p-2 rounded w-32 text-right"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <span>-${parseFloat(discount || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center border-t pt-2">
            <span>Grand Total:</span>
            <strong className="text-lg">${grandTotal.toFixed(2)}</strong>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select
              className="border p-2 rounded w-full max-w-xs"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Payment</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={items.length === 0 || !shopId || loading}
          >
            {loading ? "🔄 Processing..." : "💾 Complete Sale"}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setDiscount(0);
              setCustomer("");
            }}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            disabled={loading}
          >
            🔄 Clear
          </button>
        </div>
      </form>
    </div>
  );
}