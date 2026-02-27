import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  Factory, 
  Calendar, 
  Package, 
  Layers, 
  Settings,
  PlayCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Save,
  Image as ImageIcon
} from 'lucide-react';

const AllProductions = () => {
  const [productions, setProductions] = useState([]);
  const [totalProductions, setTotalProductions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState('filter');
  const [overview, setOverview] = useState({ totalCount: 0, byStatus: {} });
  const [factoryOptions, setFactoryOptions] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    factoryId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    factoryId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });

  // Status change states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [editableProducts, setEditableProducts] = useState([]);
  const [editableMaterials, setEditableMaterials] = useState([]);
  const [autoUnitCost, setAutoUnitCost] = useState(0);

  const fetchProductions = async (page, mode = 'table') => {
    try {
      setLoading(true);
      setLoadMode(mode);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: String(page),
        sortBy: appliedFilters.sortBy,
        sortDir: appliedFilters.sortDir,
      });
      if (appliedFilters.search.trim()) params.set('search', appliedFilters.search.trim());
      if (appliedFilters.factoryId) params.set('factoryId', appliedFilters.factoryId);
      if (appliedFilters.status) params.set('status', appliedFilters.status);
      if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);
      const response = await axios.get(`${API_ROUTES.PRODUCTIONS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductions(response.data.productions);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
      setTotalProductions(response.data.totalItems);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (appliedFilters.search.trim()) params.set('search', appliedFilters.search.trim());
      if (appliedFilters.factoryId) params.set('factoryId', appliedFilters.factoryId);
      if (appliedFilters.status) params.set('status', appliedFilters.status);
      if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);
      const response = await axios.get(`${API_ROUTES.PRODUCTIONS_OVERVIEW}${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOverview({
        totalCount: Number(response.data?.totalCount || 0),
        byStatus: response.data?.byStatus || {},
      });
    } catch {
      setOverview({ totalCount: 0, byStatus: {} });
    }
  };

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ROUTES.FACTORIES, { headers: { Authorization: `Bearer ${token}` } });
        setFactoryOptions(Array.isArray(res.data) ? res.data : []);
      } catch {
        setFactoryOptions([]);
      }
    };
    fetchFactories();
  }, []);

  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchProductions(1, 'filter');
    fetchOverview();
  }, [appliedFilters]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchProductions(currentPage, 'table');
  }, [currentPage]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this production?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ROUTES.PRODUCTIONS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage, 'table');
        fetchOverview();
      } catch (error) {
        console.error('Error deleting production:', error);
      }
    }
  };

  const openModal = async (type, production) => {
  let productionData = production;
  if (type === 'details') {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.PRODUCTIONS}/${production.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      productionData = response.data;
    } catch (error) {
      console.error('Error fetching production details:', error);
      return;
    }
  }
  
  setModal({ isOpen: true, type, data: productionData });

  if (type === 'updateStatus') {
    setSelectedStatus(production.status);
    if (production.status === 'production_done') {
        setEditableProducts(
          production.productionProducts.map(p => ({
            ...p,
            received: p.quantity,
            scrap: 0,
            unit_cost_manual: false
          }))
        );
        setEditableMaterials(
          production.productionMaterials.map(m => ({
            ...m,
            scrap: 0,
            fine: 0
          }))
        ); // Initialize fine
    } else {
        setEditableProducts(
          production.productionProducts.map(p => ({
            ...p,
            unit_cost_manual: false
          }))
        );
        setEditableMaterials(production.productionMaterials.map(m => ({...m, fine: 0}))); // Initialize fine
    }
  }
};

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
    setEditableProducts([]);
    setEditableMaterials([]);
  };

  const handleStatusChange = async () => {
    try {
        const token = localStorage.getItem('token');
        const payload = { 
            status: selectedStatus,
            products: selectedStatus === 'production_done' ? editableProducts : undefined,
            materials: selectedStatus === 'production_done' ? editableMaterials : undefined,
        };
        await axios.put(`${API_ROUTES.PRODUCTIONS}/${modal.data.id}/status`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage, 'table');
        fetchOverview();
        closeModal();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
  }

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const empty = {
      search: '',
      factoryId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setCurrentPage(1);
  };

  const handleProductEdit = (index, field, value) => {
    setEditableProducts(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };
      if (field === 'unit_cost') {
        updated.unit_cost_manual = true;
      }
      return updated;
    }));
  }

  const handleMaterialEdit = (index, field, value) => {
  setEditableMaterials(prev => {
    const newMaterials = [...prev];
    const material = { ...newMaterials[index] };
    
    // Ensure scrap + fine doesn't exceed original quantity
    if (field === 'scrap' || field === 'fine') {
      const scrapValue = field === 'scrap' ? parseFloat(value) || 0 : material.scrap || 0;
      const fineValue = field === 'fine' ? parseFloat(value) || 0 : material.fine || 0;
      const maxAllowed = material.quantity;
      
      // If sum exceeds quantity, adjust the other field
      if (scrapValue + fineValue > maxAllowed) {
        if (field === 'scrap') {
          material.fine = Math.max(0, maxAllowed - scrapValue);
        } else {
          material.scrap = Math.max(0, maxAllowed - fineValue);
        }
      }
    }
    
    material[field] = value;
    newMaterials[index] = material;
    return newMaterials;
  });
}

  useEffect(() => {
    if (selectedStatus !== 'production_done') {
      setAutoUnitCost(0);
      return;
    }
    const totalMaterialCost = editableMaterials.reduce((sum, m) => {
      const qty = parseFloat(m.quantity) || 0;
      const fine = parseFloat(m.fine) || 0;
      const price = parseFloat(m.price) || 0;
      const usedQty = Math.max(0, qty - fine);
      return sum + usedQty * price;
    }, 0);

    const totalFineProducts = editableProducts.reduce((sum, p) => {
      const received = parseFloat(p.received) || 0;
      return sum + received;
    }, 0);

    const computed = totalFineProducts > 0 ? totalMaterialCost / totalFineProducts : 0;
    setAutoUnitCost(computed);

    setEditableProducts(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p.unit_cost_manual) return p;
        const current = parseFloat(p.unit_cost) || 0;
        if (Math.abs(current - computed) < 0.0001) return p;
        changed = true;
        return { ...p, unit_cost: computed };
      });
      return changed ? next : prev;
    });
  }, [selectedStatus, editableMaterials, editableProducts]);

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}${imagePath}`;
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending':
        return { color: 'bg-gradient-to-r from-red-500 to-rose-500', icon: <Clock size={14} />, label: 'Pending' };
      case 'running':
        return { color: 'bg-gradient-to-r from-blue-500 to-cyan-500', icon: <PlayCircle size={14} />, label: 'Running' };
      case 'production_done':
        return { color: 'bg-gradient-to-r from-emerald-500 to-green-500', icon: <CheckCircle size={14} />, label: 'Completed' };
      default:
        return { color: 'bg-gray-500', icon: <AlertCircle size={14} />, label: status };
    }
  };

  const pendingCount = Number(overview.byStatus?.pending || 0);
  const runningCount = Number(overview.byStatus?.running || 0);
  const completedCount = Number(overview.byStatus?.production_done || 0);

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) setCurrentPage(pageNum);
  };

  const renderPaginationControls = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{totalProductions === 0 ? 0 : (currentPage - 1) * 20 + 1}</span> to{" "}
          <span className="font-semibold">{Math.min(currentPage * 20, totalProductions)}</span> of{" "}
          <span className="font-semibold">{totalProductions}</span> productions
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
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
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading && loadMode === 'filter') {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading productions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                <Factory className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Production Orders
                </h1>
                <p className="text-gray-600 mt-2">Monitor and manage all production batches</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Productions</p>
                <p className="text-2xl font-bold text-emerald-600">{overview.totalCount}</p>
              </div>
              
              <Link 
                to="/productions/new" 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Settings size={20} />
                New Production
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-cyan-50/60 to-emerald-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {runningCount}
                </p>
              </div>
              <div className="p-3 bg-cyan-100 rounded-xl">
                <PlayCircle size={24} className="text-cyan-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {completedCount}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>


        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-4">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search by reference..."
              className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
            />
            <select
              value={filters.factoryId}
              onChange={(e) => setFilters((prev) => ({ ...prev, factoryId: e.target.value }))}
              className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
            >
              <option value="">All Factories</option>
              {factoryOptions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="production_done">Completed</option>
            </select>
            <input type="datetime-local" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl" />
            <input type="datetime-local" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl" />
            <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl">
              <option value="createdAt">Sort by Created</option>
              <option value="reference">Sort by Reference</option>
              <option value="status">Sort by Status</option>
              <option value="start_date">Sort by Start Date</option>
              <option value="estimated_end_date">Sort by End Date</option>
            </select>
            <select value={filters.sortDir} onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))} className="w-full px-3 py-3 bg-white/80 border border-white/60 rounded-xl">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <div className="md:col-span-7 flex justify-end gap-2">
              <button onClick={handleApplyFilters} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white">Apply</button>
              <button onClick={handleClearFilters} className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-gray-700">Clear</button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading productions...</p>
              </div>
            </div>
          ) : (
            <>
              {productions.length > 0 && renderPaginationControls()}
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Reference</th>
                      <th className="p-4 text-left font-medium text-gray-700">Start Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">End Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">Factory</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map(production => {
                      const statusConfig = getStatusConfig(production.status);
                      return (
                        <tr key={production.id} className="border-t border-white/50 hover:bg-white/30 transition-colors duration-200">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Package size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{production.reference}</p>
                                <p className="text-xs text-gray-500">ID: {production.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-700">
                                {new Intl.DateTimeFormat('en-GB', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: '2-digit' 
                                }).format(new Date(production.start_date))}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-700">
                                {new Intl.DateTimeFormat('en-GB', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: '2-digit' 
                                }).format(new Date(production.estimated_end_date))}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Factory size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-800">{production.factory.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openModal('details', production)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              
                              {['running', 'pending'].includes(production.status) && (
                                <Link
                                  to={`/productions/edit/${production.id}`}
                                  className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </Link>
                              )}
                              
                              <button
                                onClick={() => handleDelete(production.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                              
                              {['running', 'pending'].includes(production.status) && (
                                <button
                                  onClick={() => openModal('updateStatus', production)}
                                  className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors duration-300"
                                  title="Change Status"
                                >
                                  <Filter size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {productions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Factory size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Productions Found</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first production order</p>
                    <Link 
                      to="/productions/new" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Settings size={20} />
                      Create First Production
                    </Link>
                  </div>
                )}
              </div>

              {productions.length > 0 && renderPaginationControls()}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {modal.isOpen && modal.type === 'details' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                    <Factory className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Production Details</h2>
                    <p className="text-gray-600">{modal.data.reference}</p>
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
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-medium">
                        {new Date(modal.data.start_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated End Date</p>
                      <p className="font-medium">
                        {new Date(modal.data.estimated_end_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Factory size={18} className="text-emerald-600" />
                    Factory Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Factory Name</p>
                      <p className="font-medium">{modal.data.factory.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500">
                        <CheckCircle size={12} />
                        {modal.data.status.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Products Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Products ({modal.data.productionProducts.length})
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Product</th>
                          <th className="p-3 text-left font-medium text-gray-700">Code</th>
                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                          {['production_done'].includes(modal.data.status) && (
                            <>
                              <th className="p-3 text-left font-medium text-gray-700">Received</th>
                              <th className="p-3 text-left font-medium text-gray-700">Scrap</th>
                              <th className="p-3 text-left font-medium text-gray-700">Cost</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {modal.data.productionProducts.map(p => {
                          const productImage = p.product?.image || p.product?.photo || p.product?.thumbnail;
                          const imageUrl = productImage ? getImageUrl(productImage) : null;
                          
                          return (
                            <tr key={p.id} className="border-t border-white/50 hover:bg-white/30">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                    {imageUrl ? (
                                      <img 
                                        src={imageUrl} 
                                        alt={p.product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={14} class="text-gray-400" /></div>';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <ImageIcon size={14} className="text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium block">{p.product.name}</span>
                                    <span className="text-xs text-gray-500">{p.product.category || 'No category'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{p.code}</td>
                              <td className="p-3 font-medium">{p.quantity}</td>
                              {['production_done'].includes(modal.data.status) && (
                                <>
                                  <td className="p-3 text-green-600 font-medium">{p.received}</td>
                                  <td className="p-3 text-red-600 font-medium">{p.scrap}</td>
                                  <td className="p-3 font-bold">${p.unit_cost?.toFixed(2)}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Materials Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Materials ({modal.data.productionMaterials.length})
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Material</th>
                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                          {['production_done'].includes(modal.data.status) && (
                            <th className="p-3 text-left font-medium text-gray-700">Scrap</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {modal.data.productionMaterials.map(m => (
                          <tr key={m.id} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3 font-medium">{m.material.name}</td>
                            <td className="p-3">{m.quantity}</td>
                            {['production_done'].includes(modal.data.status) && (
                              <td className="p-3 text-red-600 font-medium">{m.scrap}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50 ">
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

      {/* Update Status Modal */}
      {modal.isOpen && modal.type === 'updateStatus' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                    <Filter className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Update Status</h2>
                    <p className="text-gray-600">{modal.data.reference}</p>
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select New Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {['pending', 'running', 'production_done'].map(status => {
                    const config = getStatusConfig(status);
                    return (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                          selectedStatus === status
                            ? `${config.color} text-white border-transparent shadow-lg`
                            : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                        }`}
                      >
                        {config.icon}
                        <span className="mt-2 text-sm font-medium capitalize">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedStatus === 'production_done' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Package size={20} className="text-blue-600" />
                      Update Products
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-white/60">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-3 text-left font-medium text-gray-700">Product</th>
                            <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                            <th className="p-3 text-left font-medium text-gray-700">Fine Products</th>
                            <th className="p-3 text-left font-medium text-gray-700">Defect</th>
                            <th className="p-3 text-left font-medium text-gray-700">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableProducts.map((p, i) => {
                            const productImage = p.product?.image || p.product?.photo || p.product?.thumbnail;
                            const imageUrl = productImage ? getImageUrl(productImage) : null;
                            
                            return (
                              <tr key={p.id} className="border-t border-white/50">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                      {imageUrl ? (
                                        <img 
                                          src={imageUrl} 
                                          alt={p.product.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={12} class="text-gray-400" /></div>';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                          <ImageIcon size={12} className="text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium">{p.product.name}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-gray-600">{p.quantity}</td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={p.received}
                                    onChange={(e) => handleProductEdit(i, 'received', e.target.value)}
                                    className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    min="0"
                                    max={p.quantity}
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={p.scrap}
                                    onChange={(e) => handleProductEdit(i, 'scrap', e.target.value)}
                                    className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    min="0"
                                    max={p.quantity}
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={p.unit_cost}
                                    onChange={(e) => handleProductEdit(i, 'unit_cost', e.target.value)}
                                    className="w-24 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                    step="0.01"
                                    min="0"
                                  />
                                  {!p.unit_cost_manual && autoUnitCost > 0 && (
                                    <div className="text-[10px] text-gray-500 mt-1">
                                      Auto: ${autoUnitCost.toFixed(4)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className='mb-4'>
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Layers size={20} className="text-purple-600" />
                        Update Materials
                      </h3>
                      <p className="text-sm text-gray-600">* Specify if there is any fine materials left after the production is done or if there is any scrap.</p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/60">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-3 text-left font-medium text-gray-700">Material</th>
                            <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                            <th className="p-3 text-left font-medium text-gray-700">Fine materials</th>
                            <th className="p-3 text-left font-medium text-gray-700">Scrap</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableMaterials.map((m, i) => (
                            <tr key={m.id} className="border-t border-white/50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-purple-500" />
                                  <span className="font-medium">{m.material.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{m.quantity}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={m.fine || 0} // Add fine field
                                  onChange={(e) => handleMaterialEdit(i, 'fine', e.target.value)}
                                  className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                  min="0"
                                  max={m.quantity}
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={m.scrap}
                                  onChange={(e) => handleMaterialEdit(i, 'scrap', e.target.value)}
                                  className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                  min="0"
                                  max={m.quantity}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
              
              <div className="pb-6">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 cursor-pointer bg-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-500 hover:text-white transition-all duration-300 border border-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusChange}
                    className="px-6 py-3 cursor-pointer bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AllProductions;
