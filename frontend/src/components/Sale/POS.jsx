import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function ShopPOS() {
  const [shops, setShops] = useState([]);
  const [shopItems, setShopItems] = useState([]); // Combined products and materials
  const [shopId, setShopId] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch all shops
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

  // Fetch items for selected shop
  useEffect(() => {
    if (!shopId) {
      setShopItems([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ROUTES.SHOP_SALES_ITEMS(shopId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch shop items");
        return res.json();
      })
      .then((data) => {
        setShopItems(Array.isArray(data) ? data : []);
        setSearchResults([]);
        setSearchQuery("");
      })
      .catch((err) => {
        console.error("Error fetching shop items:", err);
        setShopItems([]);
      });
  }, [shopId]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = shopItems.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(query.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(query.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(query.toLowerCase()))
    );

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  // Add item to cart
  const handleAddToCart = (item) => {
    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex(cartItem => 
      cartItem.itemId === item.id && cartItem.type === item.type
    );

    if (existingIndex !== -1) {
      // Increment quantity if already in cart
      const updatedCart = [...cartItems];
      const newQuantity = updatedCart[existingIndex].quantity + 1;
      
      // Check stock availability
      if (newQuantity > item.shop_stock) {
        alert(`Insufficient stock for ${item.name}. Available: ${item.shop_stock}`);
        return;
      }
      
      updatedCart[existingIndex].quantity = newQuantity;
      updatedCart[existingIndex].totalPrice = newQuantity * updatedCart[existingIndex].unitPrice;
      setCartItems(updatedCart);
    } else {
      // Add new item to cart
      const salePrice = item.sale_price || 0;
      if (salePrice <= 0) {
        alert(`${item.name} has no sale price set.`);
        return;
      }
      
      const newItem = {
        itemId: item.id,
        name: item.name,
        type: item.type, // "product" or "material"
        quantity: 1,
        unitPrice: salePrice,
        totalPrice: salePrice,
        barcode: item.barcode,
        unit: item.unit,
        shop_stock: item.shop_stock
      };
      
      setCartItems([...cartItems, newItem]);
    }

    // Clear search
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Update cart item quantity
  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = [...cartItems];
    const item = updatedCart[index];
    
    // Check stock availability
    if (newQuantity > item.shop_stock) {
      alert(`Insufficient stock for ${item.name}. Available: ${item.shop_stock}`);
      return;
    }
    
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].totalPrice = newQuantity * updatedCart[index].unitPrice;
    setCartItems(updatedCart);
  };

  // Remove item from cart
  const handleRemoveFromCart = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Clear cart
  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setCustomer("");
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Validate form before submission
  const validateForm = () => {
    if (!shopId) {
      alert("⚠️ Please select a shop.");
      return false;
    }
    
    if (cartItems.length === 0) {
      alert("⚠️ Cart is empty. Add items to proceed.");
      return false;
    }

    if (discount < 0) {
      alert("⚠️ Discount cannot be negative.");
      return false;
    }

    // Check stock availability for all items
    for (const cartItem of cartItems) {
      if (cartItem.quantity <= 0) {
        alert(`⚠️ Quantity must be greater than 0 for ${cartItem.name}.`);
        return false;
      }
    }

    return true;
  };

  // Submit sale
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
      items: cartItems.map(item => ({
        itemId: item.itemId,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
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
        alert("✅ Sale completed successfully!");
        handleClearCart();
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

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const grandTotal = Math.max(0, subtotal - (parseFloat(discount) || 0));

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">🏪 Shop POS System</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shop Selection & Search */}
        <div className="lg:col-span-1 space-y-4">
          {/* Shop Selection */}
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium mb-2">Select Shop *</label>
            <select
              className="w-full border p-2 rounded"
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                handleClearCart();
              }}
              required
            >
              <option value="">Select a Shop</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="bg-white p-4 rounded-lg shadow relative">
            <label className="block text-sm font-medium mb-2">Search Items</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              placeholder="Search by name, barcode, brand..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              disabled={!shopId}
            />
            
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-80 overflow-y-auto shadow-lg rounded mt-1">
                {searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleAddToCart(item)}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                        {item.barcode && ` | Barcode: ${item.barcode}`}
                        {item.brand && ` | Brand: ${item.brand}`}
                        {item.category && ` | Category: ${item.category}`}
                      </div>
                      <div className="text-sm">
                        Stock: {item.shop_stock} {item.unit && `(${item.unit})`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${(item.sale_price || 0).toFixed(2)}</div>
                      <button className="mt-1 bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600">
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery && (
              <div className="absolute z-10 bg-white border w-full shadow-lg rounded mt-1 p-3 text-gray-500">
                No items found
              </div>
            )}
          </div>

          {/* Customer & Payment */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer (Optional)</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                placeholder="Customer Name"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select
                className="w-full border p-2 rounded"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Middle Column: Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">🛒 Cart Items ({cartItems.length})</h3>
                <button
                  onClick={handleClearCart}
                  className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                  disabled={cartItems.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🛒</div>
                <p>Your cart is empty</p>
                <p className="text-sm">Search and add items to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Item</th>
                      <th className="p-3 text-left text-sm font-medium">Price</th>
                      <th className="p-3 text-left text-sm font-medium">Quantity</th>
                      <th className="p-3 text-left text-sm font-medium">Total</th>
                      <th className="p-3 text-left text-sm font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                            {item.barcode && ` | ${item.barcode}`}
                            {item.unit && ` | Unit: ${item.unit}`}
                          </div>
                        </td>
                        <td className="p-3">${item.unitPrice.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded"
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.shop_stock}
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 border p-1 text-center rounded"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded"
                              disabled={item.quantity >= item.shop_stock}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Stock: {item.shop_stock}
                          </div>
                        </td>
                        <td className="p-3 font-semibold">${item.totalPrice.toFixed(2)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleRemoveFromCart(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Discount:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-24 border p-1 rounded text-right"
                      />
                      <span>-${parseFloat(discount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Grand Total:</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={cartItems.length === 0 || !shopId || loading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing Sale...
                      </span>
                    ) : (
                      `Complete Sale ($${grandTotal.toFixed(2)})`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}