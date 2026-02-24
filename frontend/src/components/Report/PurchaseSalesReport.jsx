import { useEffect, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Layers,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image as ImageIcon,
  ShoppingCart,
  Tag,
  TrendingUp as ProfitIcon,
  Download,
  AlertCircle,
  Percent,
  Grid3x3,
  Calendar
} from "lucide-react";

const PurchaseSalesReport = () => {
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPurchaseQty: 0,
    totalPurchaseAmount: 0,
    totalSaleQty: 0,
    totalSaleAmount: 0,
    totalProfit: 0
  });
  const token = localStorage.getItem("token");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchRows = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (range.startDate) params.append("startDate", range.startDate);
      if (range.endDate) params.append("endDate", range.endDate);
      params.append("page", page);
      params.append("limit", limit);
      const res = await fetch(`${API_ROUTES.REPORT_PURCHASE_SALES_DETAILS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
      
      // Calculate statistics
      const totals = data.rows?.reduce((acc, r) => ({
        totalPurchaseQty: acc.totalPurchaseQty + Number(r.purchaseQty || 0),
        totalPurchaseAmount: acc.totalPurchaseAmount + Number(r.purchaseAmount || 0),
        totalSaleQty: acc.totalSaleQty + Number(r.saleQty || 0),
        totalSaleAmount: acc.totalSaleAmount + Number(r.saleAmount || 0),
        totalProfit: acc.totalProfit + Number(r.profit || 0)
      }), {
        totalPurchaseQty: 0,
        totalPurchaseAmount: 0,
        totalSaleQty: 0,
        totalSaleAmount: 0,
        totalProfit: 0
      }) || {
        totalPurchaseQty: 0,
        totalPurchaseAmount: 0,
        totalSaleQty: 0,
        totalSaleAmount: 0,
        totalProfit: 0
      };
      
      setStats(totals);
    } catch (error) {
      console.error('Error fetching purchase vs sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(pagination.page, pagination.limit);
  }, []);

  const handleExport = () => {
    alert("Export functionality would be implemented here");
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchRows(page, pagination.limit);
    }
  };

  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchRows(pagination.page + 1, pagination.limit);
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      fetchRows(pagination.page - 1, pagination.limit);
    }
  };

  const getProfitClass = (profit) => {
    if (profit > 0) return "text-emerald-600 bg-emerald-50";
    if (profit < 0) return "text-rose-600 bg-rose-50";
    return "text-gray-600 bg-gray-50";
  };

  const getProfitIcon = (profit) => {
    if (profit > 0) return <TrendingUp size={14} className="text-emerald-500" />;
    if (profit < 0) return <TrendingDown size={14} className="text-rose-500" />;
    return <TrendingUp size={14} className="text-gray-400" />;
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg">
                <BarChart3 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Purchase vs Sales
                </h1>
                <p className="text-gray-600 mt-2">Compare purchase costs against sales revenue</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex space-x-3 items-center">
                <p className="text-sm text-gray-600">Purchase Qty</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalPurchaseQty}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-xl">
                <Package size={18} className="text-blue-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex space-x-3 items-center">
                <p className="text-sm text-gray-600">Sold Qty</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.totalSaleQty}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-xl">
                <ShoppingCart size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-violet-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Purchase Amount</p>
                <p className="text-2xl font-bold text-purple-600">${stats.totalPurchaseAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <DollarSign size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
          
         
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sold Amount</p>
                <p className="text-2xl font-bold text-amber-600">${stats.totalSaleAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingUp size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className={`backdrop-blur-lg border border-white/40 rounded-2xl shadow-xl p-5 ${
            stats.totalProfit > 0 ? "bg-gradient-to-br from-emerald-50/60 to-teal-50/60" :
            stats.totalProfit < 0 ? "bg-gradient-to-br from-rose-50/60 to-red-50/60" :
            "bg-gradient-to-br from-gray-50/60 to-slate-50/60"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className={`text-2xl font-bold ${
                  stats.totalProfit > 0 ? "text-emerald-600" :
                  stats.totalProfit < 0 ? "text-rose-600" :
                  "text-gray-600"
                }`}>
                  ${stats.totalProfit.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${
                stats.totalProfit > 0 ? "bg-emerald-100" :
                stats.totalProfit < 0 ? "bg-rose-100" :
                "bg-gray-100"
              }`}>
                <ProfitIcon size={24} className={
                  stats.totalProfit > 0 ? "text-emerald-600" :
                  stats.totalProfit < 0 ? "text-rose-600" :
                  "text-gray-600"
                } />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filter Date Range</h3>
            </div>
            
            <div className="text-sm text-gray-600">
              Showing {rows.length} products • Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    Start Date
                  </div>
                </label>
                <input
                  type="date"
                  value={range.startDate}
                  onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all duration-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    End Date
                  </div>
                </label>
                <input
                  type="date"
                  value={range.endDate}
                  onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all duration-300"
                />
              </div>
            </div>
            
            <button
              onClick={() => fetchRows(1, pagination.limit)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
            >
              <Filter size={18} />
              Apply Filters
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading purchase vs sales data...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Product</th>
                      <th className="p-4 text-left font-medium text-gray-700">Purchase</th>
                      <th className="p-4 text-left font-medium text-gray-700">Sales</th>
                      <th className="p-4 text-left font-medium text-gray-700">Profit Analysis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const imageUrl = getImageUrl(r.image);
                      const profit = Number(r.profit || 0);
                      const profitMargin = r.saleAmount > 0 ? (profit / r.saleAmount) * 100 : 0;
                      
                      return (
                        <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          idx % 2 === 0 ? 'bg-white/10' : ''
                        }`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={r.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.innerHTML = `
                                        <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                          <ImageIcon size={16} class="text-gray-400" />
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <ImageIcon size={16} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{r.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Tag size={12} className="text-gray-400" />
                                  <p className="text-xs text-gray-500">{r.category || "No category"}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Package size={14} className="text-blue-500" />
                                  <span className="text-sm text-gray-600">Qty:</span>
                                </div>
                                <span className="font-bold text-lg text-blue-600">
                                  {Number(r.purchaseQty || 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DollarSign size={14} className="text-purple-500" />
                                  <span className="text-sm text-gray-600">Amount:</span>
                                </div>
                                <span className="font-bold text-lg text-purple-600">
                                  ${Number(r.purchaseAmount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShoppingCart size={14} className="text-emerald-500" />
                                  <span className="text-sm text-gray-600">Qty:</span>
                                </div>
                                <span className="font-bold text-lg text-emerald-600">
                                  {Number(r.saleQty || 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp size={14} className="text-amber-500" />
                                  <span className="text-sm text-gray-600">Amount:</span>
                                </div>
                                <span className="font-bold text-lg text-amber-600">
                                  ${Number(r.saleAmount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-3">
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${getProfitClass(profit)}`}>
                                <div className="flex items-center gap-2">
                                  {getProfitIcon(profit)}
                                  <span className="text-sm font-medium">Profit:</span>
                                </div>
                                <span className="font-bold text-lg">
                                  ${Math.abs(profit).toFixed(2)}
                                  {profit < 0 && " loss"}
                                </span>
                              </div>
                              {r.saleAmount > 0 && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Percent size={14} className="text-indigo-500" />
                                    <span className="text-xs text-gray-600">Margin:</span>
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    profitMargin > 0 ? "text-emerald-600" :
                                    profitMargin < 0 ? "text-rose-600" :
                                    "text-gray-600"
                                  }`}>
                                    {profitMargin.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                              {profit > 0 && (
                                <div className="text-xs text-emerald-600 flex items-center gap-1">
                                  <TrendingUp size={12} />
                                  Profitable
                                </div>
                              )}
                              {profit < 0 && (
                                <div className="text-xs text-rose-600 flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  Loss
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {rows.length === 0 && !loading && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white/50 rounded-xl">
                              <BarChart3 size={48} className="text-gray-300" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchase vs Sales Data Found</h3>
                              <p className="text-gray-600">Try adjusting your date range</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {rows.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={pagination.limit}
                          onChange={(e) => {
                            fetchRows(1, Number(e.target.value));
                          }}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(pagination.page * pagination.limit, rows.length)}
                        </span>{" "}
                        of <span className="font-semibold">{rows.length}</span> products
                      </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      {/* First page */}
                      <button
                        onClick={() => goToPage(1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Previous page */}
                      <button
                        onClick={prevPage}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                pagination.page === pageNum
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                          <>
                            <span className="mx-1 text-gray-400">...</span>
                            <button
                              onClick={() => goToPage(pagination.totalPages)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                pagination.page === pagination.totalPages
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {pagination.totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next page */}
                      <button
                        onClick={nextPage}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

                      {/* Last page */}
                      <button
                        onClick={() => goToPage(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Last page"
                      >
                        <ChevronsRight size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseSalesReport;