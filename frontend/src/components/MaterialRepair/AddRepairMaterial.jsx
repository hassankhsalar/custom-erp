import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';
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
  Calendar,
  FileText,
  Check,
  AlertCircle,
  Loader,
  Building,
  Store,
  Factory,
  Truck,
  Upload,
  File,
  Box
} from 'lucide-react';

const AddRepairMaterial = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    fromType: 'store',
    fromBranchId: '',
    shippingCost: 0,
    note: '',
    document: null,
    destination: ''
  });
  
  // Branches by type
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);
  
  // Available scrap materials from selected branch
  const [availableScrapMaterials, setAvailableScrapMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingScrap, setFetchingScrap] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(true);
  
  // Materials to be repaired
  const [repairMaterials, setRepairMaterials] = useState([]);
  
  // New material to add to repair
  const [newMaterial, setNewMaterial] = useState({
    scrapMaterialId: '',
    materialId: '',
    materialName: '',
    maxQuantity: 0,
    quantity: 1
  });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalMaterials: 0,
    totalUnits: 0
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

  // Fetch scrap materials when fromType or fromBranchId changes
  useEffect(() => {
    if (formData.fromBranchId) {
      fetchScrapMaterials();
    }
  }, [formData.fromType, formData.fromBranchId]);

  // Update statistics when repair materials change
  useEffect(() => {
    const stats = {
      totalMaterials: repairMaterials.length,
      totalUnits: repairMaterials.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0)
    };
    setStatistics(stats);
  }, [repairMaterials]);

  const fetchBranches = async () => {
    try {
      setFetchingBranches(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      // Fetch stores
      const storesRes = await axios.get(`${API_ROUTES.STORES}`, getAuthHeaders());
      setStores(storesRes.data.stores || storesRes.data || []);
      
      // Fetch shops
      const shopsRes = await axios.get(`${API_ROUTES.SHOPS}`, getAuthHeaders());
      setShops(shopsRes.data.shops || shopsRes.data || []);
      
      // Fetch factories
      const factoriesRes = await axios.get(`${API_ROUTES.FACTORIES}`, getAuthHeaders());
      setFactories(factoriesRes.data.factories || factoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
      } else {
        alert('Failed to load branches. Please refresh the page.');
      }
    } finally {
      setFetchingBranches(false);
    }
  };

  const fetchScrapMaterials = async () => {
    if (!formData.fromBranchId) {
      setAvailableScrapMaterials([]);
      return;
    }

    try {
      setFetchingScrap(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await axios.get(
        `${API_ROUTES.SCRAP_MATERIALS}?type=${formData.fromType}&branchId=${formData.fromBranchId}`,
        getAuthHeaders()
      );
      
      const scrapMaterials = response.data.scrapMaterials || response.data || [];
      setAvailableScrapMaterials(scrapMaterials);
    } catch (error) {
      console.error('Error fetching scrap materials:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
      } else {
        setAvailableScrapMaterials([]);
        alert('Failed to load scrap materials from this branch.');
      }
    } finally {
      setFetchingScrap(false);
    }
  };

  // Search scrap materials as user types
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
    
    const results = availableScrapMaterials.filter(scrapMaterial => 
      scrapMaterial.material?.name?.toLowerCase().includes(searchTerm) ||
      scrapMaterial.material?.barcode?.toLowerCase().includes(searchTerm) ||
      scrapMaterial.material?.description?.toLowerCase().includes(searchTerm) ||
      scrapMaterial.material?.brand?.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    
    setSearchResults(results);
  }, [availableScrapMaterials, formData.fromBranchId]);

  // Handle material selection from search results
  const handleMaterialSelect = (scrapMaterial) => {
    setNewMaterial({
      scrapMaterialId: scrapMaterial.id,
      materialId: scrapMaterial.materialId,
      materialName: scrapMaterial.material?.name || 'Unknown Material',
      maxQuantity: scrapMaterial.quantity,
      quantity: 1
    });
    setSearchResults([]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.materialId || newMaterial.quantity <= 0) {
      alert('Please select a material and enter quantity');
      return;
    }

    if (newMaterial.quantity > newMaterial.maxQuantity) {
      alert(`Cannot exceed available scrap quantity (${newMaterial.maxQuantity})`);
      return;
    }

    // Check if material already exists in repair materials
    const existingIndex = repairMaterials.findIndex(m => m.materialId === newMaterial.materialId);
    
    if (existingIndex !== -1) {
      // Update existing repair material
      const updatedMaterials = [...repairMaterials];
      const updatedQuantity = parseFloat(updatedMaterials[existingIndex].quantity) + parseFloat(newMaterial.quantity);
      
      if (updatedQuantity > newMaterial.maxQuantity) {
        alert(`Cannot exceed available scrap quantity (${newMaterial.maxQuantity})`);
        return;
      }
      
      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity: updatedQuantity
      };
      setRepairMaterials(updatedMaterials);
    } else {
      // Add new repair material
      setRepairMaterials([...repairMaterials, {
        ...newMaterial,
        id: Date.now() // Temporary ID for rendering
      }]);
    }

    // Reset form
    setNewMaterial({
      scrapMaterialId: '',
      materialId: '',
      materialName: '',
      maxQuantity: 0,
      quantity: 1
    });
  };

  const handleRemoveMaterial = (index) => {
    setRepairMaterials(repairMaterials.filter((_, i) => i !== index));
  };

  const handleUpdateMaterial = (index, field, value) => {
    const updatedMaterials = [...repairMaterials];
    const material = updatedMaterials[index];
    
    if (field === 'quantity' && parseFloat(value) > material.maxQuantity) {
      alert(`Cannot exceed available scrap quantity (${material.maxQuantity})`);
      return;
    }
    
    updatedMaterials[index] = {
      ...material,
      [field]: value
    };
    
    setRepairMaterials(updatedMaterials);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({...formData, document: file});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fromBranchId) {
      alert('Please select a source branch');
      return;
    }

    if (!formData.destination.trim()) {
      alert('Please enter a destination');
      return;
    }

    if (repairMaterials.length === 0) {
      alert('Please add at least one material for repair');
      return;
    }

    // Validate all repair materials
    for (const material of repairMaterials) {
      if (material.quantity <= 0) {
        alert(`Quantity must be greater than 0 for ${material.materialName}`);
        return;
      }
      
      if (material.quantity > material.maxQuantity) {
        alert(`Quantity cannot exceed available scrap (${material.maxQuantity}) for ${material.materialName}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }
      
      // Prepare form data for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('fromType', formData.fromType);
      formDataToSend.append('fromId', formData.fromBranchId);
      formDataToSend.append('shippingCost', formData.shippingCost);
      formDataToSend.append('note', formData.note);
      formDataToSend.append('destination', formData.destination);
      
      if (formData.document) {
        formDataToSend.append('document', formData.document);
      }
      
      formDataToSend.append('materials', JSON.stringify(
        repairMaterials.map(m => ({
          scrapMaterialId: m.scrapMaterialId,
          materialId: m.materialId,
          quantity: parseFloat(m.quantity),
          success: 0,
          fail: 0
        }))
      ));

      const response = await axios.post(API_ROUTES.MATERIAL_REPAIRS, formDataToSend, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      alert('Material repair request created successfully!');
      navigate('/materialrepair');
    } catch (error) {
      console.error('Error creating material repair request:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
      } else {
        alert(error.response?.data?.error || 'Failed to create material repair request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (repairMaterials.length > 0 || formData.fromBranchId || formData.destination) {
      if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        navigate('/materialrepair');
      }
    } else {
      navigate('/materialrepair');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-green-100/50 mb-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-colors duration-300"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg">
                  <Box className="text-white" size={36} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Send Materials for Repair
                  </h1>
                  <p className="text-gray-600 mt-2">Send scrap materials for repair and restoration</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm font-medium text-gray-700">Materials to Repair</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.totalMaterials}</p>
            </div>
          </div>

          {/* Loading state for branches */}
          {fetchingBranches ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-blue-500" />
                <p className="text-gray-600">Loading branches...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-xl font-bold text-blue-600">{statistics.totalMaterials}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Box size={20} className="text-blue-600" />
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
                    <Box size={20} className="text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div className="backdrop-blur-sm bg-white/60 border border-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-xl font-bold text-emerald-600">Pending</p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Check size={20} className="text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Repair Details */}
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
                            setRepairMaterials([]);
                            setAvailableScrapMaterials([]);
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
                        setRepairMaterials([]);
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
                      Destination *
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-300"
                      placeholder="e.g., Repair Center, Manufacturer, Service Provider"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Add Materials Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Box size={24} className="text-orange-600" />
                  Select Scrap Materials for Repair
                </h2>
                
                {/* Source not selected message */}
                {!formData.fromBranchId ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <AlertCircle size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Source First</h3>
                    <p className="text-gray-600">Please select a source {formData.fromType} to view available scrap materials</p>
                  </div>
                ) : (
                  <>
                    {/* Loading state for scrap materials */}
                    {fetchingScrap ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-4">
                          <Loader className="w-8 h-8 animate-spin text-blue-500" />
                          <p className="text-gray-600">Loading scrap materials...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Search Scrap Material */}
                        <div className="mb-6 search-container">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Scrap Material
                          </label>
                          <div className="relative mb-4">
                            <div className="relative">
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-4 pr-10 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                                placeholder="Search by material name, brand, or barcode..."
                                disabled={availableScrapMaterials.length === 0}
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
                                    Available Scrap Materials ({searchResults.length})
                                  </div>
                                  {searchResults.map(scrapMaterial => (
                                    <div
                                      key={scrapMaterial.id}
                                      onClick={() => handleMaterialSelect(scrapMaterial)}
                                      className="px-3 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle size={16} className="text-red-600" />
                                          </div>
                                          <div>
                                            <p className="font-medium text-gray-800">{scrapMaterial.material?.name || 'Unknown'}</p>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                                              <span>Available: {scrapMaterial.quantity}</span>
                                              <span>• Loss: ${scrapMaterial.lossPerUnit?.toFixed(2) || '0.00'}/unit</span>
                                              {scrapMaterial.material?.brand && <span>• Brand: {scrapMaterial.material.brand}</span>}
                                              {scrapMaterial.material?.barcode && <span>• Code: {scrapMaterial.material.barcode}</span>}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-xs text-green-600 font-medium">
                                          Select
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* No scrap materials available */}
                          {availableScrapMaterials.length === 0 && !fetchingScrap && (
                            <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200/50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <AlertTriangle size={20} className="text-amber-600" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800">No scrap materials available</p>
                                  <p className="text-xs text-amber-700">There are no scrap materials available at this {formData.fromType}.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Selected Material Form */}
                          {newMaterial.materialName && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50/60 to-amber-50/60 border border-orange-200/50 rounded-xl">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-700">Selected: {newMaterial.materialName}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Available: {newMaterial.maxQuantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewMaterial({
                                      scrapMaterialId: '',
                                      materialId: '',
                                      materialName: '',
                                      maxQuantity: 0,
                                      quantity: 1
                                    })}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Clear selection"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                                  <input
                                    type="number"
                                    value={newMaterial.quantity}
                                    onChange={(e) => setNewMaterial({...newMaterial, quantity: e.target.value})}
                                    className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    min="1"
                                    max={newMaterial.maxQuantity}
                                    step="0.01"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Max: {newMaterial.maxQuantity}</p>
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleAddMaterial}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 flex items-center justify-center gap-2"
                                  >
                                    <Plus size={16} />
                                    Add to Repair
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Repair Materials List */}
                        {repairMaterials.length > 0 ? (
                          <div className="overflow-hidden rounded-xl border border-white/60">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/80">
                                <tr>
                                  <th className="p-3 text-left font-medium text-gray-700">Material</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Status</th>
                                  <th className="p-3 text-left font-medium text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {repairMaterials.map((material, index) => (
                                  <tr key={material.id} className="border-t border-white/50 hover:bg-white/30">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                          <Box size={14} className="text-orange-600" />
                                        </div>
                                        <div>
                                          <span className="font-medium">{material.materialName}</span>
                                          <p className="text-xs text-gray-500">Available: {material.maxQuantity} {material.material?.unit || 'units'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        value={material.quantity}
                                        onChange={(e) => handleUpdateMaterial(index, 'quantity', e.target.value)}
                                        className="w-24 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        min="0.01"
                                        max={material.maxQuantity}
                                        step="0.01"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                        Pending
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMaterial(index)}
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
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Materials Added for Repair</h3>
                            <p className="text-gray-600">Search and select scrap materials to send for repair</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Additional Details & Actions */}
            <div className="space-y-6">
              {/* Additional Details Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FileText size={24} className="text-blue-600" />
                  Additional Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Cost ($)
                    </label>
                    <input
                      type="number"
                      value={formData.shippingCost}
                      onChange={(e) => setFormData({...formData, shippingCost: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      rows="3"
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                      placeholder="Additional notes about this repair request..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attach Document (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="document-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="document-upload"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-white/80 cursor-pointer transition-colors duration-300"
                      >
                        <Upload size={18} className="text-gray-500" />
                        <span className="text-gray-700">
                          {formData.document ? formData.document.name : 'Choose file...'}
                        </span>
                      </label>
                      {formData.document && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <File size={14} />
                          <span>{formData.document.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, document: null})}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Check size={24} className="text-green-600" />
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
                    <span className="text-gray-600">Materials Count</span>
                    <span className="font-semibold">{statistics.totalMaterials}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Total Units</span>
                    <span className="font-semibold">{statistics.totalUnits}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/30">
                    <span className="text-gray-600">Shipping Cost</span>
                    <span className="font-semibold">${formData.shippingCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Actions</h2>
                
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={submitting || repairMaterials.length === 0 || !formData.fromBranchId || !formData.destination}
                    className={`w-full px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      submitting || repairMaterials.length === 0 || !formData.fromBranchId || !formData.destination
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-xl'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Truck size={20} />
                        Send for Repair
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full px-6 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/60"
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
                      <span>Select source location first to view available scrap</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Success/Fail quantities will be updated when materials return</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={12} className="text-green-500 mt-0.5" />
                      <span>Attach relevant documents for better tracking</span>
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

export default AddRepairMaterial;