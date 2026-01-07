import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AllMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [showDropdown, setShowDropdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(API_ROUTES.MATERIALS);
        setMaterials(response.data.materials);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching materials:', error);
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await axios.delete(`${API_ROUTES.MATERIALS}/${id}`);
        setMaterials(materials.filter((material) => material.id !== id));
      } catch (error) {
        console.error('Error deleting material:', error);
        alert('Error deleting material. Please try again.');
      }
    }
  };

  const getStockStatus = (stock, alertQuantity) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' };
    if (alertQuantity && stock <= alertQuantity) return { text: 'Low Stock', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { text: 'In Stock', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const formatCurrency = (amount) => {
    return amount ? `$${parseFloat(amount).toFixed(2)}` : '-';
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              All Materials
            </h2>
            <p className="text-gray-600 mt-2">Manage your material inventory</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/40">
              {materials.length} material{materials.length !== 1 ? 's' : ''}
            </div>
            <Link 
              to="/materials/add" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Material
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading materials...</p>
          </div>
        ) : materials.length > 0 ? (
          <div className="backdrop-blur-sm bg-white/50 rounded-xl overflow-hidden border border-white/40 shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                  <tr>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Name</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Brand</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Unit</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Unit Cost</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Sale Price</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Stock</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {materials.map((material, index) => {
                    const stockStatus = getStockStatus(material.current_stock, material.alert_quantity);
                    return (
                      <tr 
                        key={material.id} 
                        className={`${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white/30'} hover:bg-gray-100/50 transition-colors duration-150`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{material.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-900">{material.brand || '-'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 backdrop-blur-sm border border-blue-200/50">
                            {material.unit}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">
                            ${parseFloat(material.unit_cost).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`font-semibold ${material.sale_price ? 'text-purple-700' : 'text-gray-500'}`}>
                            {formatCurrency(material.sale_price)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col space-y-1">
                            <div className="font-semibold text-gray-900">{material.current_stock}</div>
                            {material.alert_quantity && (
                              <div className="text-xs text-gray-500">Alert: {material.alert_quantity}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-xs px-2 py-1 rounded-full border ${stockStatus.color} inline-block backdrop-blur-sm`}>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-full rounded-lg border border-gray-300/50 shadow-sm px-4 py-2 bg-white/80 text-sm font-medium text-gray-700 hover:bg-gray-100/80 focus:outline-none transition-all duration-200 backdrop-blur-sm hover:shadow-md"
                              onClick={() => setShowDropdown(showDropdown === material.id ? null : material.id)}
                            >
                              Actions
                              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {showDropdown === material.id && (
                              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white/95 backdrop-blur-lg ring-1 ring-black/5 z-10 border border-white/40">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  <Link
                                    to={`/materials/edit/${material.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-colors duration-150"
                                    role="menuitem"
                                    onClick={() => setShowDropdown(null)}
                                  >
                                    <svg className="w-4 h-4 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </Link>
                                  <button
                                    onClick={() => {
                                      handleDelete(material.id);
                                      setShowDropdown(null);
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-colors duration-150"
                                    role="menuitem"
                                  >
                                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 backdrop-blur-sm bg-white/50 rounded-xl border border-white/40">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first material</p>
            <Link 
              to="/materials/add" 
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Material
            </Link>
          </div>
        )}

        {/* Summary Cards */}
        {materials.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="backdrop-blur-sm bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
              <div className="text-sm text-gray-600">Total Materials</div>
              <div className="text-2xl font-bold text-blue-700">{materials.length}</div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
              <div className="text-sm text-gray-600">In Stock</div>
              <div className="text-2xl font-bold text-green-700">
                {materials.filter(m => m.current_stock > 0).length}
              </div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
              <div className="text-sm text-gray-600">Low Stock</div>
              <div className="text-2xl font-bold text-amber-700">
                {materials.filter(m => m.alert_quantity && m.current_stock <= m.alert_quantity && m.current_stock > 0).length}
              </div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200/50">
              <div className="text-sm text-gray-600">Out of Stock</div>
              <div className="text-2xl font-bold text-red-700">
                {materials.filter(m => m.current_stock <= 0).length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllMaterials;