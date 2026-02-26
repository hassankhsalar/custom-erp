import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Factory,
  Filter,
  Calendar,
  Download,
  BarChart3,
  Package,
  Layers,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Percent,
  Scissors,
  PackageOpen,
  RefreshCw,
  Eye
} from "lucide-react";

const WastageReport = () => {
  const [tab, setTab] = useState("materials");
  const [factories, setFactories] = useState([]);
  const [factoryId, setFactoryId] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalUsed: 0,
    totalProduced: 0,
    totalScrap: 0,
    avgWastage: 0
  });
  
  const token = localStorage.getItem("token");

  const formatDateTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const buildWastageParams = (page, limit) => {
    const params = new URLSearchParams();
    params.append("factoryId", factoryId);
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    return params;
  };

  const fetchFactories = async () => {
    try {
      const res = await fetch(API_ROUTES.FACTORIES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFactories(activeOnly(Array.isArray(data) ? data : data?.factories || []));
    } catch (error) {
      console.error('Error fetching factories:', error);
    }
  };

  const fetchRows = async (page = 1, limit = 10) => {
    if (!factoryId) return;
    
    setLoading(true);
    try {
      const params = buildWastageParams(page, limit);
      
      const endpoint = tab === "materials"
        ? API_ROUTES.REPORT_WASTAGE_MATERIALS
        : API_ROUTES.REPORT_WASTAGE_PRODUCTS;
      
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      setRows(activeOnly(data.rows || []));
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching wastage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRowsForExport = async () => {
    if (!factoryId) return [];

    const endpoint = tab === "materials"
      ? API_ROUTES.REPORT_WASTAGE_MATERIALS
      : API_ROUTES.REPORT_WASTAGE_PRODUCTS;
    const limit = 500;
    let page = 1;
    let totalPages = 1;
    const all = [];

    while (page <= totalPages) {
      const params = buildWastageParams(page, limit);
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const batch = activeOnly(data.rows || []);
      all.push(...batch);
      totalPages = Number(data.pagination?.totalPages || 1);
      page += 1;
      if (batch.length === 0) break;
    }

    return all;
  };

  const calculateSummary = (data) => {
    let totalUsed = 0;
    let totalProduced = 0;
    let totalScrap = 0;
    let totalWastage = 0;
    let count = 0;

    data.forEach(item => {
      if (tab === "materials") {
        totalUsed += Number(item.totalUsed || 0);
        totalScrap += Number(item.totalScrap || 0);
        totalWastage += Number(item.scrapPercent || 0);
      } else {
        totalProduced += Number(item.totalProduced || 0);
        totalScrap += Number(item.totalScrap || 0);
        totalWastage += Number(item.scrapPercent || 0);
      }
      count++;
    });

    setSummary({
      totalUsed,
      totalProduced,
      totalScrap,
      avgWastage: count > 0 ? totalWastage / count : 0
    });
  };

  const fetchOverviewSummary = async () => {
    const allRows = await fetchAllRowsForExport();
    calculateSummary(allRows || []);
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    if (!factoryId) return;
    fetchRows(1, pagination.limit);
    fetchOverviewSummary();
  }, [factoryId, tab]);

  const applyFilter = () => {
    if (!factoryId) {
      alert("Please select a factory first");
      return;
    }
    fetchRows(1, pagination.limit);
    fetchOverviewSummary();
  };

  const resetFilters = () => {
    setDateRange({ startDate: "", endDate: "" });
    setFactoryId("");
    setRows([]);
    setSummary({ totalUsed: 0, totalProduced: 0, totalScrap: 0, avgWastage: 0 });
  };

  const handleExport = async () => {
    const exportRows = await fetchAllRowsForExport();
    if (!exportRows.length) return;

    const factoryName = getFactoryName();
    const rangeLabel = dateRange.startDate || dateRange.endDate
      ? `${dateRange.startDate || "Start"} to ${dateRange.endDate || "End"}`
      : "All Dates";

    const header = tab === "materials"
      ? ["Factory", "Material ID", "Material Name", "Brand", "Unit", "Total Used", "Total Scrap", "Wastage %", "Current Scrap"]
      : ["Factory", "Product ID", "Product Name", "Category", "Total Produced", "Total Scrap", "Wastage %", "Current Scrap"];

    const body = tab === "materials"
      ? exportRows.map((r) => [
          factoryName,
          r.materialId,
          r.name,
          r.brand || "",
          r.unit || "",
          Number(r.totalUsed || 0),
          Number(r.totalScrap || 0),
          Number(r.scrapPercent || 0),
          Number(r.currentScrap || 0)
        ])
      : exportRows.map((r) => [
          factoryName,
          r.productId,
          r.name,
          r.category || "",
          Number(r.totalProduced || 0),
          Number(r.totalScrap || 0),
          Number(r.scrapPercent || 0),
          Number(r.currentScrap || 0)
        ]);

    const rowsForExcel = [
      ["Factory", factoryName],
      ["Date Range", rangeLabel],
      ["Exported At", formatDateTime(new Date())],
      [],
      header,
      ...body
    ];

    downloadExcelFile({
      sheetName: tab === "materials" ? "Material Wastage" : "Product Wastage",
      fileName: `wastage_report_${tab}_${factoryName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`,
      rows: rowsForExcel
    });
  };

  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchRows(pagination.page + 1, pagination.limit);
    }
  };

  const prevPage = () => {
    if (pagination.page > 1) {
      fetchRows(pagination.page - 1, pagination.limit);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchRows(page, pagination.limit);
    }
  };

  const getWastageColor = (percentage) => {
    if (percentage <= 5) return "text-emerald-600 bg-emerald-50";
    if (percentage <= 10) return "text-amber-600 bg-amber-50";
    if (percentage <= 15) return "text-orange-600 bg-orange-50";
    return "text-rose-600 bg-rose-50";
  };

  const getFactoryName = () => {
    const factory = factories.find(f => String(f.id) === String(factoryId));
    return factory ? factory.name : "No factory selected";
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-emerald-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <Scissors className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Wastage Report
                </h1>
                <p className="text-gray-600 mt-2">
                  {factoryId ? `Analyzing wastage for ${getFactoryName()}` : "Select a factory to analyze wastage"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <RefreshCw size={18} />
                Reset
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTab("materials")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "materials" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <Layers size={18} />
              Material Wastage
            </button>
            
            <button
              onClick={() => setTab("products")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "products" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <PackageOpen size={18} />
              Product Wastage
            </button>
          </div>

          {/* Filters Card */}
          <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Filter size={20} className="text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">Filter Report</h3>
              </div>
              <div className="text-sm text-gray-600">
                {loading ? "Loading data..." : "Ready to analyze"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Factory Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Factory size={14} />
                    Select Factory
                  </div>
                </label>
                <select
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value)}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                >
                  <option value="">Select Factory</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    Start Date
                  </div>
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    End Date
                  </div>
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                />
              </div>

              {/* Apply Button */}
              <button
                onClick={applyFilter}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-[46px]"
              >
                <Filter size={18} />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {factoryId && rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {tab === "materials" ? "Total Used" : "Total Produced"}
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {tab === "materials" 
                        ? summary.totalUsed.toLocaleString()
                        : summary.totalProduced.toLocaleString()
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Package size={24} className="text-emerald-600" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp size={12} />
                  {tab === "materials" ? "Total material consumption" : "Total production volume"}
                </div>
              </div>
              
              <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Scrap</p>
                    <p className="text-2xl font-bold text-amber-600">{summary.totalScrap.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <AlertCircle size={24} className="text-amber-600" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                  <TrendingDown size={12} />
                  {tab === "materials" ? "Material wastage" : "Product defects"}
                </div>
              </div>
              
              <div className="backdrop-blur-lg bg-gradient-to-br from-rose-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Wastage</p>
                    <p className="text-2xl font-bold text-rose-600">{summary.avgWastage.toFixed(2)}%</p>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-xl">
                    <Percent size={24} className="text-rose-600" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-rose-600 flex items-center gap-1">
                  <BarChart3 size={12} />
                  Average across all items
                </div>
              </div>
              
              <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Items Analyzed</p>
                    <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Layers size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
                  <Eye size={12} />
                  Number of items in report
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!factoryId ? (
            <div className="flex flex-col items-center justify-center py-12 backdrop-blur-sm bg-white/40 border border-white/40 rounded-2xl p-8">
              <div className="p-6 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl mb-6">
                <Factory size={64} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Select a Factory</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Please select a factory from the dropdown above to view detailed wastage analysis and performance metrics.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info size={14} />
                <span>Select a factory to begin analysis</span>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading wastage data...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 backdrop-blur-sm bg-white/40 border border-white/40 rounded-2xl p-8">
              <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-6">
                <PackageOpen size={64} className="text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Data Available</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                No wastage data found for the selected filters. Try adjusting your date range or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Data Table */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      {tab === "materials" ? (
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Material</th>
                          <th className="p-4 text-left font-medium text-gray-700">Brand</th>
                          <th className="p-4 text-left font-medium text-gray-700">Total Used</th>
                          <th className="p-4 text-left font-medium text-gray-700">Total Scrap</th>
                          <th className="p-4 text-left font-medium text-gray-700">Wastage %</th>
                          <th className="p-4 text-left font-medium text-gray-700">Current Scrap</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Product</th>
                          <th className="p-4 text-left font-medium text-gray-700">Category</th>
                          <th className="p-4 text-left font-medium text-gray-700">Total Produced</th>
                          <th className="p-4 text-left font-medium text-gray-700">Total Scrap</th>
                          <th className="p-4 text-left font-medium text-gray-700">Wastage %</th>
                          <th className="p-4 text-left font-medium text-gray-700">Current Scrap</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          idx % 2 === 0 ? 'bg-white/10' : ''
                        }`}>
                          {tab === "materials" ? (
                            <>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                                    <Layers size={18} className="text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{r.name}</p>
                                    <p className="text-xs text-gray-500">Material</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {r.brand || "No Brand"}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Package size={14} className="text-gray-400" />
                                  <span className="font-bold text-lg text-gray-800">{Number(r.totalUsed || 0).toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={14} className="text-amber-500" />
                                  <span className="font-bold text-lg text-amber-600">{Number(r.totalScrap || 0).toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getWastageColor(Number(r.scrapPercent || 0))}`}>
                                  <Percent size={14} />
                                  <span className="font-bold">{Number(r.scrapPercent || 0).toFixed(2)}%</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Scissors size={14} className="text-rose-500" />
                                  <span className="font-bold text-lg text-rose-600">{Number(r.currentScrap || 0).toLocaleString()}</span>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center">
                                    <PackageOpen size={18} className="text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{r.name}</p>
                                    <p className="text-xs text-gray-500">Product</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {r.category || "No Category"}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Package size={14} className="text-gray-400" />
                                  <span className="font-bold text-lg text-gray-800">{Number(r.totalProduced || 0).toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={14} className="text-amber-500" />
                                  <span className="font-bold text-lg text-amber-600">{Number(r.totalScrap || 0).toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getWastageColor(Number(r.scrapPercent || 0))}`}>
                                  <Percent size={14} />
                                  <span className="font-bold">{Number(r.scrapPercent || 0).toFixed(2)}%</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Scissors size={14} className="text-rose-500" />
                                  <span className="font-bold text-lg text-rose-600">{Number(r.currentScrap || 0).toLocaleString()}</span>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {rows.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={pagination.limit}
                          onChange={(e) => {
                            fetchRows(1, Number(e.target.value));
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
                          {Math.min(pagination.page * pagination.limit, rows.length)}
                        </span>{" "}
                        of <span className="font-semibold">{rows.length}</span> items
                      </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      {/* First page */}
                      <button
                        onClick={() => goToPage(1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Previous page */}
                      <button
                        onClick={prevPage}
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
                              onClick={() => goToPage(pageNum)}
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
                              onClick={() => goToPage(pagination.totalPages)}
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
                        onClick={nextPage}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

                      {/* Last page */}
                      <button
                        onClick={() => goToPage(pagination.totalPages)}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for Info icon
const Info = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export default WastageReport;
