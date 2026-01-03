import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function ShopPOS() {
  const [shops, setShops] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [shopId, setShopId] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalData, setPriceModalData] = useState({ index: null, currentPrice: 0 });

  const searchInputRef = useRef(null);
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

  // Focus search input on shop selection
  useEffect(() => {
    if (shopId && searchInputRef.current) {
      searchInputRef.current.focus();
    }
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

  // Add item to cart and update local stock
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
        type: item.type,
        quantity: 1,
        unitPrice: salePrice,
        totalPrice: salePrice,
        barcode: item.barcode,
        unit: item.unit,
        shop_stock: item.shop_stock,
        original_price: salePrice // Store original price for reference
      };
      
      setCartItems([...cartItems, newItem]);
    }

    // Update local stock state
    const updatedShopItems = shopItems.map(shopItem => {
      if (shopItem.id === item.id && shopItem.type === item.type) {
        return {
          ...shopItem,
          shop_stock: shopItem.shop_stock - 1
        };
      }
      return shopItem;
    });
    
    setShopItems(updatedShopItems);

    // Clear search
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Update cart item quantity and update local stock
  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = [...cartItems];
    const item = updatedCart[index];
    const originalQuantity = item.quantity;
    const quantityDifference = newQuantity - originalQuantity;
    
    // Find the item in shop items to check stock
    const shopItem = shopItems.find(si => 
      si.id === item.itemId && si.type === item.type
    );
    
    if (!shopItem) return;
    
    // Check if we're increasing quantity beyond available stock
    if (quantityDifference > 0 && shopItem.shop_stock < quantityDifference) {
      alert(`Insufficient stock for ${item.name}. Available: ${shopItem.shop_stock}`);
      return;
    }
    
    // Update cart
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].totalPrice = newQuantity * updatedCart[index].unitPrice;
    setCartItems(updatedCart);
    
    // Update local stock
    const updatedShopItems = shopItems.map(si => {
      if (si.id === item.itemId && si.type === item.type) {
        return {
          ...si,
          shop_stock: si.shop_stock - quantityDifference
        };
      }
      return si;
    });
    
    setShopItems(updatedShopItems);
  };

  // Remove item from cart and restore local stock
  const handleRemoveFromCart = (index) => {
    const itemToRemove = cartItems[index];
    const updatedCart = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedCart);
    
    // Restore stock
    const updatedShopItems = shopItems.map(si => {
      if (si.id === itemToRemove.itemId && si.type === itemToRemove.type) {
        return {
          ...si,
          shop_stock: si.shop_stock + itemToRemove.quantity
        };
      }
      return si;
    });
    
    setShopItems(updatedShopItems);
  };

  // Clear cart and restore all stock
  const handleClearCart = () => {
    // Restore all stock from cart
    const updatedShopItems = [...shopItems];
    
    cartItems.forEach(cartItem => {
      const index = updatedShopItems.findIndex(si => 
        si.id === cartItem.itemId && si.type === cartItem.type
      );
      
      if (index !== -1) {
        updatedShopItems[index].shop_stock += cartItem.quantity;
      }
    });
    
    setShopItems(updatedShopItems);
    setCartItems([]);
    setDiscount(0);
    setCustomer("");
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Open price override modal
  const handleOpenPriceModal = (index) => {
    const item = cartItems[index];
    setPriceModalData({
      index,
      currentPrice: item.unitPrice,
      name: item.name
    });
    setTempPrice(item.unitPrice.toFixed(2));
    setShowPriceModal(true);
  };

  // Apply price override
  const handleApplyPriceOverride = () => {
    if (!tempPrice || parseFloat(tempPrice) <= 0) {
      alert("Please enter a valid price greater than 0");
      return;
    }

    const newPrice = parseFloat(tempPrice);
    const updatedCart = [...cartItems];
    const itemIndex = priceModalData.index;
    
    updatedCart[itemIndex].unitPrice = newPrice;
    updatedCart[itemIndex].totalPrice = newPrice * updatedCart[itemIndex].quantity;
    
    setCartItems(updatedCart);
    setShowPriceModal(false);
    setTempPrice("");
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
        // Clear cart but don't restore stock since it's already sold
        setCartItems([]);
        setDiscount(0);
        setCustomer("");
        setSearchQuery("");
        setShowSearchResults(false);
        
        // Refresh shop items to get updated stock from server
        if (shopId) {
          fetch(API_ROUTES.SHOP_SALES_ITEMS(shopId), {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => setShopItems(Array.isArray(data) ? data : []));
        }
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

  // Get low stock items (below 20)
  const lowStockItems = shopItems.filter(item => item.shop_stock < 20 && item.shop_stock > 0);
  const outOfStockItems = shopItems.filter(item => item.shop_stock <= 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">🏪 Shop POS System</h1>
            <p className="text-blue-100">Unified Sales for Products & Materials</p>
          </div>
          <div className="mt-2 md:mt-0">
            {shopId && (
              <div className="text-sm bg-blue-700 px-3 py-1 rounded-full">
                Selected: {shops.find(s => s.id === parseInt(shopId))?.name || "Shop"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Shop Selection & Search */}
          <div className="lg:col-span-1 space-y-4">
            {/* Shop Selection Card */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">🏬</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Select Shop</h3>
                  <p className="text-sm text-gray-500">Choose shop to sell from</p>
                </div>
              </div>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

            {/* Search Card */}
            <div className="bg-white rounded-xl shadow-md p-5 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600">🔍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Search Items</h3>
                  <p className="text-sm text-gray-500">Type name, barcode or brand</p>
                </div>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                placeholder="Search products & materials..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                disabled={!shopId}
              />
              
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 bg-white border border-gray-200 w-full max-h-80 overflow-y-auto shadow-xl rounded-lg mt-2">
                  {searchResults.map((item) => {
                    const isLowStock = item.shop_stock < 20;
                    const isOutOfStock = item.shop_stock <= 0;
                    
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => !isOutOfStock && handleAddToCart(item)}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b transition ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${item.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                              </span>
                              {item.barcode && <span className="ml-2">| {item.barcode}</span>}
                            </div>
                            <div className="flex items-center mt-1">
                              <span className={`text-sm font-medium ${isLowStock ? 'text-amber-600' : 'text-gray-700'}`}>
                                Stock: {item.shop_stock} {item.unit && `(${item.unit})`}
                              </span>
                              {isLowStock && !isOutOfStock && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">Low Stock</span>
                              )}
                              {isOutOfStock && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">Out of Stock</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">${(item.sale_price || 0).toFixed(2)}</div>
                            {!isOutOfStock && (
                              <button className="mt-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition">
                                Add to Cart
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {showSearchResults && searchResults.length === 0 && searchQuery && (
                <div className="absolute z-10 bg-white border w-full shadow-lg rounded-lg mt-2 p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">😕</div>
                  <p>No items found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </div>

            {/* Stock Alerts Card */}
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-red-600">⚠️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Stock Alerts</h3>
                    <p className="text-sm text-gray-500">Items needing attention</p>
                  </div>
                </div>
                
                {outOfStockItems.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-red-700 mb-2">Out of Stock ({outOfStockItems.length})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {outOfStockItems.slice(0, 5).map(item => (
                        <div key={`${item.type}-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-red-50 rounded">
                          <span className="text-red-800">{item.name}</span>
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">0 {item.unit}</span>
                        </div>
                      ))}
                      {outOfStockItems.length > 5 && (
                        <div className="text-center text-sm text-red-600">
                          +{outOfStockItems.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {lowStockItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-700 mb-2">Low Stock ({lowStockItems.length})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {lowStockItems.slice(0, 5).map(item => (
                        <div key={`${item.type}-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-amber-50 rounded">
                          <span className="text-amber-800">{item.name}</span>
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                            {item.shop_stock} {item.unit}
                          </span>
                        </div>
                      ))}
                      {lowStockItems.length > 5 && (
                        <div className="text-center text-sm text-amber-600">
                          +{lowStockItems.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer & Payment Card */}
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600">👤</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Customer & Payment</h3>
                  <p className="text-sm text-gray-500">Optional customer details</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer (Optional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  placeholder="Enter customer name"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="mobile">📱 Mobile Payment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Middle Column: Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Cart Header */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                      <span className="text-white text-xl">🛒</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Shopping Cart</h3>
                      <p className="text-sm text-gray-500">{cartItems.length} item(s) in cart</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearCart}
                    className="px-4 py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-medium rounded-lg hover:from-gray-300 hover:to-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={cartItems.length === 0 || loading}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              {cartItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4 text-gray-300">🛒</div>
                  <h4 className="text-xl font-semibold text-gray-500 mb-2">Your cart is empty</h4>
                  <p className="text-gray-400">Search and add items to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Item</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Price</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Quantity</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Total</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${item.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                              </span>
                              {item.barcode && <span className="ml-2">| {item.barcode}</span>}
                              {item.unit && <span className="ml-2">| Unit: {item.unit}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">${item.unitPrice.toFixed(2)}</span>
                              {item.unitPrice !== item.original_price && (
                                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                  Overridden
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenPriceModal(index)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                              >
                                <span className="text-gray-700">-</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.shop_stock + item.quantity} // Current stock + quantity in cart
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-16 border border-gray-300 p-2 text-center rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity >= item.shop_stock + item.quantity}
                              >
                                <span className="text-gray-700">+</span>
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Available: {item.shop_stock + item.quantity}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">${item.totalPrice.toFixed(2)}</div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleRemoveFromCart(index)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
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

              {/* Cart Footer with Totals */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-white">
                  <div className="space-y-4 max-w-md ml-auto">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Discount:</span>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-32 border border-gray-300 p-2 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        <span className="font-medium text-red-600">-${parseFloat(discount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={handleSubmit}
                        disabled={cartItems.length === 0 || !shopId || loading}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processing Sale...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <span className="mr-2">💳</span>
                            Complete Sale (${grandTotal.toFixed(2)})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price Override Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Override Price</h3>
                <p className="text-sm text-gray-500">Adjust price for {priceModalData.name}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700">Current Price:</span>
                <span className="font-semibold">${priceModalData.currentPrice.toFixed(2)}</span>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">New Price:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                  className="w-full pl-8 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                  placeholder="Enter new price"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPriceModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPriceOverride}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition"
              >
                Apply New Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}