import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ClipboardList,
  Filter,
  Search,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShoppingBag,
  FileEdit
} from "lucide-react";

export default function SaleEditRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [approveMaxCount, setApproveMaxCount] = useState("");
  const [approveDurationMinutes, setApproveDurationMinutes] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const fetchRows = async (page = pagination.page, status = statusFilter, search = searchTerm) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams({ 
        status,
        page: String(page),
        limit: String(pagination.limit)
      });
      if (search) query.set("search", search);
      
      const res = await fetch(`${API_ROUTES.SHOP_SALES_EDIT_REQUESTS}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch requests");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setPagination(data.pagination || { page, limit: pagination.limit, total: 0, totalPages: 1 });
    } catch (err) {
      alert(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, "pending", "");
  }, []);

  const handleApprove = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const token = localStorage.getItem("token");
      const payload = {};
      if (String(approveMaxCount).trim() !== "") {
        payload.maxEditCount = Number(approveMaxCount);
      }
      if (String(approveDurationMinutes).trim() !== "") {
        payload.accessDurationMinutes = Number(approveDurationMinutes);
      }
      const res = await fetch(API_ROUTES.SHOP_SALES_EDIT_REQUEST_APPROVE(requestId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request");
      await fetchRows(pagination.page, statusFilter, searchTerm);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.SHOP_SALES_EDIT_REQUEST_REJECT(requestId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request");
      await fetchRows(pagination.page, statusFilter, searchTerm);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const applyFilters = () => {
    fetchRows(1, statusFilter, searchTerm);
  };

  const clearFilters = () => {
    setStatusFilter("pending");
    setSearchTerm("");
    setApproveMaxCount("");
    setApproveDurationMinutes("");
    fetchRows(1, "pending", "");
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchRows(page, statusFilter, searchTerm);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          color: "bg-gradient-to-r from-emerald-500 to-green-500",
          icon: <CheckCircle size={14} className="text-white" />,
          text: "Approved"
        };
      case "rejected":
        return {
          color: "bg-gradient-to-r from-red-500 to-rose-500",
          icon: <XCircle size={14} className="text-white" />,
          text: "Rejected"
        };
      default:
        return {
          color: "bg-gradient-to-r from-amber-500 to-orange-500",
          icon: <Clock size={14} className="text-white" />,
          text: "Pending"
        };
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
                <FileEdit className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Sale Edit Requests
                </h1>
                <p className="text-gray-600 mt-2">Manage and review sale edit permission requests</p>
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
                onClick={() => fetchRows(pagination.page, statusFilter, searchTerm)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-white/80 text-gray-700 font-medium rounded-xl transition-all duration-300 border border-white/60"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">{pagination.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ClipboardList size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {rows.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {rows.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {rows.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle size={24} className="text-red-600" />
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
              <h2 className="text-lg font-semibold text-gray-800">Filter Requests</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reference or requester..."
                  className="w-full p-2.5 pl-9 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Status</option>
              </select>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={approveMaxCount}
                  onChange={(e) => setApproveMaxCount(e.target.value)}
                  placeholder="Max edit count"
                  className="w-full p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={approveDurationMinutes}
                  onChange={(e) => setApproveDurationMinutes(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="w-full p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-end gap-2 md:col-span-4">
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
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading requests...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Request ID</th>
                      <th className="p-4 text-left font-medium text-gray-700">Sale Details</th>
                      <th className="p-4 text-left font-medium text-gray-700">Requester</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Created</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                              <ClipboardList size={48} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Requests Found</h3>
                            <p className="text-gray-600">No sale edit requests match your criteria</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {rows.map((row, index) => {
                      const status = getStatusBadge(row.status);
                      const created = formatDateTime(row.createdAt);
                      
                      return (
                        <tr 
                          key={row.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white font-semibold text-xs">#{row.id}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <ShoppingBag size={14} className="text-gray-400" />
                                <span className="font-medium text-gray-800">
                                  {row.sale?.reference || "N/A"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {row.sale?.shop?.name || "No shop"}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                  Edits: {row.sale?.editMaxCount ?? "∞"}
                                </span>
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                  Time: {row.sale?.editAccessDurationMinutes ?? "∞"} min
                                </span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <User size={14} className="text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">
                                  {row.requester?.name || row.requester?.username || `User ${row.requesterUserId}`}
                                </div>
                                {row.requester?.email && (
                                  <div className="text-xs text-gray-500">{row.requester.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${status.color}`}>
                              {status.icon}
                              {status.text}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar size={12} className="text-gray-400" />
                                <span className="text-xs">{created.date}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock size={12} className="text-gray-400" />
                                <span className="text-xs font-medium">{created.time}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            {row.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(row.id)}
                                  disabled={actionLoadingId === row.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-medium rounded-lg hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                  {actionLoadingId === row.id ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    <CheckCircle2 size={14} />
                                  )}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(row.id)}
                                  disabled={actionLoadingId === row.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-medium rounded-lg hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                >
                                  {actionLoadingId === row.id ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    <XCircle size={14} />
                                  )}
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No actions available</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {rows.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border-t border-white/40 rounded-b-2xl p-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={pagination.limit}
                          onChange={(e) => {
                            const newLimit = Number(e.target.value);
                            setPagination(prev => ({ ...prev, limit: newLimit }));
                            fetchRows(1, statusFilter, searchTerm);
                          }}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{" "}
                        of <span className="font-semibold">{pagination.total}</span> requests
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
            </>
          )}
        </div>

        {/* Approval Settings Info */}
        {statusFilter === "pending" && rows.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50/30 border border-blue-200 rounded-xl">
            <p className="text-sm text-gray-600 flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                When approving requests, you can specify a maximum edit count and access duration. 
                Leave fields empty to use the sale's default settings.
              </span>
            </p>
          </div>
        )}
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
}