import React, { useState, useEffect } from 'react';
import {
  Store,
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
  Building2
} from 'lucide-react';
import { API_ROUTES } from '../../config';
import { activeOnly } from '../../utils/softDelete';

const StoreInventory = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
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

  // Load stores on component mount
  useEffect(() => {
    fetchStores();
  }, []);

  // Load inventory when store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchInventory(selectedStore, 1);
      fetchSummary(selectedStore);
    }
  }, [selectedStore, itemsPerPage]);

  useEffect(() => {
    if (selectedStore) {
      fetchInventory(selectedStore, currentPage);
    }
  }, [currentPage]);

  const fetchStores = async () => {
    try {
      console.log('Fetching stores...');
      const response = await fetch(`${API_ROUTES.STORES}`, {
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
      console.log('Stores fetched:', data);
      
      // Handle both paginated and non-paginated responses
      const storesList = activeOnly(data.stores || data || []);
      setStores(storesList);
      
      if (storesList.length > 0) {
        setSelectedStore(storesList[0].id);
      } else {
        setError('No stores found');
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(`Failed to load stores: ${err.message}`);
    }
  };

  const fetchInventory = async (storeId, page = 1, filterOverrides = appliedFilters) => {
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
      const response = await fetch(`${API_ROUTES.STORE_INVENTORY_LIST(storeId)}?${params.toString()}`, {
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
      setInventory(activeOnly(data.items || []));
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

  const fetchSummary = async (storeId) => {
    try {
      const response = await fetch(API_ROUTES.STORE_INVENTORY_SUMMARY(storeId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  const handleStoreChange = (event) => {
    setSelectedStore(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    if (selectedStore) {
      fetchInventory(selectedStore, currentPage);
      fetchSummary(selectedStore);
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
    if (!editModal.data || !selectedStore) return;
    try {
      setSavingEdit(true);
      setError(null);
      const response = await fetch(API_ROUTES.STORE_INVENTORY_ITEM_UPDATE(selectedStore), {
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

      await fetchInventory(selectedStore, currentPage);
      await fetchSummary(selectedStore);
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
    a.download = `store-inventory-${selectedStore}.csv`;
    a.click();
  };

  const handleApplyFilters = () => {
    const next = { ...filters };
    setAppliedFilters(next);
    setCurrentPage(1);
    if (selectedStore) fetchInventory(selectedStore, 1, next);
  };

  const handleClearFilters = () => {
    const cleared = { searchTerm: '', filterType: 'all', sortBy: 'name', sortDir: 'asc', category: '', brand: '', unit: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentPage(1);
    if (selectedStore) fetchInventory(selectedStore, 1, cleared);
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
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
              return <button key={pageNum} onClick={() => goToPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? "bg-linear-to-r from-emerald-500 to-teal-500 text-white" : "hover:bg-white/50 text-gray-700"}`}>{pageNum}</button>;
            })}
          </div>
          <button onClick={nextPage} disabled={currentPage === serverTotalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronRight size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(serverTotalPages)} disabled={currentPage === serverTotalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronsRight size={16} className="text-gray-600" /></button>
        </div>
      </div>
    </div>
  );

  // Get store name by ID
  const getStoreName = () => {
    const store = stores.find(s => s.id === selectedStore);
    return store ? store.name : '';
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-emerald-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-linear-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                <Store className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Store Inventory
                </h1>
                <p className="text-gray-600 mt-2">Manage store materials and products inventory</p>
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

        {/* Store Selector */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Store</label>
              <select
                value={selectedStore}
                onChange={handleStoreChange}
                disabled={stores.length === 0}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            
            {summary && (
              <div className="flex-1 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100/50 backdrop-blur-sm border border-white/40 rounded-xl">
                  <Package size={18} className="text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Materials: {summary.materials.count}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-100/50 backdrop-blur-sm border border-white/40 rounded-xl">
                  <Layers size={18} className="text-teal-600" />
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
            <div className="backdrop-blur-lg bg-linear-to-br from-emerald-50/60 to-teal-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Materials Overview</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.materials.totalStock.toFixed(2)} units
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Package size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-lg bg-linear-to-br from-teal-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Products Overview</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {summary.products.totalStock.toFixed(2)} units
                  </p>
                </div>
                <div className="p-3 bg-teal-100 rounded-xl">
                  <Layers size={24} className="text-teal-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-lg bg-linear-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
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
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, filterType: 'all' }));
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors duration-300 ${
                  filters.filterType === 'all'
                    ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white'
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
                    ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white'
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
                    ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white'
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
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="name">Sort: Name</option>
                <option value="stock">Sort: Stock</option>
                <option value="damage">Sort: Damage</option>
                <option value="cost">Sort: Cost</option>
              </select>
              <select
                value={filters.sortDir}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <input
                type="text"
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="text"
                placeholder="Brand"
                value={filters.brand}
                onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="text"
                placeholder="Unit"
                value={filters.unit}
                onChange={(e) => setFilters((prev) => ({ ...prev, unit: e.target.value }))}
                className="px-3 py-2 bg-white/80 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <div className="flex gap-2">
                <button onClick={handleApplyFilters} className="flex-1 px-4 py-2 rounded-xl font-medium bg-linear-to-r from-emerald-500 to-teal-500 text-white">Apply</button>
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
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
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
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-teal-100 text-teal-700'
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
                              { item.brand || '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-700">
                              { item.category || '-'}
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
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-300"
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
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-linear-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
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
                  <div className="p-4 bg-linear-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Unit Cost</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${modal.data.unit_cost?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-linear-to-r from-teal-50/50 to-teal-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sale Price</p>
                    <p className="text-2xl font-bold text-teal-600">
                      ${modal.data.sale_price?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-linear-to-r from-purple-50/50 to-purple-100/30 rounded-lg">
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
            
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventory;
