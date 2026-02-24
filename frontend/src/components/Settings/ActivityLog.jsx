import React, { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  ChevronLeft, 
  ChevronRight,
  History,
  Filter,
  Search,
  X,
  RefreshCw,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  ChevronsLeft,
  ChevronsRight,
  Download
} from "lucide-react";

const ActivityLog = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    module: "",
    action: "",
    status: "",
    fromDateTime: "",
    toDateTime: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters.search) params.set("search", filters.search);
      if (filters.module) params.set("module", filters.module);
      if (filters.action) params.set("action", filters.action);
      if (filters.status) params.set("status", filters.status);
      if (filters.fromDateTime) params.set("fromDateTime", new Date(filters.fromDateTime).toISOString());
      if (filters.toDateTime) params.set("toDateTime", new Date(filters.toDateTime).toISOString());

      const res = await fetch(`${API_ROUTES.ACTIVITY_LOGS}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page, limit, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pagination.limit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchLogs(1, pagination.limit);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      module: "",
      action: "",
      status: "",
      fromDateTime: "",
      toDateTime: "",
    });
    setTimeout(() => fetchLogs(1, pagination.limit), 0);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    fetchLogs(nextPage, pagination.limit);
  };

  const handleLimitChange = (nextLimit) => {
    fetchLogs(1, parseInt(nextLimit, 10));
  };

  const getStatusBadge = (status) => {
    if (status === "success") {
      return {
        color: "bg-gradient-to-r from-emerald-500 to-green-500",
        icon: <CheckCircle size={14} className="text-white" />,
        text: "Success"
      };
    }
    return {
      color: "bg-gradient-to-r from-red-500 to-rose-500",
      icon: <AlertCircle size={14} className="text-white" />,
      text: "Failed"
    };
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

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
                <History className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Activity Log
                </h1>
                <p className="text-gray-600 mt-2">Track and monitor system activities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-white/80 text-gray-700 font-medium rounded-xl transition-all duration-300 border border-white/60"
              >
                <Filter size={18} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                onClick={() => fetchLogs(pagination.page, pagination.limit)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-blue-600">{pagination.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <History size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {rows.length > 0 
                    ? Math.round((rows.filter(r => r.status === 'success').length / rows.length) * 100) 
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pages</p>
                <p className="text-2xl font-bold text-purple-600">{pagination.totalPages}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Layers size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Filter size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Filter Activities</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search logs..."
                  className="w-full p-2.5 pl-9 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              
              <input
                type="text"
                value={filters.module}
                onChange={(e) => handleFilterChange("module", e.target.value)}
                placeholder="Filter by module"
                className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              
              <input
                type="text"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                placeholder="Filter by action"
                className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>

              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  From Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filters.fromDateTime}
                  onChange={(e) => handleFilterChange("fromDateTime", e.target.value)}
                  className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  To Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filters.toDateTime}
                  onChange={(e) => handleFilterChange("toDateTime", e.target.value)}
                  className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="p-2.5 bg-white/60 hover:bg-white/80 text-gray-700 rounded-xl transition-all duration-300 border border-white/60"
                  title="Clear filters"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading activity logs...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="backdrop-blur-sm bg-red-50/80 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Error Loading Logs</p>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => fetchLogs(pagination.page, pagination.limit)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto rounded-xl border border-white/60">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-4 text-left font-medium text-gray-700">Timestamp</th>
                    <th className="p-4 text-left font-medium text-gray-700">User</th>
                    <th className="p-4 text-left font-medium text-gray-700">Module</th>
                    <th className="p-4 text-left font-medium text-gray-700">Action</th>
                    <th className="p-4 text-left font-medium text-gray-700">Status</th>
                    <th className="p-4 text-left font-medium text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                            <History size={48} className="text-gray-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Activity Found</h3>
                          <p className="text-gray-600">No logs match your current filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {rows.map((log, index) => {
                    const status = getStatusBadge(log.status);
                    const formattedTime = formatDateTime(log.createdAt);
                    
                    return (
                      <tr 
                        key={log.id} 
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-gray-700">
                              <Calendar size={12} className="text-gray-400" />
                              <span className="text-xs">{formattedTime.date}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={12} className="text-gray-400" />
                              <span className="text-xs font-medium">{formattedTime.time}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <User size={12} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-700">
                              {log.user?.name || log.user?.username || "System"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-gray-700">{log.action}</span>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${status.color}`}>
                            {status.icon}
                            {status.text}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-600 max-w-xs truncate" title={log.description}>
                            {log.description || "-"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !error && rows.length > 0 && (
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600">per page</span>
                  </div>

                  <div className="text-sm text-gray-700">
                    Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                    <span className="font-semibold">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of <span className="font-semibold">{pagination.total}</span> logs
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                    title="First page"
                  >
                    <ChevronsLeft size={16} className="text-gray-600" />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>

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

                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                    title="Next page"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>

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
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ActivityLog;