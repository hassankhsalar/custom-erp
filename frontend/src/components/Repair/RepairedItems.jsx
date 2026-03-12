import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { API_ROUTES } from "../../config";
import { usePermission } from "../../hooks/usePermission";

const defaultPageSize = 10;

export default function RepairedItems() {
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState("filter");
  const [error, setError] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overview, setOverview] = useState({ totalCount: 0, totalShippingCost: 0, byStatus: {} });
  const [locationOptions, setLocationOptions] = useState({ store: [], shop: [], factory: [] });

  const { hasPermission } = usePermission();
  const canDelete = hasPermission("repairs_delete");
  const canReceive = hasPermission("repairs_receive");

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    fromType: "",
    fromId: "",
    destination: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  const [viewModal, setViewModal] = useState({ open: false, row: null });
  const [statusModal, setStatusModal] = useState({ open: false, row: null, lines: [], saving: false, error: "" });

  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  const fromOptions = useMemo(
    () => (filters.fromType ? (locationOptions[filters.fromType] || []) : []),
    [filters.fromType, locationOptions]
  );

  const fetchRows = async ({ mode = "table", page = currentPage, limit = itemsPerPage } = {}) => {
    setLoading(true);
    setLoadMode(mode);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: appliedFilters.sortBy,
        sortDir: appliedFilters.sortDir,
      });
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.fromType) params.set("fromType", appliedFilters.fromType);
      if (appliedFilters.fromId) params.set("fromId", appliedFilters.fromId);
      if (appliedFilters.destination.trim()) params.set("destination", appliedFilters.destination.trim());
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);

      const res = await fetch(`${API_ROUTES.REPAIRS}?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch repairs");
      const pagination = data?.pagination || {};
      setRows(Array.isArray(data?.repairs) ? data.repairs : []);
      setTotalItems(Number(pagination.totalItems || 0));
      setTotalPages(Math.max(1, Number(pagination.totalPages || 1)));
      setCurrentPage(Number(pagination.page || page));
    } catch (err) {
      setError(err.message || "Failed to fetch repairs");
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.fromType) params.set("fromType", appliedFilters.fromType);
      if (appliedFilters.fromId) params.set("fromId", appliedFilters.fromId);
      if (appliedFilters.destination.trim()) params.set("destination", appliedFilters.destination.trim());
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
      const res = await fetch(`${API_ROUTES.REPAIRS_OVERVIEW}${params.toString() ? `?${params.toString()}` : ""}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch overview");
      setOverview({
        totalCount: Number(data?.totalCount || 0),
        totalShippingCost: Number(data?.totalShippingCost || 0),
        byStatus: data?.byStatus || {},
      });
    } catch {
      setOverview({ totalCount: 0, totalShippingCost: 0, byStatus: {} });
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [storesRes, shopsRes, factoriesRes] = await Promise.all([
          fetch(API_ROUTES.STORES, { headers }),
          fetch(API_ROUTES.SHOPS, { headers }),
          fetch(API_ROUTES.FACTORIES, { headers }),
        ]);
        const [storesData, shopsData, factoriesData] = await Promise.all([
          storesRes.json().catch(() => []),
          shopsRes.json().catch(() => []),
          factoriesRes.json().catch(() => []),
        ]);
        setLocationOptions({
          store: Array.isArray(storesData) ? storesData : [],
          shop: Array.isArray(shopsData) ? shopsData : [],
          factory: Array.isArray(factoriesData) ? factoriesData : [],
        });
      } catch {
        setLocationOptions({ store: [], shop: [], factory: [] });
      }
    };
    fetchLocations();
  }, [headers]);

  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchRows({ mode: "filter", page: 1, limit: itemsPerPage });
    fetchOverview();
  }, [appliedFilters]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchRows({ mode: "table", page: currentPage, limit: itemsPerPage });
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest(".dropdown-container")) setActiveDropdown(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const empty = {
      search: "",
      status: "",
      fromType: "",
      fromId: "",
      destination: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "createdAt",
      sortDir: "desc",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setCurrentPage(1);
  };

  const openStatusModal = (row) => {
    setStatusModal({
      open: true,
      row,
      lines: (row.items || []).map((item) => ({
        repairItemId: item.id,
        name: item.product?.name || item.material?.name || "-",
        itemType: item.itemType,
        quantity: Number(item.quantity || 0),
        successQuantity: Number(item.success || 0),
        failQuantity: Number(item.fail || 0),
      })),
      saving: false,
      error: "",
    });
    setActiveDropdown(null);
  };

  const deleteRepair = async (row) => {
    const ok = window.confirm(`Delete repair ${row.reference || row.id}? This action cannot be undone.`);
    if (!ok) return;
    try {
      const res = await fetch(API_ROUTES.REPAIR_BY_ID(row.id), {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete repair");
      setActiveDropdown(null);
      await fetchRows({ mode: "table", page: currentPage, limit: itemsPerPage });
      await fetchOverview();
    } catch (err) {
      setError(err.message || "Failed to delete repair");
    }
  };

  const submitStatus = async () => {
    const invalid = statusModal.lines.find(
      (line) => Number(line.successQuantity || 0) + Number(line.failQuantity || 0) > Number(line.quantity || 0)
    );
    if (invalid) return setStatusModal((prev) => ({ ...prev, error: `Invalid quantities for ${invalid.name}` }));

    try {
      setStatusModal((prev) => ({ ...prev, saving: true, error: "" }));
      const payload = {
        status: "completed",
        returnedItems: statusModal.lines.map((line) => ({
          repairItemId: line.repairItemId,
          successQuantity: Number(line.successQuantity || 0),
          failQuantity: Number(line.failQuantity || 0),
        })),
      };
      const res = await fetch(API_ROUTES.REPAIR_STATUS(statusModal.row.id), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setStatusModal({ open: false, row: null, lines: [], saving: false, error: "" });
      await fetchRows({ mode: "table", page: currentPage, limit: itemsPerPage });
      await fetchOverview();
    } catch (err) {
      setStatusModal((prev) => ({ ...prev, saving: false, error: err.message || "Failed to update status" }));
    }
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setCurrentPage(nextPage);
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
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
            Showing <span className="font-semibold">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
            <span className="font-semibold">{totalItems}</span> repairs
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="mx-1 text-gray-400">...</span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === totalPages ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-white/30 disabled:opacity-40">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  const pendingCount = Number(overview.byStatus?.pending || 0) + Number(overview.byStatus?.processing || 0);
  const completedCount = Number(overview.byStatus?.completed || 0);

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading repairs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl mb-6 p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Repaired Item</h1>
        <p className="text-gray-600">Track mixed repair requests and complete success/fail processing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="backdrop-blur-lg bg-gradient-to-br from-cyan-50/60 to-blue-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
          <p className="text-sm text-gray-600">Total Repairs</p>
          <p className="text-2xl font-bold text-cyan-600">{overview.totalCount}</p>
        </div>
        <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
          <input
            type="text"
            placeholder="Search reference/destination..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
          />
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filters.fromType}
            onChange={(e) => setFilters((prev) => ({ ...prev, fromType: e.target.value, fromId: "" }))}
            className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
          >
            <option value="">All Sources</option>
            <option value="store">Store</option>
            <option value="shop">Shop</option>
            <option value="factory">Factory</option>
          </select>
          <select
            value={filters.fromId}
            onChange={(e) => setFilters((prev) => ({ ...prev, fromId: e.target.value }))}
            disabled={!filters.fromType}
            className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl disabled:opacity-60"
          >
            <option value="">{filters.fromType ? "All Locations" : "Select source type first"}</option>
            {fromOptions.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Destination..."
            value={filters.destination}
            onChange={(e) => setFilters((prev) => ({ ...prev, destination: e.target.value }))}
            className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <input type="datetime-local" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl" />
          <input type="datetime-local" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl" />
          <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl">
            <option value="createdAt">Sort by Date</option>
            <option value="reference">Sort by Reference</option>
            <option value="status">Sort by Status</option>
            <option value="shippingCost">Sort by Shipping Cost</option>
          </select>
          <select value={filters.sortDir} onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button onClick={handleApplyFilters} className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center gap-2">
            <Filter size={16} />
            Apply
          </button>
          <button onClick={handleClearFilters} className="px-4 py-3 rounded-xl bg-white/80 border border-white/60 text-gray-700 flex items-center justify-center gap-2">
            <X size={16} />
            Clear
          </button>
        </div>

        {error && <div className="text-rose-600 mb-3">{error}</div>}
        {rows.length > 0 && renderPagination()}

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/60">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Destination</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Shipping</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/50">
                    <td className="p-3 font-semibold">{row.reference}</td>
                    <td className="p-3">{row.from} #{row.fromId}</td>
                    <td className="p-3">{row.destination}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">{row.items?.length || 0}</td>
                    <td className="p-3">${Number(row.shippingCost || 0).toFixed(2)}</td>
                    <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="relative dropdown-container">
                        <button onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                        {activeDropdown === row.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-xl z-20 py-1">
                            <button onClick={() => { setViewModal({ open: true, row }); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"><Eye size={14} /> View</button>
                            { row.status != "completed" && canReceive && (
                              <button onClick={() => openStatusModal(row)} className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2"><RefreshCw size={14} /> Receive</button>
                            )}
                            { canDelete && (
                              <button onClick={() => deleteRepair(row)} className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-600 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                            )}

                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="p-8 text-center text-gray-500" colSpan={8}>No repair requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && renderPagination()}
      </div>

      {viewModal.open && viewModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Repair Details - {viewModal.row.reference}</h3>
              <button onClick={() => setViewModal({ open: false, row: null })}><XCircle /></button>
            </div>
            <div className="p-5 space-y-2">
              {(viewModal.row.items || []).map((item) => (
                <div key={item.id} className="grid grid-cols-5 gap-2 text-sm border-b pb-2">
                  <div>{item.product?.name || item.material?.name || "-"}</div>
                  <div>{item.itemType}</div>
                  <div>Sent: {Number(item.quantity || 0)}</div>
                  <div>Success: {Number(item.success || 0)}</div>
                  <div>Fail: {Number(item.fail || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {statusModal.open && statusModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-lg">Update Repair Status - {statusModal.row.reference}</h3>
            </div>
            <div className="p-5 space-y-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Name (Type)</th>
                    <th>Sent</th>
                    <th>Success</th>
                    <th>Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {statusModal.lines.map((line, idx) => (
                    <tr key={line.repairItemId}>
                      <td className="p-2">{line.name} <span className="text-xs text-gray-500">({line.itemType})</span></td>
                      <td className="p-2">{line.quantity}</td>
                      <td className="p-2"><input type="number" min="0" step="0.01" value={line.successQuantity} onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value > line.quantity) {
                          alert(`Cannot set success quantity to ${value} as it exceeds the sent quantity of ${line.quantity}`);
                          e.target.value = "0";
                        } else {
                          setStatusModal((prev) => ({ ...prev, lines: prev.lines.map((x, i) => i === idx ? { ...x, successQuantity: value, failQuantity: (x.quantity - value).toFixed(2) } : x) }));
                        }
                      }} className="rounded-lg border border-gray-200 px-2 py-2" placeholder="Success" /></td>
                      <td className="p-2"><input type="number" min="0" step="0.01" value={line.failQuantity} onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value > line.quantity) {
                          alert(`Cannot set fail quantity to ${value} as it exceeds the sent quantity of ${line.quantity}`);
                          e.target.value = "0";
                        } else {
                          setStatusModal((prev) => ({ ...prev, lines: prev.lines.map((x, i) => i === idx ? { ...x, failQuantity: value, successQuantity: (x.quantity - value).toFixed(2) } : x) }));
                        }
                      }} className="rounded-lg border border-gray-200 px-2 py-2" placeholder="Fail" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {statusModal.error && <div className="text-rose-600 text-sm">{statusModal.error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setStatusModal({ open: false, row: null, lines: [], saving: false, error: "" })} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
                <button onClick={submitStatus} disabled={statusModal.saving} className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60">{statusModal.saving ? "Saving..." : "Mark Completed"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
