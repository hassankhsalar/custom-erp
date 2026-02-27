import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Factory,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Search,
  X
} from 'lucide-react';

const ProductionReport = () => {
  const [factories, setFactories] = useState([]);
  const [factoryId, setFactoryId] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [summary, setSummary] = useState({ count: 0, byStatus: {} });
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const token = localStorage.getItem("token");

  const formatDateTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatHoursToTime = (hoursValue) => {
    const totalMinutes = Math.max(0, Math.round(Number(hoursValue || 0) * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const getFactoryName = () => {
    const factory = factories.find((f) => String(f.id) === String(factoryId));
    return factory?.name || "Unknown Factory";
  };

  const buildProductParams = (page, limit) => {
    const params = new URLSearchParams();
    params.append("factoryId", factoryId);
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    return params;
  };

  const fetchFactories = async () => {
    try {
      const res = await fetch(API_ROUTES.FACTORIES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFactories(activeOnly(Array.isArray(data) ? data : data?.factories || []));
    } catch (error) {
      console.error("Error fetching factories:", error);
    }
  };

  const fetchSummary = async () => {
    if (!factoryId) return;
    try {
      const params = new URLSearchParams();
      params.append("factoryId", factoryId);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      const res = await fetch(`${API_ROUTES.REPORT_PRODUCTION_SUMMARY}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSummary({ count: data.count || 0, byStatus: data.byStatus || {} });
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchProducts = async (page = 1, limit = 10) => {
    if (!factoryId) return;
    setLoading(true);
    try {
      const params = buildProductParams(page, limit);
      const res = await fetch(`${API_ROUTES.REPORT_PRODUCTION_PRODUCTS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const nextRows = activeOnly(data.rows || []);
      setProducts(nextRows);
      setFilteredProducts(nextRows);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForExport = async () => {
    if (!factoryId) return [];
    const limit = 500;
    let page = 1;
    let totalPages = 1;
    const all = [];

    while (page <= totalPages) {
      const params = buildProductParams(page, limit);
      const res = await fetch(`${API_ROUTES.REPORT_PRODUCTION_PRODUCTS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const batch = activeOnly(data.rows || []);
      all.push(...batch);
      totalPages = Number(data.pagination?.totalPages || 1);
      page += 1;
      if (batch.length === 0) break;
    }

    return all;
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    if (!factoryId) return;
    fetchSummary();
    fetchProducts(1, pagination.limit);
  }, [factoryId]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productId?.toString().includes(searchTerm)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const applyFilter = () => {
    if (!factoryId) return;
    fetchSummary();
    fetchProducts(1, pagination.limit);
  };

  const resetFilter = () => {
    setFactoryId("");
    setDateRange({ startDate: "", endDate: "" });
    setSearchTerm("");
    setSummary({ count: 0, byStatus: {} });
    setProducts([]);
    setFilteredProducts([]);
  };

  const handleExport = async () => {
    const exportRows = await fetchAllProductsForExport();
    if (!exportRows.length) return;

    const factoryName = getFactoryName();
    const rangeLabel = dateRange.startDate || dateRange.endDate
      ? `${dateRange.startDate || "Start"} to ${dateRange.endDate || "End"}`
      : "All Dates";
    const rows = [
      ["Factory", factoryName],
      ["Date Range", rangeLabel],
      ["Exported At", formatDateTime(new Date())],
      [],
      ["Factory", "Product", "Avg Cost", "Current Stock", "Processing Stock", "Damaged (Scrap)", "Avg Time (HH:MM)"],
      ...exportRows.map((p) => [
        factoryName,
        p.name,
        Number(p.avgCost || 0),
        Number(p.currentStock || 0),
        Number(p.processingStock || 0),
        Number(p.currentScrap || 0),
        formatHoursToTime(p.avgHours)
      ])
    ];

    downloadExcelFile({
      sheetName: "Production Report",
      fileName: `production_report_${factoryName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`,
      rows
    });
  };

  const handleRefresh = () => {
    if (!factoryId) return;
    fetchSummary();
    fetchProducts(pagination.page, pagination.limit);
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: "bg-gradient-to-r from-emerald-500 to-green-500",
      processing: "bg-gradient-to-r from-blue-500 to-cyan-500",
      pending: "bg-gradient-to-r from-amber-500 to-orange-500",
      cancelled: "bg-gradient-to-r from-red-500 to-rose-500",
      damaged: "bg-gradient-to-r from-red-500 to-rose-500"
    };
    return colors[status] || "bg-gradient-to-r from-gray-500 to-gray-600";
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: <CheckCircle size={14} />,
      processing: <Clock size={14} />,
      pending: <AlertTriangle size={14} />,
      cancelled: <X size={14} />,
      damaged: <AlertTriangle size={14} />
    };
    return icons[status] || <Package size={14} />;
  };

  // Pagination controls
  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchProducts(pagination.page + 1, pagination.limit);
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      fetchProducts(pagination.page - 1, pagination.limit);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchProducts(page, pagination.limit);
    }
  };

  const showingStart = (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min(pagination.page * pagination.limit, filteredProducts.length);

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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Factory className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Production Report
                </h1>
                <p className="text-gray-600 mt-2">Monitor production efficiency and inventory</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={!factoryId || loading}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                disabled={!products.length}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to Excel"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Filter size={20} className="text-blue-600" />
              Filter Report
            </h2>
            
            {factoryId && (
              <button
                onClick={resetFilter}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-colors duration-300"
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Factory size={16} />
                  Factory
                </div>
              </label>
              <select
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
              >
                <option value="">Select Factory</option>
                {factories.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Start Date
                </div>
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  End Date
                </div>
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={applyFilter}
                disabled={!factoryId}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Filter size={18} />
                Apply Filter
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {factoryId && products.length > 0 && (
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {!factoryId ? (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl inline-block mb-6">
                <Factory size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Select a Factory</h3>
              <p className="text-gray-600 mb-6">
                Choose a factory from the dropdown above to view production reports and statistics.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Productions</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.count || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-100/80 rounded-xl">
                    <BarChart3 size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>

              {Object.entries(summary.byStatus).map(([status, count]) => (
                <div key={status} className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 capitalize">{status.replace("_", " ")}</p>
                      <p className="text-2xl font-bold text-emerald-600">{count}</p>
                    </div>
                    <div className={`p-3 ${getStatusColor(status).replace('gradient', 'bg').split(' ')[0]} bg-opacity-20 rounded-xl`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                </div>
              ))}

              {Object.keys(summary.byStatus).length === 0 && (
                <div className="col-span-4 backdrop-blur-lg bg-gradient-to-br from-gray-50/60 to-gray-100/60 border border-white/40 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">No production records found</p>
                      <p className="text-lg font-semibold text-gray-700">Adjust your filters or try a different factory</p>
                    </div>
                    <div className="p-3 bg-gray-100/80 rounded-xl">
                      <AlertTriangle size={24} className="text-gray-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Production Products
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Showing {showingStart}-{showingEnd} of {filteredProducts.length} products
                  </p>
                </div>

                {products.length > 0 && (
                  <div className="text-sm bg-white/50 px-3 py-2 rounded-lg border border-white/40">
                    <span className="font-medium text-gray-700">Active Filters:</span>
                    <span className="ml-2 text-gray-600">
                      {dateRange.startDate && `From ${dateRange.startDate}`} 
                      {dateRange.endDate && ` to ${dateRange.endDate}`}
                    </span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading production data...</p>
                  </div>
                </div>
              ) : filteredProducts.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Product</th>
                          <th className="p-4 text-left font-medium text-gray-700">Avg Cost</th>
                          <th className="p-4 text-left font-medium text-gray-700">Current Stock</th>
                          <th className="p-4 text-left font-medium text-gray-700">Processing</th>
                          <th className="p-4 text-left font-medium text-gray-700">Damaged</th>
                          <th className="p-4 text-left font-medium text-gray-700">Avg Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p, index) => (
                          <tr 
                            key={p.productId} 
                            className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white/10' : ''
                            }`}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                  <Package size={16} className="text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{p.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">ID: {p.productId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-red-500" />
                                <span className="font-bold text-red-600">
                                  {Number(p.avgCost || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                                <CheckCircle size={12} />
                                {Number(p.currentStock || 0)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                                <Clock size={12} />
                                {Number(p.processingStock || 0)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                                <AlertTriangle size={12} />
                                {Number(p.currentScrap || 0)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-purple-500" />
                                <span className="font-bold text-purple-700">
                                  {Number(p.avgHours || 0).toFixed(1)} hrs
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                              const newLimit = Number(e.target.value);
                              setPagination(prev => ({ ...prev, limit: newLimit }));
                              fetchProducts(1, newLimit);
                            }}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                          Page <span className="font-semibold">{pagination.page}</span> of{" "}
                          <span className="font-semibold">{pagination.totalPages || 1}</span>
                        </div>
                      </div>

                      {/* Pagination buttons */}
                      <div className="flex items-center gap-2">
                        {/* First page */}
                        <button
                          onClick={() => goToPage(1)}
                          disabled={pagination.page <= 1}
                          className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                          title="First page"
                        >
                          <ChevronsLeft size={16} className="text-gray-600" />
                        </button>

                        {/* Previous page */}
                        <button
                          onClick={prevPage}
                          disabled={pagination.page <= 1}
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
                                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                          disabled={pagination.page >= pagination.totalPages}
                          className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                          title="Next page"
                        >
                          <ChevronRight size={16} className="text-gray-600" />
                        </button>

                        {/* Last page */}
                        <button
                          onClick={() => goToPage(pagination.totalPages)}
                          disabled={pagination.page >= pagination.totalPages}
                          className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                          title="Last page"
                        >
                          <ChevronsRight size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-white/50 rounded-2xl inline-block mb-4">
                    <Package size={48} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Products Found</h3>
                  <p className="text-gray-600">
                    {products.length === 0 
                      ? "No production records found for the selected factory and date range." 
                      : "No products match your search criteria."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionReport;
