import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import { 
  Star, 
  Award, 
  Crown, 
  Plus, 
  X, 
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye
} from 'lucide-react';

const COLLECTION_TYPES = {
  TOP_RATED: { label: 'Top Rated', icon: Star, color: 'from-yellow-500 to-amber-500' },
  FEATURED: { label: 'Featured', icon: Award, color: 'from-blue-500 to-cyan-500' },
  PREMIUM: { label: 'Premium', icon: Crown, color: 'from-purple-500 to-pink-500' }
};

const ProductCollectionManager = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1
  });
  const [filter, setFilter] = useState({
    type: '',
    sortBy: 'createdAt',
    sortDir: 'desc'
  });

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedType, setSelectedType] = useState('TOP_RATED');
  const [adding, setAdding] = useState(false);

  const token = localStorage.getItem('token');

  // Get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = MEDIA_BASE_URL || '';
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    }
    return `${baseUrl}/uploads/${imagePath}`;
  };

  useEffect(() => {
    if (!token) return;
    fetchCollections();
  }, [token, pagination.page, filter]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir
      });

      if (filter.type) {
        params.append('type', filter.type);
      }

      const response = await axios.get(
        `${API_ROUTES.PRODUCT_COLLECTIONS}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCollections(response.data.collections || []);
      setPagination({
        page: response.data.currentPage,
        limit: pagination.limit,
        totalCount: response.data.totalCount,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (search = '') => {
    setProductsLoading(true);
    try {
      const response = await axios.get(API_ROUTES.PRODUCTS_ALL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedProduct || !selectedType) {
      alert('Please select a product and collection type');
      return;
    }

    setAdding(true);
    try {
      await axios.post(
        API_ROUTES.PRODUCT_COLLECTIONS,
        {
          productId: selectedProduct.id,
          type: selectedType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Product added to collection successfully!');
      setIsAddModalOpen(false);
      setSelectedProduct(null);
      setSelectedType('TOP_RATED');
      setProductSearch('');
      fetchCollections();
    } catch (error) {
      console.error('Error adding to collection:', error);
      alert(error.response?.data?.error || 'Failed to add product to collection');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromCollection = async (id) => {
    if (!window.confirm('Are you sure you want to remove this product from the collection?')) {
      return;
    }

    try {
      await axios.delete(API_ROUTES.PRODUCT_COLLECTION(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCollections();
    } catch (error) {
      console.error('Error removing from collection:', error);
      alert('Failed to remove product from collection');
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setSelectedProduct(null);
    setSelectedType('TOP_RATED');
    setProductSearch('');
    fetchProducts();
  };

  const getTypeIcon = (type) => {
    const config = COLLECTION_TYPES[type];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon size={16} />;
  };

  const getTypeColor = (type) => {
    const config = COLLECTION_TYPES[type];
    return config ? config.color : 'from-gray-500 to-gray-600';
  };

  const getTypeLabel = (type) => {
    const config = COLLECTION_TYPES[type];
    return config ? config.label : type;
  };

  if (loading && collections.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <Award className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Product Collections
              </h1>
              <p className="text-gray-600 mt-2">Manage featured, top rated and premium products</p>
            </div>
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
          >
            <Plus size={20} />
            Add to Collection
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collection Type</label>
            <select
              value={filter.type}
              onChange={(e) => {
                setFilter({ ...filter, type: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
            >
              <option value="">All Types</option>
              {Object.entries(COLLECTION_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filter.sortBy}
              onChange={(e) => {
                setFilter({ ...filter, sortBy: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
            >
              <option value="createdAt">Date Added</option>
              <option value="id">ID</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <select
              value={filter.sortDir}
              onChange={(e) => {
                setFilter({ ...filter, sortDir: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Collections Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200/50 bg-white/60">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Collection Type</th>
                <th className="py-3 px-4 text-left">Added Date</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Award size={48} className="text-gray-300" />
                      <p className="text-lg font-medium">No collections found</p>
                      <p className="text-sm">Click "Add to Collection" to add products</p>
                    </div>
                  </td>
                </tr>
              ) : (
                collections.map((item, index) => {
                  const TypeIcon = COLLECTION_TYPES[item.type]?.icon || Star;
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-gray-100 hover:bg-white/80 transition-colors duration-200 ${
                        index % 2 === 0 ? 'bg-white/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">#{item.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                            {item.product.image ? (
                              <img
                                src={getImageUrl(item.product.image)}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `
                                    <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <svg class="w-6 h-6 text-gray-400" ...></svg>
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <span className="text-xs text-gray-400">No img</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{item.product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {item.product.barcode || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getTypeColor(item.type)}`}>
                          <TypeIcon size={12} />
                          {getTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                         
                          <button
                            onClick={() => handleRemoveFromCollection(item.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                            title="Remove from Collection"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Add to Collection Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                    <Plus className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Add to Collection</h2>
                    <p className="text-sm text-gray-600">Select product and collection type</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Collection Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Collection Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(COLLECTION_TYPES).map(([key, { label, icon: Icon, color }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedType(key)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedType === key
                          ? `border-${color.split('-')[1]}-500 bg-gradient-to-r ${color} text-white`
                          : 'border-gray-200 hover:border-gray-300 bg-white/50'
                      }`}
                    >
                      <Icon size={24} className={`mx-auto mb-2 ${selectedType === key ? 'text-white' : 'text-gray-600'}`} />
                      <p className={`text-sm font-medium ${selectedType === key ? 'text-white' : 'text-gray-700'}`}>
                        {label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Product *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      fetchProducts(e.target.value);
                    }}
                    placeholder="Search by product name or barcode..."
                    className="w-full p-3 pl-10 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Product List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200/50 rounded-lg">
                {productsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products found
                  </div>
                ) : (
                  products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full p-3 flex items-center gap-3 border-b border-gray-100 hover:bg-purple-50 transition-colors duration-200 ${
                        selectedProduct?.id === product.id ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">No img</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.barcode || 'N/A'}</p>
                      </div>
                      {selectedProduct?.id === product.id && (
                        <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Plus size={12} className="rotate-45" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-200/60 text-gray-700 font-medium rounded-lg hover:bg-gray-300/80 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCollection}
                  disabled={!selectedProduct || !selectedType || adding}
                  className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-300 ${
                    (!selectedProduct || !selectedType || adding) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {adding ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add to Collection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCollectionManager;