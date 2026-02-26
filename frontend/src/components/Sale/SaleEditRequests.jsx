import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ClipboardList,
  Search,
  Clock,
  User,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileEdit,
  Store,
} from "lucide-react";

const DEFAULT_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };

export default function SaleEditRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [approveLimitsByRequest, setApproveLimitsByRequest] = useState({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("pending");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  const fetchRows = async (page = 1, status = appliedStatus, search = appliedSearch) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams({
        status,
        page: String(page),
        limit: String(pagination.limit || 10),
      });
      if (search?.trim()) query.set("search", search.trim());

      const res = await fetch(`${API_ROUTES.SHOP_SALES_EDIT_REQUESTS}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch requests");

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setPagination({
        page: Number(data?.pagination?.page || page || 1),
        limit: Number(data?.pagination?.limit || pagination.limit || 10),
        total: Number(data?.pagination?.total || 0),
        totalPages: Math.max(1, Number(data?.pagination?.totalPages || 1)),
      });
    } catch (err) {
      alert(err.message || "Failed to fetch requests");
      setRows([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, "pending", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const token = localStorage.getItem("token");
      const rowLimits = approveLimitsByRequest[requestId] || {};
      const payload = {};
      if (String(rowLimits.maxEditCount ?? "").trim() !== "") {
        payload.maxEditCount = Number(rowLimits.maxEditCount);
      }
      if (String(rowLimits.accessDurationMinutes ?? "").trim() !== "") {
        payload.accessDurationMinutes = Number(rowLimits.accessDurationMinutes);
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

      setApproveLimitsByRequest((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      await fetchRows(pagination.page, appliedStatus, appliedSearch);
    } catch (err) {
      alert(err.message || "Failed to approve request");
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
      await fetchRows(pagination.page, appliedStatus, appliedSearch);
    } catch (err) {
      alert(err.message || "Failed to reject request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const applyFilters = () => {
    setAppliedStatus(statusFilter);
    setAppliedSearch(searchTerm);
    fetchRows(1, statusFilter, searchTerm);
  };

  const clearFilters = () => {
    setStatusFilter("pending");
    setSearchTerm("");
    setAppliedStatus("pending");
    setAppliedSearch("");
    fetchRows(1, "pending", "");
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchRows(page, appliedStatus, appliedSearch);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          color: "bg-gradient-to-r from-emerald-500 to-green-500",
          icon: <CheckCircle size={14} className="text-white" />,
          text: "Approved",
        };
      case "rejected":
        return {
          color: "bg-gradient-to-r from-red-500 to-rose-500",
          icon: <XCircle size={14} className="text-white" />,
          text: "Rejected",
        };
      default:
        return {
          color: "bg-gradient-to-r from-amber-500 to-orange-500",
          icon: <Clock size={14} className="text-white" />,
          text: "Pending",
        };
    }
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const rejectedCount = rows.filter((r) => r.status === "rejected").length;

  if (loading && pagination.page === 1 && rows.length === 0) {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sale edit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                <FileEdit className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Sale Edit Requests
                </h1>
                <p className="text-gray-600 mt-2">Review and process edit-access requests for sales</p>
              </div>
            </div>
            <button
              onClick={() => fetchRows(pagination.page, appliedStatus, appliedSearch)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
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
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by sale ref, requester name, email"
                className="w-full pl-9 pr-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-white/70 border border-gray-200 text-gray-700 rounded-lg hover:bg-white transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/60">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700">Request</th>
                  <th className="p-3 text-left font-medium text-gray-700">Sale</th>
                  <th className="p-3 text-left font-medium text-gray-700">Requester</th>
                  <th className="p-3 text-left font-medium text-gray-700">Status</th>
                  <th className="p-3 text-left font-medium text-gray-700">Created</th>
                  <th className="p-3 text-left font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const statusCfg = getStatusBadge(row.status);
                  return (
                    <tr key={row.id} className={`border-t border-white/50 ${idx % 2 === 0 ? "bg-white/10" : ""}`}>
                      <td className="p-3 font-semibold text-gray-800">#{row.id}</td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{row.sale?.reference || "-"}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Store size={12} />
                          {row.sale?.shop?.name || "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800 flex items-center gap-1">
                          <User size={13} />
                          {row.requester?.name || row.requester?.username || `User ${row.requesterUserId}`}
                        </div>
                        <div className="text-xs text-gray-500">{row.requester?.email || "-"}</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                          {statusCfg.icon}
                          <span className="text-white">{statusCfg.text}</span>
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-gray-500" />
                          {new Date(row.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        {row.status === "pending" ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={approveLimitsByRequest[row.id]?.maxEditCount ?? ""}
                                onChange={(e) =>
                                  setApproveLimitsByRequest((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...(prev[row.id] || {}),
                                      maxEditCount: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Count"
                                className="w-20 px-2 py-1 text-xs border rounded bg-white"
                              />
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={approveLimitsByRequest[row.id]?.accessDurationMinutes ?? ""}
                                onChange={(e) =>
                                  setApproveLimitsByRequest((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...(prev[row.id] || {}),
                                      accessDurationMinutes: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Minutes"
                                className="w-24 px-2 py-1 text-xs border rounded bg-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(row.id)}
                                disabled={actionLoadingId === row.id}
                                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(row.id)}
                                disabled={actionLoadingId === row.id}
                                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-semibold">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-semibold">{pagination.total}</span> requests
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => goToPage(1)} disabled={pagination.page === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
                  <ChevronsLeft size={16} className="text-gray-600" />
                </button>
                <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) pageNum = i + 1;
                    else if (pagination.page <= 3) pageNum = i + 1;
                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                    else pageNum = pagination.page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium ${pagination.page === pageNum ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
                <button onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
                  <ChevronsRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
