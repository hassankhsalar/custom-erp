import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { includesLooseNumberInAny } from '../../utils/numberLooseSearch';
import { 
  Factory, 
  Calendar, 
  Search, 
  Package, 
  Trash2, 
  Settings, 
  PlayCircle, 
  Clock,
  Tag,
  DollarSign,
  Warehouse,
  CheckCircle,
  AlertCircle,
  Save,
  ArrowLeft,
  Edit3,
  RefreshCw
} from 'lucide-react';

const EditProduction = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    start_date: '',
    estimated_end_date: '',
    factoryId: '',
    status: 'pending',
  });
  const [factories, setFactories] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const factoryResponse = await axios.get(API_ROUTES.FACTORIES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFactories(factoryResponse.data);

        const storeResponse = await axios.get(API_ROUTES.STORES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStores(storeResponse.data.stores || storeResponse.data || []);

        const productionResponse = await axios.get(`${API_ROUTES.PRODUCTIONS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const production = productionResponse.data;

        setFormData({
          start_date: new Date(production.start_date).toISOString().split('T')[0],
          estimated_end_date: new Date(production.estimated_end_date).toISOString().split('T')[0],
          factoryId: production.factoryId,
          status: production.status,
        });

        const products = production.productionProducts.map(pp => ({
          ...pp.product,
          productId: pp.productId,
          code: pp.code,
          quantity: pp.quantity,
          unit_cost: pp.unit_cost,
          moved_to_store: pp.moved_to_store,
        }));
        setSelectedProducts(products)

        const materials = production.productionMaterials.map(pm => ({
            materialId: pm.materialId,
            name: pm.material.name,
            quantity: pm.quantity,
            price: pm.price,
        }));
        setSelectedMaterials(materials);

      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  useEffect(() => {
    const materialsMap = new Map();
    selectedProducts.forEach(p => {
      const productQuantity = p.quantity;
      if (p.materials) {
        p.materials.forEach(materialItem => {
          const { material, material_quantity } = materialItem;
          if (materialsMap.has(material.id)) {
            const existing = materialsMap.get(material.id);
            existing.quantity += material_quantity * productQuantity;
          } else {
            materialsMap.set(material.id, {
              materialId: material.id,
              name: material.name,
              quantity: material_quantity * productQuantity,
              price: material.unit_cost,
            });
          }
        });
      }
    });

    const newMaterials = Array.from(materialsMap.values());

    setSelectedMaterials(prevMaterials => {
        const updatedMaterials = newMaterials.map(newMat => {
        const existingMat = prevMaterials.find(prevMat => prevMat.materialId === newMat.materialId);
        if (existingMat) {
          return {
            ...newMat,
            quantity: newMat.quantity,
            price: existingMat.price,
          };
        }
        return newMat;
      });

      // Keep materials that might have been added manually or do not exist in new calc
      const manuallyAdded = prevMaterials.filter(pm => !materialsMap.has(pm.materialId));
      return [...updatedMaterials, ...manuallyAdded];
    });
  }, [selectedProducts, stores]);


  const handleSearch = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_ROUTES.PRODUCTS}?search=${e.target.value}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rows = Array.isArray(response.data?.products) ? response.data.products : [];
        const filteredRows = rows.filter((row) => includesLooseNumberInAny([row.name, row.barcode, row.category, row.description], e.target.value));
        setSearchResults(filteredRows);
      } catch (error) {
        console.error('Error searching products:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const addProductToProduction = (product) => {
    setSelectedProducts(prev => {
      if (prev.find(p => p.id === product.id)) {
        return prev;
      }
      return [...prev, { ...product, quantity: 1, unit_cost: product.cost, moved_to_store: 0 }];
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = selectedProducts.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setSelectedProducts(updatedProducts);
  };

  const removeProductFromProduction = (index) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index, field, value) => {
    setSelectedMaterials(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeMaterialFromProduction = (index) => {
    setSelectedMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        products: selectedProducts.map(p => ({
          productId: p.id || p.productId,
          code: p.barcode || p.code || '',
          quantity: p.quantity,
          unit_cost: p.unit_cost,
          moved_to_store: p.moved_to_store,
        })),
        materials: selectedMaterials.map(({ storeId, ...rest }) => rest),
      };
      await axios.put(`${API_ROUTES.PRODUCTIONS}/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/productions/all');
    } catch (error) {
      alert('Error updating production: ' + error.response?.data?.error || error.message);
      console.error('Error updating production:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total materials cost
  const calculateTotalMaterialsCost = () => {
    return selectedMaterials.reduce((total, material) => {
      return total + (material.quantity * (material.price || 0));
    }, 0);
  };

  // Calculate total products value
  const calculateTotalProductsValue = () => {
    return selectedProducts.reduce((total, product) => {
      return total + (product.quantity * (product.unit_cost || 0));
    }, 0);
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock size={16} className="text-red-500" />;
      case 'running': return <PlayCircle size={16} className="text-blue-500" />;
      case 'production_done': return <CheckCircle size={16} className="text-green-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading production data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <Edit3 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Edit Production Order
                </h1>
                <p className="text-gray-600 mt-2">Modify production details, products, and materials</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/productions/all')}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/60"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div className="px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                <p className="text-sm font-medium text-gray-700">Editing</p>
                <p className="text-lg font-bold text-amber-600">ID: {id}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Production Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Production Details Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Settings className="text-amber-600" size={20} />
                </div>
                Production Settings
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    Estimated End Date *
                  </label>
                  <input
                    type="date"
                    name="estimated_end_date"
                    value={formData.estimated_end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Factory size={16} className="text-gray-500" />
                    Factory *
                  </label>
                  <div className="relative">
                    <select
                      name="factoryId"
                      value={formData.factoryId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300 appearance-none"
                      required
                    >
                      <option value="">Select Factory</option>
                      {factories.map(factory => (
                        <option key={factory.id} value={factory.id}>{factory.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    {getStatusIcon(formData.status)}
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-300 ${
                        formData.status === 'pending'
                          ? "bg-gradient-to-br from-red-500 to-rose-500 text-white border-transparent shadow-lg"
                          : "bg-white/60 border-gray-200/50 hover:bg-white/80"
                      }`}
                    >
                      <Clock size={16} />
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'running' }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-300 ${
                        formData.status === 'running'
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-transparent shadow-lg"
                          : "bg-white/60 border-gray-200/50 hover:bg-white/80"
                      }`}
                    >
                      <PlayCircle size={16} />
                      Running
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <RefreshCw size={20} className="text-amber-600" />
                Production Summary
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Products</p>
                      <p className="text-lg font-bold text-blue-700">{selectedProducts.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Value</p>
                    <p className="text-lg font-bold text-green-600">${calculateTotalProductsValue().toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Warehouse size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Materials</p>
                      <p className="text-lg font-bold text-purple-700">{selectedMaterials.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Cost</p>
                    <p className="text-lg font-bold text-amber-600">${calculateTotalMaterialsCost().toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-r from-amber-50/60 to-orange-50/60 rounded-xl border border-white/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Estimated Margin</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ${(calculateTotalProductsValue() - calculateTotalMaterialsCost()).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Margin %</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {calculateTotalProductsValue() > 0 ? 
                          (((calculateTotalProductsValue() - calculateTotalMaterialsCost()) / calculateTotalProductsValue()) * 100).toFixed(1) + '%' : 
                          '0%'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Products & Materials */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Search className="text-amber-600" size={20} />
                  </div>
                  Add More Products
                </h2>
                <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                  Current: {selectedProducts.length}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300 placeholder:text-gray-400"
                    placeholder="Search products to add..."
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Search size={20} className="text-gray-400" />
                  </div>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 backdrop-blur-lg bg-white/90 border border-white/60 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    <div className="p-3 border-b border-white/50">
                      <p className="text-sm font-medium text-gray-700">{searchResults.length} products found</p>
                    </div>
                    {searchResults.map(product => (
                      <div
                        key={product.id}
                        className="p-3 border-b border-white/30 last:border-b-0 cursor-pointer hover:bg-white/50 transition-colors duration-200"
                        onClick={() => addProductToProduction(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Package size={16} className="text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{product.name}</p>
                              <p className="text-sm text-gray-600">Barcode: {product.barcode}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">${product.cost?.toFixed(2)}</p>
                            <button className="mt-1 px-3 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Products Table */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Selected Products ({selectedProducts.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    Clear Search
                  </button>
                </div>

                {selectedProducts.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Product</th>
                          <th className="p-3 text-left font-medium text-gray-700">Code</th>
                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                          <th className="p-3 text-left font-medium text-gray-700">Unit Cost</th>
                          <th className="p-3 text-left font-medium text-gray-700">To Store</th>
                          <th className="p-3 text-left font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((product, index) => (
                          <tr key={product.id || product.productId} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Package size={14} className="text-blue-600" />
                                </div>
                                <span className="font-medium">{product.name}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-gray-600">{product.barcode || product.code}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                                className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                step="1"
                                min="1"
                              />
                            </td>
                            <td className="p-3">
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                  <DollarSign size={14} className="text-gray-400" />
                                </div>
                                <input
                                  type="number"
                                  value={product.unit_cost}
                                  onChange={(e) => handleProductChange(index, 'unit_cost', e.target.value)}
                                  className="w-24 pl-8 pr-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={product.moved_to_store}
                                onChange={(e) => handleProductChange(index, 'moved_to_store', e.target.value)}
                                className="w-20 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                                step="1"
                                min="0"
                              />
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => removeProductFromProduction(index)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                title="Remove Product"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white/30 rounded-xl border border-white/50">
                    <Package size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No products added. Search and add products above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Warehouse className="text-purple-600" size={20} />
                  </div>
                  Required Materials ({selectedMaterials.length})
                </h2>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm">
                    Auto-calculated
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger materials recalculation
                      setSelectedProducts([...selectedProducts]);
                    }}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                    title="Recalculate Materials"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {selectedMaterials.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">Material</th>
                        <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                        <th className="p-3 text-left font-medium text-gray-700">Unit Price</th>
                        <th className="p-3 text-left font-medium text-gray-700">Total Cost</th>
                        <th className="p-3 text-left font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMaterials.map((material, index) => (
                        <tr key={material.materialId} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Tag size={14} className="text-purple-600" />
                              </div>
                              <span className="font-medium">{material.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              className="w-24 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td className="p-3">
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <DollarSign size={14} className="text-gray-400" />
                              </div>
                              <input
                                type="number"
                                value={material.price}
                                onChange={(e) => handleMaterialChange(index, 'price', e.target.value)}
                                className="w-24 pl-8 pr-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </td>
                          <td className="p-3 font-bold text-purple-600">
                            ${(material.quantity * (material.price || 0)).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => removeMaterialFromProduction(index)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                              title="Remove Material"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-purple-50/60 to-blue-50/60">
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-bold text-gray-700">
                          Total Materials Cost:
                        </td>
                        <td className="p-3 font-bold text-purple-700 text-lg">
                          ${calculateTotalMaterialsCost().toFixed(2)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-white/30 rounded-xl border border-white/50">
                  <Warehouse size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Add products to see required materials</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Save Production Changes</h3>
              <p className="text-gray-600">Review all modifications before saving</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/productions/all')}
                className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting || selectedProducts.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Update Production Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProduction;

