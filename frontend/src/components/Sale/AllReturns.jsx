import { useEffect, useState } from "react";

export default function AllReturns() {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [shops, setShops] = useState([]);

  useEffect(() => {
    fetchReturns();
    fetchStats();
    fetchShops();
  }, []);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/shop-sales/returns/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to fetch returns");
      const data = await res.json();
      setReturns(data);
    } catch (err) {
      setError("Failed to load returns: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/shop-sales/returns/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/shops", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to fetch shops");
      const data = await res.json();
      setShops(data);
    } catch (err) {
      console.error("Failed to load shops:", err);
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = 
      returnItem.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.sale?.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.shop?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.returnItems?.some(item => 
        item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDate = !dateFilter || 
      new Date(returnItem.createdAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();

    const matchesShop = !shopFilter || returnItem.shopId === parseInt(shopFilter);

    return matchesSearch && matchesDate && matchesShop;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("");
    setShopFilter("");
  };

  const exportToCSV = () => {
    const headers = ["Reference", "Original Sale", "Shop", "Customer", "Total Amount", "Date", "Items Count", "Products"];
    
    const csvData = filteredReturns.map(r => [
      r.reference,
      r.sale?.reference || "N/A",
      r.shop?.name || "N/A",
      r.sale?.customer || "Walk-in",
      `$${r.totalAmount.toFixed(2)}`,
      new Date(r.createdAt).toLocaleDateString(),
      r.returnItems?.length || 0,
      r.returnItems?.map(item => `${item.product.name} (${item.quantity})`).join("; ") || "None"
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `returns-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">📦 All Returned Products</h2>
            <p className="text-gray-600">Complete history of all product returns from shops</p>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 mt-4 lg:mt-0"
          >
            📊 Export to CSV
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-blue-600 text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-blue-600 font-medium">Total Returns</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalReturns || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-green-600 text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-green-600 font-medium">Total Return Amount</p>
                <p className="text-2xl font-bold text-green-700">${(stats.totalReturnAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <span className="text-purple-600 text-2xl">🏪</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-purple-600 font-medium">Shops with Returns</p>
                <p className="text-2xl font-bold text-purple-700">
                  {[...new Set(returns.map(r => r.shopId))].length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">🔍 Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search reference, product, shop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Shops</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredReturns.length} of {returns.length} returns
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {filteredReturns.length > 0 && (
            <p className="text-sm font-medium text-green-600">
              Total: ${filteredReturns.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}
            </p>
          )}
        </div>

        {/* Returns Table */}
        {filteredReturns.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg mb-2">No returns found</p>
            <p className="text-sm">No product returns match your current filters</p>
            {(searchQuery || dateFilter || shopFilter) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Clear filters to see all returns
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">Return Details</th>
                  <th className="text-left p-4 font-medium text-gray-700">Shop</th>
                  <th className="text-left p-4 font-medium text-gray-700">Original Sale</th>
                  <th className="text-left p-4 font-medium text-gray-700">Products Returned</th>
                  <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left p-4 font-medium text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-800">{returnItem.reference}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Customer: {returnItem.sale?.customer || "Walk-in"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{returnItem.shop?.name}</p>
                        <p className="text-sm text-gray-500">{returnItem.shop?.shop_keeper}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{returnItem.sale?.reference}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(returnItem.sale?.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        {returnItem.returnItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{item.product.name}</span>
                            <div className="text-right">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                {item.quantity} × ${item.unitPrice.toFixed(2)}
                              </span>
                              <p className="text-gray-600 mt-1">${item.totalPrice.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-lg font-bold text-red-600">
                        -${returnItem.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {returnItem.returnItems.length} item(s)
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(returnItem.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredReturns.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Returns:</span> {filteredReturns.length}
              </div>
              <div>
                <span className="font-medium">Total Items Returned:</span>{" "}
                {filteredReturns.reduce((sum, r) => sum + r.returnItems.length, 0)}
              </div>
              <div>
                <span className="font-medium">Total Refund Amount:</span>{" "}
                <span className="font-bold text-red-600">
                  ${filteredReturns.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="font-medium">Shops:</span>{" "}
                {[...new Set(filteredReturns.map(r => r.shop?.name))].join(", ")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}