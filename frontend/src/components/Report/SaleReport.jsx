import { useEffect, useMemo, useState } from "react";
import { API_ROUTES } from "../../config";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  BarChart3,
  ShoppingBag,
  Clock,
  X,
  Search,
  Percent,
  Award,
  Zap,
  TrendingUpDownIcon
} from 'lucide-react';

const SaleReport = () => {
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
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const buildSalesAllParams = (page, limit, includeExportAll = false) => {
    const params = new URLSearchParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    if (shopId) params.append("shopId", shopId);
    if (includeExportAll) {
      params.append("exportAll", "true");
    } else {
      params.append("page", String(page));
      params.append("limit", String(limit));
    }
    return params;
  };

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await fetch(API_ROUTES.SHOPS, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data?.shops || []);
        setShops(rows.filter((row) => !row.deleted_at));
      } catch (error) {
        console.error("Error fetching shops:", error);
      }
    };

    fetchShops();
  }, [token]);

  const fetchPerDate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month) });
      if (shopId) params.append("shopId", shopId);
      const res = await fetch(`${API_ROUTES.REPORT_SALES_PER_DATE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPerDateRows(data.rows || []);
    } catch (error) {
      console.error("Error fetching per date data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerMonth = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (shopId) params.append("shopId", shopId);
      const res = await fetch(`${API_ROUTES.REPORT_SALES_PER_MONTH}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPerMonthRows(data.rows || []);
    } catch (error) {
      console.error("Error fetching per month data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params = buildSalesAllParams(page, limit);
      const res = await fetch(`${API_ROUTES.REPORT_SALES_ALL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching all data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "perDate") fetchPerDate();
  }, [tab, month, shopId]);

  useEffect(() => {
    if (tab === "perMonth") fetchPerMonth();
  }, [tab, year, shopId]);

  useEffect(() => {
    if (tab === "all") fetchAll(pagination.page, pagination.limit);
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
        saleCount: Number(r.saleCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        totalCost: Number(r.totalCost || 0)
      };
    });
    return map;
  }, [perDateRows]);

  // Calculate totals and metrics
  const totalSales = useMemo(() => {
    switch (tab) {
      case "perDate":
        return perDateRows.reduce((sum, r) => sum + Number(r.saleCount || 0), 0);
      case "perMonth":
        return perMonthRows.reduce((sum, r) => sum + Number(r.saleCount || 0), 0);
      case "all":
        return allRows.reduce((sum, r) => sum + Number(r.saleCount || 0), 0);
      default:
        return 0;
    }
  }, [tab, perDateRows, perMonthRows, allRows]);

  const totalRevenue = useMemo(() => {
    switch (tab) {
      case "perDate":
        return perDateRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      case "perMonth":
        return perMonthRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      case "all":
        return allRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
      default:
        return 0;
    }
  }, [tab, perDateRows, perMonthRows, allRows]);

  const totalProfit = useMemo(() => {
    switch (tab) {
      case "perDate":
        return perDateRows.reduce((sum, r) => sum + (Number(r.totalAmount || 0) - Number(r.totalCost || 0)), 0);
      case "perMonth":
        return perMonthRows.reduce((sum, r) => sum + (Number(r.totalAmount || 0) - Number(r.totalCost || 0)), 0);
      case "all":
        return allRows.reduce((sum, r) => sum + (Number(r.totalAmount || 0) - Number(r.totalCost || 0)), 0);
      default:
        return 0;
    }
  }, [tab, perDateRows, perMonthRows, allRows]);

  const profitMargin = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  }, [totalRevenue, totalProfit]);

  const handleExport = async () => {
    let data = [];
    
    switch (tab) {
      case "perDate":
        data = [["Date", "Sales", "Revenue", "Cost", "Profit"]];
        daysOfMonth.forEach(d => {
          const stats = perDateMap[d.key] || { saleCount: 0, totalAmount: 0, totalCost: 0 };
          const profit = stats.totalAmount - stats.totalCost;
          data.push([d.key, stats.saleCount, stats.totalAmount, stats.totalCost, profit]);
        });
        break;
      case "perMonth":
        data = [["Month", "Sales", "Revenue", "Cost", "Profit"]];
        Array.from({ length: 12 }, (_, i) => {
          const row = perMonthRows.find(r => Number(r.month) === i + 1) || { saleCount: 0, totalAmount: 0, totalCost: 0 };
          const profit = Number(row.totalAmount || 0) - Number(row.totalCost || 0);
          data.push([new Date(0, i).toLocaleString("en-US", { month: "long" }), row.saleCount, row.totalAmount, row.totalCost, profit]);
        });
        break;
      case "all":
        let rowsToExport = allRows;
        try {
          const params = buildSalesAllParams(1, pagination.limit, true);
          const res = await fetch(`${API_ROUTES.REPORT_SALES_ALL}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const exportData = await res.json();
          rowsToExport = exportData.rows || [];
        } catch (error) {
          console.error("Error fetching full sales export data:", error);
        }
        data = [["Date", "Place", "Sales", "Revenue", "Cost", "Profit"]];
        rowsToExport.forEach(r => {
          const profit = Number(r.totalAmount || 0) - Number(r.totalCost || 0);
          data.push([r.date.slice(0, 10), shopId != "" ? shops[shopId].name : "All Shops", r.saleCount, r.totalAmount, r.totalCost, profit]);
        });
        break;
    }
    
    downloadExcelFile({
      sheetName: "Sale Report",
      fileName: `sale_report_${tab}_${new Date().toISOString().split("T")[0]}.xls`,
      rows: data
    });
  };

  const handleRefresh = () => {
    switch (tab) {
      case "perDate":
        fetchPerDate();
        break;
      case "perMonth":
        fetchPerMonth();
        break;
      case "all":
        fetchAll(pagination.page, pagination.limit);
        break;
    }
  };

  const getDayColor = (stats) => {
    const profit = stats.totalAmount - stats.totalCost;
    if (stats.saleCount === 0) return "bg-gradient-to-br from-gray-50/60 to-gray-100/60";
    if (profit > 1000) return "bg-gradient-to-br from-emerald-50/60 to-green-50/60";
    if (profit > 500) return "bg-gradient-to-br from-blue-50/60 to-cyan-50/60";
    if (profit > 0) return "bg-gradient-to-br from-amber-50/60 to-orange-50/60";
    return "bg-gradient-to-br from-red-50/60 to-rose-50/60";
  };

  const getMonthColor = (monthIndex) => {
    const row = perMonthRows.find(r => Number(r.month) === monthIndex + 1);
    if (!row || row.saleCount === 0) return "bg-gradient-to-br from-gray-50/60 to-gray-100/60";
    const profit = Number(row.totalAmount || 0) - Number(row.totalCost || 0);
    if (profit > 5000) return "bg-gradient-to-br from-emerald-50/60 to-green-50/60";
    if (profit > 2500) return "bg-gradient-to-br from-blue-50/60 to-cyan-50/60";
    if (profit > 0) return "bg-gradient-to-br from-amber-50/60 to-orange-50/60";
    return "bg-gradient-to-br from-red-50/60 to-rose-50/60";
  };

  const getProfitIcon = (profit) => {
    if (profit > 1000) return <TrendingUp size={12} className="text-emerald-600" />;
    if (profit > 0) return <TrendingUpDownIcon size={12} className="text-amber-600" />;
    return <TrendingDown size={12} className="text-red-600" />;
  };

  const getProfitColor = (profit) => {
    if (profit > 1000) return "text-emerald-600";
    if (profit > 0) return "text-amber-600";
    return "text-red-600";
  };

  // Pagination controls for "all" tab
  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchAll(pagination.page + 1, pagination.limit);
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      fetchAll(pagination.page - 1, pagination.limit);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchAll(page, pagination.limit);
    }
  };

  const showingStart = (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min(pagination.page * pagination.limit, pagination.totalCount || 0);

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
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                <ShoppingBag className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Sale Report
                </h1>
                <p className="text-gray-600 mt-2">Track revenue, sales, and profit margins</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                title="Export to Excel"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-blue-600">{totalSales}</p>
              </div>
              <div className="p-3 bg-blue-100/80 rounded-xl">
                <ShoppingBag size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-emerald-100/80 rounded-xl">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${totalProfit.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-amber-100/80 rounded-xl">
                <TrendingUp size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-violet-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600">
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100/80 rounded-xl">
                <Percent size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTab("perDate")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                tab === "perDate"
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
                  : "bg-white/60 text-gray-700 hover:bg-white/80"
              }`}
            >
              <Calendar size={18} />
              Daily Report
            </button>
            
            <button
              onClick={() => setTab("perMonth")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                tab === "perMonth"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "bg-white/60 text-gray-700 hover:bg-white/80"
              }`}
            >
              <TrendingUp size={18} />
              Monthly Report
            </button>
            
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                tab === "all"
                  ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg"
                  : "bg-white/60 text-gray-700 hover:bg-white/80"
              }`}
            >
              <BarChart3 size={18} />
              All Records
            </button>
          </div>

          {/* Filter Controls */}
          <div className="mb-6">
            {tab === "perDate" && (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Select Month
                    </div>
                  </label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Package size={16} />
                      Shop
                    </div>
                  </label>
                  <select
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-transparent min-w-48"
                  >
                    <option value="">All Shops</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-sm bg-white/50 px-4 py-3 rounded-xl border border-white/40">
                  <span className="font-medium text-gray-700">Viewing:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            )}

            {tab === "perMonth" && (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Select Year
                    </div>
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="2000"
                    max="2100"
                    className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent w-32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Package size={16} />
                      Shop
                    </div>
                  </label>
                  <select
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent min-w-48"
                  >
                    <option value="">All Shops</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-sm bg-white/50 px-4 py-3 rounded-xl border border-white/40">
                  <span className="font-medium text-gray-700">Viewing:</span>
                  <span className="ml-2 text-gray-600">
                    Year {year}
                  </span>
                </div>
              </div>
            )}

            {tab === "all" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Start Date
                    </div>
                  </label>
                  <input
                    type="date"
                    value={range.startDate}
                    onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      End Date
                    </div>
                  </label>
                  <input
                    type="date"
                    value={range.endDate}
                    onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Package size={16} />
                      Shop
                    </div>
                  </label>
                  <select
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
                  >
                    <option value="">All Shops</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => fetchAll(1, pagination.limit)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Filter size={18} />
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading sales data...</p>
              </div>
            </div>
          ) : (
            <>
              {tab === "perDate" && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {daysOfMonth.map(d => {
                    const stats = perDateMap[d.key] || { saleCount: 0, totalAmount: 0, totalCost: 0 };
                    const profit = stats.totalAmount - stats.totalCost;
                    const isToday = new Date().toLocaleDateString("en-CA").slice(0, 10) === d.key;
                    
                    return (
                      <div 
                        key={d.key} 
                        className={`${getDayColor(stats)} border border-white/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                          isToday ? "ring-2 ring-emerald-500/50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-800">{d.day}</span>
                            <span className="text-xs text-gray-500">{d.weekday}</span>
                          </div>
                          {stats.saleCount > 0 && (
                            <div className={`p-1.5 ${profit > 0 ? 'bg-emerald-100' : 'bg-red-100'} rounded-lg`}>
                              {getProfitIcon(profit)}
                            </div>
                          )}
                        </div>
                        
                        {stats.saleCount > 0 ? (
                          <>
                            <div className="mb-2">
                              <div className="text-xs text-gray-500">Sales</div>
                              <div className="text-sm font-semibold text-gray-800">{stats.saleCount}</div>
                            </div>
                            <div className="mb-2">
                              <div className="text-xs text-gray-500">Revenue</div>
                              <div className="text-sm font-medium text-blue-600">
                                ${stats.totalAmount.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Profit</div>
                              <div className={`text-sm font-bold ${getProfitColor(profit)} flex items-center gap-1`}>
                                {getProfitIcon(profit)}
                                ${profit.toFixed(2)}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-3">
                            <div className="text-xs text-gray-400">No sales</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "perMonth" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 12 }, (_, i) => {
                    const row = perMonthRows.find(r => Number(r.month) === i + 1) || { saleCount: 0, totalAmount: 0, totalCost: 0 };
                    const profit = Number(row.totalAmount || 0) - Number(row.totalCost || 0);
                    const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === year;
                    
                    return (
                      <div 
                        key={i} 
                        className={`${getMonthColor(i)} border border-white/40 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                          isCurrentMonth ? "ring-2 ring-blue-500/50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {new Date(0, i).toLocaleString("en-US", { month: "short" })}
                          </h3>
                          {row.saleCount > 0 && (
                            <div className={`p-2 ${profit > 0 ? 'bg-emerald-100/80' : 'bg-red-100/80'} rounded-xl`}>
                              {getProfitIcon(profit)}
                            </div>
                          )}
                        </div>
                        
                        {row.saleCount > 0 ? (
                          <>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Sales</span>
                                <span className="font-bold text-gray-800">{row.saleCount}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Revenue</span>
                                <span className="font-medium text-blue-600">
                                  ${Number(row.totalAmount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Cost</span>
                                <span className="text-sm font-medium text-red-600">
                                  ${Number(row.totalCost || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-white/40">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Profit</span>
                                  <span className={`font-bold ${getProfitColor(profit)} flex items-center gap-1`}>
                                    {getProfitIcon(profit)}
                                    ${profit.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6">
                            <div className="p-3 bg-gray-100/50 rounded-xl inline-block mb-3">
                              <ShoppingBag size={20} className="text-gray-400" />
                            </div>
                            <div className="text-sm text-gray-400">No sales</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "all" && (
                <>
                  <div className="overflow-hidden rounded-xl border border-white/60 mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Date</th>
                          <th className="p-4 text-left font-medium text-gray-700">Sales</th>
                          <th className="p-4 text-left font-medium text-gray-700">Revenue</th>
                          <th className="p-4 text-left font-medium text-gray-700">Cost</th>
                          <th className="p-4 text-left font-medium text-gray-700">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRows.map((r, idx) => {
                          const profit = Number(r.totalAmount || 0) - Number(r.totalCost || 0);
                          return (
                            <tr 
                              key={idx} 
                              className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                                idx % 2 === 0 ? 'bg-white/10' : ''
                              }`}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span className="font-medium">
                                    {new Date(r.date).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                                  <ShoppingBag size={12} />
                                  {r.saleCount}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <DollarSign size={14} className="text-emerald-500" />
                                  <span className="font-bold text-emerald-600">
                                    ${Number(r.totalAmount || 0).toFixed(2)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm font-medium text-red-600">
                                  ${Number(r.totalCost || 0).toFixed(2)}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className={`flex items-center gap-2 font-bold ${getProfitColor(profit)}`}>
                                  {getProfitIcon(profit)}
                                  ${profit.toFixed(2)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {allRows.length > 0 && (
                    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {/* Items per page selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show:</span>
                            <select
                              value={pagination.limit}
                              onChange={(e) => {
                                const newLimit = Number(e.target.value);
                                setPagination(prev => ({ ...prev, limit: newLimit }));
                                fetchAll(1, newLimit);
                              }}
                              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            >
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                          </div>

                          {/* Page info */}
                          <div className="text-sm text-gray-700">
                            Showing <span className="font-semibold">{showingStart}</span> to{" "}
                            <span className="font-semibold">{showingEnd}</span> of{" "}
                            <span className="font-semibold">{pagination.totalCount || 0}</span> records
                          </div>
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center gap-2">
                          {/* First page */}
                          <button
                            onClick={() => goToPage(1)}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="First page"
                          >
                            <ChevronsLeft size={16} className="text-gray-600" />
                          </button>

                          {/* Previous page */}
                          <button
                            onClick={prevPage}
                            disabled={pagination.page <= 1}
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
                                  onClick={() => goToPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    pagination.page === pageNum
                                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
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
                                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
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
                            onClick={nextPage}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Next page"
                          >
                            <ChevronRight size={16} className="text-gray-600" />
                          </button>

                          {/* Last page */}
                          <button
                            onClick={() => goToPage(pagination.totalPages)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Last page"
                          >
                            <ChevronsRight size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {allRows.length === 0 && (
                    <div className="text-center py-12">
                      <div className="p-4 bg-white/50 rounded-2xl inline-block mb-4">
                        <ShoppingBag size={48} className="text-gray-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sales Records</h3>
                      <p className="text-gray-600">
                        {range.startDate || range.endDate 
                          ? "No sales found for the selected date range." 
                          : "No sales records available."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleReport;
