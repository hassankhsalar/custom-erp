import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { 
  ChartLine, 
  Eye, 
  HandCoins, 
  NotebookText, 
  Package, 
  Printer, 
  ScrollText, 
  Search, 
  SquareKanban, 
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  AlertCircle,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Building2,
  User,
  Clock,
  Tag,
  FileText,
  ShoppingBag,
  ArrowLeftRight,
  CreditCard,
  MapPin,
  Phone,
  Percent
} from "lucide-react";

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
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
    
    if (returnItem.returnItems && returnItem.returnItems.length > 0) {
      setReturnDetails(returnItem);
    } else {
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
    const matchesSearch = 
      returnItem.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.sale?.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.shop?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.returnItems?.some(item => 
        item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesSingleDate = !dateFilter || 
      new Date(returnItem.createdAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();

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

    const matchesShop = !shopFilter || returnItem.shopId === parseInt(shopFilter);

    return matchesSearch && matchesSingleDate && matchesDateRange() && matchesShop;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReturns = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("");
    setShopFilter("");
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ["Reference", "Original Sale", "Shop", "Customer", "Total Amount", "Date", "Items Count", "Products/Materials"];
    
    const csvData = filteredReturns.map(r => [
      r.reference,
      r.sale?.reference || "N/A",
      r.shop?.name || "N/A",
      r.sale?.customer?.name || "Walk-in",
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

  // Pagination handlers
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Get status color based on amount
  const getReturnStatus = (amount) => {
    if (amount > 1000) return { color: 'from-red-500 to-rose-500', text: 'High Value' };
    if (amount > 500) return { color: 'from-amber-500 to-orange-500', text: 'Medium Value' };
    return { color: 'from-emerald-500 to-green-500', text: 'Low Value' };
  };

  // Modal Component
  const ReturnDetailsModal = () => {
    if (!showModal || !selectedReturn) return null;

    const returnData = returnDetails || selectedReturn;
    const items = returnData.returnItems || [];
    const shop = returnData.shop || {};
    const sale = returnData.sale || {};

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
        <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-white/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Return Details</h2>
                  <p className="text-gray-600">{returnData.reference}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Tag size={12} /> Return ID
                </p>
                <p className="font-semibold text-gray-800">#{returnData.id}</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12} /> Date
                </p>
                <p className="font-semibold text-gray-800">
                  {new Date(returnData.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <HandCoins size={12} /> Total Amount
                </p>
                <p className="font-bold text-red-600">${(returnData.totalAmount || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Package size={12} /> Items Count
                </p>
                <p className="font-semibold text-gray-800">{items.length} items</p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading return details...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Shop and Sale Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="backdrop-blur-sm bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 size={20} className="text-blue-600" />
                      Shop Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Store size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Shop</p>
                          <p className="font-medium text-gray-800">{shop.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <User size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Shop Keeper</p>
                          <p className="font-medium text-gray-800">{shop.shop_keeper || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium text-gray-800">{shop.address || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Mobile</p>
                          <p className="font-medium text-gray-800">{shop.mobile || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="backdrop-blur-sm bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-purple-600" />
                      Original Sale
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Tag size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Sale Reference</p>
                          <p className="font-medium text-gray-800">{sale.reference || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Sale Date</p>
                          <p className="font-medium text-gray-800">
                            {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <User size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Customer</p>
                          <p className="font-medium text-gray-800">{sale.customer?.name || 'Walk-in'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CreditCard size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Payment Type</p>
                          <p className="font-medium text-gray-800">{sale.paymentType || 'Cash'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <HandCoins size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Original Total</p>
                          <p className="font-bold text-emerald-600">
                            ${(sale.grandTotal || sale.totalAmount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Returned Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-red-600" />
                    Returned Items ({items.length})
                  </h3>
                  
                  {items.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                      <Package size={48} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No items returned</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-white/60">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-4 text-left font-medium text-gray-700">Item</th>
                            <th className="p-4 text-left font-medium text-gray-700">Type</th>
                            <th className="p-4 text-left font-medium text-gray-700">Quantity</th>
                            <th className="p-4 text-left font-medium text-gray-700">Unit Price</th>
                            <th className="p-4 text-left font-medium text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const isProduct = !!item.product;
                            const itemName = isProduct ? item.product?.name : item.material?.name;
                            const itemBarcode = isProduct ? item.product?.barcode : item.material?.barcode;
                            
                            return (
                              <tr key={index} className="border-t border-white/50 hover:bg-white/30 transition-colors">
                                <td className="p-4">
                                  <div>
                                    <p className="font-medium text-gray-800">{itemName}</p>
                                    <p className="text-xs text-gray-500 mt-1">Barcode: {itemBarcode || "N/A"}</p>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    isProduct 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {isProduct ? 'Product' : 'Material'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="p-4 font-medium text-gray-700">
                                  ${(item.unitPrice || 0).toFixed(2)}
                                </td>
                                <td className="p-4 font-bold text-red-600">
                                  -${(item.totalPrice || 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className=" text-green-600">
                          <tr>
                            <td colSpan="4" className="p-4 text-right font-semibold">
                              Total Refund Amount:
                            </td>
                            <td className="p-4 font-bold text-xl">
                              -${(returnData.totalAmount || 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="backdrop-blur-sm bg-gradient-to-br from-gray-50/60 to-slate-50/60 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <NotebookText size={20} className="text-gray-600" />
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Clock size={16} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Created At</p>
                        <p className="font-medium text-gray-800">
                          {new Date(returnData.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Processed By</p>
                        <p className="font-medium text-gray-800">System (Automated)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-white/50 p-6">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60 flex items-center gap-2"
              >
                <Printer size={18} />
                Print Receipt
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-600 rounded-full animate-spin"></div>
              <p className="text-xl text-gray-600">Loading returns...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Return Details Modal */}
      <ReturnDetailsModal />
      
      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl shadow-lg">
                <ArrowLeftRight className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  All Returns
                </h1>
                <p className="text-gray-600 mt-2">Complete history of all returns from shops</p>
              </div>
            </div>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Download size={20} />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="backdrop-blur-xl bg-red-100/80 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Returns</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalReturns || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ChartLine size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-green-50/60 to-emerald-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Return Amount</p>
                <p className="text-2xl font-bold text-green-600">${(stats.totalReturnAmount || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <HandCoins size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalItems || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shops with Returns</p>
                <p className="text-2xl font-bold text-amber-600">{stats.uniqueShops || 0}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Store size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reference, product, shop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/50 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/50 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/50 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shop</label>
              <div className="relative">
                <Store size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-white/50 bg-white/50 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none transition-all appearance-none"
                >
                  <option value="">All Shops</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500/80 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-300 backdrop-blur-sm"
              >
                <RefreshCw size={18} />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4 px-2">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredReturns.length > 0 ? indexOfFirstItem + 1 : 0}</span> to{" "}
            <span className="font-semibold">{Math.min(indexOfLastItem, filteredReturns.length)}</span> of{" "}
            <span className="font-semibold">{filteredReturns.length}</span> returns
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {filteredReturns.length > 0 && (
            <p className="text-sm font-semibold text-red-600 bg-red-100 px-4 py-2 rounded-full">
              Total: ${filteredReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0).toFixed(2)}
            </p>
          )}
        </div>

        {/* Returns Table */}
        {filteredReturns.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <Package size={64} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No returns found</h3>
              <p className="text-gray-600 mb-6">No returns match your current filters</p>
              {(searchQuery || dateRange.startDate || dateRange.endDate || shopFilter) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg"
                >
                  <RefreshCw size={20} />
                  Clear filters to see all returns
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-red-500/10 to-rose-500/10">
                  <tr>
                    <th className="p-4 text-left font-semibold text-gray-700">Return Details</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Shop</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Original Sale</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Items Returned</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Amount</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Date</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReturns.map((returnItem, index) => {
                    const status = getReturnStatus(returnItem.totalAmount);
                    
                    return (
                      <tr key={returnItem.id} className={`border-t border-white/30 hover:bg-white/40 transition-colors duration-200 ${
                        index % 2 === 0 ? 'bg-white/10' : ''
                      }`}>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-gray-800">{returnItem.reference}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Tag size={12} /> Return ID: {returnItem.id}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-gray-800 flex items-center gap-1">
                              <Store size={14} className="text-gray-400" />
                              {returnItem.shop?.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{returnItem.shop?.shop_keeper}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-800">{returnItem.sale?.reference}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {returnItem.sale?.createdAt ? new Date(returnItem.sale.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Customer: {returnItem.sale?.customer?.name || "Walk-in"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2 max-w-xs">
                            {returnItem.returnItems?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white/50 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.product?.name ? 'bg-blue-500' : 'bg-purple-500'
                                  }`}></span>
                                  <span className="font-medium truncate max-w-[100px]">
                                    {item.product?.name || item.material?.name}
                                  </span>
                                </div>
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  {item.quantity} × ${(item.unitPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {returnItem.returnItems?.length > 2 && (
                              <div className="text-xs text-gray-500 pt-1 border-t border-dashed border-gray-300">
                                +{returnItem.returnItems.length - 2} more items
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-lg font-bold text-red-600">
                              -${(returnItem.totalAmount || 0).toFixed(2)}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${status.color} text-white mt-1`}>
                              <Percent size={10} />
                              {status.text}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-800">
                            {new Date(returnItem.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(returnItem.createdAt).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => openReturnModal(returnItem)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredReturns.length > 0 && (
              <div className="backdrop-blur-lg bg-white/30 border-t border-white/40 p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="font-semibold">{Math.min(indexOfLastItem, filteredReturns.length)}</span>{" "}
                      of <span className="font-semibold">{filteredReturns.length}</span> returns
                    </div>
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>

                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="mx-1 text-gray-400">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>

                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Card */}
        {filteredReturns.length > 0 && (
          <div className="mt-6 backdrop-blur-xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                  <Package size={16} className="text-red-500" />
                  Total Returns
                </p>
                <p className="text-2xl font-bold text-gray-800">{filteredReturns.length}</p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                  <ShoppingBag size={16} className="text-purple-500" />
                  Total Items Returned
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredReturns.reduce((sum, r) => sum + (r.returnItems?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                  <HandCoins size={16} className="text-red-500" />
                  Total Refund Amount
                </p>
                <p className="text-2xl font-bold text-red-600">
                  ${filteredReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                  <Store size={16} className="text-amber-500" />
                  Shops
                </p>
                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                  {[...new Set(filteredReturns.map(r => r.shop?.name))].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}