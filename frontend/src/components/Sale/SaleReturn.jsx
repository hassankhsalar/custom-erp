import { useEffect, useState } from "react";

export default function SaleReturn() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/sales", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to fetch sales");
      const data = await res.json();
      setSales(data);
    } catch (err) {
      setError("Failed to load sales: " + err.message);
    }
  };

  const handleSelectSale = (saleId) => {
    const sale = sales.find((s) => s.id === parseInt(saleId));
    setSelectedSale(sale);
    setError("");
    
    // Initialize return items with original sale items
    setItems(sale.saleItems.map(i => ({
      productId: i.productId,
      name: i.product?.name || `Product ${i.productId}`,
      unitPrice: i.unitPrice,
      originalQuantity: i.quantity,
      returnedQuantity: 0,
      maxReturnable: i.quantity // Can't return more than originally sold
    })));
  };

  const handleChangeQty = (idx, qty) => {
    const updated = [...items];
    const inputQty = parseFloat(qty) || 0;
    
    // Validate: can't return more than original quantity
    const maxQty = updated[idx].maxReturnable;
    const validQty = Math.min(Math.max(0, inputQty), maxQty);
    
    updated[idx].returnedQuantity = validQty;
    setItems(updated);
  };

  const handleReturnAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: item.maxReturnable
    }));
    setItems(updated);
  };

  const handleClearAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: 0
    }));
    setItems(updated);
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const totalAmount = items.reduce((sum, item) => 
      sum + (item.returnedQuantity * item.unitPrice), 0
    );
    return { totalItems, totalAmount };
  };

  const handleSubmit = async () => {
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

  const payload = {
    saleId: selectedSale.id,
    items: returnItems.map(item => ({
      productId: item.productId,
      quantity: item.returnedQuantity,
      unitPrice: item.unitPrice
    }))
  };

  setLoading(true);
  setError("");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:3001/api/sales/return", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to process return");
    }

    // Show success message with details
    alert(`✅ ${data.message}\nReference: ${data.return.reference}\nAmount: $${data.return.totalAmount.toFixed(2)}`);
    
    // Reset form
    setSelectedSale(null);
    setItems([]);
    
    // Refresh sales list to reflect changes
    fetchSales();
    
  } catch (err) {
    console.error("Return error:", err);
    setError("❌ " + err.message);
  } finally {
    setLoading(false);
  }
};

  const { totalItems, totalAmount } = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔙 Sale Return</h2>
        <p className="text-gray-600 mb-6">Process returns for previous sales</p>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Sale Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Sale to Return
          </label>
          <select
            className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => handleSelectSale(e.target.value)}
            value={selectedSale?.id || ""}
          >
            <option value="">Choose a sale...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference} - {s.store?.name} - ${s.grandTotal.toFixed(2)} - {new Date(s.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Sale Details */}
        {selectedSale && (
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-3">
              Sale Details: {selectedSale.reference}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Store:</span> {selectedSale.store?.name}
              </div>
              <div>
                <span className="font-medium">Customer:</span> {selectedSale.customer || "Walk-in"}
              </div>
              <div>
                <span className="font-medium">Original Total:</span> ${selectedSale.grandTotal.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(selectedSale.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Payment Type:</span> {selectedSale.paymentType}
              </div>
              <div>
                <span className="font-medium">Items:</span> {selectedSale.saleItems.length}
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
                    <th className="text-left p-3 font-medium text-gray-700">Unit Price</th>
                    <th className="text-left p-3 font-medium text-gray-700">Sold Qty</th>
                    <th className="text-left p-3 font-medium text-gray-700">Return Qty</th>
                    <th className="text-left p-3 font-medium text-gray-700">Return Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">ID: {item.productId}</p>
                        </div>
                      </td>
                      <td className="p-3">${item.unitPrice.toFixed(2)}</td>
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
                      <td className="p-3 font-medium">
                        ${(item.returnedQuantity * item.unitPrice).toFixed(2)}
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
                  <p className="text-sm text-gray-600">Total Items to Return</p>
                  <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Return Amount</p>
                  <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || totalItems === 0}
                    className={`w-full px-6 py-3 rounded-lg font-semibold ${
                      loading || totalItems === 0
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
            {totalItems > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                ⚠️ This action will return {totalItems} item(s) and refund ${totalAmount.toFixed(2)}. 
                Stock levels will be updated automatically.
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedSale && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-lg">Select a sale to process a return</p>
          </div>
        )}
      </div>
    </div>
  );
}