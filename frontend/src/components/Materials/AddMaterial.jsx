import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { 
  Image as ImageIcon, 
  Upload, 
  X, 
  Eye,
  Package,
  DollarSign,
  TrendingUp,
  Factory,
  Tag,
  Barcode,
  AlertCircle,
  CheckCircle,
  Layers
} from 'lucide-react';

const AddMaterial = () => {
  const navigate = useNavigate();
  const [material, setMaterial] = useState({
    name: '',
    description: '',
    brand: '',
    barcode: '',
    unit: '',
    unit_cost: '',
    sale_price: '',
    alert_quantity: '',
    image: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const token = localStorage.getItem('token');

  // Function to upload image
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await axios.post(`${API_ROUTES.UPLOADS}/product`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMaterial((prevMaterial) => ({
      ...prevMaterial,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (jpg, png, gif, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setSelectedImageFile(file);
  };

  const removeImage = () => {
    setMaterial({ ...material, image: null });
    setImagePreview(null);
    setSelectedImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadingImage(true);
    
    try {
      let imageUrl = material.image;
      
      if (selectedImageFile) {
        try {
          imageUrl = await uploadImage(selectedImageFile);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          alert('Failed to upload image. Material will be created without an image.');
        }
      }
      
      const materialData = {
        ...material,
        unit_cost: material.unit_cost ? parseFloat(material.unit_cost) : 0,
        sale_price: material.sale_price ? parseFloat(material.sale_price) : null,
        alert_quantity: material.alert_quantity ? parseFloat(material.alert_quantity) : 0,
        image: imageUrl,
      };
      
      await axios.post(API_ROUTES.MATERIALS, materialData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      alert('Material created successfully!');
      navigate('/materials/all');
      
    } catch (error) {
      console.error('Error creating material:', error);
      alert('Error creating material. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Calculate margin percentage
  const calculateMargin = () => {
    if (material.unit_cost && material.sale_price && parseFloat(material.unit_cost) > 0) {
      const cost = parseFloat(material.unit_cost);
      const sale = parseFloat(material.sale_price);
      return ((sale - cost) / cost * 100).toFixed(1);
    }
    return null;
  };

  const margin = calculateMargin();

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Add New Material
                </h1>
                <p className="text-gray-600 mt-2">Create a new material for inventory management</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/materials/all')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60"
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-purple-600" />
              Material Information
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image Upload Section */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Image</label>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-300/50 bg-gray-50/50 flex items-center justify-center">
                      {imagePreview ? (
                        <>
                          <img 
                            src={imagePreview} 
                            alt="Material preview" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="w-full h-full cursor-pointer flex items-center justify-center">
                          <div className="text-center p-6">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploadingImage}
                          />
                        </label>
                      )}
                    </div>
                    
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-white text-sm">Uploading...</p>
                        </div>
                      </div>
                    )}
                  </div>

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
                  
                  {selectedImageFile && !uploadingImage && (
                    <p className="text-xs text-green-600 mt-2 text-center">
                      ✓ Image selected. It will be uploaded when you save.
                    </p>
                  )}
                </div>
              </div>

              {/* Material Details Form */}
              <div className="lg:col-span-2 space-y-5">
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
                        placeholder="Enter material name"
                        required
                        className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
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
                        className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            name="unit"
                            value={material.unit}
                            onChange={handleChange}
                            placeholder="kg/piece/litre"
                            required
                            className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">Examples: kg, piece, litre, box</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Cost <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="number"
                            name="unit_cost"
                            value={material.unit_cost}
                            onChange={handleChange}
                            placeholder="0.00"
                            required
                            min="0"
                            step="0.01"
                            className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand
                      </label>
                      <div className="relative">
                        <Factory className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          name="brand"
                          value={material.brand}
                          onChange={handleChange}
                          placeholder="Brand name"
                          className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barcode / SKU
                      </label>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          name="barcode"
                          value={material.barcode}
                          onChange={handleChange}
                          placeholder="Barcode or SKU"
                          className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale Price
                      </label>
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="sale_price"
                          value={material.sale_price}
                          onChange={handleChange}
                          placeholder="Optional sale price"
                          className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 bg-blue-50/50 p-2 rounded backdrop-blur-sm border border-blue-100/50">
                        Optional. Leave empty if material is not for direct sale.
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alert Quantity
                      </label>
                      <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="number"
                          name="alert_quantity"
                          value={material.alert_quantity}
                          onChange={handleChange}
                          placeholder="Low stock threshold"
                          min="0"
                          step="0.01"
                          className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 bg-amber-50/50 p-2 rounded backdrop-blur-sm border border-amber-100/50">
                        Low stock alert threshold. Leave empty to disable alerts.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            {(material.unit_cost || material.sale_price) && (
              <div className="mt-6 pt-6 border-t border-gray-200/50">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Pricing Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {material.unit_cost && (
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-green-200/50">
                      <div className="text-sm text-gray-600">Unit Cost</div>
                      <div className="text-xl font-bold text-green-700">
                        ${parseFloat(material.unit_cost).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Per {material.unit || 'unit'}</div>
                    </div>
                  )}
                  
                  {material.sale_price && (
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-blue-200/50">
                      <div className="text-sm text-gray-600">Sale Price</div>
                      <div className="text-xl font-bold text-blue-700">
                        ${parseFloat(material.sale_price).toFixed(2)}
                      </div>
                      {material.unit_cost && (
                        <div className="text-xs text-gray-500 mt-1">
                          Margin: ${(parseFloat(material.sale_price) - parseFloat(material.unit_cost)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {material.sale_price && material.unit_cost && parseFloat(material.unit_cost) > 0 && (
                    <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-purple-200/50">
                      <div className="text-sm text-gray-600">Margin %</div>
                      <div className={`text-xl font-bold ${
                        margin >= 0 ? 'text-purple-700' : 'text-red-700'
                      }`}>
                        {margin}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Profit percentage</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/materials/all')}
              className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 p-3 px-8 rounded-xl font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
              disabled={uploadingImage}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploadingImage}
              className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 flex items-center ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploadingImage ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Material
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;