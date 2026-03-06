import React, { useState, useEffect, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import { activeOnly } from '../../utils/softDelete';
import {
  Pen,
  Trash2,
  Image as ImageIcon,
  Package,
  DollarSign,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  AlertTriangle,
  Settings,
  Factory,
  Tag,
  Warehouse,
  Box,
  Gauge
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';

const MaterialOverviewCards = memo(function MaterialOverviewCards({ overview }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Materials</p>
            <p className="text-2xl font-bold text-blue-600">{overview.totalMaterials}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-xl">
            <Box size={24} className="text-blue-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">In Stock</p>
            <p className="text-2xl font-bold text-emerald-600">{overview.inStockMaterials}</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Low Stock</p>
            <p className="text-2xl font-bold text-amber-600">{overview.lowStockMaterials}</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-xl">
            <AlertCircle size={24} className="text-amber-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">{overview.outOfStockMaterials}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
        </div>
      </div>
    </div>
  );
});

const AllMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [overview, setOverview] = useState({
    totalMaterials: 0,
    inStockMaterials: 0,
    lowStockMaterials: 0,
    outOfStockMaterials: 0,
  });
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [appliedSortBy, setAppliedSortBy] = useState('name');
  const [appliedSortDir, setAppliedSortDir] = useState('asc');

  const { hasPermission } = usePermission();
  const canCreate = hasPermission('material_create');
  const canEdit = hasPermission('material_edit');
  const canDelete = hasPermission('material_delete');


  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = MEDIA_BASE_URL;
    
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    } else {
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  const fetchMaterialsTable = useCallback(async () => {
    try {
      setLoadingTable(true);
      const response = await axios.get(API_ROUTES.MATERIALS, {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: appliedSearch || undefined,
          sortBy: appliedSortBy,
          sortDir: appliedSortDir,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const rows = activeOnly(response.data.materials || []);
      setMaterials(rows);
      setTotalPages(Number(response.data.totalPages || Math.ceil((response.data.totalCount || 0) / itemsPerPage) || 1));
      setTotalMaterials(Number(response.data.totalCount || 0));
    } catch (error) {
      console.error('Error fetching materials:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert('Permission denied. You do not have access to materials.');
      }
    } finally {
      setLoadingTable(false);
    }
  }, [appliedSearch, appliedSortBy, appliedSortDir, currentPage, itemsPerPage, navigate, token]);

  const fetchMaterialsOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const response = await axios.get(`${API_ROUTES.MATERIALS}/overview`, {
        params: { search: appliedSearch || undefined },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setOverview({
        totalMaterials: Number(response.data.totalMaterials || 0),
        inStockMaterials: Number(response.data.inStockMaterials || 0),
        lowStockMaterials: Number(response.data.lowStockMaterials || 0),
        outOfStockMaterials: Number(response.data.outOfStockMaterials || 0),
      });
    } catch (error) {
      console.error('Error fetching materials overview:', error);
    } finally {
      setLoadingOverview(false);
    }
  }, [appliedSearch, appliedSortBy, appliedSortDir, token]);

  useEffect(() => {
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }
    fetchMaterialsTable();
  }, [fetchMaterialsTable, navigate, token]);

  useEffect(() => {
    if (!token) return;
    fetchMaterialsOverview();
  }, [fetchMaterialsOverview, token]);

  const handleDelete = async (id) => {
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await axios.delete(`${API_ROUTES.MATERIALS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        await Promise.all([fetchMaterialsTable(), fetchMaterialsOverview()]);
      } catch (error) {
        console.error('Error deleting material:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You cannot delete this material.');
        }
      }
    }
  };

  const openDetailsModal = (material) => {
    setModal({ isOpen: true, type: 'details', data: material });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
  };

  const getStockStatus = (stock, alertQuantity) => {
    if (stock <= 0) return { 
      text: 'Out of Stock', 
      color: 'bg-gradient-to-r from-red-500 to-rose-500',
      icon: <AlertCircle size={14} />
    };
    if (alertQuantity && stock <= alertQuantity) return { 
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

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-amber-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <Warehouse className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  All Materials
                </h1>
                <p className="text-gray-600 mt-2">Manage your material inventory and details</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              { canCreate && (
                <Link 
                  to="/materials/add" 
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Settings size={20} />
                  New Material
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <MaterialOverviewCards overview={overview} />

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loadingTable ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading materials...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Search</label>
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCurrentPage(1);
                        setAppliedSearch(searchInput.trim());
                        setAppliedSortBy(sortBy);
                        setAppliedSortDir(sortDir);
                      }
                    }}
                    placeholder="Name / brand / category / barcode"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="name">Name</option>
                    <option value="created_at">Created Date</option>
                    <option value="unit_cost">Unit Cost</option>
                    <option value="sale_price">Sale Price</option>
                    <option value="current_stock">Current Stock</option>
                    <option value="brand">Brand</option>
                    <option value="category">Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Order</label>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      setAppliedSearch(searchInput.trim());
                      setAppliedSortBy(sortBy);
                      setAppliedSortDir(sortDir);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setAppliedSearch('');
                      setSortBy('name');
                      setSortDir('asc');
                      setAppliedSortBy('name');
                      setAppliedSortDir('asc');
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/80 border border-gray-300 text-gray-700 hover:bg-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Material</th>
                      <th className="p-4 text-left font-medium text-gray-700">Pricing</th>
                      <th className="p-4 text-left font-medium text-gray-700">Stock</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material, index) => {
                      const stockStatus = getStockStatus(material.current_stock, material.alert_quantity);
                      const imageUrl = getImageUrl(material.image);
                      
                      return (
                        <React.Fragment key={material.id}>
                          <tr className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                  {imageUrl ? (
                                    <img 
                                      src={imageUrl} 
                                      alt={material.name}
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
                                  <p className="font-semibold text-gray-800">{material.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {material.brand && (
                                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                        {material.brand}
                                      </span>
                                    )}
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      {material.unit}
                                    </span>
                                  </div>
                                  {material.sku && (
                                    <p className="text-xs text-gray-500 mt-1">SKU: {material.sku}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <DollarSign size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    Unit Cost: <span className="text-red-600">${parseFloat(material.unit_cost).toFixed(2)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Tag size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    Sale Price: <span className="text-emerald-600">${material.sale_price ? parseFloat(material.sale_price).toFixed(2) : '0.00'}</span>
                                  </span>
                                </div>
                                {material.alert_quantity && (
                                  <div className="flex items-center gap-2">
                                    <Gauge size={14} className="text-gray-400" />
                                    <span className="text-xs text-gray-600">
                                      Alert Qty: <span className="font-medium">{material.alert_quantity}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col items-start gap-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${stockStatus.color}`}>
                                  {stockStatus.icon}
                                  {stockStatus.text}
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <p className="font-bold text-lg text-gray-900">{material.current_stock}</p>
                                  <span className="text-sm text-gray-500">{material.unit}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDetailsModal(material)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                                
                                {canEdit && (
                                  <Link
                                    to={`/materials/edit/${material.id}`}
                                    className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                    title="Edit"
                                  >
                                    <Pen size={16} />
                                  </Link>
                                )}
                                
                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(material.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                
                              </div>
                            </td>
                          </tr>
                          
                          
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                
                {materials.length === 0 && !loadingTable && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Warehouse size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Materials Found</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first material</p>
                    <Link 
                      to="/materials/add" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Settings size={20} />
                      Create First Material
                    </Link>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {materials.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * itemsPerPage, totalMaterials)}
                        </span>{" "}
                        of <span className="font-semibold">{totalMaterials}</span> materials
                      </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      {/* First page */}
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Previous page */}
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="mx-1 text-gray-400">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === totalPages
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next page */}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

                      {/* Last page */}
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
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

      {/* Material Details Modal */}
      {modal.isOpen && modal.type === 'details' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                    <Warehouse className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Material Details</h2>
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
                {/* Material Image */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Material Image</h3>
                  <div className="flex justify-center">
                    {modal.data.image ? (
                      <div className="w-48 h-48 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={getImageUrl(modal.data.image)} 
                          alt={modal.data.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                <ImageIcon size={32} class="text-gray-400" />
                                <span class="ml-2 text-gray-500">Image not available</span>
                              </div>
                            `;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon size={32} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No image available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Material Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Material Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Material Name</p>
                      <p className="font-medium text-lg">{modal.data.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Brand</p>
                      <p className="font-medium">{modal.data.brand || 'No brand specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">SKU</p>
                      <p className="font-medium">{modal.data.barcode || 'No SKU'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock Status</p>
                      <div className="mt-1">
                        {(() => {
                          const status = getStockStatus(modal.data.current_stock, modal.data.alert_quantity);
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${status.color}`}>
                              {status.icon}
                              {status.text}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-red-50/50 to-red-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Unit Cost</p>
                    <p className="text-2xl font-bold text-red-600">
                      ${parseFloat(modal.data.unit_cost).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Per {modal.data.unit}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sale Price</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${modal.data.sale_price ? parseFloat(modal.data.sale_price).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Per {modal.data.unit}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Current Stock Value</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(parseFloat(modal.data.unit_cost) * parseInt(modal.data.current_stock)).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Total inventory value</p>
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-amber-50/50 to-amber-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Current Stock</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {modal.data.current_stock}
                    </p>
                    <p className="text-xs text-gray-500">{modal.data.unit}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Alert Quantity</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {modal.data.alert_quantity || 'Not set'}
                    </p>
                    <p className="text-xs text-gray-500">Low stock threshold</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-cyan-50/50 to-cyan-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Unit</p>
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {modal.data.unit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMaterials;
