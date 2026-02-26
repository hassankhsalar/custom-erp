import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  BarChart3,
  Users,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  User,
  Award,
  Heart,
  ShoppingBag
} from 'lucide-react';

const CustomerReport = () => {
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("most_due");
  const [sortOrder, setSortOrder] = useState("desc");
  const [overview, setOverview] = useState({
    totalCustomers: 0,
    totalItemQty: 0,
    totalPaid: 0,
    totalDue: 0,
    activeCustomers: 0
  });
  const token = localStorage.getItem("token");

  const buildParams = (page = 1, limit = 10, includeExportAll = false) => {
    const params = new URLSearchParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    if (searchTerm.trim()) params.append("search", searchTerm.trim());
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    if (includeExportAll) params.append("exportAll", "true");
    else {
      params.append("page", page);
      params.append("limit", limit);
    }
    return params;
  };

  const fetchRows = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params = buildParams(page, limit);
      const res = await fetch(`${API_ROUTES.REPORT_CUSTOMER_DETAILS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalCount: 0, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (range.startDate) params.append("startDate", range.startDate);
      if (range.endDate) params.append("endDate", range.endDate);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      const res = await fetch(`${API_ROUTES.REPORT_CUSTOMER_OVERVIEW}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOverview({
        totalCustomers: Number(data?.totalCustomers || 0),
        totalItemQty: Number(data?.totalItemQty || 0),
        totalPaid: Number(data?.totalPaid || 0),
        totalDue: Number(data?.totalDue || 0),
        activeCustomers: Number(data?.activeCustomers || 0)
      });
    } catch (error) {
      console.error("Error fetching customer overview:", error);
    }
  };

  useEffect(() => {
    fetchRows(1, pagination.limit);
    fetchOverview();
  }, []);

  const handleExport = async () => {
    try {
      const fetchAllRows = async () => {
        const firstParams = buildParams(1, pagination.limit, true);
        const firstRes = await fetch(`${API_ROUTES.REPORT_CUSTOMER_DETAILS}?${firstParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const firstData = await firstRes.json();
        let allRows = firstData.rows || [];
        const totalCount = Number(firstData?.pagination?.totalCount || 0);
        if (totalCount > 0 && allRows.length < totalCount) {
          const pageSize = 200;
          let currentPage = 1;
          let totalPages = 1;
          allRows = [];
          do {
            const pageParams = buildParams(currentPage, pageSize, false);
            const pageRes = await fetch(`${API_ROUTES.REPORT_CUSTOMER_DETAILS}?${pageParams.toString()}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const pageData = await pageRes.json();
            const batch = pageData.rows || [];
            allRows.push(...batch);
            totalPages = Number(pageData?.pagination?.totalPages || 1);
            currentPage += 1;
          } while (currentPage <= totalPages);
        }
        return allRows;
      };

      const exportRows = await fetchAllRows();
      if (!exportRows.length) return;
      const excelRows = [
        ["Name", "Mobile", "Email", "Items (Qty)", "Item Types", "Total Paid", "Total Due"],
        ...exportRows.map((r) => [
          r.name || "",
          r.mobile || "",
          r.email || "-",
          Number(r.totalItemQty || 0),
          Number(r.itemTypeCount || 0),
          Number(r.totalPaid || 0).toFixed(2),
          Number(r.totalDue || 0).toFixed(2)
        ])
      ];
      downloadExcelFile({
        sheetName: "Customer Report",
        fileName: `customer_report_${new Date().toISOString().split("T")[0]}.xls`,
        rows: excelRows
      });
    } catch (error) {
      console.error("Error exporting customer report:", error);
    }
  };

  const handleRefresh = () => {
    fetchRows(pagination.page, pagination.limit);
    fetchOverview();
  };

  const applyFilters = async () => {
    await fetchRows(1, pagination.limit);
    await fetchOverview();
  };

  const resetFilter = () => {
    setRange({ startDate: "", endDate: "" });
    setSearchTerm("");
    setSortBy("most_due");
    setSortOrder("desc");
    setTimeout(() => {
      fetchRows(1, pagination.limit);
      fetchOverview();
    }, 0);
  };

  // Calculate statistics
  const totalCustomers = Number(overview.totalCustomers || 0);
  const totalItems = Number(overview.totalItemQty || 0);
  const totalPaid = Number(overview.totalPaid || 0);
  const totalDue = Number(overview.totalDue || 0);
  const activeCustomers = Number(overview.activeCustomers || 0);
  const avgSpend = totalCustomers > 0 ? totalPaid / totalCustomers : 0;

  const getCustomerStatus = (totalDue, totalPaid) => {
    if (totalDue === 0) return { 
      text: 'Clear', 
      color: 'bg-gradient-to-r from-emerald-500 to-green-500',
      icon: <CheckCircle size={12} />
    };
    if (totalDue > totalPaid * 0.3) return { 
      text: 'High Due', 
      color: 'bg-gradient-to-r from-red-500 to-rose-500',
      icon: <AlertCircle size={12} />
    };
    return { 
      text: 'Pending', 
      color: 'bg-gradient-to-br from-amber-500 to-orange-500',
      icon: <AlertCircle size={12} />
    };
  };

  const getLoyaltyLevel = (totalItemQty, totalPaid) => {
    if (totalItemQty > 100 || totalPaid > 5000) return { 
      text: 'Premium', 
      color: 'bg-gradient-to-r from-purple-500 to-violet-500',
      icon: <Award size={12} />
    };
    if (totalItemQty > 50 || totalPaid > 1000) return { 
      text: 'Regular', 
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      icon: <Heart size={12} />
    };
    return { 
      text: 'New', 
      color: 'bg-gradient-to-r from-gray-500 to-gray-600',
      icon: <User size={12} />
    };
  };

  const getPerformanceColor = (totalItemQty) => {
    if (totalItemQty > 100) return "bg-gradient-to-br from-purple-50/60 to-violet-50/60";
    if (totalItemQty > 50) return "bg-gradient-to-br from-emerald-50/60 to-green-50/60";
    if (totalItemQty > 10) return "bg-gradient-to-br from-blue-50/60 to-cyan-50/60";
    return "bg-gradient-to-br from-gray-50/60 to-gray-100/60";
  };

  // Pagination controls
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

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchRows(page, pagination.limit);
    }
  };

  const showingStart = pagination.totalCount > 0 ? ((pagination.page - 1) * pagination.limit + 1) : 0;
  const showingEnd = Math.min(pagination.page * pagination.limit, pagination.totalCount || 0);

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <Users className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Customer Report
                </h1>
                <p className="text-gray-600 mt-2">Manage customer relationships and track purchases</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                disabled={!rows.length}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to Excel"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-purple-600">{totalCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">{activeCustomers} active</p>
              </div>
              <div className="p-3 bg-purple-100/80 rounded-xl">
                <Users size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-emerald-600">{totalItems}</p>
                <p className="text-xs text-gray-500 mt-1">Items bought</p>
              </div>
              <div className="p-3 bg-emerald-100/80 rounded-xl">
                <ShoppingBag size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${totalPaid.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Avg: ${avgSpend.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100/80 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-red-600">
                  ${totalDue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Pending amount</p>
              </div>
              <div className="p-3 bg-red-100/80 rounded-xl">
                <AlertCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Filter size={20} className="text-purple-600" />
              Filter Customers
            </h2>
            
            {(range.startDate || range.endDate || searchTerm) && (
              <button
                onClick={resetFilter}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-colors duration-300"
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Start Date
                </div>
              </label>
              <input
                type="date"
                value={range.startDate}
                onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-transparent"
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
                value={range.endDate}
                onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-transparent"
                >
                  <option value="most_due">Most Due</option>
                  <option value="most_paid">Most Paid</option>
                  <option value="most_items">Most Items</option>
                  <option value="most_item_types">Most Item Types</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Filter size={18} />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search customers by name, mobile, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading customer data...</p>
              </div>
            </div>
          ) : rows.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <User size={20} className="text-purple-600" />
                    Customer Details
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Showing {showingStart}-{showingEnd} of {pagination.totalCount || 0} customers
                  </p>
                </div>

                <div className="text-sm bg-white/50 px-3 py-2 rounded-lg border border-white/40">
                  <span className="font-medium text-gray-700">Active Filters:</span>
                  <span className="ml-2 text-gray-600">
                    {range.startDate && `From ${range.startDate}`} 
                    {range.endDate && ` to ${range.endDate}`}
                    {searchTerm && ` | Search: "${searchTerm}"`}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Customer</th>
                      <th className="p-4 text-left font-medium text-gray-700">Contact</th>
                      <th className="p-4 text-left font-medium text-gray-700">Purchase History</th>
                      <th className="p-4 text-left font-medium text-gray-700">Financials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const status = getCustomerStatus(r.totalDue, r.totalPaid);
                      const loyalty = getLoyaltyLevel(r.totalItemQty, r.totalPaid);
                      return (
                        <tr 
                          key={r.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            idx % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                                <User size={16} className="text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{r.name}</p>
                                <p className="text-xs text-gray-500 mt-1">ID: {r.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                <span className="font-medium">{r.mobile}</span>
                              </div>
                              {r.email ? (
                                <div className="flex items-center gap-2">
                                  <Mail size={14} className="text-gray-400" />
                                  <span className="text-sm text-gray-600 truncate max-w-[180px]">{r.email}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No email</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <ShoppingBag size={14} className="text-emerald-500" />
                                <span className="font-bold text-gray-800">{Number(r.totalItemQty || 0)}</span>
                                <span className="text-sm text-gray-600">items</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package size={14} className="text-blue-500" />
                                <span className="font-medium text-gray-700">{Number(r.itemTypeCount || 0)}</span>
                                <span className="text-sm text-gray-600">types</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Paid:</span>
                                <span className="font-bold text-emerald-600">
                                  ${Number(r.totalPaid || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Due:</span>
                                <span className="font-bold text-red-600">
                                  ${Number(r.totalDue || 0).toFixed(2)}
                                </span>
                              </div>
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
                          const newLimit = Number(e.target.value);
                          setPagination(prev => ({ ...prev, limit: newLimit }));
                          fetchRows(1, newLimit);
                        }}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
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
                      Showing <span className="font-semibold">{showingStart}</span> to{" "}
                      <span className="font-semibold">{showingEnd}</span> of{" "}
                      <span className="font-semibold">{pagination.totalCount || 0}</span> customers
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
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
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
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
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
                <Users size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Customers Found</h3>
              <p className="text-gray-600">
                {rows.length === 0 
                  ? "No customer records available for the selected criteria." 
                  : "No customers match your search criteria."}
              </p>
              {(range.startDate || range.endDate || searchTerm) && (
                <button
                  onClick={resetFilter}
                  className="mt-4 px-4 py-2 bg-white/60 text-gray-700 rounded-xl hover:bg-white/80 transition-colors duration-300"
                >
                  Clear filters to see all customers
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerReport;
