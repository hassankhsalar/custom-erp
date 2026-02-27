import { useEffect, useMemo, useState } from "react";
import { API_ROUTES } from "../../config";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Calendar,
  BarChart3,
  TrendingUp,
  PieChart,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShoppingCart,
  DollarSign,
  Package,
  Truck,
  CalendarDays,
  CalendarRange,
  Download,
  Layers,
  TrendingDown,
  AlertCircle,
  Clock,
  Grid3x3
} from "lucide-react";

const PurchaseReport = () => {
  const [tab, setTab] = useState("perDate");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [perDateRows, setPerDateRows] = useState([]);
  const [perMonthRows, setPerMonthRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [allOverviewRows, setAllOverviewRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [filters, setFilters] = useState({ supplierId: "", placeType: "", placeId: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState({ perDate: false, perMonth: false, all: false });
  const token = localStorage.getItem("token");

  const buildCommonFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.supplierId) params.append("supplierId", filters.supplierId);
    if (filters.placeType) params.append("placeType", filters.placeType);
    if (filters.placeId) params.append("placeId", filters.placeId);
    return params;
  };

  const buildPurchasesAllParams = (page, limit, includeExportAll = false) => {
    const params = buildCommonFilterParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    if (includeExportAll) {
      params.append("exportAll", "true");
    } else {
      params.append("page", String(page));
      params.append("limit", String(limit));
    }
    return params;
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(API_ROUTES.SUPPLIERS, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data?.suppliers || []);
        setSuppliers(rows.filter((row) => !row.deleted_at));
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };

    fetchSuppliers();
  }, [token]);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (!filters.placeType) {
        setPlaces([]);
        return;
      }

      const endpoint = filters.placeType === "store"
        ? API_ROUTES.STORES
        : filters.placeType === "shop"
          ? API_ROUTES.SHOPS
          : API_ROUTES.FACTORIES;

      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        let rows = [];
        if (Array.isArray(data)) rows = data;
        else if (Array.isArray(data?.stores)) rows = data.stores;
        else if (Array.isArray(data?.shops)) rows = data.shops;
        else if (Array.isArray(data?.factories)) rows = data.factories;
        setPlaces(rows.filter((row) => !row.deleted_at));
      } catch (error) {
        console.error("Error fetching places:", error);
      }
    };

    fetchPlaces();
  }, [token, filters.placeType]);

  const fetchPerDate = async () => {
    setLoading(prev => ({ ...prev, perDate: true }));
    try {
      const params = buildCommonFilterParams();
      params.append("month", String(month));
      const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_PER_DATE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPerDateRows(data.rows || []);
    } catch (error) {
      console.error('Error fetching per date data:', error);
    } finally {
      setLoading(prev => ({ ...prev, perDate: false }));
    }
  };

  const fetchPerMonth = async () => {
    setLoading(prev => ({ ...prev, perMonth: true }));
    try {
      const params = buildCommonFilterParams();
      params.append("year", String(year));
      const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_PER_MONTH}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPerMonthRows(data.rows || []);
    } catch (error) {
      console.error('Error fetching per month data:', error);
    } finally {
      setLoading(prev => ({ ...prev, perMonth: false }));
    }
  };

  const fetchAll = async (page = 1, limit = 10) => {
    setLoading(prev => ({ ...prev, all: true }));
    try {
      const params = buildPurchasesAllParams(page, limit);
      const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_ALL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching all purchases:', error);
    } finally {
      setLoading(prev => ({ ...prev, all: false }));
    }
  };

  const fetchAllOverview = async () => {
    try {
      const params = buildPurchasesAllParams(1, pagination.limit, true);
      const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_ALL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllOverviewRows(data.rows || []);
    } catch (error) {
      console.error("Error fetching all purchase overview data:", error);
      setAllOverviewRows([]);
    }
  };

  useEffect(() => {
    if (tab === "perDate") fetchPerDate();
  }, [tab, month, filters.supplierId, filters.placeType, filters.placeId]);

  useEffect(() => {
    if (tab === "perMonth") fetchPerMonth();
  }, [tab, year, filters.supplierId, filters.placeType, filters.placeId]);

  useEffect(() => {
    if (tab === "all") {
      fetchAll(pagination.page, pagination.limit);
      fetchAllOverview();
    }
  }, [tab]);

  const daysOfMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(y, m - 1, i + 1);
      return {
        key: date.toLocaleDateString("en-CA").slice(0, 10),
        day: String(i + 1).padStart(2, "0"),
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: date
      };
    });
  }, [month]);

  const perDateMap = useMemo(() => {
    const map = {};
    perDateRows.forEach(r => {
      map[r.date.slice(0, 10)] = {
        purchaseCount: Number(r.purchaseCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        shippingCost: Number(r.shippingCost || 0),
        totalDiscount: Number(r.totalDiscount || 0)
      };
    });
    return map;
  }, [perDateRows]);

  const calculateTotals = (data) => {
    return data.reduce((acc, row) => ({
      purchases: acc.purchases + Number(row.purchaseCount || 0),
      amount: acc.amount + Number(row.totalAmount || 0),
      shipping: acc.shipping + Number(row.shippingCost || 0),
      discount: acc.discount + Number(row.totalDiscount || 0)
    }), { purchases: 0, amount: 0, shipping: 0, discount: 0 });
  };

  const perDateTotals = calculateTotals(perDateRows);
  const perMonthTotals = calculateTotals(perMonthRows);
  const allTotals = calculateTotals(allOverviewRows);

  const handleExport = async () => {
    let data = [];

    if (tab === "perDate") {
      data = [["Date", "Purchases", "Amount", "Shipping Cost", "Discount"]];
      daysOfMonth.forEach((d) => {
        const stats = perDateMap[d.key] || { purchaseCount: 0, totalAmount: 0, shippingCost: 0, totalDiscount: 0 };
        data.push([d.key, stats.purchaseCount, stats.totalAmount, stats.shippingCost, stats.totalDiscount]);
      });
    } else if (tab === "perMonth") {
      data = [["Month", "Purchases", "Amount", "Shipping Cost", "Discount"]];
      Array.from({ length: 12 }, (_, i) => {
        const row = perMonthRows.find((r) => Number(r.month) === i + 1) || { purchaseCount: 0, totalAmount: 0, shippingCost: 0, totalDiscount: 0 };
        data.push([new Date(0, i).toLocaleString("en-US", { month: "long" }), row.purchaseCount, row.totalAmount, row.shippingCost, row.totalDiscount]);
      });
    } else {
      let rowsToExport = allRows;
      try {
        const params = buildPurchasesAllParams(1, pagination.limit, true);
        const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_ALL}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const exportData = await res.json();
        rowsToExport = exportData.rows || [];
      } catch (error) {
        console.error("Error fetching full purchase export data:", error);
      }
      
      data = [["Date", "Place", "Purchases", "Amount", "Shipping Cost", "Discount"]];
      rowsToExport.forEach((r) => {
        data.push([r.date.slice(0, 10), (filters.placeType && filters.placeId) ? places.find(p => p.id == filters.placeId).name : filters.placeType || "All Places", r.purchaseCount, r.totalAmount, r.shippingCost, Number(r.totalDiscount || 0)]);
      });
    }

    downloadExcelFile({
      sheetName: "Purchase Report",
      fileName: `purchase_report_${tab}_${new Date().toISOString().split("T")[0]}.xls`,
      rows: data
    });
  };

  const getCardColor = (index) => {
    const colors = [
      "from-blue-50/60 to-cyan-50/60",
      "from-emerald-50/60 to-green-50/60",
      "from-amber-50/60 to-orange-50/60",
      "from-purple-50/60 to-violet-50/60",
      "from-rose-50/60 to-pink-50/60",
      "from-indigo-50/60 to-blue-50/60",
      "from-teal-50/60 to-emerald-50/60",
      "from-orange-50/60 to-amber-50/60",
      "from-violet-50/60 to-purple-50/60",
      "from-pink-50/60 to-rose-50/60",
      "from-cyan-50/60 to-blue-50/60",
      "from-green-50/60 to-teal-50/60"
    ];
    return colors[index % colors.length];
  };

  const getStatusIcon = (purchaseCount) => {
    if (purchaseCount === 0) return <AlertCircle size={14} className="text-gray-400" />;
    if (purchaseCount <= 2) return <Clock size={14} className="text-amber-500" />;
    if (purchaseCount <= 5) return <TrendingUp size={14} className="text-emerald-500" />;
    return <TrendingUp size={14} className="text-blue-500" />;
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <BarChart3 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Purchase Report
                </h1>
                <p className="text-gray-600 mt-2">Track and analyze purchase activities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {tab === "perDate" ? perDateTotals.purchases :
                   tab === "perMonth" ? perMonthTotals.purchases :
                   allTotals.purchases}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <ShoppingCart size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(tab === "perDate" ? perDateTotals.amount :
                     tab === "perMonth" ? perMonthTotals.amount :
                     allTotals.amount).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shipping Cost</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${(tab === "perDate" ? perDateTotals.shipping :
                     tab === "perMonth" ? perMonthTotals.shipping :
                     allTotals.shipping).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Truck size={24} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-rose-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Discount</p>
                <p className="text-2xl font-bold text-rose-600">
                  ${(tab === "perDate" ? perDateTotals.discount :
                     tab === "perMonth" ? perMonthTotals.discount :
                     allTotals.discount).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-rose-100 rounded-xl">
                <TrendingDown size={24} className="text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTab("perDate")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "perDate" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <CalendarDays size={18} />
              Per Date
            </button>
            
            <button
              onClick={() => setTab("perMonth")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "perMonth" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <Calendar size={18} />
              Per Month
            </button>
            
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "all" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <CalendarRange size={18} />
              All Purchases
            </button>
          </div>

          {tab === "perDate" && (
            <div className="space-y-6">
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Filter size={20} className="text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Select Month</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    {loading.perDate ? "Loading..." : `${perDateRows.length} days with purchases`}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  />
                  <select
                    value={filters.supplierId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  >
                    <option value="">All Suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.placeType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, placeType: e.target.value, placeId: "" }))}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  >
                    <option value="">All Places</option>
                    <option value="store">Store</option>
                    <option value="shop">Shop</option>
                    <option value="factory">Factory</option>
                  </select>
                  <select
                    value={filters.placeId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, placeId: e.target.value }))}
                    disabled={!filters.placeType}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300 disabled:opacity-60"
                  >
                    <option value="">{filters.placeType ? "All Selected Places" : "Select Place Type First"}</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-600">
                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>

              {loading.perDate ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading daily purchase data...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {daysOfMonth.map((d, index) => {
                    const stats = perDateMap[d.key] || { purchaseCount: 0, totalAmount: 0, shippingCost: 0, totalDiscount: 0 };
                    const hasPurchases = stats.purchaseCount > 0;
                    
                    return (
                      <div
                        key={d.key}
                        className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                          hasPurchases
                            ? "bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border-emerald-200"
                            : "bg-white/50 border-white/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(stats.purchaseCount)}
                            <span className={`text-xs font-medium ${hasPurchases ? "text-emerald-700" : "text-gray-500"}`}>
                              {d.weekday}
                            </span>
                          </div>
                          <span className={`text-lg font-bold ${hasPurchases ? "text-gray-800" : "text-gray-400"}`}>
                            {d.day}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-col items-left justify-between">
                            <span className="text-xs text-gray-600">Purchases</span>
                            <span className={`font-semibold ${hasPurchases ? "text-emerald-600" : "text-gray-400"}`}>
                              {stats.purchaseCount}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-left justify-between">
                            <span className="text-xs text-gray-600">Amount</span>
                            <span className={`font-semibold ${hasPurchases ? "text-blue-600" : "text-gray-400"}`}>
                              ${stats.totalAmount.toFixed(2)}
                            </span>
                          </div>
                          
                          {stats.shippingCost > 0 && (
                            <div className="flex flex-col items-left justify-between pt-2 border-t border-white/40">
                              <span className="text-xs text-gray-600">Shipping</span>
                              <span className="text-xs font-medium text-amber-600">
                                ${stats.shippingCost.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {Number(stats.totalDiscount || 0) > 0 && (
                            <div className="flex flex-col items-left justify-between">
                              <span className="text-xs text-gray-600">Discount</span>
                              <span className="text-xs font-medium text-rose-600">
                                ${Number(stats.totalDiscount || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "perMonth" && (
            <div className="space-y-6">
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Filter size={20} className="text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Select Year</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    {loading.perMonth ? "Loading..." : `${perMonthRows.filter(r => r.purchaseCount > 0).length} months with purchases`}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                    min="2000"
                    max="2100"
                  />
                  <select
                    value={filters.supplierId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  >
                    <option value="">All Suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.placeType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, placeType: e.target.value, placeId: "" }))}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  >
                    <option value="">All Places</option>
                    <option value="store">Store</option>
                    <option value="shop">Shop</option>
                    <option value="factory">Factory</option>
                  </select>
                  <select
                    value={filters.placeId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, placeId: e.target.value }))}
                    disabled={!filters.placeType}
                    className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300 disabled:opacity-60"
                  >
                    <option value="">{filters.placeType ? "All Selected Places" : "Select Place Type First"}</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-600">Year overview for {year}</div>
                </div>
              </div>

              {loading.perMonth ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading monthly purchase data...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthName = new Date(0, i).toLocaleString("en-US", { month: "long" });
                    const row = perMonthRows.find(r => Number(r.month) === i + 1) || { purchaseCount: 0, totalAmount: 0, shippingCost: 0, totalDiscount: 0 };
                    const hasPurchases = row.purchaseCount > 0;
                    
                    return (
                      <div
                        key={i}
                        className={`backdrop-blur-sm border rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                          hasPurchases
                            ? `bg-gradient-to-br ${getCardColor(i)} border-emerald-200`
                            : "bg-white/50 border-white/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(row.purchaseCount)}
                            <span className={`font-semibold ${hasPurchases ? "text-gray-800" : "text-gray-500"}`}>
                              {monthName}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${hasPurchases ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {i + 1}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingCart size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">Purchases</span>
                            </div>
                            <span className={`font-bold text-lg ${hasPurchases ? "text-emerald-600" : "text-gray-400"}`}>
                              {row.purchaseCount || 0}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">Amount</span>
                            </div>
                            <span className={`font-bold text-lg ${hasPurchases ? "text-blue-600" : "text-gray-400"}`}>
                              ${Number(row.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          
                          {row.shippingCost > 0 && (
                            <div className="flex items-center justify-between pt-3 border-t border-white/40">
                              <div className="flex items-center gap-2">
                                <Truck size={14} className="text-amber-400" />
                                <span className="text-xs text-gray-600">Shipping</span>
                              </div>
                              <span className="text-sm font-medium text-amber-600">
                                ${Number(row.shippingCost || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {Number(row.totalDiscount || 0) > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Discount</span>
                              </div>
                              <span className="text-sm font-medium text-rose-600">
                                ${Number(row.totalDiscount || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "all" && (
            <div className="space-y-6">
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Filter size={20} className="text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filter Date Range</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    {loading.all ? "Loading..." : `${pagination.totalCount || 0} purchase records`}
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          Start Date
                        </div>
                      </label>
                      <input
                        type="date"
                        value={range.startDate}
                        onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          End Date
                        </div>
                      </label>
                      <input
                        type="date"
                        value={range.endDate}
                        onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Package size={14} />
                          Supplier
                        </div>
                      </label>
                      <select
                        value={filters.supplierId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
                        className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                      >
                        <option value="">All Suppliers</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Package size={14} />
                          Place Type
                        </div>
                      </label>
                      <select
                        value={filters.placeType}
                        onChange={(e) => setFilters((prev) => ({ ...prev, placeType: e.target.value, placeId: "" }))}
                        className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                      >
                        <option value="">All Places</option>
                        <option value="store">Store</option>
                        <option value="shop">Shop</option>
                        <option value="factory">Factory</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Package size={14} />
                          Place
                        </div>
                      </label>
                      <select
                        value={filters.placeId}
                        onChange={(e) => setFilters((prev) => ({ ...prev, placeId: e.target.value }))}
                        disabled={!filters.placeType}
                        className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300 disabled:opacity-60"
                      >
                        <option value="">{filters.placeType ? "All Selected Places" : "Select Place Type First"}</option>
                        {places.map((place) => (
                          <option key={place.id} value={place.id}>
                            {place.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      await fetchAll(1, pagination.limit);
                      await fetchAllOverview();
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
                  >
                    <Filter size={18} />
                    Apply Filters
                  </button>
                </div>
              </div>

              {loading.all ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading purchase records...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Date</th>
                          <th className="p-4 text-left font-medium text-gray-700">Purchase Count</th>
                          <th className="p-4 text-left font-medium text-gray-700">Total Amount</th>
                          <th className="p-4 text-left font-medium text-gray-700">Shipping Cost</th>
                          <th className="p-4 text-left font-medium text-gray-700">Discount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRows.map((r, idx) => (
                          <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            idx % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                                  <CalendarDays size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(r.date).toLocaleDateString("en-US", { year: "numeric" })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <ShoppingCart size={14} className="text-emerald-500" />
                                <span className="font-bold text-lg text-emerald-600">{r.purchaseCount}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-blue-500" />
                                <span className="font-bold text-lg text-blue-600">
                                  ${Number(r.totalAmount || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Truck size={14} className="text-amber-500" />
                                <span className="font-medium text-amber-600">
                                  ${Number(r.shippingCost || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-rose-600">
                                  ${Number(r.totalDiscount || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        
                        {allRows.length === 0 && !loading.all && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-white/50 rounded-xl">
                                  <BarChart3 size={48} className="text-gray-300" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchase Records Found</h3>
                                  <p className="text-gray-600">Try adjusting your date range or filters</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {allRows.length > 0 && (
                    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {/* Items per page selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show:</span>
                            <select
                              value={pagination.limit}
                              onChange={(e) => {
                                fetchAll(1, Number(e.target.value));
                              }}
                              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            >
                              <option value="5">5</option>
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="50">50</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                          </div>

                          {/* Page info */}
                          <div className="text-sm text-gray-700">
                            Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                            <span className="font-semibold">
                              {Math.min(pagination.page * pagination.limit, pagination.totalCount || 0)}
                            </span>{" "}
                            of <span className="font-semibold">{pagination.totalCount || 0}</span> records
                          </div>
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center gap-2">
                          {/* First page */}
                          <button
                            onClick={() => fetchAll(1, pagination.limit)}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="First page"
                          >
                            <ChevronsLeft size={16} className="text-gray-600" />
                          </button>

                          {/* Previous page */}
                          <button
                            onClick={() => fetchAll(pagination.page - 1, pagination.limit)}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Previous page"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>

                          {/* Page numbers */}
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
                                  onClick={() => fetchAll(pageNum, pagination.limit)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    pagination.page === pageNum
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
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
                                  onClick={() => fetchAll(pagination.totalPages, pagination.limit)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    pagination.page === pagination.totalPages
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                                      : "hover:bg-white/50 text-gray-700"
                                  }`}
                                >
                                  {pagination.totalPages}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Next page */}
                          <button
                            onClick={() => fetchAll(pagination.page + 1, pagination.limit)}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Next page"
                          >
                            <ChevronRight size={16} className="text-gray-600" />
                          </button>

                          {/* Last page */}
                          <button
                            onClick={() => fetchAll(pagination.totalPages, pagination.limit)}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseReport;
