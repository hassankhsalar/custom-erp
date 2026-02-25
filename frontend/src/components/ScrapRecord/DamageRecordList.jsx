import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Trash2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { API_ROUTES } from "../../config";
import { useAuth } from "../../App";

const defaultPageSize = 20;

export default function DamageRecordList() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState("filter"); // filter | table
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [overview, setOverview] = useState({ totalRecords: 0, totalLoss: 0, averageLoss: 0 });
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [sourceOptions, setSourceOptions] = useState([]);

  const [filters, setFilters] = useState({
    fromType: "",
    fromId: "",
    reason: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const buildQuery = (currentPage = page, currentLimit = pageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(currentLimit));
    params.set("sortBy", appliedFilters.sortBy);
    params.set("sortDir", appliedFilters.sortDir);
    if (appliedFilters.fromType) params.set("fromType", appliedFilters.fromType);
    if (appliedFilters.fromId) params.set("fromId", appliedFilters.fromId);
    if (appliedFilters.reason.trim()) params.set("reason", appliedFilters.reason.trim());
    if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
    return params.toString();
  };

  const buildOverviewQuery = () => {
    const params = new URLSearchParams();
    if (appliedFilters.fromType) params.set("fromType", appliedFilters.fromType);
    if (appliedFilters.fromId) params.set("fromId", appliedFilters.fromId);
    if (appliedFilters.reason.trim()) params.set("reason", appliedFilters.reason.trim());
    if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
    return params.toString();
  };

  const loadRecords = async ({ nextPage = page, nextPageSize = pageSize, mode = "table" } = {}) => {
    setLoading(true);
    setLoadMode(mode);
    setMessage("");
    try {
      const res = await fetch(`${API_ROUTES.DAMAGE_RECORDS}?${buildQuery(nextPage, nextPageSize)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load damage records");
      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPage(Number(data?.currentPage || nextPage));
      setTotalPages(Math.max(1, Number(data?.totalPages || 1)));
      setTotalItems(Number(data?.totalItems || 0));
    } catch (error) {
      setMessage(error.message || "Failed to load damage records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const query = buildOverviewQuery();
      const res = await fetch(`${API_ROUTES.DAMAGE_RECORDS_OVERVIEW}${query ? `?${query}` : ""}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load overview");
      setOverview({
        totalRecords: Number(data?.totalRecords || 0),
        totalLoss: Number(data?.totalLoss || 0),
        averageLoss: Number(data?.averageLoss || 0),
      });
    } catch {
      setOverview({ totalRecords: 0, totalLoss: 0, averageLoss: 0 });
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadRecords({ nextPage: 1, nextPageSize: pageSize, mode: "filter" });
    loadOverview();
  }, [token, appliedFilters]);

  useEffect(() => {
    const fetchSourceOptions = async () => {
      if (!token || !filters.fromType) {
        setSourceOptions([]);
        return;
      }
      try {
        const route =
          filters.fromType === "store"
            ? API_ROUTES.STORES
            : filters.fromType === "shop"
              ? API_ROUTES.SHOPS
              : API_ROUTES.FACTORIES;
        const res = await fetch(route, { headers });
        const data = await res.json();
        setSourceOptions(Array.isArray(data) ? data : []);
      } catch {
        setSourceOptions([]);
      }
    };
    fetchSourceOptions();
  }, [filters.fromType, token, headers]);

  useEffect(() => {
    if (!token) return;
    loadRecords({ nextPage: page, nextPageSize: pageSize, mode: "table" });
  }, [page, pageSize]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const reset = {
      fromType: "",
      fromId: "",
      reason: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "createdAt",
      sortDir: "desc",
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this damage record?")) return;
    setMessage("");
    try {
      const res = await fetch(API_ROUTES.DAMAGE_RECORD_BY_ID(id), {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete damage record");
      await loadRecords({ nextPage: page, nextPageSize: pageSize, mode: "table" });
      await loadOverview();
    } catch (error) {
      setMessage(error.message || "Failed to delete damage record");
    }
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{totalItems === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(page * pageSize, totalItems)}</span> of{" "}
            <span className="font-semibold">{totalItems}</span> records
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={page === 1} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                      : "hover:bg-white/50 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="mx-1 text-gray-400">...</span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === totalPages
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                      : "hover:bg-white/50 text-gray-700"
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600">Loading damage records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full mx-auto">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Damage Records
              </h2>
              <p className="text-gray-600">Track and manage combined product/material damage records.</p>
            </div>
          </div>
          <button
            onClick={() => {
              loadRecords({ nextPage: page, nextPageSize: pageSize, mode: "table" });
              loadOverview();
            }}
            className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2 bg-white/80 hover:bg-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <p className="text-sm text-gray-600">Total Records</p>
          <p className="text-2xl font-bold text-gray-800">{overviewLoading ? "..." : overview.totalRecords}</p>
        </div>
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <p className="text-sm text-gray-600">Total Loss</p>
          <p className="text-2xl font-bold text-red-600">{overviewLoading ? "..." : `$${overview.totalLoss.toFixed(2)}`}</p>
        </div>
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <p className="text-sm text-gray-600">Average Loss</p>
          <p className="text-2xl font-bold text-orange-600">{overviewLoading ? "..." : `$${overview.averageLoss.toFixed(2)}`}</p>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 items-end mb-4">
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-600 mb-1 block">Reason</label>
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                value={filters.reason}
                onChange={(e) => setFilters((p) => ({ ...p, reason: e.target.value }))}
                className="w-full pl-8 p-2.5 rounded-lg border border-gray-300 bg-white/70"
                placeholder="Search reason..."
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Source Type</label>
            <select
              value={filters.fromType}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  fromType: e.target.value,
                  fromId: "",
                }))
              }
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-white/70"
            >
              <option value="">All</option>
              <option value="store">Store</option>
              <option value="shop">Shop</option>
              <option value="factory">Factory</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Source</label>
            <select
              value={filters.fromId}
              onChange={(e) => setFilters((p) => ({ ...p, fromId: e.target.value }))}
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-white/70"
              disabled={!filters.fromType}
            >
              <option value="">{filters.fromType ? "All" : "Select source type first"}</option>
              {sourceOptions.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name || `${filters.fromType} #${source.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">From</label>
            <input type="datetime-local" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white/70" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">To</label>
            <input type="datetime-local" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white/70" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Sort</label>
            <select
              value={`${filters.sortBy}|${filters.sortDir}`}
              onChange={(e) => {
                const [sortBy, sortDir] = e.target.value.split("|");
                setFilters((p) => ({ ...p, sortBy, sortDir }));
              }}
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-white/70"
            >
              <option value="createdAt|desc">Newest</option>
              <option value="createdAt|asc">Oldest</option>
              <option value="totalLoss|desc">Loss High-Low</option>
              <option value="totalLoss|asc">Loss Low-High</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={applyFilters} className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white inline-flex items-center gap-2">
            <Filter size={14} /> Apply
          </button>
          <button onClick={clearFilters} className="px-4 py-2 rounded-lg border bg-white/70">Clear</button>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
        {renderPagination()}

        <div className="overflow-x-auto rounded-xl border border-white/60 mt-4">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100/80">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-right px-4 py-3">Loss</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-600">Loading records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-600">No damage records found.</td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="border-t border-white/50 hover:bg-white/30">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600" />
                        <span className="font-medium">{row.reason}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(row.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.sourceName || `${row.fromType} #${row.fromId}`}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                        <DollarSign size={14} />
                        {Number(row.totalLoss || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelected(row)} className="p-2 rounded-lg border hover:bg-gray-50" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-2 rounded-lg border text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {renderPagination()}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Damage Record #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="px-2 py-1 rounded border text-sm">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Source:</span> {selected.sourceName || `${selected.fromType} #${selected.fromId}`}</div>
              <div><span className="text-gray-500">Date:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500">Reason:</span> {selected.reason}</div>
              <div><span className="text-gray-500">Total Loss:</span> {Number(selected.totalLoss || 0).toFixed(2)}</div>
            </div>
            <div className="mt-4 border rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Loss/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 capitalize">{item.itemType}</td>
                      <td className="px-3 py-2">{item.product?.name || item.material?.name || "-"}</td>
                      <td className="px-3 py-2 text-right">{Number(item.quantity || 0)}</td>
                      <td className="px-3 py-2 text-right">{Number(item.lossPerUnit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected.note ? <p className="mt-3 text-sm text-gray-700"><span className="text-gray-500">Note:</span> {selected.note}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
