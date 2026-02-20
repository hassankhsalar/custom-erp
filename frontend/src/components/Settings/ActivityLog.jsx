import React, { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <div className="max-w-6xl xl:max-w-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Activity Log</h1>
        <button
          onClick={() => fetchLogs(pagination.page, pagination.limit)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          placeholder="Search..."
          className="p-2 rounded-lg border border-gray-300 bg-white/70"
        />
        <input
          type="text"
          value={filters.module}
          onChange={(e) => handleFilterChange("module", e.target.value)}
          placeholder="Module"
          className="p-2 rounded-lg border border-gray-300 bg-white/70"
        />
        <input
          type="text"
          value={filters.action}
          onChange={(e) => handleFilterChange("action", e.target.value)}
          placeholder="Action"
          className="p-2 rounded-lg border border-gray-300 bg-white/70"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="p-2 rounded-lg border border-gray-300 bg-white/70"
        >
          <option value="">All Status</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
        </select>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">From Date Time</label>
          <input
            type="datetime-local"
            value={filters.fromDateTime}
            onChange={(e) => handleFilterChange("fromDateTime", e.target.value)}
            className="p-2 rounded-lg border border-gray-300 bg-white/70"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">To Date Time</label>
          <input
            type="datetime-local"
            value={filters.toDateTime}
            onChange={(e) => handleFilterChange("toDateTime", e.target.value)}
            className="p-2 rounded-lg border border-gray-300 bg-white/70"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading activity logs...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Module</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No activity found.
                  </td>
                </tr>
              )}
              {rows.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {log.user?.name || log.user?.username || "System"}
                  </td>
                  <td className="px-4 py-3">{log.module}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing page {pagination.page} of {pagination.totalPages} | Total {pagination.total} logs
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pagination.limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="p-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
