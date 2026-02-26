import { useEffect, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { activeOnly } from "../../utils/softDelete";
import { downloadExcelFile } from "../../utils/excelExport";
import {
  Truck,
  Package,
  Building,
  Store,
  Factory,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image as ImageIcon,
  Layers,
  DollarSign,
  MapPin,
  Box,
  Repeat,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Grid3x3,
  Eye
} from "lucide-react";

const TransferReport = () => {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [overview, setOverview] = useState({ totalCount: 0, byStatus: {}, from: { shops: [], stores: [], factories: [] }, to: { shops: [], stores: [], factories: [] } });
  const [topSender, setTopSender] = useState([]);
  const [topReceiver, setTopReceiver] = useState([]);
  const [topMode, setTopMode] = useState("transfer");
  const [topItems, setTopItems] = useState([]);
  const [topItemsPagination, setTopItemsPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const withRange = (params) => {
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    return params;
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const params = withRange(new URLSearchParams());
      const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_OVERVIEW}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOverview(data);
    } catch (error) {
      console.error('Error fetching transfer overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopSender = async () => {
    setLoading(true);
    try {
      const params = withRange(new URLSearchParams());
      params.append("mode", topMode);
      const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_SENDER}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTopSender(activeOnly(data.rows || []));
    } catch (error) {
      console.error('Error fetching top sender:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopReceiver = async () => {
    setLoading(true);
    try {
      const params = withRange(new URLSearchParams());
      params.append("mode", topMode);
      const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_RECEIVER}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTopReceiver(activeOnly(data.rows || []));
    } catch (error) {
      console.error('Error fetching top receiver:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopItems = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params = withRange(new URLSearchParams());
      params.append("page", page);
      params.append("limit", limit);
      const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_ITEMS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTopItems(activeOnly(data.rows || []));
      setTopItemsPagination(data.pagination || { page: 1, limit, totalPages: 1, totalCount: 0 });
    } catch (error) {
      console.error('Error fetching top items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (tab === "topSender") fetchTopSender();
    if (tab === "topReceiver") fetchTopReceiver();
    if (tab === "topItems") fetchTopItems(1, topItemsPagination.limit);
  }, [tab]);

  const applyFilter = () => {
    if (tab === "overview") fetchOverview();
    if (tab === "topSender") fetchTopSender();
    if (tab === "topReceiver") fetchTopReceiver();
    if (tab === "topItems") fetchTopItems(1, topItemsPagination.limit);
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: { bg: 'from-emerald-100 to-green-100', text: 'text-emerald-700', icon: <CheckCircle size={14} /> },
      pending: { bg: 'from-amber-100 to-orange-100', text: 'text-amber-700', icon: <Clock size={14} /> },
      in_transit: { bg: 'from-blue-100 to-cyan-100', text: 'text-blue-700', icon: <Truck size={14} /> },
      cancelled: { bg: 'from-rose-100 to-red-100', text: 'text-rose-700', icon: <AlertCircle size={14} /> }
    };
    return colors[status] || { bg: 'from-gray-100 to-slate-100', text: 'text-gray-700', icon: <AlertCircle size={14} /> };
  };

  const getLocationIcon = (type) => {
    switch(type) {
      case 'shop': return <Store size={14} className="text-blue-500" />;
      case 'store': return <Building size={14} className="text-purple-500" />;
      case 'factory': return <Factory size={14} className="text-amber-500" />;
      default: return <MapPin size={14} className="text-gray-500" />;
    }
  };

  const getLocationColor = (type) => {
    switch(type) {
      case 'shop': return 'from-blue-50/60 to-cyan-50/60';
      case 'store': return 'from-purple-50/60 to-violet-50/60';
      case 'factory': return 'from-amber-50/60 to-orange-50/60';
      default: return 'from-gray-50/60 to-slate-50/60';
    }
  };

  const handleExport = () => {
    const fileDate = new Date().toISOString().split("T")[0];

    if (tab === "overview") {
      const rows = [
        ["Metric", "Value"],
        ["Total Transfers", Number(overview.totalCount || 0)],
        ...Object.entries(overview.byStatus || {}).map(([status, count]) => [`Status: ${status}`, Number(count || 0)])
      ];
      downloadExcelFile({
        sheetName: "Transfer Overview",
        fileName: `transfer_overview_${fileDate}.xls`,
        rows
      });
      return;
    }

    if (tab === "topSender") {
      const rows = [
        ["Place Type", "Place Name", "Transfers", "Items", "Item Types", "Shipping Cost"],
        ...topSender.map((r) => [
          r.placeType || "",
          r.placeName || "",
          Number(r.totalTransfers || 0),
          Number(r.totalItems || 0),
          Number(r.itemTypeCount || 0),
          Number(r.totalShippingCost || 0)
        ])
      ];
      downloadExcelFile({
        sheetName: "Top Sender",
        fileName: `transfer_top_sender_${fileDate}.xls`,
        rows
      });
      return;
    }

    if (tab === "topReceiver") {
      const rows = [
        ["Place Type", "Place Name", "Transfers", "Items", "Item Types", "Shipping Cost"],
        ...topReceiver.map((r) => [
          r.placeType || "",
          r.placeName || "",
          Number(r.totalTransfers || 0),
          Number(r.totalItems || 0),
          Number(r.itemTypeCount || 0),
          Number(r.totalShippingCost || 0)
        ])
      ];
      downloadExcelFile({
        sheetName: "Top Receiver",
        fileName: `transfer_top_receiver_${fileDate}.xls`,
        rows
      });
      return;
    }

    const fetchAllTopItemsForExport = async () => {
      const limit = 500;
      let page = 1;
      let totalPages = 1;
      const allRows = [];

      while (page <= totalPages) {
        const params = withRange(new URLSearchParams());
        params.append("page", String(page));
        params.append("limit", String(limit));
        const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_ITEMS}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const batch = activeOnly(data.rows || []);
        allRows.push(...batch);
        totalPages = Number(data.pagination?.totalPages || 1);
        page += 1;
        if (batch.length === 0) break;
      }

      const rows = [
        ["Item Type", "Item ID", "Item Name", "Category", "Unit", "Quantity Transferred"],
        ...allRows.map((r) => [
          r.itemType || "",
          r.itemId || "",
          r.name || "",
          r.category || "",
          r.unit || "",
          Number(r.totalQty || 0)
        ])
      ];

      downloadExcelFile({
        sheetName: "Top Items",
        fileName: `transfer_top_items_${fileDate}.xls`,
        rows
      });
    };

    fetchAllTopItemsForExport().catch((error) => {
      console.error("Error exporting all top items:", error);
    });
  };

  const nextPage = () => {
    if (topItemsPagination.page < topItemsPagination.totalPages) {
      fetchTopItems(topItemsPagination.page + 1, topItemsPagination.limit);
    }
  };

  const prevPage = () => {
    if (topItemsPagination.page > 1) {
      fetchTopItems(topItemsPagination.page - 1, topItemsPagination.limit);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= topItemsPagination.totalPages) {
      fetchTopItems(page, topItemsPagination.limit);
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <Truck className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Transfer Report
                </h1>
                <p className="text-gray-600 mt-2">Track and analyze inventory transfers between locations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTab("overview")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "overview" 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <BarChart3 size={18} />
              Overview
            </button>
            
            <button
              onClick={() => setTab("topSender")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "topSender" 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <ArrowUpRight size={18} />
              Top Sender
            </button>
            
            <button
              onClick={() => setTab("topReceiver")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "topReceiver" 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <ArrowDownRight size={18} />
              Top Receiver
            </button>
            
            <button
              onClick={() => setTab("topItems")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${tab === "topItems" 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
            >
              <Package size={18} />
              Top Items
            </button>
          </div>

          {/* Filters */}
          <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Filter size={20} className="text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-800">Filter Date Range</h3>
              </div>
              <div className="text-sm text-gray-600">
                {loading ? "Loading data..." : "Ready to filter"}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 transition-all duration-300"
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
                    className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 transition-all duration-300"
                  />
                </div>
              </div>

              {(tab === "topSender" || tab === "topReceiver") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} />
                      Analysis Mode
                    </div>
                  </label>
                  <select
                    value={topMode}
                    onChange={(e) => setTopMode(e.target.value)}
                    className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 transition-all duration-300"
                  >
                    <option value="transfer">Transfer Wise</option>
                    <option value="product">Product Wise</option>
                  </select>
                </div>
              )}

              <button
                onClick={applyFilter}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
              >
                <Filter size={18} />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading transfer data...</p>
              </div>
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Transfers</p>
                          <p className="text-2xl font-bold text-amber-600">{overview.totalCount || 0}</p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-xl">
                          <Truck size={24} className="text-amber-600" />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                        <TrendingUp size={12} />
                        Active inventory movement
                      </div>
                    </div>
                    
                    {Object.entries(overview.byStatus || {}).map(([status, count]) => {
                      const statusInfo = getStatusColor(status);
                      return (
                        <div key={status} className={`backdrop-blur-lg border border-white/40 rounded-2xl shadow-xl p-5 ${statusInfo.bg}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 capitalize">{status.replace("_", " ")}</p>
                              <p className="text-2xl font-bold text-gray-800">{count}</p>
                            </div>
                            <div className="p-3 bg-white/60 rounded-xl">
                              {statusInfo.icon}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transfer From & To Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Transfer From */}
                    <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <ArrowUpRight size={20} className="text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Transfer Sender</h3>
                      </div>
                      
                      {["shops", "stores", "factories"].map((group) => (
                        <div key={group} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            {getLocationIcon(group.slice(0, -1))}
                            <p className="text-sm font-medium text-gray-700 capitalize">{group}</p>
                            <span className="text-xs text-gray-500 ml-auto">
                              {(overview.from?.[group] || []).length} locations
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {(overview.from?.[group] || []).map(p => (
                              <div key={`${group}-${p.id}`} className={`backdrop-blur-sm border border-white/60 rounded-xl p-4 ${getLocationColor(group.slice(0, -1))}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getLocationIcon(group.slice(0, -1))}
                                    <p className="font-medium text-gray-800">{p.name}</p>
                                  </div>
                                  <span className="text-lg font-bold text-amber-600">{p.total}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {p.total} transfers initiated
                                </div>
                              </div>
                            ))}
                            
                            {(overview.from?.[group] || []).length === 0 && (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No data available for {group}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Destination */}
                    <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <ArrowDownRight size={20} className="text-emerald-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Transfer Reciever</h3>
                      </div>
                      
                      {["shops", "stores", "factories"].map((group) => (
                        <div key={group} className="mb-6 last:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            {getLocationIcon(group.slice(0, -1))}
                            <p className="text-sm font-medium text-gray-700 capitalize">{group}</p>
                            <span className="text-xs text-gray-500 ml-auto">
                              {(overview.to?.[group] || []).length} locations
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {(overview.to?.[group] || []).map(p => (
                              <div key={`${group}-${p.id}`} className={`backdrop-blur-sm border border-white/60 rounded-xl p-4 ${getLocationColor(group.slice(0, -1))}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getLocationIcon(group.slice(0, -1))}
                                    <p className="font-medium text-gray-800">{p.name}</p>
                                  </div>
                                  <span className="text-lg font-bold text-emerald-600">{p.total}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {p.total} transfers received
                                </div>
                              </div>
                            ))}
                            
                            {(overview.to?.[group] || []).length === 0 && (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No data available for {group}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "topSender" && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Place</th>
                          <th className="p-4 text-left font-medium text-gray-700">Transfers</th>
                          <th className="p-4 text-left font-medium text-gray-700">Items</th>
                          <th className="p-4 text-left font-medium text-gray-700">Item Types</th>
                          <th className="p-4 text-left font-medium text-gray-700">Shipping Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSender.map((r, idx) => (
                          <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            idx % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 flex items-center justify-center">
                                  <ArrowUpRight size={18} className="text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{r.placeName}</p>
                                  <p className="text-xs text-gray-500">Sender</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Truck size={14} className="text-amber-500" />
                                <span className="font-bold text-lg text-amber-600">{r.totalTransfers}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Package size={14} className="text-blue-500" />
                                <span className="font-bold text-lg text-blue-600">{Number(r.totalItems || 0)}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-purple-500" />
                                <span className="font-bold text-lg text-purple-600">{r.itemTypeCount}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-500" />
                                <span className="font-bold text-lg text-emerald-600">
                                  ${Number(r.totalShippingCost || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        
                        {topSender.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-white/50 rounded-xl">
                                  <ArrowUpRight size={48} className="text-gray-300" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sender Data Found</h3>
                                  <p className="text-gray-600">Try adjusting your filters or date range</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "topReceiver" && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-4 text-left font-medium text-gray-700">Place</th>
                          <th className="p-4 text-left font-medium text-gray-700">Transfers</th>
                          <th className="p-4 text-left font-medium text-gray-700">Items</th>
                          <th className="p-4 text-left font-medium text-gray-700">Item Types</th>
                          <th className="p-4 text-left font-medium text-gray-700">Shipping Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topReceiver.map((r, idx) => (
                          <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            idx % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
                                  <ArrowDownRight size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{r.placeName}</p>
                                  <p className="text-xs text-gray-500">Receiver</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Truck size={14} className="text-amber-500" />
                                <span className="font-bold text-lg text-amber-600">{r.totalTransfers}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Package size={14} className="text-blue-500" />
                                <span className="font-bold text-lg text-blue-600">{Number(r.totalItems || 0)}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Layers size={14} className="text-purple-500" />
                                <span className="font-bold text-lg text-purple-600">{r.itemTypeCount}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-500" />
                                <span className="font-bold text-lg text-emerald-600">
                                  ${Number(r.totalShippingCost || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        
                        {topReceiver.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-white/50 rounded-xl">
                                  <ArrowDownRight size={48} className="text-gray-300" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Receiver Data Found</h3>
                                  <p className="text-gray-600">Try adjusting your filters or date range</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "topItems" && (
                <div className="space-y-6">
                  <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-4 text-left font-medium text-gray-700">Item</th>
                            <th className="p-4 text-left font-medium text-gray-700">Category</th>
                            <th className="p-4 text-left font-medium text-gray-700">Quantity Transferred</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topItems.map((r, idx) => {
                            const imageUrl = getImageUrl(r.image);
                            const qty = r.unit ? `${Number(r.totalQty || 0)} ${r.unit}` : Number(r.totalQty || 0);
                            
                            return (
                              <tr key={idx} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                                idx % 2 === 0 ? 'bg-white/10' : ''
                              }`}>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                      {imageUrl ? (
                                        <img 
                                          src={imageUrl} 
                                          alt={r.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = `
                                              <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <ImageIcon size={16} class="text-gray-400" />
                                              </div>
                                            `;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                          <ImageIcon size={16} className="text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-800">{r.name}</p>
                                      <p className="text-xs text-gray-500">Item ID: {r.id || idx + 1}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <Tag size={14} className="text-gray-400" />
                                    <span className="font-medium">{r.category || "No category"}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <Box size={16} className="text-amber-500" />
                                    <span className="font-bold text-lg text-amber-600">{qty}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Most transferred item
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {topItems.length === 0 && (
                            <tr>
                              <td colSpan="3" className="p-8 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="p-4 bg-white/50 rounded-xl">
                                    <Package size={48} className="text-gray-300" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Item Data Found</h3>
                                    <p className="text-gray-600">Try adjusting your filters or date range</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {topItems.length > 0 && (
                    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {/* Items per page selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Show:</span>
                            <select
                              value={topItemsPagination.limit}
                              onChange={(e) => {
                                fetchTopItems(1, Number(e.target.value));
                              }}
                              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
                            Showing <span className="font-semibold">{(topItemsPagination.page - 1) * topItemsPagination.limit + 1}</span> to{" "}
                            <span className="font-semibold">
                              {Math.min(topItemsPagination.page * topItemsPagination.limit, topItemsPagination.totalCount || 0)}
                            </span>{" "}
                            of <span className="font-semibold">{topItemsPagination.totalCount || 0}</span> items
                          </div>
                        </div>

                        {/* Pagination buttons */}
                        <div className="flex items-center gap-2">
                          {/* First page */}
                          <button
                            onClick={() => goToPage(1)}
                            disabled={topItemsPagination.page === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="First page"
                          >
                            <ChevronsLeft size={16} className="text-gray-600" />
                          </button>

                          {/* Previous page */}
                          <button
                            onClick={prevPage}
                            disabled={topItemsPagination.page === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Previous page"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>

                          {/* Page numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, topItemsPagination.totalPages) }, (_, i) => {
                              let pageNum;
                              if (topItemsPagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (topItemsPagination.page <= 3) {
                                pageNum = i + 1;
                              } else if (topItemsPagination.page >= topItemsPagination.totalPages - 2) {
                                pageNum = topItemsPagination.totalPages - 4 + i;
                              } else {
                                pageNum = topItemsPagination.page - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    topItemsPagination.page === pageNum
                                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                      : "hover:bg-white/50 text-gray-700"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            {topItemsPagination.totalPages > 5 && topItemsPagination.page < topItemsPagination.totalPages - 2 && (
                              <>
                                <span className="mx-1 text-gray-400">...</span>
                                <button
                                  onClick={() => goToPage(topItemsPagination.totalPages)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    topItemsPagination.page === topItemsPagination.totalPages
                                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                      : "hover:bg-white/50 text-gray-700"
                                  }`}
                                >
                                  {topItemsPagination.totalPages}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Next page */}
                          <button
                            onClick={nextPage}
                            disabled={topItemsPagination.page === topItemsPagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Next page"
                          >
                            <ChevronRight size={16} className="text-gray-600" />
                          </button>

                          {/* Last page */}
                          <button
                            onClick={() => goToPage(topItemsPagination.totalPages)}
                            disabled={topItemsPagination.page === topItemsPagination.totalPages}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for Tag icon (missing in imports)
const Tag = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
    <path d="M7 7h.01"/>
  </svg>
);

export default TransferReport;
