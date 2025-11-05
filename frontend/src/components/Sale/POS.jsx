import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function POS() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");

  const navigate = useNavigate();

  // ✅ Fetch all stores
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login"); // Redirect if no token
      return;
    }

    fetch("http://localhost:3001/api/stores", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stores");
        return res.json();
      })
      .then((data) => setStores(Array.isArray(data) ? data : data.stores || []))
      .catch((err) => {
        console.error("Error fetching stores:", err);
        setStores([]);
      });
  }, [navigate]);

  // ✅ Fetch products for a selected store
  useEffect(() => {
    if (!storeId) {
      setProducts([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`http://localhost:3001/api/products/store/${storeId}`, {
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
  }, [storeId]);

  // ✅ Add new blank sale item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        searchQuery: "", // Added to track search input separately
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
    updated[index].searchQuery = product.name; // Set the search query to product name
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
    if (!storeId) {
      alert("⚠️ Please select a store.");
      return false;
    }
    
    if (items.length === 0) {
      alert("⚠️ Please add at least one item.");
      return false;
    }

    // Check if all items have valid product selections
    const invalidItems = items.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      alert("⚠️ Please select a product for all items.");
      return false;
    }

    // Check for negative values
    if (discount < 0) {
      alert("⚠️ Discount cannot be negative.");
      return false;
    }

    const itemsWithInvalidQuantities = items.filter(item => item.quantity <= 0);
    if (itemsWithInvalidQuantities.length > 0) {
      alert("⚠️ Quantity must be greater than 0 for all items.");
      return false;
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
      storeId: parseInt(storeId),
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

    try {
      const res = await fetch("http://localhost:3001/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Sale added successfully!");
        setItems([]);
        setDiscount(0);
        setCustomer("");
        setPaymentType("cash");
        navigate("/sale/pos");
      } else {
        const error = await res.json();
        alert("❌ Error: " + (error.message || "Something went wrong"));
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Network error. Please try again.");
    }
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grandTotal = Math.max(0, total - (parseFloat(discount) || 0));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🧾 New Sale (POS)</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store + Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store *</label>
            <select
              className="border p-2 rounded w-full"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
            >
              <option value="">Select Store</option>
              {stores.map((s) => (
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
          
          {items.map((item, idx) => (
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

              <div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="border p-2 rounded w-full"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) =>
                    handleChangeItem(idx, "quantity", e.target.value)
                  }
                  required
                />
              </div>

              <div>
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
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
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
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
            disabled={items.length === 0 || !storeId}
          >
            💾 Save Sale
          </button>
          
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setDiscount(0);
              setCustomer("");
            }}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            🔄 Clear
          </button>
        </div>
      </form>
    </div>
  );
}