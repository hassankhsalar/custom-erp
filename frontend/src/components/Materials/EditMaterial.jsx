import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { 
  Image as ImageIcon, 
  X, 
  Upload, 
  Eye,
  Package,
  DollarSign,
  TrendingUp,
  Factory,
  Tag,
  Barcode,
  AlertCircle,
  CheckCircle,
  Layers,
  Pen
} from 'lucide-react';

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
    alert_quantity: '',
  });
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const token = localStorage.getItem('token');

  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = MEDIA_BASE_URL;
    
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    } else {
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await axios.get(`${API_ROUTES.MATERIALS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setMaterial(response.data);
        
        if (response.data.image) {
          setImagePreview(getImageUrl(response.data.image));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching material:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You do not have access to this material.');
        }
        
        setLoading(false);
      }
    };
    
    if (token) {
      fetchMaterial();
    } else {
      alert('No authentication token found. Please login.');
      navigate('/login');
    }
  }, [id, token, navigate]);

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

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await axios.post(`${API_ROUTES.UPLOADS}/material`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired during image upload. Please try again.');
      }
      
      throw error;
    }
  };

  const removeImage = () => {
    setMaterial({ ...material, image: null });
    setImagePreview(null);
    setSelectedImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      let imageUrl = material.image;
      
      if (selectedImageFile) {
        try {
          imageUrl = await uploadImage(selectedImageFile);
          setMaterial({ ...material, image: imageUrl });
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          alert('Failed to upload image. Material will be updated without changing the image.');
        }
      }
      
      const materialData = {
        ...material,
        unit_cost: parseFloat(material.unit_cost),
        sale_price: material.sale_price ? parseFloat(material.sale_price) : null,
        alert_quantity: material.alert_quantity ? parseFloat(material.alert_quantity) : null,
        image: selectedImageFile ? imageUrl : material.image,
      };
      
      await axios.put(`${API_ROUTES.MATERIALS}/${id}`, materialData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      alert('Material updated successfully!');
      navigate('/materials/all');
      
    } catch (error) {
      console.error('Error updating material:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        alert('Permission denied. You cannot update this material.');
        return;
      }
      
      try {
        const simpleData = {
          name: material.name,
          description: material.description || '',
          unit: material.unit,
          unit_cost: parseFloat(material.unit_cost),
        };
        
        await axios.put(`${API_ROUTES.MATERIALS}/${id}`, simpleData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        alert('Basic material information updated successfully!');
        navigate('/materials/all');
      } catch (secondError) {
        console.error('Second attempt failed:', secondError);
        alert('Error updating material. Please try again.');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading material details...</p>
        </div>
      </div>
    );
  }

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
                  Edit Material
                </h1>
                <p className="text-gray-600 mt-2">Update material information and inventory</p>
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
          {/* Material Details Card */}
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
                      ✓ New image selected. It will be uploaded when you save.
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
                        placeholder="Material name"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          name="unit"
                          value={material.unit}
                          placeholder="kg/piece/litre"
                          readOnly
                          className="w-full pl-10 p-3 border outline-none border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                        />
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sale Price
                      </label>
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="number"
                          name="sale_price"
                          value={material.sale_price || ''}
                          onChange={handleChange}
                          placeholder="Optional sale price"
                          min="0"
                          step="0.01"
                          className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                        />
                      </div>
                    </div>
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
                      value={material.alert_quantity || ''}
                      onChange={handleChange}
                      placeholder="Low stock threshold"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200"
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 bg-amber-50/50 p-2 rounded backdrop-blur-sm border border-amber-100/50">
                    Set low stock alert. Material will show as "Low Stock" when quantity falls below this value.
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Pricing Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-green-200/50 h-full">
                    <div className="text-sm text-gray-600">Unit Cost</div>
                    <div className="text-xl font-bold text-green-700">
                      ${parseFloat(material.unit_cost || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Per {material.unit || 'unit'}</div>
                  </div>
                </div>

                {/* Sale Price & Margin */}
                <div className="col-span-1">
                  <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-purple-200/50 h-full">
                    <div className="text-sm text-gray-600">Sale Price</div>
                    <div className={`text-xl font-bold ${material.sale_price ? 'text-purple-700' : 'text-gray-500'}`}>
                      {material.sale_price ? `$${parseFloat(material.sale_price).toFixed(2)}` : 'Not set'}
                    </div>
                    {material.sale_price && (
                      <>
                        <div className="text-xs text-gray-500 mt-1">
                          {material.unit_cost ? 
                            `Margin: $${(material.sale_price - material.unit_cost).toFixed(2)}` : 
                            'No unit cost set'}
                        </div>
                        {margin && (
                          <div className={`text-sm font-semibold mt-2 ${
                            margin >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {margin}% {margin >= 0 ? 'profit' : 'loss'}
                          </div>
                        )}
                      </>
                    )}
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
                  Updating...
                </span>
              ) : (
                <>
                  <Pen className="w-5 h-5 mr-2" />
                  Update Material
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;
