import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { 
  Factory, 
  Calendar, 
  Search, 
  Package, 
  Layers, 
  Plus, 
  Trash2, 
  Settings, 
  PlayCircle, 
  Clock,
  Tag,
  DollarSign,
  Warehouse,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

const NewProduction = () => {
  const location = useLocation();
  const requisitionOrder = location.state?.requisitionOrder || null;
  const [formData, setFormData] = useState({
    start_date: '',
    estimated_end_date: '',
    factoryId: '',
    status: 'pending',
  });
  const [factories, setFactories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [factoryMaterialMap, setFactoryMaterialMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [requisitionLink, setRequisitionLink] = useState({
    requisitionId: null,
    requisitionSectionId: null,
  });
  const [prefillFactoryId, setPrefillFactoryId] = useState('');
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
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const materialsMap = new Map();
    selectedProducts.forEach(p => {
      const productQuantity = p.quantity;
      if (p.materials) {
        p.materials.forEach(materialItem => {
          const { material, material_quantity } = materialItem;
          const factoryInfo = factoryMaterialMap[material.id];
          const unitPrice = factoryInfo?.avg_cost && factoryInfo.avg_cost > 0
            ? factoryInfo.avg_cost
            : material.unit_cost;
          const availableStock = factoryInfo?.stock ?? 0;
          if (materialsMap.has(material.id)) {
            const existing = materialsMap.get(material.id);
            existing.quantity += material_quantity * productQuantity;
          } else {
            materialsMap.set(material.id, {
              materialId: material.id,
              name: material.name,
              quantity: material_quantity * productQuantity,
              price: unitPrice,
              availableStock,
            });
          }
        });
      }
    });

    const newMaterials = Array.from(materialsMap.values());

    setSelectedMaterials(prevMaterials => {
      return newMaterials.map(newMat => {
        const existingMat = prevMaterials.find(prevMat => prevMat.materialId === newMat.materialId);
        if (existingMat) {
          return {
            ...newMat,
            price: newMat.price,
          };
        }
        return newMat;
      });
    });
  }, [selectedProducts, factoryMaterialMap]);

  useEffect(() => {
    const fetchFactoryMaterials = async () => {
      if (!formData.factoryId) {
        setFactoryMaterialMap({});
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_ROUTES.FACTORIES}/${formData.factoryId}/materials`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const map = {};
        response.data.forEach((fm) => {
          map[fm.materialId] = {
            avg_cost: fm.avg_cost,
            stock: fm.stock,
            unit_cost: fm.material?.unit_cost || 0,
          };
        });
        setFactoryMaterialMap(map);
      } catch (error) {
        console.error('Error fetching factory materials:', error);
        setFactoryMaterialMap({});
      }
    };
    fetchFactoryMaterials();
  }, [formData.factoryId]);

  useEffect(() => {
    if (!requisitionOrder) return;
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const destinationType = requisitionOrder.destinationType || requisitionOrder.destination?.type;
    const destinationId = requisitionOrder.destinationId || requisitionOrder.destination?.id;
    if (destinationType === "factory" && destinationId) {
      const nextFactoryId = String(destinationId);
      setPrefillFactoryId(nextFactoryId);
      setFormData((prev) => ({
        ...prev,
        factoryId: nextFactoryId,
        start_date: prev.start_date || fmt(today),
        estimated_end_date: prev.estimated_end_date || fmt(nextWeek),
      }));
    }

    const orderProducts = (requisitionOrder.items || [])
      .filter((it) => it.itemType === "product")
      .map((it) => ({
        id: it.productId,
        name: it.product?.name,
        barcode: it.product?.barcode || '',
        materials: it.product?.materials || [],
        quantity: it.quantity || 1,
        unit_cost: it.product?.cost || 0,
        moved_to_store: 0,
        batchNumber: '',
        expiryDate: '',
        manufactureDate: '',
        batchNotes: '',
        image: it.product?.image || null
      }));

    if (orderProducts.length > 0) {
      setSelectedProducts(orderProducts);
    }

    setRequisitionLink({
      requisitionId: requisitionOrder.requisitionId,
      requisitionSectionId: requisitionOrder.id,
    });
  }, [requisitionOrder]);

  useEffect(() => {
    if (!prefillFactoryId || !factories.length) return;
    const exists = factories.some((factory) => String(factory.id) === String(prefillFactoryId));
    if (!exists) return;
    setFormData((prev) => {
      if (String(prev.factoryId) === String(prefillFactoryId)) return prev;
      return { ...prev, factoryId: String(prefillFactoryId) };
    });
  }, [prefillFactoryId, factories]);

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `http://localhost:3001${imagePath}`;
    return `http://localhost:3001/uploads/${imagePath}`;
  };

  const handleSearch = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_ROUTES.PRODUCTS}?search=${e.target.value}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(response.data.products);
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
      return [...prev, { 
        ...product, 
        quantity: 1, 
        unit_cost: product.cost, 
        moved_to_store: 0,
        batchNumber: '',
        expiryDate: '',
        manufactureDate: '',
        batchNotes: '',
        image: product.image || product.photo || product.thumbnail
      }];
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
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity') {
          const qty = parseFloat(value) || 0;
          const available = item.availableStock ?? 0;
          if (available > 0 && qty > available) {
            alert(`Requested quantity exceeds available stock (${available}).`);
            updated.quantity = available;
          }
        }
        return updated;
      })
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
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        requisitionId: requisitionLink.requisitionId,
        requisitionSectionId: requisitionLink.requisitionSectionId,
        products: selectedProducts.map(p => ({
          productId: p.id,
          code: p.barcode || '',
          batchNumber: p.batchNumber || null,
          expiryDate: p.expiryDate || null,
          manufactureDate: p.manufactureDate || null,
          batchNotes: p.batchNotes || null,
          quantity: p.quantity,
          unit_cost: p.unit_cost,
          moved_to_store: p.moved_to_store,
        })),
        materials: selectedMaterials.map((material) => material),
      };
      await axios.post(API_ROUTES.PRODUCTIONS, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (requisitionLink.requisitionSectionId) {
        try {
          await axios.post(
            API_ROUTES.REQUISITION_SECTION_COMPLETE(requisitionLink.requisitionSectionId),
            { status: 'done', note: 'Completed by production creation' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch {
          // Non-blocking: production already created
        }
      }
      navigate('/productions/all');
    } catch (error) {
      alert('Error creating production: ' + error.response?.data?.error || error.message);
      console.error('Error creating production:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl  xl:max-w-full">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                <Factory className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  New Production Order
                </h1>
                <p className="text-gray-600 mt-2">Create a new production batch in your factory</p>
                {requisitionOrder && (
                  <p className="text-sm text-indigo-700 mt-1">
                    Requisition Order: {requisitionOrder?.requisition?.reference} / Section {requisitionOrder?.sectionNo}
                  </p>
                )}
              </div>
            </div>
            <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm font-medium text-gray-700">Production Info</p>
              <p className="text-lg font-bold text-emerald-600">
                {selectedProducts.length} Product{selectedProducts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Production Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Production Details Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="text-blue-600" size={20} />
                </div>
                Production Details
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
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    Estimated End Date *
                  </label>
                  <input
                    type="date"
                    name="estimated_end_date"
                    value={formData.estimated_end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
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
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 appearance-none"
                      required
                    >
                      <option value="">Select Factory</option>
                      {factories.map(factory => (
                        <option key={factory.id} value={String(factory.id)}>{factory.name}</option>
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
                    <PlayCircle size={16} className="text-gray-500" />
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: 'pending' }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-300 ${
                        formData.status === 'pending'
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-transparent shadow-lg"
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
                          ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white border-transparent shadow-lg"
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
                <Layers size={20} className="text-emerald-600" />
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

                <div className="p-3 bg-gradient-to-r from-blue-50/60 to-purple-50/60 rounded-xl border border-white/60">
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
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Search className="text-emerald-600" size={20} />
                  </div>
                  Add Products to Production
                </h2>
              </div>

              <div className="relative mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 placeholder:text-gray-400"
                    placeholder="Search products by name or barcode..."
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
                    {searchResults.map(product => {
                      const productImage = product.image || product.photo || product.thumbnail;
                      const imageUrl = productImage ? getImageUrl(productImage) : null;
                      
                      return (
                        <div
                          key={product.id}
                          className="p-3 border-b border-white/30 last:border-b-0 cursor-pointer hover:bg-white/50 transition-colors duration-200"
                          onClick={() => addProductToProduction(product)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={16} class="text-gray-400" /></div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <ImageIcon size={16} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{product.name}</p>
                                <p className="text-sm text-gray-600">Barcode: {product.barcode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">${product.cost?.toFixed(2)}</p>
                              <button className="mt-1 px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors">
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                </div>

                {selectedProducts.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Product</th>
                          <th className="p-3 text-left font-medium text-gray-700">Code</th>
                          <th className="p-3 text-left font-medium text-gray-700">Batch</th>
                          <th className="p-3 text-left font-medium text-gray-700">Expiry</th>
                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                          <th className="p-3 text-left font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((product, index) => {
                          const imageUrl = product.image ? getImageUrl(product.image) : null;
                          
                          return (
                            <tr key={product.id} className="border-t border-white/50 hover:bg-white/30">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                    {imageUrl ? (
                                      <img 
                                        src={imageUrl} 
                                        alt={product.name}
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
                                    <span className="font-medium block">{product.name}</span>
                                    <span className="text-xs text-gray-500">{product.category || 'No category'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-gray-600">{product.barcode}</td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={product.batchNumber || ''}
                                  onChange={(e) => handleProductChange(index, 'batchNumber', e.target.value)}
                                  className="w-32 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none"
                                  placeholder="Batch no."
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="date"
                                  value={product.expiryDate || ''}
                                  onChange={(e) => handleProductChange(index, 'expiryDate', e.target.value)}
                                  className="w-36 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none"
                                />
                              </td>
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
                                <button
                                  type="button"
                                  onClick={() => removeProductFromProduction(index)}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white/30 rounded-xl border border-white/50">
                    <Package size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No products added yet. Search and add products above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Warehouse className="text-amber-600" size={20} />
                  </div>
                  Required Materials ({selectedMaterials.length})
                </h2>
                <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm">
                  Auto-calculated
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
                              <div className="p-2 bg-amber-100 rounded-lg">
                                <Tag size={14} className="text-amber-600" />
                              </div>
                              <span className="font-medium">{material.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              className="w-24 px-3 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td className="p-3">
                            <div className="relative">
                              <input
                                type="number"
                                value={material.price}
                                onChange={(e) => handleMaterialChange(index, 'price', e.target.value)}
                                className="w-24 p-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </td>
                          <td className="p-3 font-bold text-amber-600">
                            ${(material.quantity * (material.price || 0)).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => removeMaterialFromProduction(index)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-amber-50/60 to-yellow-50/60">
                      <tr>
                        <td colSpan="3" className="p-3 text-right font-bold text-gray-700">
                          Total Materials Cost:
                        </td>
                        <td className="p-3 font-bold text-amber-700 text-lg">
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
                  <p className="text-gray-600">Materials will appear here when products are added</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Ready to Create Production</h3>
              <p className="text-gray-600">Review all details before submitting</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/productions/all')}
                className="px-6 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || selectedProducts.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Production...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Create Production Order
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

export default NewProduction;
