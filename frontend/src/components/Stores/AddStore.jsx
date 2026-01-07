import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';

const AddStore = () => {
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductsAndMaterials = async () => {
      try {
        const token = localStorage.getItem('token');
        const productsResponse = await axios.get(API_ROUTES.PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllProducts(productsResponse.data.products);

        const materialsResponse = await axios.get(API_ROUTES.MATERIALS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllMaterials(materialsResponse.data.materials);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products or materials:', error);
        setLoading(false);
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
      await axios.post(API_ROUTES.STORES, {
        name,
        address,
        store_keeper,
        mobile,
        storeProducts: selectedProducts.map(p => ({ product_id: parseInt(p.product_id), stock: parseFloat(p.stock) })),
        storeMaterials: selectedMaterials.map(m => ({ material_id: parseInt(m.material_id), stock: parseFloat(m.stock) })),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Store created successfully!');
      navigate('/stores/all');
    } catch (error) {
      console.error('Error creating store:', error);
      alert('Error creating store. Please try again.');
    }
  };

  const totalStockValue = () => {
    let total = 0;
    selectedProducts.forEach(product => {
      const matchedProduct = allProducts.find(p => p.id === parseInt(product.product_id));
      if (matchedProduct && matchedProduct.cost) {
        total += parseFloat(product.stock) * parseFloat(matchedProduct.cost);
      }
    });
    selectedMaterials.forEach(material => {
      const matchedMaterial = allMaterials.find(m => m.id === parseInt(material.material_id));
      if (matchedMaterial && matchedMaterial.unit_cost) {
        total += parseFloat(material.stock) * parseFloat(matchedMaterial.unit_cost);
      }
    });
    return total.toFixed(2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products and materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Add New Store
            </h1>
            <p className="text-gray-600 mt-2">Create a new store with inventory management</p>
          </div>
          <Link 
            to="/stores/all"
            className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
          >
            ← Back to Stores
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Information Card */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Store Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="name"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Enter store name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Address
                  </label>
                  <textarea
                    id="address"
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 resize-none"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Store address"
                    rows="3"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Keeper
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="store_keeper"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                      value={store_keeper}
                      onChange={(e) => setStoreKeeper(e.target.value)}
                      placeholder="Store keeper's name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="mobile"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Contact number"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Products in Store
              </h2>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-green-200/50">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Products Table */}
            {selectedProducts.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60 backdrop-blur-sm">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Product</th>
                      <th className="py-3 px-4 text-left font-medium">Stock</th>
                      <th className="py-3 px-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {selectedProducts.map((prod, index) => {
                      const matchedProduct = allProducts.find(p => p.id === parseInt(prod.product_id));
                      return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium text-gray-800">{prod.product_name}</span>
                            </div>
                            {matchedProduct?.cost && (
                              <div className="text-sm text-gray-500">Cost: ${matchedProduct.cost}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                              {prod.stock}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button 
                                type="button" 
                                onClick={() => handleEditProduct(prod, index)} 
                                className="bg-amber-500/90 hover:bg-amber-600 text-white p-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                              >
                                Edit
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteProduct(index)} 
                                className="bg-red-500/90 hover:bg-red-600 text-white p-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 mb-6 backdrop-blur-sm bg-gray-50/50 rounded-lg border border-gray-200/50">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-600 mb-2">No products added yet</p>
                <p className="text-sm text-gray-500">Add products to your store inventory</p>
              </div>
            )}

            {/* Add Product Form */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="🔍 Search for a product..."
                  className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 overflow-hidden rounded-lg border border-gray-200/70 bg-white/95 backdrop-blur-lg shadow-xl">
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <li
                          key={product.id}
                          onMouseDown={() => handleSelectProduct(product)}
                          className="p-3 hover:bg-green-50/80 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                        >
                          <div className="font-medium text-gray-800">{product.name}</div>
                          {product.cost && (
                            <div className="text-sm text-gray-500">Cost: ${product.cost} | Stock: {product.stock}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input 
                    type="number" 
                    value={newProduct.stock} 
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} 
                    placeholder="Enter stock quantity" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200" 
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="flex items-end">
                  <button 
                    type="button" 
                    onClick={handleAddOrUpdateProduct} 
                    className={`w-full p-3 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
                      editingProductIndex !== null 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white hover:shadow-lg' 
                        : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-700 hover:to-green-800 text-white hover:shadow-lg'
                    }`}
                  >
                    {editingProductIndex !== null ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Materials in Store
              </h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-blue-200/50">
                {selectedMaterials.length} material{selectedMaterials.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Materials Table */}
            {selectedMaterials.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60 backdrop-blur-sm">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Material</th>
                      <th className="py-3 px-4 text-left font-medium">Stock</th>
                      <th className="py-3 px-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {selectedMaterials.map((mat, index) => {
                      const matchedMaterial = allMaterials.find(m => m.id === parseInt(mat.material_id));
                      return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-gray-800">{mat.material_name}</span>
                            </div>
                            {matchedMaterial?.unit_cost && (
                              <div className="text-sm text-gray-500">Cost: ${matchedMaterial.unit_cost}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                              {mat.stock}
                            </span>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 mb-6 backdrop-blur-sm bg-gray-50/50 rounded-lg border border-gray-200/50">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-600 mb-2">No materials added yet</p>
                <p className="text-sm text-gray-500">Add materials to your store inventory</p>
              </div>
            )}

            {/* Add Material Form */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
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
                            <div className="text-sm text-gray-500">Cost: ${material.unit_cost} | Stock: {material.current_stock}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input 
                    type="number" 
                    value={newMaterial.stock} 
                    onChange={(e) => setNewMaterial({ ...newMaterial, stock: e.target.value })} 
                    placeholder="Enter stock quantity" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200" 
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

          {/* Summary Section */}
          {(selectedProducts.length > 0 || selectedMaterials.length > 0) && (
            <div className="backdrop-blur-sm bg-gradient-to-r from-purple-50 to-purple-100/30 rounded-xl p-6 border border-purple-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-green-200/50">
                  <div className="text-sm text-gray-600">Total Products</div>
                  <div className="text-2xl font-bold text-green-700">{selectedProducts.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Added to store</div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-blue-200/50">
                  <div className="text-sm text-gray-600">Total Materials</div>
                  <div className="text-2xl font-bold text-blue-700">{selectedMaterials.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Added to store</div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/60 rounded-lg p-4 border border-purple-200/50">
                  <div className="text-sm text-gray-600">Total Stock Value</div>
                  <div className="text-2xl font-bold text-purple-700">${totalStockValue()}</div>
                  <div className="text-xs text-gray-500 mt-1">Estimated value</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Link 
              to="/stores/all"
              className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 p-3 px-8 rounded-xl font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStore;