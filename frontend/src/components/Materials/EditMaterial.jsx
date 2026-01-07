import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const EditMaterial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState({
    name: '',
    description: '',
    brand: '',
    barcode: '',
    image: '',
    unit: '',
    unit_cost: '',
    sale_price: '',
    current_stock: '',
    alert_quantity: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await axios.get(`${API_ROUTES.MATERIALS}/${id}`);
        setMaterial(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching material:', error);
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMaterial((prevMaterial) => ({
      ...prevMaterial,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_ROUTES.MATERIALS}/${id}`, {
        ...material,
        unit_cost: parseFloat(material.unit_cost),
        sale_price: material.sale_price ? parseFloat(material.sale_price) : null,
        current_stock: parseFloat(material.current_stock),
        alert_quantity: material.alert_quantity ? parseFloat(material.alert_quantity) : null,
      });
      alert('Material updated successfully!');
      navigate('/materials/all');
    } catch (error) {
      console.error('Error updating material:', error);
      alert('Error updating material. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading material details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              Edit Material
            </h1>
            <p className="text-gray-600 mt-2">Update material information and inventory</p>
          </div>
          <button 
            onClick={() => navigate('/materials/all')}
            className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
          >
            ← Back to Materials
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Material Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={material.name}
                    onChange={handleChange}
                    placeholder="Material name"
                    required
                    className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={material.description}
                    onChange={handleChange}
                    placeholder="Material description..."
                    rows="3"
                    className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={material.brand}
                      onChange={handleChange}
                      placeholder="Brand name"
                      className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode / SKU
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={material.barcode}
                      onChange={handleChange}
                      placeholder="Barcode or SKU"
                      className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={material.unit}
                      onChange={handleChange}
                      placeholder="kg/piece/litre"
                      required
                      className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="current_stock"
                      value={material.current_stock}
                      onChange={handleChange}
                      placeholder="Stock quantity"
                      required
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Cost <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                      <input
                        type="number"
                        name="unit_cost"
                        value={material.unit_cost}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                        min="0"
                        step="0.01"
                        className="w-full p-3 pl-8 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                      <input
                        type="number"
                        name="sale_price"
                        value={material.sale_price || ''}
                        onChange={handleChange}
                        placeholder="Optional sale price"
                        min="0"
                        step="0.01"
                        className="w-full p-3 pl-8 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 bg-blue-50/50 p-2 rounded backdrop-blur-sm border border-blue-100/50">
                      Optional. Leave empty if material is not for direct sale.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Quantity
                  </label>
                  <input
                    type="number"
                    name="alert_quantity"
                    value={material.alert_quantity || ''}
                    onChange={handleChange}
                    placeholder="Low stock threshold"
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-400/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200"
                  />
                  <div className="mt-1 text-xs text-gray-500 bg-amber-50/50 p-2 rounded backdrop-blur-sm border border-amber-100/50">
                    Set low stock alert. Material will show as "Low Stock" when quantity falls below this value.
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Status & Pricing Summary */}
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stock Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Stock Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`backdrop-blur-sm rounded-lg p-4 border ${
                      material.current_stock <= 0 
                        ? 'bg-red-100/50 border-red-200/50' 
                        : material.alert_quantity && material.current_stock <= material.alert_quantity
                          ? 'bg-amber-100/50 border-amber-200/50'
                          : 'bg-green-100/50 border-green-200/50'
                    }`}>
                      <div className="text-sm text-gray-600">Status</div>
                      <div className={`text-xl font-bold ${
                        material.current_stock <= 0 
                          ? 'text-red-700' 
                          : material.alert_quantity && material.current_stock <= material.alert_quantity
                            ? 'text-amber-700'
                            : 'text-green-700'
                      }`}>
                        {material.current_stock <= 0 
                          ? 'Out of Stock' 
                          : material.alert_quantity && material.current_stock <= material.alert_quantity
                            ? 'Low Stock'
                            : 'In Stock'
                        }
                      </div>
                    </div>
                    
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-blue-200/50">
                      <div className="text-sm text-gray-600">Current Stock</div>
                      <div className="text-xl font-bold text-blue-700">{material.current_stock}</div>
                      <div className="text-xs text-gray-500 mt-1">In {material.unit || 'units'}</div>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Pricing Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-green-200/50">
                      <div className="text-sm text-gray-600">Unit Cost</div>
                      <div className="text-xl font-bold text-green-700">
                        ${parseFloat(material.unit_cost || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Per {material.unit || 'unit'}</div>
                    </div>
                    
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-purple-200/50">
                      <div className="text-sm text-gray-600">Sale Price</div>
                      <div className={`text-xl font-bold ${material.sale_price ? 'text-purple-700' : 'text-gray-500'}`}>
                        {material.sale_price ? `$${parseFloat(material.sale_price).toFixed(2)}` : 'Not set'}
                      </div>
                      {material.sale_price && (
                        <div className="text-xs text-gray-500 mt-1">
                          {material.unit_cost ? 
                            `Margin: $${(material.sale_price - material.unit_cost).toFixed(2)}` : 
                            'No unit cost set'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/materials/all')}
              className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 p-3 px-8 rounded-xl font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-700 hover:to-green-800 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Update Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;