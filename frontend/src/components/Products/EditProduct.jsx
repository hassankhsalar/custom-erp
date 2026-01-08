import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', material_quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_ROUTES.PRODUCTS}/${id}`);
        setProduct(response.data);
        setMaterials(response.data.materials.map(m => ({...m, material_name: m.material.name})));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        setLoading(false);
      }
    };

    const fetchMaterials = async () => {
      try {
        const response = await axios.get(API_ROUTES.MATERIALS);
        setAllMaterials(response.data.materials);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };

    fetchProduct();
    fetchMaterials();
  }, [id]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMaterials(
        allMaterials.filter(material =>
          material.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredMaterials([]);
    }
  }, [searchTerm, allMaterials]);

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleAddOrUpdateMaterial = () => {
    if (newMaterial.material_id && newMaterial.material_quantity && newMaterial.price) {
      if (editingMaterialIndex !== null) {
        const updatedMaterials = [...materials];
        updatedMaterials[editingMaterialIndex] = newMaterial;
        setMaterials(updatedMaterials);
        setEditingMaterialIndex(null);
      } else {
        setMaterials([...materials, newMaterial]);
      }
      setNewMaterial({ material_id: '', material_name: '', material_quantity: '', price: '' });
      setSearchTerm('');
    }
  };

  const handleSelectMaterial = (material) => {
    setNewMaterial({ ...newMaterial, material_id: material.id, material_name: material.name });
    setSearchTerm(material.name);
    setFilteredMaterials([]);
  };

  const handleDeleteMaterial = (index) => {
    const updatedMaterials = [...materials];
    updatedMaterials.splice(index, 1);
    setMaterials(updatedMaterials);
  };

  const handleEditMaterial = (material, index) => {
    setNewMaterial(material);
    setEditingMaterialIndex(index);
    setSearchTerm(material.material_name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = {
      ...product,
      sale_price: parseFloat(product.sale_price),
      wholesale_price: parseFloat(product.wholesale_price),
      cost: parseFloat(product.cost),
      stock: parseInt(product.stock),
      materials: materials.map(m => ({...m, material_id: parseInt(m.material_id), material_quantity: parseFloat(m.material_quantity), price: parseFloat(m.price)})),
    };

    try {
      await axios.put(`${API_ROUTES.PRODUCTS}/${id}`, productData);
      alert('Product updated successfully!');
      navigate('/products/all');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product');
    }
  };

  const selectedMaterial = allMaterials.find(
    (m) => m.id === parseInt(newMaterial.material_id)
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) return <div>Product not found</div>;

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              Edit Product
            </h1>
            <p className="text-gray-600 mt-2">Update product details and materials</p>
          </div>
          <button 
            onClick={() => navigate('/products/all')}
            className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
          >
            ← Back to Products
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Details Card */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Product Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={product.name} 
                    onChange={handleProductChange} 
                    placeholder="Product Name" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    name="description" 
                    value={product.description} 
                    onChange={handleProductChange} 
                    placeholder="Product description..." 
                    rows="3"
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 resize-none"
                  ></textarea>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price *</label>
                    <input 
                      type="number" 
                      name="sale_price" 
                      value={product.sale_price} 
                      onChange={handleProductChange} 
                      placeholder="0.00" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200" 
                      required 
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wholesale Price *</label>
                    <input 
                      type="number" 
                      name="wholesale_price" 
                      value={product.wholesale_price} 
                      onChange={handleProductChange} 
                      placeholder="0.00" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200" 
                      required 
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost *</label>
                    <input 
                      type="number" 
                      name="cost" 
                      value={product.cost} 
                      onChange={handleProductChange} 
                      placeholder="0.00" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200" 
                      required 
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                    <input 
                      type="number" 
                      name="stock" 
                      value={product.stock} 
                      onChange={handleProductChange} 
                      placeholder="Stock quantity" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
                      required 
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Materials
              </h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-blue-200/50">
                {materials.length} material{materials.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Materials Table */}
            {materials.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60 backdrop-blur-sm">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Material</th>
                      <th className="py-3 px-4 text-left font-medium">Quantity</th>
                      <th className="py-3 px-4 text-left font-medium">Price</th>
                      <th className="py-3 px-4 text-left font-medium">Total</th>
                      <th className="py-3 px-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {materials.map((mat, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="font-medium text-gray-800">{mat.material_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                            {mat.material_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          ${parseFloat(mat.price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          ${(parseFloat(mat.price) * parseFloat(mat.material_quantity)).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button 
                              type="button" 
                              onClick={() => handleEditMaterial(mat, index)} 
                              className="bg-amber-500/90 hover:bg-amber-600 text-white p-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteMaterial(index)} 
                              className="bg-red-500/90 hover:bg-red-600 text-white p-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 mb-6 backdrop-blur-sm bg-gray-50/50 rounded-lg border border-gray-200/50">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-2">No materials added yet</p>
                <p className="text-sm text-gray-500">Add materials to create your product</p>
              </div>
            )}

            {/* Add Material Form */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Search for a material..."
                  className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                />
                {filteredMaterials.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 overflow-hidden rounded-lg border border-gray-200/70 bg-white/95 backdrop-blur-lg shadow-xl">
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredMaterials.map(material => (
                        <li
                          key={material.id}
                          onMouseDown={() => handleSelectMaterial(material)}
                          className="p-3 hover:bg-blue-50/80 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                        >
                          <div className="font-medium text-gray-800">{material.name}</div>
                          {material.unit_cost && (
                            <div className="text-sm text-gray-500">Unit Cost: ${material.unit_cost}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={newMaterial.material_quantity} 
                    onChange={(e) => setNewMaterial({ ...newMaterial, material_quantity: e.target.value })} 
                    placeholder="Enter quantity" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price {selectedMaterial?.unit_cost && `(Default: $${selectedMaterial.unit_cost})`}
                  </label>
                  <input 
                    type="number" 
                    value={newMaterial.price} 
                    onChange={(e) => setNewMaterial({ ...newMaterial, price: e.target.value })} 
                    placeholder={selectedMaterial?.unit_cost || "Enter price"} 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200" 
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="flex items-end">
                  <button 
                    type="button" 
                    onClick={handleAddOrUpdateMaterial} 
                    className={`w-full p-3 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
                      editingMaterialIndex !== null 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white hover:shadow-lg' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-lg'
                    }`}
                  >
                    {editingMaterialIndex !== null ? 'Update Material' : 'Add Material'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/products/all')}
              className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 p-3 px-8 rounded-xl font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-700 hover:to-green-800 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5"
            >
              Update Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;