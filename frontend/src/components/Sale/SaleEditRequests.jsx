import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { CheckCircle2, XCircle, RefreshCcw, ClipboardList } from "lucide-react";

export default function SaleEditRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [approveMaxCount, setApproveMaxCount] = useState("");
  const [approveDurationMinutes, setApproveDurationMinutes] = useState("");

  const fetchRows = async (status = statusFilter) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams({ status }).toString();
      const res = await fetch(`${API_ROUTES.SHOP_SALES_EDIT_REQUESTS}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch requests");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      alert(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows("pending");
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
      await fetchRows(statusFilter);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
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
          <input
            type="number"
            min="1"
            step="1"
            value={approveMaxCount}
            onChange={(e) => setApproveMaxCount(e.target.value)}
            placeholder="Approve with count (e.g. 2)"
            className="px-3 py-2 border rounded bg-white text-sm"
          />
          <input
            type="number"
            min="1"
            step="1"
            value={approveDurationMinutes}
            onChange={(e) => setApproveDurationMinutes(e.target.value)}
            placeholder="Approve with minutes (e.g. 5)"
            className="px-3 py-2 border rounded bg-white text-sm"
          />
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
    </div>
  );
}
