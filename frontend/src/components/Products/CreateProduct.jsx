
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { Upload, X, Eye } from 'lucide-react';

const CreateProduct = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    sale_price: '',
    wholesale_price: '',
    cost: '',
    alert_quantity: '0',
  });
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', material_quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(API_ROUTES.MATERIALS);
        setAllMaterials(response.data.materials);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview('');
  };

  const uploadImage = async () => {
    if (!image) return null;
    
    const formData = new FormData();
    formData.append('image', image);
    
    try {
      setUploading(true);
      const response = await axios.post(`${API_ROUTES.UPLOADS}/product`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!product.name || !product.sale_price || !product.wholesale_price || !product.cost) {
      alert('Please fill all required fields');
      return;
    }

    try {
      let imageUrl = null;
      
      // Upload image if exists
      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          return; // Stop if image upload failed
        }
      }

      const productData = {
        ...product,
        sale_price: parseFloat(product.sale_price),
        wholesale_price: parseFloat(product.wholesale_price),
        cost: parseFloat(product.cost),
        alert_quantity: parseInt(product.alert_quantity),
        image: imageUrl,
        materials: materials.map(m => ({
          ...m, 
          material_id: parseInt(m.material_id), 
          material_quantity: parseFloat(m.material_quantity), 
          price: parseFloat(m.price)
        })),
      };

      await axios.post(API_ROUTES.PRODUCTS, productData);
      alert('Product created successfully!');
      
      // Clear form
      setProduct({ 
        name: '', 
        description: '', 
        sale_price: '', 
        wholesale_price: '', 
        cost: '', 
        alert_quantity: '0'
      });
      setMaterials([]);
      setImage(null);
      setImagePreview('');
    } catch (error) {
      console.error('Error creating product:', error);
      alert(error.response?.data?.error || 'Error creating product');
    }
  };

  const selectedMaterial = allMaterials.find(
    (m) => m.id === parseInt(newMaterial.material_id)
  );

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create New Product
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Details Card */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Product Details</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={product.name} 
                    onChange={handleProductChange} 
                    placeholder="Enter product name" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price *</label>
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

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative">
                        <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-300/50">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300/50 rounded-lg cursor-pointer bg-white/50 hover:bg-gray-50/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="mb-1 text-sm text-gray-500">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 5MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                    
                    {/* Image Preview Modal Trigger */}
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => window.open(imagePreview, '_blank')}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Eye size={16} />
                        View Full Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alert Quantity</label>
                  <input 
                    type="number" 
                    name="alert_quantity" 
                    value={product.alert_quantity === '0' ? '' : product.alert_quantity}
                    onChange={handleProductChange} 
                    placeholder="Optional - Set low stock alert" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 transition-all duration-200" 
                    min="0"
                    step="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    name="description" 
                    value={product.description} 
                    onChange={handleProductChange} 
                    placeholder="Product description..." 
                    rows="5"
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 resize-none"
                  ></textarea>
                </div>
                
                {/* Additional optional fields can be added here */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                    <input 
                      type="text" 
                      name="barcode" 
                      value={product.barcode || ''} 
                      onChange={handleProductChange} 
                      placeholder="Optional barcode" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-200" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input 
                      type="text" 
                      name="category" 
                      value={product.category || ''} 
                      onChange={handleProductChange} 
                      placeholder="Optional category" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-200" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Materials</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {materials.length} item{materials.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Materials Table */}
            {materials.length > 0 && (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60 backdrop-blur-sm">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Material</th>
                      <th className="py-3 px-4 text-left font-medium">Quantity</th>
                      <th className="py-3 px-4 text-left font-medium">Price</th>
                      <th className="py-3 px-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {materials.map((mat, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="py-3 px-4 text-gray-800 font-medium">{mat.material_name}</td>
                        <td className="py-3 px-4">
                          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                            {mat.material_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          ${parseFloat(mat.price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button 
                              type="button" 
                              onClick={() => handleEditMaterial(mat, index)} 
                              className="bg-amber-500/90 hover:bg-amber-600 text-white p-2 px-4 rounded-lg transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteMaterial(index)} 
                              className="bg-red-500/90 hover:bg-red-600 text-white p-2 px-4 rounded-lg transition-all duration-200 hover:shadow-md backdrop-blur-sm"
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
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
                  >
                    {editingMaterialIndex !== null ? 'Update Material' : 'Add Material'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button 
              type="submit" 
              disabled={uploading}
              className={`bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white p-4 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 ${
                uploading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? 'Uploading Image...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct;