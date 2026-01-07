import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Box, 
  Search, 
  User, 
  MapPin, 
  Phone, 
  Store,
  ShoppingBag,
  Hash,
  AlertCircle,
  Check,
  TrendingUp
} from 'lucide-react';

const AddShop = () => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [shop_keeper, setShopKeeper] = useState('');
  const [mobile, setMobile] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [newProduct, setNewProduct] = useState({ product_id: '', product_name: '', stock: '' });
  const [newMaterial, setNewMaterial] = useState({ material_id: '', material_name: '', stock: '' });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductsAndMaterials = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const productsResponse = await axios.get(API_ROUTES.PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllProducts(productsResponse.data.products);

        const materialsResponse = await axios.get(API_ROUTES.MATERIALS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllMaterials(materialsResponse.data.materials);
      } catch (error) {
        console.error('Error fetching products or materials:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductsAndMaterials();
  }, []);

  useEffect(() => {
    if (productSearchTerm) {
      setFilteredProducts(
        allProducts.filter(product =>
          product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchTerm, allProducts]);

  useEffect(() => {
    if (materialSearchTerm) {
      setFilteredMaterials(
        allMaterials.filter(material =>
          material.name.toLowerCase().includes(materialSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredMaterials([]);
    }
  }, [materialSearchTerm, allMaterials]);

  useEffect(() => {
    // Track changes for save indicator
    const hasChanged = name || address || shop_keeper || mobile || selectedProducts.length > 0 || selectedMaterials.length > 0;
    setHasChanges(hasChanged);
  }, [name, address, shop_keeper, mobile, selectedProducts, selectedMaterials]);

  const handleAddOrUpdateProduct = () => {
    if (newProduct.product_id && newProduct.stock) {
      if (editingProductIndex !== null) {
        const updatedProducts = [...selectedProducts];
        updatedProducts[editingProductIndex] = newProduct;
        setSelectedProducts(updatedProducts);
        setEditingProductIndex(null);
      } else {
        setSelectedProducts([...selectedProducts, newProduct]);
      }
      setNewProduct({ product_id: '', product_name: '', stock: '' });
      setProductSearchTerm('');
    }
  };

  const handleSelectProduct = (product) => {
    setNewProduct({ ...newProduct, product_id: product.id, product_name: product.name });
    setProductSearchTerm(product.name);
    setFilteredProducts([]);
  };

  const handleDeleteProduct = (index) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
  };

  const handleEditProduct = (product, index) => {
    setNewProduct(product);
    setEditingProductIndex(index);
    setProductSearchTerm(product.product_name);
  };

  const handleAddOrUpdateMaterial = () => {
    if (newMaterial.material_id && newMaterial.stock) {
      if (editingMaterialIndex !== null) {
        const updatedMaterials = [...selectedMaterials];
        updatedMaterials[editingMaterialIndex] = newMaterial;
        setSelectedMaterials(updatedMaterials);
        setEditingMaterialIndex(null);
      } else {
        setSelectedMaterials([...selectedMaterials, newMaterial]);
      }
      setNewMaterial({ material_id: '', material_name: '', stock: '' });
      setMaterialSearchTerm('');
    }
  };

  const handleSelectMaterial = (material) => {
    setNewMaterial({ ...newMaterial, material_id: material.id, material_name: material.name });
    setMaterialSearchTerm(material.name);
    setFilteredMaterials([]);
  };

  const handleDeleteMaterial = (index) => {
    const updatedMaterials = [...selectedMaterials];
    updatedMaterials.splice(index, 1);
    setSelectedMaterials(updatedMaterials);
  };

  const handleEditMaterial = (material, index) => {
    setNewMaterial(material);
    setEditingMaterialIndex(index);
    setMaterialSearchTerm(material.material_name);
  };

  const handleCancelEditProduct = () => {
    setNewProduct({ product_id: '', product_name: '', stock: '' });
    setEditingProductIndex(null);
    setProductSearchTerm('');
  };

  const handleCancelEditMaterial = () => {
    setNewMaterial({ material_id: '', material_name: '', stock: '' });
    setEditingMaterialIndex(null);
    setMaterialSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(API_ROUTES.SHOPS, {
        name,
        address,
        shop_keeper,
        mobile,
        shopProducts: selectedProducts.map(p => ({ 
          product_id: parseInt(p.product_id), 
          stock: parseFloat(p.stock) 
        })),
        shopMaterials: selectedMaterials.map(m => ({ 
          material_id: parseInt(m.material_id), 
          stock: parseFloat(m.stock) 
        })),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/shop/all');
    } catch (error) {
      console.error('Error creating shop:', error);
      alert(error.response?.data?.error || 'Failed to create shop');
    } finally {
      setIsLoading(false);
    }
  };

  const totalProductStock = selectedProducts.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0);
  const totalMaterialStock = selectedMaterials.reduce((sum, m) => sum + (parseFloat(m.stock) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/shop/all"
              className="group p-2 glass-card rounded-xl border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="text-gray-600 group-hover:text-gray-800" size={24} />
            </Link>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                <ShoppingBag className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Create New Shop
                </h1>
                <p className="text-gray-600 mt-2">Add a new shop with inventory details</p>
              </div>
            </div>
          </div>
          
          {hasChanges && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-lg border border-amber-200/50">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-sm text-amber-600">You have unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Selected Products</p>
              <p className="text-2xl font-bold text-gray-800">{selectedProducts.length}</p>
              <p className="text-xs text-gray-500 mt-1">{totalProductStock} units</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Package className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Selected Materials</p>
              <p className="text-2xl font-bold text-gray-800">{selectedMaterials.length}</p>
              <p className="text-xs text-gray-500 mt-1">{totalMaterialStock} units</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Box className="text-green-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Shop Keeper</p>
              <p className="text-xl font-bold text-gray-800">{shop_keeper || "Not assigned"}</p>
              <p className="text-xs text-gray-500 mt-1">Responsible person</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <User className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Shop Status</p>
              <p className="text-xl font-bold text-gray-800">Creating...</p>
              <p className="text-xs text-gray-500 mt-1">Ready to save</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shop Details Card */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                <Store className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Shop Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter shop name"
                  />
                </div>
              </div>

              {/* Address Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter shop address"
                  />
                </div>
              </div>

              {/* Shop Keeper Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Keeper
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    value={shop_keeper}
                    onChange={(e) => setShopKeeper(e.target.value)}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter shop keeper name"
                  />
                </div>
              </div>

              {/* Mobile Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200/50">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Shop
                    </>
                  )}
                </button>
                <Link
                  to="/shop/all"
                  className="group flex items-center justify-center gap-2 px-6 py-3 glass-card border border-gray-300 text-gray-700 font-medium rounded-xl transition-all duration-300 hover:bg-white/30 hover:scale-[1.02]"
                >
                  <X size={18} />
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Products and Materials Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Products Card */}
          <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Shop Products</h2>
                    <p className="text-gray-600">Add products to shop inventory</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 rounded-full">
                  <span className="text-sm font-medium text-blue-600">{selectedProducts.length} items</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Products Table */}
              <div className="overflow-hidden rounded-xl border border-gray-200/50 mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {selectedProducts.map((prod, index) => (
                        <tr key={index} className="hover:bg-white/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Package className="text-blue-500" size={16} />
                              </div>
                              <span className="font-medium text-gray-900">{prod.product_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Hash className="text-gray-400" size={16} />
                              <span className="font-medium text-gray-900">{prod.stock}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditProduct(prod, index)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg transition-all duration-300"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(index)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedProducts.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                            <Package className="mx-auto text-gray-300" size={32} />
                            <p className="mt-2">No products added yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit Product Form */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingProductIndex !== null ? 'Edit Product' : 'Add New Product'}
                  </label>
                  
                  {/* Search Input */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="Search for a product..."
                      className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                    />
                    
                    {/* Search Results Dropdown */}
                    {filteredProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 glass-card rounded-xl border border-gray-200/50 shadow-lg overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              onMouseDown={() => handleSelectProduct(product)}
                              className="p-3 hover:bg-white/30 border-b border-gray-200/30 last:border-b-0 cursor-pointer transition-colors duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <Package className="text-blue-500" size={14} />
                                </div>
                                <span className="text-gray-700">{product.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Input and Actions */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="text-gray-400" size={18} />
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                          placeholder="Enter stock quantity"
                          className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {editingProductIndex !== null && (
                        <button
                          type="button"
                          onClick={handleCancelEditProduct}
                          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-500/10 rounded-xl transition-all duration-300 border border-gray-300"
                        >
                          <X size={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddOrUpdateProduct}
                        disabled={!newProduct.product_id || !newProduct.stock}
                        className={`group flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg ${
                          editingProductIndex !== null
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        } text-white font-medium ${(!newProduct.product_id || !newProduct.stock) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-[1.02]'}`}
                      >
                        {editingProductIndex !== null ? (
                          <>
                            <Save size={18} />
                            Update Product
                          </>
                        ) : (
                          <>
                            <Plus size={18} />
                            Add Product
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Card */}
          <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-white/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
                    <Box className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Shop Materials</h2>
                    <p className="text-gray-600">Add materials to shop inventory</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-orange-500/10 rounded-full">
                  <span className="text-sm font-medium text-orange-600">{selectedMaterials.length} items</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Materials Table */}
              <div className="overflow-hidden rounded-xl border border-gray-200/50 mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-orange-500/10 to-amber-500/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Material
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {selectedMaterials.map((mat, index) => (
                        <tr key={index} className="hover:bg-white/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Box className="text-orange-500" size={16} />
                              </div>
                              <span className="font-medium text-gray-900">{mat.material_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Hash className="text-gray-400" size={16} />
                              <span className="font-medium text-gray-900">{mat.stock}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditMaterial(mat, index)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg transition-all duration-300"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(index)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedMaterials.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                            <Box className="mx-auto text-gray-300" size={32} />
                            <p className="mt-2">No materials added yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit Material Form */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingMaterialIndex !== null ? 'Edit Material' : 'Add New Material'}
                  </label>
                  
                  {/* Search Input */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      value={materialSearchTerm}
                      onChange={(e) => setMaterialSearchTerm(e.target.value)}
                      placeholder="Search for a material..."
                      className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all duration-300"
                    />
                    
                    {/* Search Results Dropdown */}
                    {filteredMaterials.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 glass-card rounded-xl border border-gray-200/50 shadow-lg overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {filteredMaterials.map(material => (
                            <div
                              key={material.id}
                              onMouseDown={() => handleSelectMaterial(material)}
                              className="p-3 hover:bg-white/30 border-b border-gray-200/30 last:border-b-0 cursor-pointer transition-colors duration-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                  <Box className="text-orange-500" size={14} />
                                </div>
                                <span className="text-gray-700">{material.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Input and Actions */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="text-gray-400" size={18} />
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={newMaterial.stock}
                          onChange={(e) => setNewMaterial({ ...newMaterial, stock: e.target.value })}
                          placeholder="Enter stock quantity"
                          className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all duration-300"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {editingMaterialIndex !== null && (
                        <button
                          type="button"
                          onClick={handleCancelEditMaterial}
                          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-500/10 rounded-xl transition-all duration-300 border border-gray-300"
                        >
                          <X size={18} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddOrUpdateMaterial}
                        disabled={!newMaterial.material_id || !newMaterial.stock}
                        className={`group flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg ${
                          editingMaterialIndex !== null
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        } text-white font-medium ${(!newMaterial.material_id || !newMaterial.stock) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-[1.02]'}`}
                      >
                        {editingMaterialIndex !== null ? (
                          <>
                            <Save size={18} />
                            Update Material
                          </>
                        ) : (
                          <>
                            <Plus size={18} />
                            Add Material
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 glass-card rounded-xl p-4 border border-emerald-200/50 shadow-2xl backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Check className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600">Ready to Create Shop</p>
              <p className="text-xs text-emerald-500">
                {selectedProducts.length} products • {selectedMaterials.length} materials • {totalProductStock + totalMaterialStock} total units
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="ml-4 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Shop'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddShop;