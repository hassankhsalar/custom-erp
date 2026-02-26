import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { activeOnly } from '../../utils/softDelete';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  Save,
  X,
  Search,
  FileText,
  Check,
  AlertCircle,
  Loader,
  Image as ImageIcon,
  Building,
  Store,
  Factory
} from 'lucide-react';

const AddScrapRecord = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    fromType: 'store',
    fromBranchId: '',
    reason: '',
    note: ''
  });
  
  // Branches by type
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);
  
  // Available products from selected branch
  const [availableProducts, setAvailableProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(true);
  
  // Scrap products state (products to be scrapped)
  const [scrapProducts, setScrapProducts] = useState([]);
  
  // New product to add to scrap
  const [newProduct, setNewProduct] = useState({
    productId: '',
    productName: '',
    maxQuantity: 0,
    quantity: 1,
    lossPerUnit: 0
  });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalUnits: 0,
    totalLoss: 0
  });

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Create axios instance with auth header
  const getAuthHeaders = () => {
    const token = getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch products when fromType or fromBranchId changes
  useEffect(() => {
    if (formData.fromBranchId) {
      fetchBranchProducts();
    } else {
      setAvailableProducts([]);
    }
  }, [formData.fromType, formData.fromBranchId]);

  // Update statistics when scrap products change
  useEffect(() => {
    const stats = {
      totalProducts: scrapProducts.length,
      totalUnits: scrapProducts.reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0),
      totalLoss: scrapProducts.reduce((sum, p) => sum + (parseFloat(p.quantity || 0) * parseFloat(p.lossPerUnit || 0)), 0)
    };
    setStatistics(stats);
  }, [scrapProducts]);

  const fetchBranches = async () => {
    try {
      setFetchingBranches(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      // Fetch stores
      const storesRes = await axios.get(`${API_ROUTES.STORES}`, getAuthHeaders());
      setStores(activeOnly(storesRes.data.stores || storesRes.data || []));
      
      // Fetch shops
      const shopsRes = await axios.get(`${API_ROUTES.SHOPS}`, getAuthHeaders());
      setShops(activeOnly(shopsRes.data.shops || shopsRes.data || []));
      
      // Fetch factories
      const factoriesRes = await axios.get(`${API_ROUTES.FACTORIES}`, getAuthHeaders());
      setFactories(activeOnly(factoriesRes.data.factories || factoriesRes.data || []));
    } catch (error) {
      console.error('Error fetching branches:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('Failed to load branches. Please refresh the page.');
      }
    } finally {
      setFetchingBranches(false);
    }
  };

  const fetchBranchProducts = async () => {
    if (!formData.fromBranchId) {
      setAvailableProducts([]);
      return;
    }

    try {
      setFetchingProducts(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `${API_ROUTES.SCRAP_RECORDS}/branch-products?type=${formData.fromType}&branchId=${formData.fromBranchId}`,
        getAuthHeaders()
      );
      
      const products = activeOnly(response.data || []);
      setAvailableProducts(products);
      console.log(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setAvailableProducts([]);
        alert('Failed to load products from this branch.');
      }
    } finally {
      setFetchingProducts(false);
    }
  };

  // Search products as user types
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim() || !formData.fromBranchId) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setShowResults(true);
    const searchTerm = query.toLowerCase();
    
    const results = availableProducts.filter(product => 
      product.name?.toLowerCase().includes(searchTerm) ||
      product.barcode?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    
    setSearchResults(results);
  }, [availableProducts, formData.fromBranchId]);

  // Handle product selection from search results
  const handleProductSelect = (product) => {
    setNewProduct({
      productId: product.id,
      productName: product.name,
      maxQuantity: product.availableQuantity || product.stock || 0,
      quantity: 1,
      lossPerUnit: product.avg_cost || 0
    });
    setSearchResults([]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleAddProduct = () => {
    if (!newProduct.productId || newProduct.quantity <= 0 || newProduct.lossPerUnit < 0) {
      alert('Please fill all product fields correctly');
      return;
    }

    if (newProduct.quantity > newProduct.maxQuantity) {
      alert(`Cannot exceed available quantity (${newProduct.maxQuantity})`);
      return;
    }

    // Check if product already exists in scrap products
    const existingIndex = scrapProducts.findIndex(p => p.productId === newProduct.productId);
    
    if (existingIndex !== -1) {
      // Update existing scrap product
      const updatedProducts = [...scrapProducts];
      const updatedQuantity = parseFloat(updatedProducts[existingIndex].quantity) + parseFloat(newProduct.quantity);
      
      if (updatedQuantity > newProduct.maxQuantity) {
        alert(`Cannot exceed available quantity (${newProduct.maxQuantity})`);
        return;
      }
      
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        quantity: updatedQuantity,
        lossPerUnit: newProduct.lossPerUnit
      };
      setScrapProducts(updatedProducts);
    } else {
      // Add new scrap product
      setScrapProducts([...scrapProducts, {
        ...newProduct,
        id: Date.now() // Temporary ID for rendering
      }]);
    }

    // Reset form
    setNewProduct({
      productId: '',
      productName: '',
      maxQuantity: 0,
      quantity: 1,
      lossPerUnit: 0
    });
  };

  const handleRemoveProduct = (index) => {
    setScrapProducts(scrapProducts.filter((_, i) => i !== index));
  };

  const handleUpdateProduct = (index, field, value) => {
    const updatedProducts = [...scrapProducts];
    const product = updatedProducts[index];
    
    if (field === 'quantity' && parseFloat(value) > product.maxQuantity) {
      alert(`Cannot exceed available quantity (${product.maxQuantity})`);
      return;
    }
    
    updatedProducts[index] = {
      ...product,
      [field]: value
    };
    
    setScrapProducts(updatedProducts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fromBranchId) {
      alert('Please select a source branch');
      return;
    }

    if (!formData.reason.trim()) {
      alert('Please enter a reason for scrapping');
      return;
    }

    if (scrapProducts.length === 0) {
      alert('Please add at least one product');
      return;
    }

    // Validate all scrap products
    for (const product of scrapProducts) {
      if (product.quantity <= 0) {
        alert(`Quantity must be greater than 0 for ${product.productName}`);
        return;
      }
      
      if (product.quantity > product.maxQuantity) {
        alert(`Cannot exceed available quantity (${product.maxQuantity}) for ${product.productName}`);
        return;
      }
      
      if (product.lossPerUnit < 0) {
        alert(`Loss per unit cannot be negative for ${product.productName}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        navigate('/login');
        return;
      }
      
      const payload = {
        fromType: formData.fromType,
        fromBranchId: formData.fromBranchId,
        reason: formData.reason,
        note: formData.note,
        products: scrapProducts.map(p => ({
          productId: p.productId,
          quantity: parseFloat(p.quantity),
          lossPerUnit: parseFloat(p.lossPerUnit)
        }))
      };

      const response = await axios.post(API_ROUTES.SCRAP_RECORDS, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Scrap record created successfully!');
      navigate('/scraprecord');
    } catch (error) {
      console.error('Error creating scrap record:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert(error.response?.data?.error || 'Failed to create scrap record');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (scrapProducts.length > 0 || formData.fromBranchId || formData.reason || formData.note) {
      if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        navigate('/scraprecord');
      }
    } else {
      navigate('/scraprecord');
    }
  };

  // Get current branches based on selected type
  const getCurrentBranches = () => {
    switch (formData.fromType) {
      case 'store':
        return stores;
      case 'shop':
        return shops;
      case 'factory':
        return factories;
      default:
        return [];
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showResults && !e.target.closest('.search-container')) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showResults]);

  // Get icon based on branch type
  const getBranchIcon = (type) => {
    switch (type) {
      case 'store': return <Store size={20} />;
      case 'shop': return <Building size={20} />;
      case 'factory': return <Factory size={20} />;
      default: return <Building size={20} />;
    }
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `http://localhost:3001${imagePath}`;
    return `http://localhost:3001/uploads/${imagePath}`;
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-colors duration-300"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
                  <AlertTriangle className="text-white" size={36} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Add Scrap Record
                  </h1>
                  <p className="text-gray-600 mt-2">Record product losses due to damage, defects, or obsolescence</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm font-medium text-gray-700">Estimated Loss</p>
              <p className="text-2xl font-bold text-red-600">${statistics.totalLoss.toFixed(2)}</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-xl font-bold text-blue-600">{statistics.totalProducts}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Units</p>
                  <p className="text-xl font-bold text-orange-600">{statistics.totalUnits}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle size={20} className="text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Loss</p>
                  <p className="text-xl font-bold text-red-600">${statistics.totalLoss.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign size={20} className="text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Record Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Source Information Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Building size={24} className="text-blue-600" />
                  Source Information
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source Type *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['store', 'shop', 'factory'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              fromType: type,
                              fromBranchId: ''
                            });
                            setScrapProducts([]);
                            setAvailableProducts([]);
                          }}
                          className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                            formData.fromType === type
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                              : 'bg-white/60 text-gray-700 hover:bg-white/80'
                          }`}
                        >
                          {getBranchIcon(type)}
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select {formData.fromType.charAt(0).toUpperCase() + formData.fromType.slice(1)} *
                    </label>
                    <select
                      value={formData.fromBranchId}
                      onChange={(e) => {
                        setFormData({...formData, fromBranchId: e.target.value});
                        setScrapProducts([]);
                      }}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                      required
                      disabled={fetchingBranches}
                    >
                      <option value="">Select a {formData.fromType}</option>
                      {getCurrentBranches().map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} {branch.address ? `- ${branch.address}` : ''}
                        </option>
                      ))}
                    </select>
                    {fetchingBranches && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading {formData.fromType}s...
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Scrapping *
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                      placeholder="e.g., Damaged during shipment, Manufacturing defect, Expired, etc."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      rows="4"
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                      placeholder="Any additional details about why these products were scrapped..."
                    />
                  </div>
                </div>
              </div>

              {/* Add Products Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Package size={24} className="text-orange-600" />
                  Add Products to Scrap
                </h2>
                
                {/* Source not selected message */}
                {!formData.fromBranchId ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <AlertCircle size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Source First</h3>
                    <p className="text-gray-600">Please select a source {formData.fromType} to view available products</p>
                  </div>
                ) : (
                  <>
                    {/* Loading state for products */}
                    {fetchingProducts ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-4">
                          <Loader className="w-8 h-8 animate-spin text-blue-500" />
                          <p className="text-gray-600">Loading products...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Search Product */}
                        <div className="mb-6 search-container">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Product
                          </label>
                          <div className="relative mb-4">
                            <div className="relative">
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-4 pr-10 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                                placeholder="Search by product name or barcode..."
                                disabled={availableProducts.length === 0}
                              />
                              <Search 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                                size={20} 
                              />
                            </div>
                            
                            {/* Real-time Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                <div className="py-2">
                                  <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                    Available Products ({searchResults.length})
                                  </div>
                                  {searchResults.map(product => {
                                    const imageUrl = product.image ? getImageUrl(product.image) : null;
                                    
                                    return (
                                      <div
                                        key={product.id}
                                        onClick={() => handleProductSelect(product)}
                                        className="px-3 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                              {imageUrl ? (
                                                <img 
                                                  src={imageUrl} 
                                                  alt={product.name}
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
                                            <div>
                                              <p className="font-medium text-gray-800">{product.name}</p>
                                              <p className="text-xs text-gray-500">
                                                Code: {product.barcode || 'N/A'} | 
                                                Stock: {product.availableQuantity || product.stock || 0} | 
                                                Cost: ${product.avg_cost?.toFixed(2) || '0.00'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="text-xs text-green-600 font-medium">
                                            Select
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* No products available */}
                          {availableProducts.length === 0 && !fetchingProducts && (
                            <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200/50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <AlertTriangle size={20} className="text-amber-600" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800">No products available</p>
                                  <p className="text-xs text-amber-700">There are no products available at this {formData.fromType}.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Selected Product Form */}
                          {newProduct.productName && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/60 border border-green-200/50 rounded-xl">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-700">Selected: {newProduct.productName}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Available: {newProduct.maxQuantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewProduct({
                                      productId: '',
                                      productName: '',
                                      maxQuantity: 0,
                                      quantity: 1,
                                      lossPerUnit: 0
                                    })}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Clear selection"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                                  <input
                                    type="number"
                                    value={newProduct.quantity}
                                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    min="1"
                                    max={newProduct.maxQuantity}
                                    step="1"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Max: {newProduct.maxQuantity}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Loss per Unit ($) *</label>
                                  <input
                                    type="number"
                                    value={newProduct.lossPerUnit}
                                    onChange={(e) => setNewProduct({...newProduct, lossPerUnit: e.target.value})}
                                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleAddProduct}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center justify-center gap-2"
                                  >
                                    <Plus size={16} />
                                    Add to List
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Scrap Products List */}
                        {scrapProducts.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border border-white/60">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/80">
                                <tr>
                                  <th className="p-3 text-left font-medium text-gray-700">Product</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Loss/Unit</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Total Loss</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scrapProducts.map((product, index) => (
                                  <tr key={product.id} className="border-t border-white/50 hover:bg-white/30">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                          <Package size={14} className="text-orange-600" />
                                        </div>
                                        <div>
                                          <span className="font-medium">{product.productName}</span>
                                          <p className="text-xs text-gray-500">Available: {product.maxQuantity}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        value={product.quantity}
                                        onChange={(e) => handleUpdateProduct(index, 'quantity', e.target.value)}
                                        className="w-20 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        min="1"
                                        max={product.maxQuantity}
                                        step="1"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        value={product.lossPerUnit}
                                        onChange={(e) => handleUpdateProduct(index, 'lossPerUnit', e.target.value)}
                                        className="w-24 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                        min="0"
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-red-600">
                                      ${(product.quantity * product.lossPerUnit).toFixed(2)}
                                    </td>
                                    <td className="p-3">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProduct(index)}
                                        className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors duration-300"
                                        title="Remove"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                              <AlertCircle size={48} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Products Added</h3>
                            <p className="text-gray-600">Search and select products to add to this scrap record</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Summary & Actions */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <DollarSign size={24} className="text-red-600" />
                  Summary
                </h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Source Type</span>
                    <span className="font-semibold capitalize">{formData.fromType}</span>
                  </div>
                  {formData.fromBranchId && (
                    <div className="flex justify-between items-center py-2 border-b border-white/30">
                      <span className="text-gray-600">Source Branch</span>
                      <span className="font-semibold">
                        {getCurrentBranches().find(b => b.id == formData.fromBranchId)?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Products Count</span>
                    <span className="font-semibold">{statistics.totalProducts}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Total Units</span>
                    <span className="font-semibold">{statistics.totalUnits}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Total Loss</span>
                    <span className="text-xl font-bold text-red-600">${statistics.totalLoss.toFixed(2)}</span>
                  </div>
                  <div className="pt-4">
                    <div className="p-3 bg-red-50/60 border border-red-200/50 rounded-lg">
                      <p className="text-sm text-red-700">
                        <AlertTriangle size={14} className="inline mr-1" />
                        This loss will be recorded permanently and cannot be recovered.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Actions</h2>
                
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={submitting || scrapProducts.length === 0 || !formData.fromBranchId || !formData.reason}
                    className={`w-full px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      submitting || scrapProducts.length === 0 || !formData.fromBranchId || !formData.reason
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 hover:shadow-xl'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Save Scrap Record
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full px-6 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                  >
                    Cancel
                  </button>
                </div>

                {/* Quick Tips */}
                <div className="mt-6 pt-6 border-t border-white/40">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tips:</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Provide clear reasons for documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Verify quantities before saving</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Loss per unit is typically the cost price</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScrapRecord;
