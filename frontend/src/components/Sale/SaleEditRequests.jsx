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
  const [approveLimitsByRequest, setApproveLimitsByRequest] = useState({});

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
      await fetchRows(statusFilter);
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList size={24} />
          Sale Edit Requests
        </h1>
        <button
          onClick={() => fetchRows(statusFilter)}
          className="px-3 py-2 rounded border bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value);
              fetchRows(value);
            }}
            className="px-3 py-2 border rounded bg-white"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Request</th>
              <th className="p-3 text-left">Sale</th>
              <th className="p-3 text-left">Requester</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">#{row.id}</td>
                <td className="p-3">
                  <div className="font-medium">{row.sale?.reference || "-"}</div>
                  <div className="text-xs text-gray-500">{row.sale?.shop?.name || "-"}</div>
                  <div className="text-xs text-gray-500">
                    Limit: {row.sale?.editMaxCount ?? "unlimited"} edits | Time: {row.sale?.editAccessDurationMinutes ?? "unlimited"} min
                  </div>
                </td>
                <td className="p-3">
                  <div>{row.requester?.name || row.requester?.username || `User ${row.requesterUserId}`}</div>
                  <div className="text-xs text-gray-500">{row.requester?.email || "-"}</div>
                </td>
                <td className="p-3 capitalize">{row.status}</td>
                <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  {row.status === "pending" ? (
                    <div className="flex flex-col gap-2">
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
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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