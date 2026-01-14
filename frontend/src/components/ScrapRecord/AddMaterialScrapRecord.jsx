
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
  FileText,
  Check,
  AlertCircle,
  Loader
} from 'lucide-react';

const AddMaterialScrapRecord = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    reason: '',
    note: ''
  });
  
  // Scrap materials state (materials to be scrapped)
  const [scrapMaterials, setScrapMaterials] = useState([]);
  
  // All available materials for search
  const [allMaterials, setAllMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingMaterials, setFetchingMaterials] = useState(true);
  
  // New material to add to scrap
  const [newMaterial, setNewMaterial] = useState({
    materialId: '',
    materialName: '',
    quantity: 1,
    lossPerUnit: 0
  });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalMaterials: 0,
    totalUnits: 0,
    totalLoss: 0
  });

  // Fetch all available materials on component mount
  useEffect(() => {
    fetchAllMaterials();
  }, []);

  // Update statistics when scrap materials change
  useEffect(() => {
    const stats = {
      totalMaterials: scrapMaterials.length,
      totalUnits: scrapMaterials.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0),
      totalLoss: scrapMaterials.reduce((sum, m) => sum + (parseFloat(m.quantity || 0) * parseFloat(m.lossPerUnit || 0)), 0)
    };
    setStatistics(stats);
  }, [scrapMaterials]);

  const fetchAllMaterials = async () => {
    try {
      setFetchingMaterials(true);
      const response = await axios.get(`${API_ROUTES.MATERIALS}`);
      // Assuming response.data has materials array
      const materials = response.data.materials || response.data;
      setAllMaterials(Array.isArray(materials) ? materials : []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setAllMaterials([]);
      alert('Failed to load materials. Please refresh the page.');
    } finally {
      setFetchingMaterials(false);
    }
  };

  // Search materials as user types
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setShowResults(true);
    const searchTerm = query.toLowerCase();
    
    const results = allMaterials.filter(material => 
      material.name?.toLowerCase().includes(searchTerm) ||
      material.barcode?.toLowerCase().includes(searchTerm) ||
      material.description?.toLowerCase().includes(searchTerm) ||
      material.material_code?.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results
    
    setSearchResults(results);
  }, [allMaterials]);

  // Handle material selection from search results
  const handleMaterialSelect = (material) => {
    setNewMaterial({
      materialId: material.id,
      materialName: material.name,
      quantity: 1,
      lossPerUnit: material.unit_cost || 0 // Default to unit cost
    });
    setSearchResults([]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.materialId || newMaterial.quantity <= 0 || newMaterial.lossPerUnit < 0) {
      alert('Please fill all material fields correctly');
      return;
    }

    // Check if material already exists in scrap materials
    const existingIndex = scrapMaterials.findIndex(m => m.materialId === newMaterial.materialId);
    
    if (existingIndex !== -1) {
      // Update existing scrap material
      const updatedMaterials = [...scrapMaterials];
      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity: parseFloat(updatedMaterials[existingIndex].quantity) + parseFloat(newMaterial.quantity),
        lossPerUnit: newMaterial.lossPerUnit // Use new loss per unit
      };
      setScrapMaterials(updatedMaterials);
    } else {
      // Add new scrap material
      setScrapMaterials([...scrapMaterials, {
        ...newMaterial,
        id: Date.now() // Temporary ID for rendering
      }]);
    }

    // Reset form
    setNewMaterial({
      materialId: '',
      materialName: '',
      quantity: 1,
      lossPerUnit: 0
    });
  };

  const handleRemoveMaterial = (index) => {
    setScrapMaterials(scrapMaterials.filter((_, i) => i !== index));
  };

  const handleUpdateMaterial = (index, field, value) => {
    const updatedMaterials = [...scrapMaterials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value
    };
    setScrapMaterials(updatedMaterials);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      alert('Please enter a reason for scrapping');
      return;
    }

    if (scrapMaterials.length === 0) {
      alert('Please add at least one material');
      return;
    }

    // Validate all scrap materials
    for (const material of scrapMaterials) {
      if (material.quantity <= 0) {
        alert(`Quantity must be greater than 0 for ${material.materialName}`);
        return;
      }
      if (material.lossPerUnit < 0) {
        alert(`Loss per unit cannot be negative for ${material.materialName}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const payload = {
        reason: formData.reason,
        note: formData.note,
        materials: scrapMaterials.map(m => ({
          materialId: m.materialId,
          quantity: parseFloat(m.quantity),
          lossPerUnit: parseFloat(m.lossPerUnit)
        }))
      };

      const response = await axios.post(API_ROUTES.MATERIAL_SCRAP_RECORDS, payload);

      alert('Material scrap record created successfully!');
      navigate('/materialscraprecord');
    } catch (error) {
      console.error('Error creating material scrap record:', error);
      alert(error.response?.data?.error || 'Failed to create material scrap record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (scrapMaterials.length > 0 || formData.reason || formData.note) {
      if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        navigate('/materialscraprecord');
      }
    } else {
      navigate('/materialscraprecord');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
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
                    Add Material Scrap Record
                  </h1>
                  <p className="text-gray-600 mt-2">Record material losses due to damage, defects, or waste</p>
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
                  <p className="text-sm text-gray-600">Materials</p>
                  <p className="text-xl font-bold text-blue-600">{statistics.totalMaterials}</p>
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
              {/* Record Information Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FileText size={24} className="text-blue-600" />
                  Record Information
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Scrapping *
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                      placeholder="e.g., Damaged during handling, Manufacturing defect, Wastage, etc."
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
                      placeholder="Any additional details about why these materials were scrapped..."
                    />
                  </div>
                </div>
              </div>

              {/* Add Materials Card */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Package size={24} className="text-orange-600" />
                  Add Materials to Scrap
                </h2>
                
                {/* Loading state for materials */}
                {fetchingMaterials ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-4">
                      <Loader className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-gray-600">Loading materials...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search Material */}
                    <div className="mb-6 search-container">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Material
                      </label>
                      <div className="relative mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full pl-4 pr-10 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                            placeholder="Search by material name, barcode, or code..."
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
                                Search Results ({searchResults.length})
                              </div>
                              {searchResults.map(material => (
                                <div
                                  key={material.id}
                                  onClick={() => handleMaterialSelect(material)}
                                  className="px-3 py-3 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg">
                                        <Package size={16} className="text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-800">{material.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {material.barcode ? `Barcode: ${material.barcode} | ` : ''}
                                          {material.material_code ? `Code: ${material.material_code} | ` : ''}
                                          Cost: ${material.unit_cost?.toFixed(2) || '0.00'}
                                        </p>
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

                      {/* Selected Material Form */}
                      {newMaterial.materialName && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/60 border border-green-200/50 rounded-xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700">Selected Material: {newMaterial.materialName}</h3>
                            <button
                              type="button"
                              onClick={() => setNewMaterial({
                                materialId: '',
                                materialName: '',
                                quantity: 1,
                                lossPerUnit: 0
                              })}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Clear selection"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                              <input
                                type="number"
                                value={newMaterial.quantity}
                                onChange={(e) => setNewMaterial({...newMaterial, quantity: e.target.value})}
                                className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                min="1"
                                step="1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Loss per Unit ($) *</label>
                              <input
                                type="number"
                                value={newMaterial.lossPerUnit}
                                onChange={(e) => setNewMaterial({...newMaterial, lossPerUnit: e.target.value})}
                                className="w-full px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={handleAddMaterial}
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

                    {/* Scrap Materials List */}
                    {scrapMaterials.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-white/60">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100/80">
                            <tr>
                              <th className="p-3 text-left font-medium text-gray-700">Material</th>
                              <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                              <th className="p-3 text-left font-medium text-gray-700">Loss/Unit</th>
                              <th className="p-3 text-left font-medium text-gray-700">Total Loss</th>
                              <th className="p-3 text-left font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scrapMaterials.map((material, index) => (
                              <tr key={material.id} className="border-t border-white/50 hover:bg-white/30">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                      <Package size={14} className="text-orange-600" />
                                    </div>
                                    <span className="font-medium">{material.materialName}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={material.quantity}
                                    onChange={(e) => handleUpdateMaterial(index, 'quantity', e.target.value)}
                                    className="w-20 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    min="1"
                                    step="1"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={material.lossPerUnit}
                                    onChange={(e) => handleUpdateMaterial(index, 'lossPerUnit', e.target.value)}
                                    className="w-24 px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="p-3 font-bold text-red-600">
                                  ${(material.quantity * material.lossPerUnit).toFixed(2)}
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
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Materials Added</h3>
                        <p className="text-gray-600">Search and select materials to add to this scrap record</p>
                      </div>
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
                    <span className="text-gray-600">Materials Count</span>
                    <span className="font-semibold">{statistics.totalMaterials}</span>
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
                    disabled={submitting || scrapMaterials.length === 0}
                    className={`w-full px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      submitting || scrapMaterials.length === 0
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
                      <span>Loss per unit is typically the unit cost</span>
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

export default AddMaterialScrapRecord;