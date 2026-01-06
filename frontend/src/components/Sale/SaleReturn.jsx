import { Mailbox, ShoppingCart, Store, Undo2, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SaleReturn() {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  
  const navigate = useNavigate();

  // Fetch shops on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:3001/api/shops", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching shops:", err));
  }, [navigate]);

  // Fetch return-eligible sales when shop is selected
  useEffect(() => {
    if (!selectedShop) {
      setSales([]);
      setFilteredSales([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    // Use the new endpoint for return-eligible sales
    fetch(`http://localhost:3001/api/shop-sales/return-eligible?shopId=${selectedShop}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // All sales returned by this endpoint are eligible for return
        setSales(data);
        setFilteredSales(data);
      })
      .catch((err) => {
        console.error("Error fetching sales:", err);
        setError("Failed to load sales: " + err.message);
      });
  }, [selectedShop]);

  // Filter sales based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSales(sales);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = sales.filter(sale => 
      sale.reference?.toLowerCase().includes(query) ||
      sale.shop?.name?.toLowerCase().includes(query) ||
      sale.customer?.toLowerCase().includes(query) ||
      sale.paymentType?.toLowerCase().includes(query) ||
      sale.grandTotal?.toString().includes(query) ||
      new Date(sale.createdAt).toLocaleDateString().toLowerCase().includes(query)
    );
    setFilteredSales(filtered);
  }, [searchQuery, sales]);

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Format sales data for table display
  const formatSalesData = (sales) => {
    return sales.map(sale => ({
      id: sale.id,
      reference: sale.reference,
      shop: sale.shop?.name || "-",
      customer: sale.customer || "-",
      total: `$${sale.grandTotal?.toFixed(2)}`,
      date: new Date(sale.createdAt).toLocaleDateString(),
      items: sale.saleItems?.length || 0,
      status: "Available for Return",
      rawDate: sale.createdAt,
      originalSale: sale // Store original sale object for selection
    }));
  };

  // Sort data based on sortConfig
  const sortedData = sortConfig.key ? 
    [...formatSalesData(filteredSales)].sort((a, b) => {
      // Special handling for date sorting
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      // Special handling for currency values
      if (sortConfig.key === 'total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', ''));
        const valueB = parseFloat(b[sortConfig.key].replace('$', ''));
        if (sortConfig.direction === 'ascending') {
          return valueA - valueB;
        }
        return valueB - valueA;
      }

      // Special handling for items count
      if (sortConfig.key === 'items') {
        if (sortConfig.direction === 'ascending') {
          return a.items - b.items;
        }
        return b.items - a.items;
      }

      // Default string comparison
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    }) : 
    formatSalesData(filteredSales);

  // Get table headers for the sales table
  const tableHeaders = sales.length > 0 ? 
    ['reference', 'customer', 'total', 'date', 'items', 'status'] : 
    ['reference', 'customer', 'total', 'date', 'items', 'status'];

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleSelectSale = (sale) => {
    // Use the original sale object stored in the formatted data
    setSelectedSale(sale.originalSale);
    setError("");
    
    // Initialize return items with original sale items
    const returnItems = sale.originalSale.saleItems.map(item => ({
      saleItemId: item.id,
      productId: item.productId || item.materialId,
      name: item.product?.name || item.material?.name || `Item ${item.id}`,
      type: item.productId ? "product" : "material",
      barcode: item.product?.barcode || item.material?.barcode || "",
      unit: item.material?.unit || null,
      originalQuantity: item.quantity,
      originalUnitPrice: item.unitPrice,
      returnedQuantity: 0,
      unitPrice: item.unitPrice,
      totalPrice: 0,
      maxReturnable: item.quantity // Can't return more than originally sold
    }));
    
    setItems(returnItems);
  };

  const handleChangeQty = (idx, qty) => {
    const updated = [...items];
    const inputQty = parseFloat(qty) || 0;
    
    // Validate: can't return more than original quantity
    const maxQty = updated[idx].maxReturnable;
    const validQty = Math.min(Math.max(0, inputQty), maxQty);
    
    updated[idx].returnedQuantity = validQty;
    updated[idx].totalPrice = validQty * updated[idx].unitPrice;
    
    setItems(updated);
  };

  const handleChangePrice = (idx, price) => {
    const updated = [...items];
    const newPrice = parseFloat(price) || 0;
    
    updated[idx].unitPrice = Math.max(0, newPrice);
    updated[idx].totalPrice = updated[idx].returnedQuantity * updated[idx].unitPrice;
    
    setItems(updated);
  };

  const handleReturnAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: item.maxReturnable,
      totalPrice: item.maxReturnable * item.unitPrice
    }));
    setItems(updated);
  };

  const handleClearAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: 0,
      totalPrice: 0
    }));
    setItems(updated);
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.filter(item => item.returnedQuantity > 0).length;
    
    return { totalItems, totalAmount, itemCount };
  };

  const handleSubmit = async () => {
    if (!selectedShop) {
      setError("Please select a shop first.");
      return;
    }

    if (!selectedSale) {
      setError("Please select a sale first.");
      return;
    }

    // Filter items that actually have return quantities
    const returnItems = items.filter(item => item.returnedQuantity > 0);
    
    if (returnItems.length === 0) {
      setError("Please specify quantities for items to return.");
      return;
    }

    // Prepare payload according to new API structure
    const payload = {
      saleId: selectedSale.id,
      items: returnItems.map(item => ({
        itemId: item.productId,
        type: item.type,
        quantity: item.returnedQuantity,
        unitPrice: item.unitPrice
      }))
    };

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/shop-sales/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process return");
      }

      // Show success message with details
      const totalAmount = calculateTotals().totalAmount;
      alert(`✅ ${data.message || "Return processed successfully!"}\nReference: ${data.return?.reference || "N/A"}\nAmount: $${(data.return?.totalAmount || totalAmount).toFixed(2)}\nShop: ${data.return?.shop?.name || selectedSale.shop?.name}`);
      
      // Remove the returned sale from the list
      const updatedSales = sales.filter(sale => sale.id !== selectedSale.id);
      setSales(updatedSales);
      setFilteredSales(updatedSales);
      
      // Reset form
      setSelectedSale(null);
      setItems([]);
      setSearchQuery("");
      
    } catch (err) {
      console.error("Return error:", err);
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const { totalItems, totalAmount, itemCount } = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 inline-flex gap-2 bg-red-400/30 text-red-400 py-1 px-2 rounded-md"><Undo2 size={30} /> Shop Sale Return</h2>
        <p className="text-gray-600 mb-6">Process returns for previous shop sales</p>

        {/* Shop Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Shop
          </label>
          <select
            className="w-full md:w-64 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedShop}
            onChange={(e) => {
              setSelectedShop(e.target.value);
              setSelectedSale(null);
              setItems([]);
              setSearchQuery("");
            }}
          >
            <option value="">Select a Shop</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${error.includes("❌") ? "bg-red-50 border border-red-200 text-red-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
            {error}
          </div>
        )}

        {/* Search Bar - Only show when shop is selected */}
        {selectedShop && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="w-full sm:w-auto">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Available Sales for Return</h3>
                <p className="text-sm text-gray-500">Showing {filteredSales.length} non-returned sale(s)</p>
              </div>
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by reference, customer, amount..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Search Results Info */}
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                Found {filteredSales.length} sale(s) matching "{searchQuery}"
                <button
                  onClick={clearSearch}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sales Table with AllSales design - Only show when shop is selected */}
        {selectedShop && (
          <div className="mb-6">
            {/* Apply AllSales table design here */}
            <div className="customTable w-full rounded-md border overflow-hidden dark:border-slate-700 border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-900">
                  <tr>
                    {tableHeaders.map((key) => (
                      <th
                        key={key}
                        className="p-3 text-left font-medium dark:text-[#abc2d3] text-gray-700 cursor-pointer"
                      >
                        <div className="flex items-center gap-[5px]">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          <ArrowUpDown
                            onClick={() => handleSort(key)}
                            className="hover:bg-gray-200 dark:hover:bg-slate-800 p-[5px] rounded-md text-[1.6rem]"
                          />
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-left dark:text-[#abc2d3] font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t dark:border-slate-700 border-gray-200 hover:bg-gray-50 ${
                        selectedSale?.id === item.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      {tableHeaders.map((key) => (
                        <td key={key} className="p-3 dark:text-black">
                          {key === 'status' ? (
                            <span className="text-green-600 text-sm font-medium flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Available for Return
                            </span>
                          ) : key === 'items' ? (
                            <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {item.items}
                            </span>
                          ) : (
                            item[key]
                          )}
                        </td>
                      ))}
                      <td className="p-3">
                        <button
                          onClick={() => handleSelectSale(item)}
                          className={`px-4 py-2 rounded text-sm font-medium ${
                            selectedSale?.id === item.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {selectedSale?.id === item.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty States */}
              {sales.length === 0 && (
                <p className="text-[0.9rem] text-gray-500 py-6 text-center w-full">
                  No sales available for return
                </p>
              )}
              
              {sales.length > 0 && filteredSales.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="mt-2">No sales found matching "{searchQuery}"</p>
                  <button
                    onClick={clearSearch}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear search and show all sales
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Sale Details */}
        {selectedSale && (
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg text-gray-800">
                Selected Sale: {selectedSale.reference}
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Change Sale
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Shop:</span> {selectedSale.shop?.name}
              </div>
              <div>
                <span className="font-medium">Customer:</span> {selectedSale.customer || "Walk-in"}
              </div>
              <div>
                <span className="font-medium">Original Total:</span> ${selectedSale.grandTotal?.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(selectedSale.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Payment Type:</span> {selectedSale.paymentType}
              </div>
              <div>
                <span className="font-medium">Items:</span> {selectedSale.saleItems?.length || 0}
              </div>
            </div>
          </div>
        )}

        {/* Return Items Section */}
        {selectedSale && items.length > 0 && (
          <div className="border border-gray-200 rounded-lg bg-white p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-800">Return Items</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleReturnAll}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                >
                  Return All
                </button>
                <button
                  onClick={handleClearAll}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Product</th>
                    <th className="text-left p-3 font-medium text-gray-700">Type</th>
                    <th className="text-left p-3 font-medium text-gray-700">Sold Qty</th>
                    <th className="text-left p-3 font-medium text-gray-700">Return Qty</th>
                    <th className="text-left p-3 font-medium text-gray-700">Unit Price</th>
                    <th className="text-left p-3 font-medium text-gray-700">Return Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <span>ID: {item.productId}</span>
                            {item.barcode && (
                              <>
                                <span>•</span>
                                <span>Barcode: {item.barcode}</span>
                              </>
                            )}
                            {item.unit && (
                              <>
                                <span>•</span>
                                <span>Unit: {item.unit}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                          item.type === 'product' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-gray-100 px-2 py-1 rounded">{item.originalQuantity}</span>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          max={item.maxReturnable}
                          step="1"
                          className="w-24 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={item.returnedQuantity}
                          onChange={(e) => handleChangeQty(idx, e.target.value)}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Max: {item.maxReturnable}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <span className="mr-1">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-24 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={item.unitPrice}
                            onChange={(e) => handleChangePrice(idx, e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="p-3 font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Items to Return</p>
                  <p className="text-2xl font-bold text-blue-700">{itemCount}</p>
                  <p className="text-sm text-gray-600">Total Quantity: {totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Return Amount</p>
                  <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || itemCount === 0}
                    className={`w-full px-6 py-3 rounded-lg font-semibold ${
                      loading || itemCount === 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Process Return ($${totalAmount.toFixed(2)})`
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            {itemCount > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                ⚠️ This action will return {totalItems} item(s) and refund ${totalAmount.toFixed(2)}. 
                Stock will be restored to {selectedSale.shop?.name} automatically.
              </div>
            )}
          </div>
        )}

        {/* Empty State - Shop not selected */}
        {!selectedShop && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4 inline-flex justify-center"><Store color="skyblue" size={52} /></div>
            <p className="text-lg">Select a shop to view sales and process returns</p>
          </div>
        )}

        {/* Empty State - Sale not selected */}
        {selectedShop && !selectedSale && sales.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4 inline-flex justify-center"><ShoppingCart color="skyblue" size={42} /></div>
            <p className="text-lg">Select a shop sale from the table to process a return</p>
          </div>
        )}

        {/* Empty State - No sales for selected shop */}
        {selectedShop && sales.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4"><Mailbox /></div>
            <p className="text-lg">No sales available for return</p>
            <p className="text-sm text-gray-400 mt-2">
              All sales for this shop have been returned or no sales exist yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}