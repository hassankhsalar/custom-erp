import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  AlertCircle,
  Check,
  Hash
} from 'lucide-react';

const EditStore = () => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [store_keeper, setStoreKeeper] = useState('');
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const storeResponse = await axios.get(`${API_ROUTES.STORES}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const store = storeResponse.data;
        setName(store.name);
        setAddress(store.address);
        setStoreKeeper(store.store_keeper);
        setMobile(store.mobile);

        // Populate selected products and materials
        setSelectedProducts(store.storeProducts.map(sp => ({
          product_id: sp.product_id,
          product_name: sp.product.name,
          stock: sp.stock,
        })));
        setSelectedMaterials(store.storeMaterials.map(sm => ({
          material_id: sm.material_id,
          material_name: sm.material.name,
          stock: sm.stock,
        })));

        const productsResponse = await axios.get(API_ROUTES.PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllProducts(productsResponse.data.products);

        const materialsResponse = await axios.get(API_ROUTES.MATERIALS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllMaterials(materialsResponse.data.materials);

      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreData();
  }, [id]);

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
    const hasChanged = name || address || store_keeper || mobile || selectedProducts.length > 0 || selectedMaterials.length > 0;
    setHasChanges(hasChanged);
  }, [name, address, store_keeper, mobile, selectedProducts, selectedMaterials]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ROUTES.STORES}/${id}`, {
        name,
        address,
        store_keeper,
        mobile,
        storeProducts: selectedProducts.map(p => ({ product_id: parseInt(p.product_id), stock: parseFloat(p.stock) })),
        storeMaterials: selectedMaterials.map(m => ({ material_id: parseInt(m.material_id), stock: parseFloat(m.stock) })),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/stores/all');
    } catch (error) {
      console.error('Error updating store:', error);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 border border-white/30 shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/stores/all"
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="text-gray-600 hover:text-gray-800" size={24} />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Store
              </h1>
              <p className="text-gray-600 mt-2">Update store information and inventory</p>
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

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Store Details Card */}
        <div className="col-span-1 lg:col-span-2">
          <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Store className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Store Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name *
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
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter store name"
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
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter store address"
                  />
                </div>
              </div>

              {/* Store Keeper Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Keeper
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    value={store_keeper}
                    onChange={(e) => setStoreKeeper(e.target.value)}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter store keeper name"
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
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200/50">
                <button
                  type="submit"
                  className="group flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  <Save size={18} />
                  Update Store
                </button>
                <Link
                  to="/stores/all"
                  className="group flex items-center justify-center gap-2 px-6 py-3 glass-card border border-gray-300 text-gray-700 font-medium rounded-xl transition-all duration-300 hover:bg-white/30 hover:scale-[1.02]"
                >
                  <X size={18} />
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        
      </div>

      
    </div>
  );
};

export default EditStore;