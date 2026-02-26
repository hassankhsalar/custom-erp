import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';
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
  Factory
} from 'lucide-react';

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [ totalProducts, setTotalProducts ] = useState(0);

  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = 'http://localhost:3001';
    
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    } else {
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ROUTES.PRODUCTS, {
          params: { page: currentPage, limit: itemsPerPage },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setProducts(activeOnly(response.data.products));
        setTotalPages(Math.ceil(response.data.totalCount / itemsPerPage));
        setTotalProducts(response.data.totalCount);
      } catch (error) {
        console.error('Error fetching products:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You do not have access to products.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchProducts();
    } else {
      alert('Authentication required. Please login.');
      navigate('/login');
    }
  }, [currentPage, itemsPerPage, token, navigate]);

  const handleDelete = async (id) => {
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_ROUTES.PRODUCTS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const response = await axios.get(API_ROUTES.PRODUCTS, {
          params: { page: currentPage, limit: itemsPerPage },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setProducts(activeOnly(response.data.products));
        setTotalPages(Math.ceil(response.data.totalCount / itemsPerPage));
        setTotalProducts(response.data.totalCount);
      } catch (error) {
        console.error('Error deleting product:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You cannot delete this product.');
        }
      }
    }
  };

  const toggleMaterials = (id) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  const openDetailsModal = (product) => {
    setModal({ isOpen: true, type: 'details', data: product });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
  };

  const getStockStatus = (stock) => {
    if (stock <= 0) return { 
      text: 'Out of Stock', 
      color: 'bg-gradient-to-r from-red-500 to-rose-500',
      icon: <AlertCircle size={14} />
    };
    if (stock <= 10) return { 
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

  // Calculate statistics
  const lowStockProducts = products.filter(p => p.stock < p.alert_quantity && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock <= 0).length;

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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  All Products
                </h1>
                <p className="text-gray-600 mt-2">Manage your product inventory and details</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/products/create" 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Settings size={20} />
                New Product
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-blue-600">{totalProducts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{lowStockProducts}</p>
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
                <p className="text-2xl font-bold text-red-600">{outOfStockProducts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Product</th>
                      <th className="p-4 text-left font-medium text-gray-700">Price Info</th>
                      <th className="p-4 text-left font-medium text-gray-700">Stock</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => {
                      const stockStatus = getStockStatus(product.stock);
                      const imageUrl = getImageUrl(product.image);
                      
                      return (
                        <React.Fragment key={product.id}>
                          <tr className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                  {imageUrl ? (
                                    <img 
                                      src={imageUrl} 
                                      alt={product.name}
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
                                  <p className="font-semibold text-gray-800">{product.name}</p>
                                  {product.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                                  )}
                                  {product.category && (
                                    <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <DollarSign size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    Sale: <span className="text-blue-600">${parseFloat(product.sale_price).toFixed(2)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    Wholesale: <span className="text-emerald-600">${parseFloat(product.wholesale_price).toFixed(2)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Factory size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    Cost: <span className="text-red-600">${parseFloat(product.cost).toFixed(2)}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col items-start gap-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${stockStatus.color}`}>
                                  {stockStatus.icon}
                                  {stockStatus.text}
                                </div>
                                <p className="font-bold text-lg text-gray-900">{product.stock}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDetailsModal(product)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                                
                                <Link
                                  to={`/products/edit/${product.id}`}
                                  className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                  title="Edit"
                                >
                                  <Pen size={16} />
                                </Link>
                                
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                                
                                <button
                                  onClick={() => toggleMaterials(product.id)}
                                  className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors duration-300"
                                  title="Materials"
                                >
                                  <Layers size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Materials Section */}
                          {expandedProductId === product.id && (
                            <tr className="border-t border-blue-100/50 bg-blue-50/30">
                              <td colSpan="4" className="p-4">
                                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-4 border border-white/40">
                                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Layers size={20} className="text-purple-600" />
                                    Materials ({product.materials.length})
                                  </h4>
                                  <div className="overflow-hidden rounded-lg border border-white/60">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100/80">
                                        <tr>
                                          <th className="p-3 text-left font-medium text-gray-700">Material Name</th>
                                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                                          <th className="p-3 text-left font-medium text-gray-700">Price</th>
                                          <th className="p-3 text-left font-medium text-gray-700">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {product.materials.map(mat => (
                                          <tr key={mat.material_id} className="border-t border-white/50 hover:bg-white/30">
                                            <td className="p-3">
                                              <div className="flex items-center gap-2">
                                                <Layers size={14} className="text-purple-500" />
                                                <span className="font-medium">{mat.material.name}</span>
                                              </div>
                                            </td>
                                            <td className="p-3">
                                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                                {mat.material_quantity}
                                              </span>
                                            </td>
                                            <td className="p-3 font-medium text-gray-900">
                                              ${parseFloat(mat.price).toFixed(2)}
                                            </td>
                                            <td className="p-3 font-semibold text-gray-900">
                                              ${(parseFloat(mat.price) * parseFloat(mat.material_quantity)).toFixed(2)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                
                {products.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Package size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Products Found</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first product</p>
                    <Link 
                      to="/products/create" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Settings size={20} />
                      Create First Product
                    </Link>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {products.length > 0 && (
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
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                          {Math.min(currentPage * itemsPerPage, products.length)}
                        </span>{" "}
                        of <span className="font-semibold">{totalProducts}</span> products
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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

      {/* Product Details Modal */}
      {modal.isOpen && modal.type === 'details' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Product Details</h2>
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
                {/* Product Image */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Image</h3>
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
                
                {/* Product Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Product Name</p>
                      <p className="font-medium text-lg">{modal.data.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="font-medium">{modal.data.description || 'No description'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="font-medium">{modal.data.category || 'No category'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock Status</p>
                      <div className="mt-1">
                        {(() => {
                          const status = getStockStatus(modal.data.stock);
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
                  <div className="p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sale Price</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${parseFloat(modal.data.sale_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Wholesale Price</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${parseFloat(modal.data.wholesale_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-red-50/50 to-red-100/30 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Cost</p>
                    <p className="text-2xl font-bold text-red-600">
                      ${parseFloat(modal.data.cost).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Materials Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Layers size={20} className="text-purple-600" />
                  Materials ({modal.data.materials.length})
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">Material Name</th>
                        <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                        <th className="p-3 text-left font-medium text-gray-700">Price</th>
                        <th className="p-3 text-left font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modal.data.materials.map(mat => (
                        <tr key={mat.material_id} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-3 font-medium">{mat.material.name}</td>
                          <td className="p-3">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              {mat.material_quantity}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-900">
                            ${parseFloat(mat.price).toFixed(2)}
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            ${(parseFloat(mat.price) * parseFloat(mat.material_quantity)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50">
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
    </div>
  );
};

export default AllProducts;
