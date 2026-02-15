import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ChartLine, Eye, HandCoins, NotebookText, Package, Printer, ScrollText, Search, SquareKanban, Store } from "lucide-react";

export default function AllReturns() {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [shops, setShops] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnDetails, setReturnDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchReturns();
    fetchShops();
  }, []);

  // Calculate statistics from returns data
  useEffect(() => {
    if (returns.length > 0) {
      const totalReturns = returns.length;
      const totalReturnAmount = returns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const totalItems = returns.reduce((sum, r) => sum + (r.returnItems?.length || 0), 0);
      const uniqueShops = [...new Set(returns.map(r => r.shopId))].length;
      
      setStats({
        totalReturns,
        totalReturnAmount,
        totalItems,
        uniqueShops
      });
    }
  }, [returns]);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Use the correct endpoint
      const res = await fetch(API_ROUTES.SHOP_SALES_RETURNS_BACKUP, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server response:", errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("Returns data received:", data); // Debug log
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setReturns(data);
      } else if (data.returns) {
        setReturns(data.returns);
      } else if (data.data) {
        setReturns(data.data);
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.error("Error fetching returns:", err);
      setError("Failed to load returns: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnDetails = async (returnId) => {
    try {
      setDetailsLoading(true);
      const token = localStorage.getItem("token");
      
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/returns/${returnId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) throw new Error("Failed to fetch return details");
      const data = await res.json();
      setReturnDetails(data);
    } catch (err) {
      console.error("Error fetching return details:", err);
      setError("Failed to load return details: " + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReturnModal = async (returnItem) => {
    setSelectedReturn(returnItem);
    
    // If return items are already loaded, use them
    if (returnItem.returnItems && returnItem.returnItems.length > 0) {
      setReturnDetails(returnItem);
    } else {
      // Otherwise fetch details
      await fetchReturnDetails(returnItem.id);
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReturn(null);
    setReturnDetails(null);
  };

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOPS}`, {
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
    // Search filter
    const matchesSearch = 
      returnItem.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.sale?.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.shop?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.returnItems?.some(item => 
        item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Single date filter (backward compatibility)
    const matchesSingleDate = !dateFilter || 
      new Date(returnItem.createdAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();

    // Date range filter
    const matchesDateRange = () => {
      if (!dateRange.startDate && !dateRange.endDate) return true;
      
      const returnDate = new Date(returnItem.createdAt);
      const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
      
      if (start && end) {
        return returnDate >= start && returnDate <= end;
      } else if (start) {
        return returnDate >= start;
      } else if (end) {
        return returnDate <= end;
      }
      return true;
    };

    // Shop filter
    const matchesShop = !shopFilter || returnItem.shopId === parseInt(shopFilter);

    return matchesSearch && matchesSingleDate && matchesDateRange() && matchesShop;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("");
    setShopFilter("");
    setDateRange({ startDate: "", endDate: "" });
  };

  const exportToCSV = () => {
    const headers = ["Reference", "Original Sale", "Shop", "Customer", "Total Amount", "Date", "Items Count", "Products/Materials"];
    
    const csvData = filteredReturns.map(r => [
      r.reference,
      r.sale?.reference || "N/A",
      r.shop?.name || "N/A",
      r.sale?.customer || "Walk-in",
      `$${(r.totalAmount || 0).toFixed(2)}`,
      new Date(r.createdAt).toLocaleDateString(),
      r.returnItems?.length || 0,
      r.returnItems?.map(item => {
        const name = item.product?.name || item.material?.name || "Unknown";
        const type = item.product?.name ? "Product" : "Material";
        return `${name} (${item.quantity}) [${type}]`;
      }).join("; ") || "None"
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

  // Modal Component
  const ReturnDetailsModal = () => {
    if (!showModal || !selectedReturn) return null;

    const returnData = returnDetails || selectedReturn;
    const items = returnData.returnItems || [];
    const shop = returnData.shop || {};
    const sale = returnData.sale || {};

    return (
      <div className="fixed inset-0 bg-white bg-opacity-30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold inline-flex items-center gap-2"><Package/> Return Details</h2>
                <p className="text-blue-100 mt-1">{returnData.reference}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:text-blue-200 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-blue-200">Return ID</p>
                <p className="font-semibold">#{returnData.id}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200">Date</p>
                <p className="font-semibold">
                  {new Date(returnData.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Amount</p>
                <p className="font-semibold text-xl">${(returnData.totalAmount || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200">Items Count</p>
                <p className="font-semibold">{items.length} items</p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {detailsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading details...</p>
              </div>
            ) : (
              <>
                {/* Shop and Sale Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2"><Store/></span> Shop Information
                    </h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Shop:</span> {shop.name}</p>
                      <p><span className="font-medium">Shop Keeper:</span> {shop.shop_keeper}</p>
                      <p><span className="font-medium">Address:</span> {shop.address || "N/A"}</p>
                      <p><span className="font-medium">Mobile:</span> {shop.mobile || "N/A"}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2"><ScrollText /></span> Original Sale
                    </h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Sale Reference:</span> {sale.reference}</p>
                      <p><span className="font-medium">Sale Date:</span> {new Date(sale.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-medium">Customer:</span> {sale.customer || "Walk-in"}</p>
                      <p><span className="font-medium">Payment Type:</span> {sale.paymentType || "Cash"}</p>
                      <p><span className="font-medium">Original Total:</span> ${(sale.grandTotal || sale.totalAmount || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Returned Items */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-800 mb-4 text-lg flex items-center">
                    <span className="mr-2"><Package/></span> Returned Items ({items.length})
                  </h3>
                  
                  {items.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items returned</p>
                  ) : (
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-700">Item</th>
                            <th className="text-left p-3 font-medium text-gray-700">Type</th>
                            <th className="text-left p-3 font-medium text-gray-700">Quantity</th>
                            <th className="text-left p-3 font-medium text-gray-700">Unit Price</th>
                            <th className="text-left p-3 font-medium text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const isProduct = !!item.product;
                            const itemName = isProduct ? item.product?.name : item.material?.name;
                            const itemBarcode = isProduct ? item.product?.barcode : item.material?.barcode;
                            
                            return (
                              <tr key={index} className="border-b border-gray-200 hover:bg-white">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{itemName}</p>
                                    <p className="text-sm text-gray-500">Barcode: {itemBarcode || "N/A"}</p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                                    isProduct 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {isProduct ? 'Product' : 'Material'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="p-3 font-medium">
                                  ${(item.unitPrice || 0).toFixed(2)}
                                </td>
                                <td className="p-3 font-bold text-red-600">
                                  -${(item.totalPrice || 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-800 text-white">
                          <tr>
                            <td colSpan="4" className="p-3 text-right font-semibold">
                              Total Refund Amount:
                            </td>
                            <td className="p-3 font-bold text-xl">
                              -${(returnData.totalAmount || 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2"><NotebookText /></span> Additional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="font-medium">
                        {new Date(returnData.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Processed By</p>
                      <p className="font-medium">System (Automated)</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                // Option to print receipt
                window.print();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-300 inline-flex items-center gap-2"
            >
              <Printer /> Print Receipt
            </button>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
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
    <div className="max-w-7xl rounded-t-2xl mx-auto p-6">
      {/* Return Details Modal */}
      <ReturnDetailsModal />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 inline-flex gap-2 bg-red-400/30 text-red-400 py-2 px-3 rounded-md"><Package size={32} /> All Returns</h2>
            <p className="text-gray-600">Complete history of all returns from shops</p>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 mt-4 lg:mt-0"
          >
            <SquareKanban /> Export to CSV
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-blue-600 text-2xl"><ChartLine /></span>
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
                <span className="text-green-600 text-2xl"><HandCoins /></span>
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
                <span className="text-purple-600 text-2xl"><Package /></span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-purple-600 font-medium">Total Items</p>
                <p className="text-2xl font-bold text-purple-700">{stats.totalItems || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-amber-100 p-3 rounded-lg">
                <span className="text-amber-600 text-2xl"><Store /></span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-amber-600 font-medium">Shops with Returns</p>
                <p className="text-2xl font-bold text-amber-700">{stats.uniqueShops || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3"><Search /> Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
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
            <p className="text-sm font-medium text-red-600">
              Total: ${filteredReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0).toFixed(2)}
            </p>
          )}
        </div>

        {/* Returns Table */}
        {filteredReturns.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg mb-2">No returns found</p>
            <p className="text-sm">No returns match your current filters</p>
            {(searchQuery || dateRange.startDate || dateRange.endDate || shopFilter) && (
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
                  <th className="text-left p-4 font-medium text-gray-700">Items Returned</th>
                  <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left p-4 font-medium text-gray-700">Date</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{returnItem.reference}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Return ID: {returnItem.id}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{returnItem.shop?.name}</p>
                        <p className="text-sm text-gray-500">{returnItem.shop?.shop_keeper}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-sm">{returnItem.sale?.reference}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(returnItem.sale?.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Customer: {returnItem.sale?.customer || "Walk-in"}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        {returnItem.returnItems?.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">
                                {item.product?.name || item.material?.name}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                item.product?.name 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {item.product?.name ? 'Product' : 'Material'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                {item.quantity} × ${(item.unitPrice || 0).toFixed(2)}
                              </span>
                              <p className="text-gray-600 mt-1">${(item.totalPrice || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                        {returnItem.returnItems?.length > 3 && (
                          <div className="text-xs text-gray-500 pt-1 border-t">
                            +{returnItem.returnItems.length - 3} more items
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-lg font-bold text-red-600">
                        -${(returnItem.totalAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {returnItem.returnItems?.length || 0} item(s)
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-sm">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(returnItem.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openReturnModal(returnItem)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 inline-flex items-center"
                      >
                        <Eye /> View Details
                      </button>
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
                {filteredReturns.reduce((sum, r) => sum + (r.returnItems?.length || 0), 0)}
              </div>
              <div>
                <span className="font-medium">Total Refund Amount:</span>{" "}
                <span className="font-bold text-red-600">
                  ${filteredReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="font-medium">Shops:</span>{" "}
                {[...new Set(filteredReturns.map(r => r.shop?.name))].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredReturns.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-gray-600">
              Showing {filteredReturns.length} of {returns.length} returns
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                Previous
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}