import { useEffect, useMemo, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Play,
  ChevronLeft,
  ChevronRight,
  Warehouse
} from "lucide-react";

const DailyStockReport = () => {
  const token = localStorage.getItem("token");
  const [snapshotRange, setSnapshotRange] = useState({ startDate: "", endDate: "" });
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotPagination, setSnapshotPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");

  const [places, setPlaces] = useState([]);
  const [filters, setFilters] = useState({
    placeType: "",
    placeId: "",
    itemType: "",
    search: ""
  });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState(null);

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => String(s.id) === String(selectedSnapshotId)) || activeSnapshot,
    [snapshots, selectedSnapshotId, activeSnapshot]
  );

  const fetchPlaces = async (type) => {
    if (!type) {
      setPlaces([]);
      return;
    }
    const endpoint = type === "store" ? API_ROUTES.STORES : type === "shop" ? API_ROUTES.SHOPS : API_ROUTES.FACTORIES;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPlaces(Array.isArray(data) ? data : []);
  };

  const fetchSnapshots = async (page = 1) => {
    const params = new URLSearchParams();
    if (snapshotRange.startDate) params.append("startDate", snapshotRange.startDate);
    if (snapshotRange.endDate) params.append("endDate", snapshotRange.endDate);
    params.append("page", String(page));
    params.append("limit", String(snapshotPagination.limit));

    const res = await fetch(`${API_ROUTES.REPORT_DAILY_STOCK}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const fetchedRows = data.rows || [];
    setSnapshots(fetchedRows);
    setSnapshotPagination(data.pagination || { page: 1, limit: 20, totalPages: 1 });

    if (!selectedSnapshotId && fetchedRows.length > 0) {
      setSelectedSnapshotId(String(fetchedRows[0].id));
    }
  };

  const fetchItems = async (page = 1, limit = pagination.limit) => {
    if (!selectedSnapshotId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.placeType) params.append("placeType", filters.placeType);
      if (filters.placeId) params.append("placeId", filters.placeId);
      if (filters.itemType) params.append("itemType", filters.itemType);
      if (filters.search.trim()) params.append("search", filters.search.trim());
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetch(`${API_ROUTES.REPORT_DAILY_STOCK_BY_ID(selectedSnapshotId)}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1, totalCount: 0 });
      setActiveSnapshot(data.snapshot || null);
    } finally {
      setLoading(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      await fetch(API_ROUTES.REPORT_DAILY_STOCK_RUN_NOW, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSnapshots(1);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchSnapshots(1);
  }, []);

  useEffect(() => {
    fetchPlaces(filters.placeType);
    setFilters((prev) => ({ ...prev, placeId: "" }));
  }, [filters.placeType]);

  useEffect(() => {
    if (selectedSnapshotId) fetchItems(1, pagination.limit);
  }, [selectedSnapshotId]);

  const fileUrl = selectedSnapshot?.filePath ? `${MEDIA_BASE_URL}${selectedSnapshot.filePath}` : "";

  const fetchAllItemsForExcel = async () => {
    if (!selectedSnapshotId) return [];

    const limit = 500;
    let page = 1;
    let totalPages = 1;
    const allRows = [];

    while (page <= totalPages) {
      const params = new URLSearchParams();
      if (filters.placeType) params.append("placeType", filters.placeType);
      if (filters.placeId) params.append("placeId", filters.placeId);
      if (filters.itemType) params.append("itemType", filters.itemType);
      if (filters.search.trim()) params.append("search", filters.search.trim());
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetch(`${API_ROUTES.REPORT_DAILY_STOCK_BY_ID(selectedSnapshotId)}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const batch = data.rows || [];
      allRows.push(...batch);
      totalPages = Number(data.pagination?.totalPages || 1);
      page += 1;
      if (batch.length === 0) break;
    }

    return allRows;
  };

  const handleExcelExport = async () => {
    const excelRows = await fetchAllItemsForExcel();
    if (!excelRows.length) return;
    const sheetRows = [
      ["Place Name", "Place Type", "Place ID", "Item Name", "Item Type", "Item ID", "Unit", "Stock", "Avg Cost", "Scrap"],
      ...excelRows.map((r) => [
        r.placeName || "",
        r.placeType || "",
        r.placeId || "",
        r.itemName || "",
        r.itemType || "",
        r.itemId || "",
        r.unit || "",
        Number(r.stock || 0),
        r.avgCost == null ? "" : Number(r.avgCost),
        Number(r.scrap || 0)
      ])
    ];

    downloadExcelFile({
      sheetName: "Daily Stock",
      fileName: `daily_stock_${selectedSnapshot?.snapshotDate?.slice?.(0, 10) || new Date().toISOString().split("T")[0]}.xls`,
      rows: sheetRows
    });
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 md:p-6">
      <div className="w-full mx-auto">
        <div className="backdrop-blur-xl bg-white/50 border border-white/60 rounded-2xl shadow-xl mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-md">
                <Warehouse className="text-white" size={30} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Daily Stock Report</h1>
                <p className="text-slate-600">End-of-day stock snapshot for store, shop, and factory</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchSnapshots(snapshotPagination.page)}
                className="px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-slate-700 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={runNow}
                disabled={running}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <Play size={16} />
                {running ? "Running..." : "Run Now"}
              </button>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-lg p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Snapshot Start Date</label>
              <input
                type="date"
                value={snapshotRange.startDate}
                onChange={(e) => setSnapshotRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Snapshot End Date</label>
              <input
                type="date"
                value={snapshotRange.endDate}
                onChange={(e) => setSnapshotRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Snapshot</label>
              <select
                value={selectedSnapshotId}
                onChange={(e) => setSelectedSnapshotId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              >
                <option value="">Select snapshot</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.snapshotDate).toLocaleDateString()} ({s.totalItems} items)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchSnapshots(1)}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                Load Snapshots
              </button>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-lg p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Place Type</label>
              <select
                value={filters.placeType}
                onChange={(e) => setFilters((prev) => ({ ...prev, placeType: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              >
                <option value="">All</option>
                <option value="store">Store</option>
                <option value="shop">Shop</option>
                <option value="factory">Factory</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Place</label>
              <select
                value={filters.placeId}
                onChange={(e) => setFilters((prev) => ({ ...prev, placeId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              >
                <option value="">All</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Item Type</label>
              <select
                value={filters.itemType}
                onChange={(e) => setFilters((prev) => ({ ...prev, itemType: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              >
                <option value="">All</option>
                <option value="product">Product</option>
                <option value="material">Material</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Place or item name"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => fetchItems(1, pagination.limit)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold flex items-center justify-center gap-2"
                disabled={!selectedSnapshotId}
              >
                <Filter size={16} />
                Apply
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
              {fileUrl && (
                <>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    CSV
                  </a>
                  <button
                    onClick={handleExcelExport}
                    disabled={!rows.length}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Download size={16} />
                    Excel
                  </button>
                </>
              )}
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/50 text-sm text-slate-600">
            {selectedSnapshot ? (
              <>
                Snapshot: <b>{new Date(selectedSnapshot.snapshotDate).toLocaleDateString()}</b> |
                Run At: <b>{new Date(selectedSnapshot.runAt).toLocaleString()}</b> |
                Total Items: <b>{pagination.totalCount}</b>
              </>
            ) : (
              "Select a snapshot to view records"
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100/80">
                <tr>
                  <th className="p-3 text-left">Place</th>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3 text-right">Avg Cost</th>
                  <th className="p-3 text-right">Scrap</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-600">Loading...</td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r, idx) => (
                    <tr key={`${r.id}-${idx}`} className="border-t border-white/50 hover:bg-white/40">
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{r.placeName}</div>
                        <div className="text-xs text-slate-500">{r.placeType} #{r.placeId}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{r.itemName}</div>
                        <div className="text-xs text-slate-500">{r.itemType} #{r.itemId}</div>
                      </td>
                      <td className="p-3">{r.unit || "-"}</td>
                      <td className="p-3 text-right font-semibold">{Number(r.stock || 0).toLocaleString()}</td>
                      <td className="p-3 text-right">{r.avgCost == null ? "-" : Number(r.avgCost).toFixed(2)}</td>
                      <td className="p-3 text-right">{Number(r.scrap || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-600">No rows found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-white/50 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages || 1}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchItems(Math.max(1, pagination.page - 1), pagination.limit)}
                disabled={pagination.page <= 1 || !selectedSnapshotId}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white/80 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => fetchItems(pagination.page + 1, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages || !selectedSnapshotId}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white/80 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStockReport;
