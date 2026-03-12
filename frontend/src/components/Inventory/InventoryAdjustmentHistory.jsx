import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, History, Search } from "lucide-react";
import { API_ROUTES } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import { includesLooseNumberInAny } from "../../utils/numberLooseSearch";

const pageSizeOptions = [5, 10, 20, 50, 100];

const toId = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : "";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const InventoryAdjustmentHistory = ({ defaultPlaceType = "" }) => {
  const token = localStorage.getItem("token");
  const [searchParams, setSearchParams] = useSearchParams();

  const modeItemType = String(searchParams.get("itemType") || "").toLowerCase();
  const modeItemId = toId(searchParams.get("itemId"));
  const isItemMode = ["product", "material"].includes(modeItemType) && modeItemId;

  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);

  const [placeType, setPlaceType] = useState(String(searchParams.get("placeType") || defaultPlaceType || ""));
  const [placeId, setPlaceId] = useState(toId(searchParams.get("placeId")));
  const [itemTypeFilter, setItemTypeFilter] = useState(String(searchParams.get("filterItemType") || "all"));
  const [searchText, setSearchText] = useState(String(searchParams.get("search") || ""));
  const [dateFrom, setDateFrom] = useState(String(searchParams.get("dateFrom") || ""));
  const [dateTo, setDateTo] = useState(String(searchParams.get("dateTo") || ""));
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") || 1)));
  const [limit, setLimit] = useState(pageSizeOptions.includes(Number(searchParams.get("limit"))) ? Number(searchParams.get("limit")) : 20);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const placeOptions = useMemo(() => {
    if (placeType === "store") return stores;
    if (placeType === "shop") return shops;
    if (placeType === "factory") return factories;
    return [];
  }, [placeType, stores, shops, factories]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const loadAllPlaces = async () => {
      try {
        const [storeRes, shopRes, factoryRes] = await Promise.all([
          fetch(API_ROUTES.STORES, { headers }),
          fetch(API_ROUTES.SHOPS, { headers }),
          fetch(API_ROUTES.FACTORY_INVENTORY_FACTORIES, { headers }),
        ]);
        const [storeData, shopData, factoryData] = await Promise.all([
          storeRes.json().catch(() => []),
          shopRes.json().catch(() => []),
          factoryRes.json().catch(() => []),
        ]);
        setStores(activeOnly(Array.isArray(storeData) ? storeData : storeData?.stores || []));
        setShops(activeOnly(Array.isArray(shopData) ? shopData : shopData?.shops || []));
        setFactories(activeOnly(Array.isArray(factoryData) ? factoryData : factoryData?.factories || []));
      } catch (_) {
        setStores([]);
        setShops([]);
        setFactories([]);
      }
    };
    loadAllPlaces();
  }, [token]);

  useEffect(() => {
    if (defaultPlaceType && !placeType) {
      setPlaceType(defaultPlaceType);
    }
  }, [defaultPlaceType, placeType]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (placeType) next.set("placeType", placeType); else next.delete("placeType");
    if (placeId) next.set("placeId", String(placeId)); else next.delete("placeId");
    if (itemTypeFilter && itemTypeFilter !== "all") next.set("filterItemType", itemTypeFilter); else next.delete("filterItemType");
    if (searchText) next.set("search", searchText); else next.delete("search");
    if (dateFrom) next.set("dateFrom", dateFrom); else next.delete("dateFrom");
    if (dateTo) next.set("dateTo", dateTo); else next.delete("dateTo");
    next.set("page", String(page));
    next.set("limit", String(limit));
    setSearchParams(next, { replace: true });
  }, [placeType, placeId, itemTypeFilter, searchText, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const fetchRows = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (placeType) params.set("placeType", placeType);
        if (placeId) params.set("placeId", String(placeId));
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        let endpoint = API_ROUTES.INVENTORY_ADJUSTMENTS_PLACE_SUMMARY;
        if (isItemMode) {
          endpoint = API_ROUTES.INVENTORY_ADJUSTMENTS_ITEM;
          params.set("itemType", modeItemType);
          params.set("itemId", String(modeItemId));
        } else {
          if (!placeType || !placeId) {
            setRows([]);
            setPagination({ page: 1, totalPages: 1, totalCount: 0 });
            setLoading(false);
            return;
          }
          if (itemTypeFilter && itemTypeFilter !== "all") params.set("itemType", itemTypeFilter);
          if (searchText) params.set("search", searchText);
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, { headers });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to fetch adjustment history");

        const nextRows = Array.isArray(data.items) ? data.items : [];
        const filteredRows = searchText ? nextRows.filter((row) => includesLooseNumberInAny([row.name, row.barcode, row.brand, row.category], searchText)) : nextRows;
        setRows(filteredRows);
        setPagination({
          page: Number(data.pagination?.page || 1),
          totalPages: Number(data.pagination?.totalPages || 1),
          totalCount: Number(data.pagination?.totalCount || 0),
        });
      } catch (err) {
        setRows([]);
        setPagination({ page: 1, totalPages: 1, totalCount: 0 });
        setError(err.message || "Failed to fetch adjustment history");
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [token, placeType, placeId, itemTypeFilter, searchText, dateFrom, dateTo, page, limit, isItemMode, modeItemType, modeItemId]);

  const openItemHistory = (itemType, itemId) => {
    const next = new URLSearchParams(searchParams);
    next.set("itemType", itemType);
    next.set("itemId", String(itemId));
    next.set("page", "1");
    setSearchParams(next);
  };

  const clearItemMode = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("itemType");
    next.delete("itemId");
    next.set("page", "1");
    setSearchParams(next);
  };

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const goToPage = (target) => {
    if (target < 1 || target > totalPages) return;
    setPage(target);
  };
  const prevPage = () => goToPage(page - 1);
  const nextPage = () => goToPage(page + 1);

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-lime-500/30"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{pagination.totalCount === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(page * limit, pagination.totalCount)}</span>{" "}
            of <span className="font-semibold">{pagination.totalCount}</span> items
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={page === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={prevPage} disabled={page === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === pageNum ? "bg-linear-to-br from-lime-500 to-sky-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button onClick={nextPage} disabled={page === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-lime-50 via-sky-50 to-sky-50 p-4 md:p-6">
      <div className="bg-white/70 backdrop-blur border border-white/60 rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-lime-500 to-sky-500 text-white">
              <History size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inventory Adjustment History</h1>
              <p className="text-sm text-gray-600">
                {isItemMode ? "Item-wise adjustment entries" : "Adjusted items summary by place"}
              </p>
            </div>
          </div>
          {isItemMode && (
            <button onClick={clearItemMode} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">
              Back to Summary
            </button>
          )}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur border border-white/60 rounded-2xl p-4 mb-5 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select
          value={placeType}
          onChange={(e) => {
            setPlaceType(e.target.value);
            setPlaceId("");
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-200"
        >
          <option value="">Place Type</option>
          <option value="store">Store</option>
          <option value="shop">Shop</option>
          <option value="factory">Factory</option>
        </select>
        <select
          value={placeId}
          onChange={(e) => {
            setPlaceId(toId(e.target.value));
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-200"
        >
          <option value="">Select Place</option>
          {placeOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {!isItemMode && (
          <select
            value={itemTypeFilter}
            onChange={(e) => {
              setItemTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-gray-200"
          >
            <option value="all">All Item Types</option>
            <option value="product">Product</option>
            <option value="material">Material</option>
          </select>
        )}
        {!isItemMode && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="Search name/barcode/brand"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
        )}
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200" />
        </div>
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200" />
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur border border-white/60 rounded-2xl p-4">
        {loading ? <p className="py-8 text-center text-gray-600">Loading...</p> : null}
        {!loading && error ? <p className="py-8 text-center text-red-600">{error}</p> : null}

        {!loading && !error && isItemMode && (
          <>
            {rows.length > 0 && renderPagination()}
            <div className="overflow-x-auto rounded-xl border border-white/60">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Place</th>
                    <th className="p-3 text-left">Quantity</th>
                    <th className="p-3 text-left">Avg Unit Price</th>
                    <th className="p-3 text-left">Value</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-left">Account Adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const qty = Number(row.quantity || 0);
                    const price = Number(row.unitPrice || 0);
                    return (
                      <tr key={row.id} className="border-t border-white/50 hover:bg-white/30 transition-colors duration-200">
                        <td className="p-3">{formatDateTime(row.date)}</td>
                        <td className="p-3">{String(row.placeType || "-")} #{row.storeId || row.shopId || row.factoryId || "-"}</td>
                        <td className={`p-3 font-semibold ${qty >= 0 ? "text-sky-700" : "text-rose-700"}`}>{qty >= 0 ? "+" : ""}{qty}</td>
                        <td className="p-3">{price.toFixed(2)}</td>
                        <td className="p-3">{(Math.abs(qty) * price).toFixed(2)}</td>
                        <td className="p-3">{row.reason || "-"}</td>
                        <td className="p-3">{row.isAccountAdjusted ? "Yes" : "No"}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td className="p-6 text-center text-gray-500" colSpan="7">No adjustments found</td></tr>}
                </tbody>
              </table>
            </div>
            {rows.length > 0 && renderPagination()}
          </>
        )}

        {!loading && !error && !isItemMode && (
          <>
            {rows.length > 0 && renderPagination()}
            <div className="overflow-x-auto rounded-xl border border-white/60">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-3 text-left">Image</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Brand</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Quantity</th>
                    <th className="p-3 text-left">Avg Unit Price</th>
                    <th className="p-3 text-left">Total Debit</th>
                    <th className="p-3 text-left">Total Credit</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.itemType}-${row.itemId}`} className="border-t border-white/50 hover:bg-white/30 transition-colors duration-200">
                      <td className="p-3">
                        {row.image ? <img src={row.image} alt={row.name} className="w-10 h-10 rounded object-cover" /> : <span>-</span>}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-gray-500">{row.barcode || "-"}</p>
                      </td>
                      <td className="p-3">{row.brand || "-"}</td>
                      <td className="p-3">{row.category || "-"}</td>
                      <td className="p-3">{Number(row.quantity || 0).toFixed(2)} {row.unit || ""}</td>
                      <td className="p-3">{Number(row.avgUnitPrice || 0).toFixed(2)}</td>
                      <td className="p-3 text-rose-700">{Number(row.totalAdjustedDebit || 0).toFixed(2)}</td>
                      <td className="p-3 text-sky-700">{Number(row.totalAdjustedCredit || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => openItemHistory(row.itemType, row.itemId)}
                          className="px-2 py-1 rounded bg-lime-100 hover:bg-lime-200 text-lime-700 text-xs"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td className="p-6 text-center text-gray-500" colSpan="9">No adjusted items found</td></tr>}
                </tbody>
              </table>
            </div>
            {rows.length > 0 && renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryAdjustmentHistory;


