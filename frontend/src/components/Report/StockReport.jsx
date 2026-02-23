import { useEffect, useMemo, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import {
  Package,
  Layers,
  Building,
  Store,
  Factory,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image as ImageIcon,
  Box,
  AlertCircle,
  CheckCircle,
  Grid3x3,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Hash,
  Gauge,
  AlertTriangle,
  RefreshCw,
  Eye,
  MapPin
} from "lucide-react";

const StockReport = () => {
  const [tab, setTab] = useState("products");
  const [placeType, setPlaceType] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [places, setPlaces] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStock: 0,
    scrapCount: 0
  });
  const token = localStorage.getItem("token");

  const placeLabel = useMemo(() => {
    if (placeType === "store") return "Store";
    if (placeType === "shop") return "Shop";
    if (placeType === "factory") return "Factory";
    return "All Locations";
  }, [placeType]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchPlaces = async (type) => {
    if (!type) {
      setPlaces([]);
      return;
    }
    try {
      const endpoint = type === "store" ? API_ROUTES.STORES : type === "shop" ? API_ROUTES.SHOPS : API_ROUTES.FACTORIES;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching places:', error);
      setPlaces([]);
    }
  };

  const fetchRows = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (placeType) params.append("placeType", placeType);
      if (placeId) params.append("placeId", placeId);
      params.append("page", page);
      params.append("limit", limit);
      const endpoint = tab === "products" ? API_ROUTES.REPORT_STOCK_PRODUCTS : API_ROUTES.REPORT_STOCK_MATERIALS;
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRows(data.rows || []);
      setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
      
      // Calculate statistics
      const totalStock = data.rows?.reduce((sum, r) => sum + Number(r.stock || 0), 0) || 0;
      const scrapCount = data.rows?.reduce((sum, r) => sum + Number(r.scrap || 0), 0) || 0;
      const lowStock = data.rows?.filter(r => Number(r.stock || 0) < 10).length || 0;
      
      setStats({
        totalItems: data.rows?.length || 0,
        totalStock,
        lowStock,
        scrapCount
      });
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, pagination.limit);
  }, [tab]);

  useEffect(() => {
    setPlaceId("");
    fetchPlaces(placeType);
  }, [placeType]);

  const applyFilter = () => {
    fetchRows(1, pagination.limit);
  };

  const getStockStatus = (stock) => {
    if (stock <= 0) return { 
      text: 'Out of Stock', 
      color: 'bg-gradient-to-r from-rose-500 to-red-500',
      icon: <AlertCircle size={12} />,
      bg: 'bg-rose-50',
      textColor: 'text-rose-700'
    };
    if (stock <= 10) return { 
      text: 'Low Stock', 
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
      icon: <AlertTriangle size={12} />,
      bg: 'bg-amber-50',
      textColor: 'text-amber-700'
    };
    return { 
      text: 'In Stock', 
      color: 'bg-gradient-to-r from-emerald-500 to-green-500',
      icon: <CheckCircle size={12} />,
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    };
  };

  const getPlaceIcon = (type) => {
    switch(type) {
      case 'store': return <Building size={18} className="text-purple-600" />;
      case 'shop': return <Store size={18} className="text-blue-600" />;
      case 'factory': return <Factory size={18} className="text-amber-600" />;
      default: return <MapPin size={18} className="text-gray-600" />;
    }
  };

  const handleExport = () => {
    alert("Export functionality would be implemented here");
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

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Stock Report
                </h1>
                <p className="text-gray-600 mt-2">Monitor inventory levels across all locations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.totalItems}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Package size={24} className="text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
              <TrendingUp size={12} />
              Across all locations
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStock.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Box size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
              <TrendingUp size={12} />
              Units available
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} />
              Needs attention
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-rose-50/60 to-red-50/60 border border-white/40 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Damage/Scrap</p>
                <p className="text-2xl font-bold text-rose-600">{stats.scrapCount}</p>
              </div>
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
            </div>
            <div className="mt-3 text-xs text-rose-600 flex items-center gap-1">
              <TrendingDown size={12} />
              Needs disposal
            </div>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filter Stock Report</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTab("products")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${tab === "products" 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                  : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
              >
                <Package size={18} />
                Products
              </button>
              
              <button
                onClick={() => setTab("materials")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${tab === "materials" 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                  : "bg-white/60 text-gray-700 hover:bg-white/80"}`}
              >
                <Layers size={18} />
                Materials
              </button>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    Location Type
                  </div>
                </label>
                <select
                  value={placeType}
                  onChange={(e) => setPlaceType(e.target.value)}
                  className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                >
                  <option value="">All Places</option>
                  <option value="store">Store</option>
                  <option value="shop">Shop</option>
                  <option value="factory">Factory</option>
                </select>
              </div>
              
              {placeType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      {getPlaceIcon(placeType)}
                      {placeLabel} Selection
                    </div>
                  </label>
                  <select
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    className="w-full backdrop-blur-sm bg-white/80 border border-white/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 transition-all duration-300"
                  >
                    <option value="">All {placeLabel}s</option>
                    {places.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex items-end">
                <button
                  onClick={applyFilter}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full"
                >
                  <Filter size={18} />
                  Apply Filters
                </button>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
              <RefreshCw size={14} />
              Showing {stats.totalItems} items • {placeType ? `${placeLabel}${placeId ? ' specific' : 's'}` : 'All locations'}
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading stock data...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Item Details</th>
                      <th className="p-4 text-left font-medium text-gray-700">Product Info</th>
                      <th className="p-4 text-left font-medium text-gray-700">Stock Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Damage/Scrap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const imageUrl = getImageUrl(r.image);
                      const stock = Number(r.stock || 0);
                      const scrap = Number(r.scrap || 0);
                      const stockText = r.unit ? `${stock} ${r.unit}` : stock.toLocaleString();
                      const stockStatus = getStockStatus(stock);
                      
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
                                {r.brand && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Tag size={12} className="text-gray-400" />
                                    <p className="text-xs text-gray-500">{r.brand}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-600">Category</p>
                                <p className="font-medium">{r.category || "No category"}</p>
                              </div>
                              {r.sku && (
                                <div className="flex items-center gap-2">
                                  <Hash size={12} className="text-gray-400" />
                                  <p className="text-xs text-gray-500">{r.sku}</p>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-3">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${stockStatus.color}`}>
                                {stockStatus.icon}
                                {stockStatus.text}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Box size={14} className="text-blue-500" />
                                  <span className="text-sm text-gray-600">Current Stock:</span>
                                </div>
                                <span className="font-bold text-lg text-blue-600">{stockText}</span>
                              </div>
                              {stock <= 10 && stock > 0 && (
                                <div className="text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  Low stock warning
                                </div>
                              )}
                              {stock <= 0 && (
                                <div className="text-xs text-rose-600 flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  Out of stock
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={14} className="text-rose-500" />
                                  <span className="text-sm text-gray-600">Damage/Scrap:</span>
                                </div>
                                <span className={`font-bold text-lg ${scrap > 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                                  {scrap}
                                </span>
                              </div>
                              {scrap > 0 && (
                                <div className="text-xs text-rose-600 flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  Requires attention
                                </div>
                              )}
                              {scrap === 0 && (
                                <div className="text-xs text-emerald-600 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  No damage reported
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {rows.length === 0 && !loading && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white/50 rounded-xl">
                              <Package size={48} className="text-gray-300" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Stock Data Found</h3>
                              <p className="text-gray-600">Try adjusting your filters or select a different location</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {rows.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockReport;