import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  Layers,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Box,
  DollarSign,
  Tag,
  Archive,
  Trash2,
  Pencil,
  X,
  Store
} from 'lucide-react';
import { API_ROUTES } from '../../config';

const ShopInventory = () => {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, data: null });
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  const [editForm, setEditForm] = useState({ stock: '', sale_price: '', alert_quantity: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const token = localStorage.getItem('token');
  
  // Table states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [filters, setFilters] = useState({ searchTerm: '', filterType: 'all', sortBy: 'name', sortDir: 'asc', category: '', brand: '', unit: '' });
  const [appliedFilters, setAppliedFilters] = useState({ searchTerm: '', filterType: 'all', sortBy: 'name', sortDir: 'asc', category: '', brand: '', unit: '' });

  // Load shops on component mount
  useEffect(() => {
    fetchShops();
  }, []);

  // Load inventory when shop is selected
  useEffect(() => {
    if (selectedShop) {
      fetchInventory(selectedShop, 1);
      fetchSummary(selectedShop);
    }
  }, [selectedShop, itemsPerPage]);

  useEffect(() => {
    if (selectedShop) {
      fetchInventory(selectedShop, currentPage);
    }
  }, [currentPage]);

  const fetchShops = async () => {
    try {
      console.log('Fetching shops...');
      const response = await fetch(API_ROUTES.SHOPS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Shops fetched:', data);
      
      setShops(data);
      
      if (data.length > 0) {
        setSelectedShop(data[0].id);
      } else {
        setError('No shops found');
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
      setError(`Failed to load shops: ${err.message}`);
    }
  };

  const fetchInventory = async (shopId, page = 1, filterOverrides = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
        search: filterOverrides.searchTerm || '',
        filterType: filterOverrides.filterType || 'all',
        sortBy: filterOverrides.sortBy || 'name',
        sortDir: filterOverrides.sortDir || 'asc',
        category: filterOverrides.category || '',
        brand: filterOverrides.brand || '',
        unit: filterOverrides.unit || '',
      });
      const response = await fetch(`${API_ROUTES.SHOP_INVENTORY_LIST(shopId)}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInventory(data.items || []);
      setTotalItems(Number(data.pagination?.totalCount || 0));
      setServerTotalPages(Number(data.pagination?.totalPages || 1));
      setCurrentPage(Number(data.pagination?.page || page));
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(`Failed to load inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (shopId) => {
    try {
      const response = await fetch(API_ROUTES.SHOP_INVENTORY_SUMMARY(shopId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setSummary(null);
    }
  };

  const handleShopChange = (event) => {
    setSelectedShop(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    if (selectedShop) {
      fetchInventory(selectedShop, currentPage);
      fetchSummary(selectedShop);
    }
  };

  const openDetailsModal = (item) => {
    setModal({ isOpen: true, data: item });
  };

  const closeModal = () => {
    setModal({ isOpen: false, data: null });
  };

  const openEditModal = (item) => {
    setEditModal({ isOpen: true, data: item });
    setEditForm({
      stock: String(item.stock ?? ''),
      sale_price: item.sale_price === null || item.sale_price === undefined ? '' : String(item.sale_price),
      alert_quantity: item.alert_quantity === null || item.alert_quantity === undefined ? '' : String(item.alert_quantity),
    });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, data: null });
    setEditForm({ stock: '', sale_price: '', alert_quantity: '' });
    setSavingEdit(false);
  };

  const saveEditModal = async () => {
    if (!editModal.data || !selectedShop) return;
    try {
      setSavingEdit(true);
      setError(null);
      const response = await fetch(API_ROUTES.SHOP_INVENTORY_ITEM_UPDATE(selectedShop), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemType: editModal.data.type,
          itemId: editModal.data.id,
          stock: editForm.stock,
          sale_price: editForm.sale_price,
          alert_quantity: editForm.alert_quantity,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update inventory item');
      }

      await fetchInventory(selectedShop, currentPage);
      await fetchSummary(selectedShop);
      closeEditModal();
    } catch (err) {
      setError(err.message || 'Failed to update inventory item');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredInventory = inventory;
  const paginatedInventory = filteredInventory;

  const nextPage = () => {
    if (currentPage < serverTotalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= serverTotalPages) {
      setCurrentPage(page);
    }
  };

  const getStockStatus = (stock, alertQty = 10) => {
    if (stock <= 0) return { 
      text: 'Out of Stock', 
      color: 'bg-gradient-to-r from-red-500 to-rose-500',
      icon: <AlertCircle size={14} />
    };
    if (stock <= alertQty) return { 
      text: 'Low Stock', 
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
      icon: <AlertCircle size={14} />
    };
    return { 
      text: 'In Stock', 
      color: 'bg-gradient-to-r from-emerald-500 to-green-500',
      icon: <CheckCircle size={14} />
    };
  };

  const exportToCSV = () => {
    const headers = ['Type', 'Name', 'Stock', 'Unit', 'Avg Cost', 'Sale Price', 'Category/Brand', 'Status'];
    const csvData = filteredInventory.map(item => [
      item.type === 'material' ? 'Material' : 'Product',
      item.name,
      item.stock,
      item.unit,
      item.avg_cost || 'N/A',
      item.sale_price || 'N/A',
      item.type === 'material' ? item.brand || 'N/A' : item.category || 'N/A',
      getStockStatus(item.stock).text
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop-inventory-${selectedShop}.csv`;
    a.click();
  };

  const handleApplyFilters = () => {
    const next = { ...filters };
    setAppliedFilters(next);
    setCurrentPage(1);
    if (selectedShop) fetchInventory(selectedShop, 1, next);
  };

  const handleClearFilters = () => {
    const cleared = { searchTerm: '', filterType: 'all', sortBy: 'name', sortDir: 'asc', category: '', brand: '', unit: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentPage(1);
    if (selectedShop) fetchInventory(selectedShop, 1, cleared);
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span>{" "}
            of <span className="font-semibold">{totalItems}</span> items
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronsLeft size={16} className="text-gray-600" /></button>
          <button onClick={prevPage} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronLeft size={16} className="text-gray-600" /></button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, serverTotalPages) }, (_, i) => {
              let pageNum;
              if (serverTotalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= serverTotalPages - 2) pageNum = serverTotalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return <button key={pageNum} onClick={() => goToPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" : "hover:bg-white/50 text-gray-700"}`}>{pageNum}</button>;
            })}
          </div>
          <button onClick={nextPage} disabled={currentPage === serverTotalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronRight size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(serverTotalPages)} disabled={currentPage === serverTotalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronsRight size={16} className="text-gray-600" /></button>
        </div>
      </div>
    </div>
  );

  // Get shop name by ID
  const getShopName = () => {
    const shop = shops.find(s => s.id === selectedShop);
    return shop ? shop.name : '';
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-orange-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg">
                <ShoppingBag className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Shop Inventory
                </h1>
                <p className="text-gray-600 mt-2">Manage shop materials and products inventory</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-3 bg-white/60 hover:bg-white/80 rounded-xl transition-colors duration-300 border border-white/40"
                title="Refresh"
              >
                <RefreshCw size={20} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredInventory.length === 0}
                className="p-3 bg-white/60 hover:bg-white/80 rounded-xl transition-colors duration-300 border border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export to CSV"
              >
                <Download size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Shop Selector */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Shop</label>
              <select
                value={selectedShop}
                onChange={handleShopChange}
                disabled={shops.length === 0}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
            
            {summary && (
              <div className="flex-1 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100/50 backdrop-blur-sm border border-white/40 rounded-xl">
                  <Package size={18} className="text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Materials: {summary.materials.count}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100/50 backdrop-blur-sm border border-white/40 rounded-xl">
                  <Layers size={18} className="text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Products: {summary.products.count}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100/50 backdrop-blur-sm border border-white/40 rounded-xl">
                  <AlertCircle size={18} className="text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Low Stock: {summary.lowStock.materials.length + summary.lowStock.products.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="backdrop-blur-lg bg-gradient-to-br from-orange-50/60 to-amber-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Materials Overview</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.materials.totalStock.toFixed(2)} units
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Package size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-yellow-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Products Overview</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {summary.products.totalStock.toFixed(2)} units
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Layers size={24} className="text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scrap Items</p>
                  <p className="text-2xl font-bold text-red-600">
                    {(summary.materials.totalScrap + summary.products.totalScrap).toFixed(2)} units
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <Trash2 size={24} className="text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, barcode, or category..."
                value={filters.searchTerm}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, filterType: 'all' }));
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-300 ${
                  filters.filterType === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : 'bg-white/60 hover:bg-white/80 text-gray-700'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, filterType: 'material' }));
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-300 ${
                  filters.filterType === 'material'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : 'bg-white/60 hover:bg-white/80 text-gray-700'
                }`}
              >
                Materials
              </button>
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, filterType: 'product' }));
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-300 ${
                  filters.filterType === 'product'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : 'bg-white/60 hover:bg-white/80 text-gray-700'
                }`}
              >
                Products
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="name">Sort: Name</option>
                <option value="stock">Sort: Stock</option>
                <option value="damage">Sort: Damage</option>
                <option value="cost">Sort: Cost</option>
              </select>
              <select
                value={filters.sortDir}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <input
                type="text"
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <input
                type="text"
                placeholder="Brand"
                value={filters.brand}
                onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <input
                type="text"
                placeholder="Unit"
                value={filters.unit}
                onChange={(e) => setFilters((prev) => ({ ...prev, unit: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              <div className="flex gap-2">
                <button onClick={handleApplyFilters} className="flex-1 px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-orange-500 to-amber-500 text-white">Apply</button>
                <button onClick={handleClearFilters} className="flex-1 px-4 py-2 rounded-xl font-medium bg-white/60 hover:bg-white/80 text-gray-700">Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading inventory...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Error Loading Data</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <>
              {filteredInventory.length > 0 && renderPagination()}
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Type</th>
                      <th className="p-4 text-left font-medium text-gray-700">Item</th>
                      <th className="p-4 text-left font-medium text-gray-700">Stock</th>
                      <th className="p-4 text-left font-medium text-gray-700">Unit</th>
                      <th className="p-4 text-left font-medium text-gray-700">Avg Cost</th>
                      <th className="p-4 text-left font-medium text-gray-700">Sale Price</th>
                      <th className="p-4 text-left font-medium text-gray-700">Category</th>
                      <th className="p-4 text-left font-medium text-gray-700">Brand</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Scrap</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventory.map((item, index) => {
                      const stockStatus = getStockStatus(item.stock, Number(item.alert_quantity) || 10);
                      
                      return (
                        <tr key={`${item.type}-${item.id}`} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              item.type === 'material' 
                                ? 'bg-orange-100 text-orange-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.type === 'material' ? <Package size={12} /> : <Layers size={12} />}
                              {item.type === 'material' ? 'Material' : 'Product'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              {item.barcode && (
                                <p className="text-xs text-gray-500 mt-1">Barcode: {item.barcode}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className={`font-bold ${
                              item.stock <= 0 ? 'text-red-600' : 
                              item.stock <= 10 ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`}>
                              {item.stock}
                            </p>
                          </td>
                          <td className="p-4 text-gray-600">{item.unit}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <DollarSign size={14} className="text-gray-400" />
                              <span className="font-medium">{item.avg_cost ? `$${item.avg_cost.toFixed(2)}` : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Tag size={14} className="text-gray-400" />
                              <span className="font-medium">{item.sale_price ? `$${item.sale_price.toFixed(2)}` : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-700">
                              {item.category || '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-700">
                              { item.brand || '-' }
                            </span>
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${stockStatus.color}`}>
                              {stockStatus.icon}
                              {stockStatus.text}
                            </div>
                          </td>
                          <td className="p-4">
                            {item.scrap ? (
                              <span className="text-red-600 font-medium">
                                {item.scrap} ({((item.scrap / item.stock) * 100).toFixed(1)}%)
                              </span>
                            ) : '0'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetailsModal(item)}
                                className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors duration-300"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                title="Edit Inventory"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {paginatedInventory.length === 0 && !loading && (
                      <tr>
                        <td colSpan="10" className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Archive size={48} className="text-gray-300" />
                            <p className="text-gray-500">No inventory items found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredInventory.length > 0 && renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Item Details Modal */}
      {modal.isOpen && modal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                    {modal.data.type === 'material' ? (
                      <Package className="text-white" size={24} />
                    ) : (
                      <Layers className="text-white" size={24} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {modal.data.type === 'material' ? 'Material Details' : 'Product Details'}
                    </h2>
                    <p className="text-gray-600">{modal.data.name}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Basic Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-lg">{modal.data.name}</p>
                    </div>
                    {modal.data.description && (
                      <div>
                        <p className="text-sm text-gray-600">Description</p>
                        <p className="font-medium">{modal.data.description}</p>
                      </div>
                    )}
                    {modal.data.barcode && (
                      <div>
                        <p className="text-sm text-gray-600">Barcode</p>
                        <p className="font-medium">{modal.data.barcode}</p>
                      </div>
                    )}
                    {modal.data.type === 'material' ? (
                      <div>
                        <p className="text-sm text-gray-600">Brand</p>
                        <p className="font-medium">{modal.data.brand || 'N/A'}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-medium">{modal.data.category || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stock Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Current Stock</p>
                      <p className="text-2xl font-bold text-gray-900">{modal.data.stock} {modal.data.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock Status</p>
                      <div className="mt-1">
                        {(() => {
                          const status = getStockStatus(modal.data.stock, Number(modal.data.alert_quantity) || 10);
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${status.color}`}>
                              {status.icon}
                              {status.text}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {modal.data.scrap > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Scrap</p>
                        <p className="font-medium text-red-600">{modal.data.scrap} {modal.data.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-orange-50/50 to-orange-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Unit Cost</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${modal.data.unit_cost?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-amber-50/50 to-amber-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sale Price</p>
                    <p className="text-2xl font-bold text-amber-600">
                      ${modal.data.sale_price?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Average Cost</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${modal.data.avg_cost?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Batch Details */}
              {modal.data.batchDetails && (
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Batch Details</h3>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(modal.data.batchDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80 backdrop-blur-sm">
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editModal.isOpen && editModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Edit Inventory Item</h2>
                <button onClick={closeEditModal} className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300">
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <p className="text-gray-600 mt-1">{editModal.data.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                <input type="number" min="0" step="0.0001" value={editForm.stock} onChange={(e) => setEditForm((prev) => ({ ...prev, stock: e.target.value }))} className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                <input type="number" min="0" step="0.0001" value={editForm.sale_price} onChange={(e) => setEditForm((prev) => ({ ...prev, sale_price: e.target.value }))} className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alert Quantity</label>
                <input type="number" min="0" step="0.0001" value={editForm.alert_quantity} onChange={(e) => setEditForm((prev) => ({ ...prev, alert_quantity: e.target.value }))} className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
            </div>
            <div className="p-6 border-t border-white/50 bg-white/80 backdrop-blur-sm flex justify-end gap-3">
              <button onClick={closeEditModal} className="px-5 py-2.5 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60">Cancel</button>
              <button onClick={saveEditModal} disabled={savingEdit} className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${savingEdit ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl'}`}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopInventory;
