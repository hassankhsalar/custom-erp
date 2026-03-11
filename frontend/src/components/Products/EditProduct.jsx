import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import SearchableSelect from '../common/SearchableSelect';
import { 
  Image as ImageIcon, 
  X, 
  Upload, 
  Eye, 
  Layers, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Factory, 
  Pen, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Archive
} from 'lucide-react';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [product, setProduct] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', material_quantity: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [expandedMaterialDetails, setExpandedMaterialDetails] = useState(null);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [loadingStockHistory, setLoadingStockHistory] = useState(false);

  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;

    if (imagePath.startsWith('/uploads')) {
      return `${MEDIA_BASE_URL}${imagePath}`;
    } 
    
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  // Fetch stock history
  const fetchStockHistory = async () => {
    if (!token || !id) return;
    
    setLoadingStockHistory(true);
    try {
      const response = await axios.get(`${API_ROUTES.PRODUCTS}/${id}/stock-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    } finally {
      setLoadingStockHistory(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!token) {
        alert('Authentication required. Please login.');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${API_ROUTES.PRODUCTS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        // Ensure all fields are present with defaults if missing
        const productData = {
          name: response.data.name || '',
          description: response.data.description || '',
          sale_price: response.data.sale_price || '',
          wholesale_price: response.data.wholesale_price || '',
          cost: response.data.cost || '',
          stock: response.data.stock || 0, // Added stock field
          alert_quantity: response.data.alert_quantity || '0',
          category: response.data.category || '',
          brand: response.data.brand || '',
          unit: response.data.unit || '',
          barcode: response.data.barcode || '',
          image: response.data.image || null,
        };
        
        setProduct(productData);
        setMaterials(response.data.materials.map(m => ({...m, material_name: m.material.name})));
        
        if (response.data.image) {
          setImagePreview(getImageUrl(response.data.image));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You do not have access to this product.');
        }
        
        setLoading(false);
      }
    };

    const fetchMaterials = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get(API_ROUTES.MATERIALS, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setAllMaterials(response.data.materials || []);
      } catch (error) {
        console.error('Error fetching materials:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You do not have access to materials.');
        }
      }
    };

    const fetchMasterData = async () => {
      if (!token) return;
      try {
        const [unitsRes, brandsRes, categoriesRes] = await Promise.all([
          axios.get(`${API_ROUTES.MASTER_DATA_UNITS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_BRANDS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_PRODUCT_CATEGORIES}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setUnits(unitsRes.data.items || []);
        setBrands(brandsRes.data.items || []);
        setCategories(categoriesRes.data.items || []);
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };

    if (token) {
      fetchProduct();
      fetchMaterials();
      fetchMasterData();
    }
  }, [id, token, navigate]);

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
    if (window.confirm('Are you sure you want to remove this material?')) {
      const updatedMaterials = [...materials];
      updatedMaterials.splice(index, 1);
      setMaterials(updatedMaterials);
    }
  };

  const handleEditMaterial = (material, index) => {
    setNewMaterial(material);
    setEditingMaterialIndex(index);
    setSearchTerm(material.material_name);
  };

  const toggleMaterialDetails = (index) => {
    setExpandedMaterialDetails(expandedMaterialDetails === index ? null : index);
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
      const response = await axios.post(`${API_ROUTES.UPLOADS}/product`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired during image upload. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      }
      
      throw error;
    }
  };

  const removeImage = () => {
    setProduct({ ...product, image: null });
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
      let imageUrl = product.image;
      
      if (selectedImageFile) {
        try {
          imageUrl = await uploadImage(selectedImageFile);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          alert('Failed to upload image. Product will be updated without changing the image.');
        }
      }
      
      const productData = {
        name: product.name,
        description: product.description || '',
        sale_price: parseFloat(product.sale_price),
        wholesale_price: parseFloat(product.wholesale_price),
        cost: parseFloat(product.cost),
        stock: parseInt(product.stock) || 0, // Include stock field
        alert_quantity: product.alert_quantity ? parseInt(product.alert_quantity) : 0,
        category: product.category || null,
        brand: product.brand || null,
        unit: product.unit || null,
        barcode: product.barcode || null,
        image: selectedImageFile ? imageUrl : product.image,
        materials: materials.map(m => ({
          material_id: parseInt(m.material_id),
          material_quantity: parseFloat(m.material_quantity),
          price: parseFloat(m.price)
        })),
      };
      
      await axios.put(`${API_ROUTES.PRODUCTS}/${id}`, productData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      alert('Product updated successfully!');
      navigate('/products/all');
      
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        alert('Permission denied. You cannot update this product.');
        return;
      }
      
      alert(error.response?.data?.error || 'Error updating product. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleViewStockHistory = () => {
    if (!showStockHistory) {
      fetchStockHistory();
    }
    setShowStockHistory(!showStockHistory);
  };

  const selectedMaterial = allMaterials.find(
    (m) => m.id === parseInt(newMaterial.material_id)
  );

  // Calculate total cost of materials
  const totalMaterialsCost = materials.reduce((sum, mat) => 
    sum + (parseFloat(mat.price) * parseFloat(mat.material_quantity)), 0
  );
  
  const categoryOptions = categories.map((category) => ({ value: category.name, label: category.name }));
  const brandOptions = brands.map((brand) => ({ value: brand.name, label: brand.name }));
  const unitOptions = units.map((unit) => ({ value: unit.name, label: unit.name }));
  const mergedCategoryOptions = product?.category && !categoryOptions.some((option) => option.value === product.category)
    ? [{ value: product.category, label: product.category }, ...categoryOptions]
    : categoryOptions;
  const mergedBrandOptions = product?.brand && !brandOptions.some((option) => option.value === product.brand)
    ? [{ value: product.brand, label: product.brand }, ...brandOptions]
    : brandOptions;
  const mergedUnitOptions = product?.unit && !unitOptions.some((option) => option.value === product.unit)
    ? [{ value: product.unit, label: product.unit }, ...unitOptions]
    : unitOptions;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) return <div>Product not found</div>;

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
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Edit Product
                </h1>
                <p className="text-gray-600 mt-2">Update product details, stock, and materials</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/products/all')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60"
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Details Card */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Product Information
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image Upload Section */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-300/50 bg-gray-50/50 flex items-center justify-center">
                      {imagePreview ? (
                        <>
                          <img 
                            src={imagePreview} 
                            alt="Product preview" 
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

              {/* Product Details Form */}
              <div className="lg:col-span-2 space-y-5">
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
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="number" 
                        name="sale_price" 
                        value={product.sale_price} 
                        onChange={handleProductChange} 
                        placeholder="0.00" 
                        className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200" 
                        required 
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wholesale Price *</label>
                    <div className="relative">
                      <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="number" 
                        name="wholesale_price" 
                        value={product.wholesale_price} 
                        onChange={handleProductChange} 
                        placeholder="0.00" 
                        className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200" 
                        required 
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost *</label>
                    <div className="relative">
                      <Factory className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="number" 
                        name="cost" 
                        value={product.cost} 
                        onChange={handleProductChange} 
                        placeholder="0.00" 
                        className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200" 
                        required 
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Stock Field - New */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                    <div className="relative">
                      <Archive className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="number" 
                        name="stock" 
                        value={product.stock} 
                        onChange={handleProductChange} 
                        placeholder="0" 
                        className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
                        required 
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alert Quantity</label>
                    <input 
                      type="number" 
                      name="alert_quantity" 
                      value={product.alert_quantity === '0' ? '' : product.alert_quantity}
                      onChange={handleProductChange} 
                      placeholder="Low stock alert level" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all duration-200" 
                      min="0"
                      step="1"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleViewStockHistory}
                      className="w-full p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                    >
                      <Archive size={18} />
                      {showStockHistory ? 'Hide Stock History' : 'View Stock History'}
                    </button>
                  </div>
                </div>

                {/* Stock History Section */}
                {showStockHistory && (
                  <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Archive size={16} />
                      Stock Adjustment History
                    </h4>
                    {loadingStockHistory ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : stockHistory.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No stock history available</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {stockHistory.map((history, index) => (
                          <div key={index} className="text-sm bg-white/50 p-3 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">
                                {history.type}
                              </span>
                              <span className={`font-semibold ${history.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {history.quantity > 0 ? '+' : ''}{history.quantity}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(history.createdAt).toLocaleString()} - {history.reason || history.notes || 'No notes'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                    <input 
                      type="text" 
                      name="barcode" 
                      value={product.barcode || ''} 
                      onChange={handleProductChange} 
                      placeholder="Product barcode" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <SearchableSelect
                      name="category" 
                      value={product.category || ''} 
                      onChange={handleProductChange} 
                      options={mergedCategoryOptions}
                      placeholder="Select category"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <SearchableSelect
                      name="brand"
                      value={product.brand || ''}
                      onChange={handleProductChange}
                      options={mergedBrandOptions}
                      placeholder="Select brand"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <SearchableSelect
                      name="unit"
                      value={product.unit || ''}
                      onChange={handleProductChange}
                      options={mergedUnitOptions}
                      placeholder="Unit"
                      disabled
                    />
                    <p className="mt-1 text-xs text-amber-700">Unit cannot be changed after stock exists.</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    name="description" 
                    value={product.description} 
                    onChange={handleProductChange} 
                    placeholder="Product description..." 
                    rows="4"
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-purple-600" />
                Materials
              </h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-blue-200/50">
                {materials.length} material{materials.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Materials Table */}
            {materials.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-xl border border-white/60 bg-white/40 backdrop-blur-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-4 px-6 text-left font-medium">Material</th>
                      <th className="py-4 px-6 text-left font-medium">Quantity</th>
                      <th className="py-4 px-6 text-left font-medium">Price</th>
                      <th className="py-4 px-6 text-left font-medium">Total</th>
                      <th className="py-4 px-6 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {materials.map((mat, index) => {
                      const total = parseFloat(mat.price) * parseFloat(mat.material_quantity);
                      
                      return (
                        <React.Fragment key={index}>
                          <tr className="hover:bg-white/30 transition-colors duration-150">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="font-medium text-gray-800">{mat.material_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                                {mat.material_quantity}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-medium text-gray-900">
                              ${parseFloat(mat.price).toFixed(2)}
                            </td>
                            <td className="py-4 px-6 font-semibold text-gray-900">
                              ${total.toFixed(2)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button" 
                                  onClick={() => handleEditMaterial(mat, index)} 
                                  className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors duration-300"
                                  title="Edit"
                                >
                                  <Pen size={16} />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteMaterial(index)} 
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => toggleMaterialDetails(index)} 
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="Details"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Material Details */}
                          {expandedMaterialDetails === index && (
                            <tr className="border-t border-blue-100/50 bg-blue-50/30">
                              <td colSpan="5" className="p-4">
                                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-4 border border-white/40">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Material Details</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs text-gray-500">Quantity</p>
                                      <p className="font-medium">{mat.material_quantity} units</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Unit Price</p>
                                      <p className="font-medium">${parseFloat(mat.price).toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Total Cost</p>
                                      <p className="font-medium text-purple-600">${total.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Materials Summary */}
                <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-4 border-t border-white/60">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Materials Cost:</span>
                    <span className="text-lg font-bold text-purple-600">${totalMaterialsCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 mb-6 backdrop-blur-sm bg-gray-50/50 rounded-xl border border-gray-200/50">
                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                  <Layers size={48} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Materials Added</h3>
                <p className="text-gray-600 mb-4">Add materials to this product</p>
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
                  className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
                {filteredMaterials.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 overflow-hidden rounded-lg border border-gray-200/70 bg-white/95 backdrop-blur-lg shadow-xl">
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredMaterials.map(material => (
                        <li
                          key={material.id}
                          onMouseDown={() => handleSelectMaterial(material)}
                          className="p-3 hover:bg-purple-50/80 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
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
                    disabled={!newMaterial.material_id || !newMaterial.material_quantity || !newMaterial.price}
                    className={`w-full p-3 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
                      editingMaterialIndex !== null 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white hover:shadow-lg' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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
              disabled={uploadingImage}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploadingImage}
              className={`bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-700 hover:to-green-800 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploadingImage ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Updating...
                </span>
              ) : (
                'Update Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;