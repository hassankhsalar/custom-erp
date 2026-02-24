import { useEffect, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { 
  BarChart3, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  SortAsc,
  SortDesc
} from "lucide-react";

export default function BestSellingReport() {
  const [rows, setRows] = useState([]);
  const [sortBy, setSortBy] = useState("amount");
  const [order, setOrder] = useState("desc");
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchRows = async (page = 1, limit = 10) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("sortBy", sortBy);
    params.append("order", order);
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    params.append("page", page);
    params.append("limit", limit);
    
    try {
      const res = await fetch(`${API_ROUTES.REPORT_BEST_SELLING_DETAILS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(pagination.page, pagination.limit);
  }, []);

  // Calculate statistics
  const totalAmount = rows.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalProfit = rows.reduce((sum, r) => sum + (r.totalProfit || 0), 0);
  const totalQuantity = rows.reduce((sum, r) => sum + (r.totalQty || 0), 0);
  const topPerforming = rows.length > 0 ? rows[0] : null;

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                <BarChart3 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Sales Performance Report
                </h1>
                <p className="text-gray-600 mt-2">Analyze product performance by sales metrics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => fetchRows(1, pagination.limit)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Filter size={20} />
                )}
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-emerald-600">${totalProfit.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Units Sold</p>
                <p className="text-2xl font-bold text-amber-600">{totalQuantity.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Package size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products Analyzed</p>
                <p className="text-2xl font-bold text-purple-600">{rows.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Layers size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Filter size={20} className="text-indigo-600" />
            Report Filters
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <SortAsc size={14} />
                Sort By
              </label>
              <select 
                className="w-full border border-white/60 bg-white/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 outline-none transition-all backdrop-blur-sm"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="amount">Sold Amount</option>
                <option value="quantity">Quantity</option>
                <option value="profit">Profit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                {order === "desc" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                Order
              </label>
              <select 
                className="w-full border border-white/60 bg-white/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 outline-none transition-all backdrop-blur-sm"
                value={order} 
                onChange={(e) => setOrder(e.target.value)}
              >
                <option value="desc">Best to Worst</option>
                <option value="asc">Worst to Best</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Start Date
              </label>
              <input 
                type="date" 
                value={range.startDate} 
                onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-white/60 bg-white/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 outline-none transition-all backdrop-blur-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={14} />
                End Date
              </label>
              <input 
                type="date" 
                value={range.endDate} 
                onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-white/60 bg-white/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 outline-none transition-all backdrop-blur-sm"
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading sales data...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <BarChart3 size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sales Data Found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Rank</th>
                      <th className="p-4 text-left font-medium text-gray-700">Product</th>
                      <th className="p-4 text-left font-medium text-gray-700">Category</th>
                      <th className="p-4 text-left font-medium text-gray-700">Quantity</th>
                      <th className="p-4 text-left font-medium text-gray-700">Total Amount</th>
                      <th className="p-4 text-left font-medium text-gray-700">Profit</th>
                      <th className="p-4 text-left font-medium text-gray-700">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const imageUrl = getImageUrl(r.image);
                      const profit = Number(r.totalProfit || 0);
                      const performance = profit >= 0 ? "high" : "low";
                      
                      return (
                        <tr 
                          key={idx} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            idx % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center justify-center">
                              <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                                idx === 0 ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' :
                                idx === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                                idx === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {idx + 1}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={r.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23f3f4f6' viewBox='0 0 24 24'%3E%3Cpath d='M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14l-5-5 5-5v10z'/%3E%3C/svg%3E";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <Package size={16} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{r.name}</p>
                                {r.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {r.category ? (
                              <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-xs font-medium rounded-full">
                                {r.category}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Package size={14} className="text-blue-600" />
                              </div>
                              <div>
                                <span className="text-gray-900 text-lg">{Number(r.totalQty || 0).toLocaleString()}</span>
                                <p className="text-xs text-gray-500">units</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-emerald-50 rounded-lg">
                                <DollarSign size={14} className="text-emerald-600" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 text-lg">
                                  ${Number(r.totalAmount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${
                                profit >= 0 ? 'bg-green-50' : 'bg-red-50'
                              }`}>
                                {profit >= 0 ? (
                                  <TrendingUp size={14} className="text-green-600" />
                                ) : (
                                  <TrendingDown size={14} className="text-red-600" />
                                )}
                              </div>
                              <div>
                                <span className={`font-bold text-lg ${
                                  profit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ${Math.abs(profit).toFixed(2)}
                                </span>
                                <p className="text-xs text-gray-500">
                                  {profit >= 0 ? 'Profit' : 'Loss'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${
                              performance === "high" 
                                ? "bg-gradient-to-r from-emerald-500 to-green-500" 
                                : "bg-gradient-to-r from-red-500 to-rose-500"
                            }`}>
                              {performance === "high" ? (
                                <>
                                  <CheckCircle size={12} />
                                  High Performer
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={12} />
                                  Low Performer
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
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
                        className="text-sm border border-white/60 bg-white/50 rounded-xl px-3 py-1.5 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
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
                      onClick={() => fetchRows(1, pagination.limit)}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>

                    {/* Previous page */}
                    <button
                      onClick={() => fetchRows(pagination.page - 1, pagination.limit)}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
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
                            onClick={() => fetchRows(pageNum, pagination.limit)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pagination.page === pageNum
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
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
                            onClick={() => fetchRows(pagination.totalPages, pagination.limit)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pagination.page === pagination.totalPages
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
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
                      onClick={() => fetchRows(pagination.page + 1, pagination.limit)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>

                    {/* Last page */}
                    <button
                      onClick={() => fetchRows(pagination.totalPages, pagination.limit)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legend Section */}
        {rows.length > 0 && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50/60 to-yellow-50/60 rounded-xl">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-800">Top Performer</p>
                  <p className="text-sm text-gray-600">Highest sales/profit</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50/60 to-green-50/60 rounded-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500">
                  <CheckCircle size={12} />
                  High Performer
                </div>
                <div>
                  <p className="font-medium text-gray-800">Positive Profit</p>
                  <p className="text-sm text-gray-600">Making profit</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50/60 to-rose-50/60 rounded-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-500">
                  <AlertTriangle size={12} />
                  Low Performer
                </div>
                <div>
                  <p className="font-medium text-gray-800">Negative Profit</p>
                  <p className="text-sm text-gray-600">Making loss</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}