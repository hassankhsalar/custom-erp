import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { Upload, X, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const emptyAltUnit = { unitname: "", multiplier: "" };
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { Upload, X, Eye, Layers, DollarSign, Package, TrendingUp, Factory, Pen, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateProduct = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [product, setProduct] = useState({
    name: "",
    description: "",
    sale_price: "",
    wholesale_price: "",
    cost: "",
    alert_quantity: "0",
    brand: "",
    category: "",
    unit: "",
    barcode: "",
  });

  const [alternativeNames, setAlternativeNames] = useState([]);
  const [altNameInput, setAltNameInput] = useState("");
  const [alternativeUnits, setAlternativeUnits] = useState([]);
  const [altUnitDraft, setAltUnitDraft] = useState(emptyAltUnit);
  const [unitSuggestions, setUnitSuggestions] = useState([]);

  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material_id: "", material_name: "", material_quantity: "", price: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState(null);

  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedMaterialDetails, setExpandedMaterialDetails] = useState(null);

  useEffect(() => {
    if (!token) {
      alert("Authentication required. Please login.");
      navigate("/login");
      return;
    }
    setLoading(false);
  }, [token, navigate]);

  useEffect(() => {
    const fetchBaseData = async () => {
      if (!token) return;
      try {
        const [materialsRes, unitsRes, brandsRes, categoriesRes] = await Promise.all([
          axios.get(API_ROUTES.MATERIALS, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_UNITS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_BRANDS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_PRODUCT_CATEGORIES}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setAllMaterials(materialsRes.data.materials || []);
        setUnits(unitsRes.data.items || []);
        setBrands(brandsRes.data.items || []);
        setCategories(categoriesRes.data.items || []);
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
    
    if (token) {
      fetchMaterials();
    }
  }, [token, navigate]);
        console.error("Error fetching base data:", error);
      }
    };
    fetchBaseData();
  }, [token]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMaterials(
        allMaterials.filter((material) => material.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } else {
      setFilteredMaterials([]);
    }
  }, [searchTerm, allMaterials]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!product.unit || !token) {
        setUnitSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(API_ROUTES.MASTER_DATA_UNIT_RELATION_SUGGESTIONS(product.unit), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnitSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setUnitSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [product.unit, token]);

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAltName = () => {
    const value = altNameInput.trim();
    if (!value) return;
    if (alternativeNames.some((name) => name.toLowerCase() === value.toLowerCase())) return;
    setAlternativeNames((prev) => [...prev, value]);
    setAltNameInput("");
  };

  const handleRemoveAltName = (index) => {
    setAlternativeNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAltUnit = (incoming = null) => {
    const payload = incoming || altUnitDraft;
    const unitname = String(payload.unitname || "").trim();
    const multiplier = parseFloat(payload.multiplier);
    if (!unitname || !Number.isFinite(multiplier) || multiplier <= 0) return;
    if (unitname.toLowerCase() === product.unit.toLowerCase()) return;
    if (alternativeUnits.some((u) => u.unitname.toLowerCase() === unitname.toLowerCase())) return;
    setAlternativeUnits((prev) => [...prev, { unitname, multiplier }]);
    if (!incoming) {
      setAltUnitDraft(emptyAltUnit);
    }
  };

  const handleRemoveAltUnit = (index) => {
    setAlternativeUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddOrUpdateMaterial = () => {
    if (newMaterial.material_id && newMaterial.material_quantity && newMaterial.price) {
      if (editingMaterialIndex !== null) {
        const updatedMaterials = [...materials];
        updatedMaterials[editingMaterialIndex] = newMaterial;
        setMaterials(updatedMaterials);
        setEditingMaterialIndex(null);
      } else {
        setMaterials((prev) => [...prev, newMaterial]);
      }
      setNewMaterial({ material_id: "", material_name: "", material_quantity: "", price: "" });
      setSearchTerm("");
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
    setMaterials((prev) => prev.filter((_, i) => i !== index));
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
    if (file) {
      setImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview("");
  };

  const uploadImage = async () => {
    if (!image) return null;
    const formData = new FormData();
    formData.append("image", image);
    try {
      setUploading(true);
      const response = await axios.post(`${API_ROUTES.UPLOADS}/product`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
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
      
      alert('Failed to upload image');
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.name || !product.sale_price || !product.wholesale_price || !product.cost || !product.unit) {
      alert("Please fill all required fields");
    
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }
    
    if (!product.name || !product.sale_price || !product.wholesale_price || !product.cost) {
      alert('Please fill all required fields');
      return;
    }

    try {
      let imageUrl = null;
      
      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) return;
        if (!imageUrl) {
          return;
        }
      }

      const productData = {
        ...product,
        sale_price: parseFloat(product.sale_price),
        wholesale_price: parseFloat(product.wholesale_price),
        cost: parseFloat(product.cost),
        alert_quantity: parseInt(product.alert_quantity || 0, 10),
        image: imageUrl,
        alternative_names: alternativeNames,
        alternative_units: alternativeUnits,
        materials: materials.map((m) => ({
          ...m,
          material_id: parseInt(m.material_id, 10),
          material_quantity: parseFloat(m.material_quantity),
          price: parseFloat(m.price),
        })),
      };

      await axios.post(API_ROUTES.PRODUCTS, productData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      alert("Product created successfully!");
      setProduct({
        name: "",
        description: "",
        sale_price: "",
        wholesale_price: "",
        cost: "",
        alert_quantity: "0",
        brand: "",
        category: "",
        unit: "",
        barcode: "",
      });
      setAlternativeNames([]);
      setAlternativeUnits([]);
      
      alert('Product created successfully!');
      
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
      setImagePreview("");
    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        alert('Permission denied. You cannot create products.');
        return;
      }
      
      alert(error.response?.data?.error || 'Error creating product');
      console.error("Error creating product:", error);
      alert(error.response?.data?.error || "Error creating product");
    }
  };

  const selectedMaterial = allMaterials.find((m) => m.id === parseInt(newMaterial.material_id, 10));

  // Calculate total cost of materials
  const totalMaterialsCost = materials.reduce((sum, mat) => 
    sum + (parseFloat(mat.price) * parseFloat(mat.material_quantity)), 0
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Create New Product
                </h1>
                <p className="text-gray-600 mt-2">Add a new product to your inventory</p>
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

    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create New Product</h1>

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
                            alt="Preview" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
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
                            disabled={uploading}
                          />
                        </label>
                      )}
                    </div>
                    
                    {uploading && (
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
                </div>
              </div>

              {/* Product Details Form */}
              <div className="lg:col-span-2 space-y-5">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input type="text" name="name" value={product.name} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Names</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={altNameInput}
                      onChange={(e) => setAltNameInput(e.target.value)}
                      placeholder="Add another name"
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0"
                    />
                    <button type="button" onClick={handleAddAltName} className="px-3 rounded-lg bg-indigo-600 text-white">
                      <Plus size={16} />
                    </button>
                  </div>
                  {alternativeNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alternativeNames.map((name, idx) => (
                        <span key={`${name}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs">
                          {name}
                          <button type="button" onClick={() => handleRemoveAltName(idx)}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      name="category"
                      id="product-category-list"
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0"
                      onChange={handleProductChange}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name} > {category.name} </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select 
                      name="brand"
                      id="product-brand-list" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" 
                      onChange={handleProductChange}>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name} className="capitalize" > {brand.name} </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select 
                      name="unit"
                      onChange={handleProductChange}
                      id="product-unit-list" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0">
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.name} className="capitalize"> {unit.name} </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
                    <input type="number" name="sale_price" value={product.sale_price} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="0.01" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price *</label>
                    <input type="number" name="wholesale_price" value={product.wholesale_price} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="0.01" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
                  <input type="number" name="cost" value={product.cost} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="0.01" required />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Units</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select name="alternative_unit"
                      list="product-unit-list"
                      onChange={(e) => setAltUnitDraft((prev) => ({ ...prev, unitname: e.target.value }))}
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.name} className="capitalize"> {unit.name} </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      placeholder="Multiplier"
                      value={altUnitDraft.multiplier}
                      onChange={(e) => setAltUnitDraft((prev) => ({ ...prev, multiplier: e.target.value }))}
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0"
                    />
                  </div>
                  <button type="button" onClick={() => handleAddAltUnit()} className="mt-2 px-3 py-2 rounded-lg bg-indigo-600 text-white">
                    Add Alternative Unit
                  </button>
                  {unitSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {unitSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleAddAltUnit({ unitname: suggestion.relatedUnit, multiplier: suggestion.multiplier })}
                          className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {suggestion.relatedUnit} ({suggestion.multiplier})
                        </button>
                      ))}
                    </div>
                  )}
                  {alternativeUnits.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {alternativeUnits.map((unit, idx) => (
                        <div key={`${unit.unitname}-${idx}`} className="flex items-center justify-between px-3 py-2 rounded bg-indigo-50 text-sm">
                          <span>1 {unit.unitname} = {unit.multiplier} {product.unit || "base unit"}</span>
                          <button type="button" onClick={() => handleRemoveAltUnit(idx)}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input type="text" name="barcode" value={product.barcode} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alert Quantity</label>
                  <input type="number" name="alert_quantity" value={product.alert_quantity === "0" ? "" : product.alert_quantity} onChange={handleProductChange} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="1" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={product.description} onChange={handleProductChange} rows="5" className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                  {imagePreview ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-300/50">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full">
                        <X size={16} />
                      </button>
                      <button type="button" onClick={() => window.open(imagePreview, "_blank")} className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                        <Eye size={16} /> View Full Preview
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white/50">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-xs text-gray-500">Click to upload image</p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={uploading} />
                    </label>
                  )}

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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                    <input 
                      type="text" 
                      name="barcode" 
                      value={product.barcode || ''} 
                      onChange={handleProductChange} 
                      placeholder="Optional barcode" 
                      className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input 
                    type="text" 
                    name="category" 
                    value={product.category || ''} 
                    onChange={handleProductChange} 
                    placeholder="Optional category" 
                    className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-200"
                  />
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

          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Materials</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{materials.length} item{materials.length !== 1 ? "s" : ""}</span>
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

            {materials.length > 0 && (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60">
                <table className="min-w-full">
            {/* Materials Table */}
            {materials.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-xl border border-white/60 bg-white/40 backdrop-blur-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left">Material</th>
                      <th className="py-3 px-4 text-left">Quantity</th>
                      <th className="py-3 px-4 text-left">Price</th>
                      <th className="py-3 px-4 text-left">Actions</th>
                      <th className="py-4 px-6 text-left font-medium">Material</th>
                      <th className="py-4 px-6 text-left font-medium">Quantity</th>
                      <th className="py-4 px-6 text-left font-medium">Price</th>
                      <th className="py-4 px-6 text-left font-medium">Total</th>
                      <th className="py-4 px-6 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((mat, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4">{mat.material_name}</td>
                        <td className="py-3 px-4">{mat.material_quantity}</td>
                        <td className="py-3 px-4">{parseFloat(mat.price).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEditMaterial(mat, index)} className="px-3 py-1 rounded bg-amber-500 text-white">Edit</button>
                            <button type="button" onClick={() => handleDeleteMaterial(index)} className="px-3 py-1 rounded bg-red-500 text-white">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                <p className="text-gray-600 mb-4">Start adding materials to your product</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search material..." className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Search for a material..."
                  className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                />
                {filteredMaterials.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 overflow-hidden rounded-lg border bg-white shadow-xl">
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredMaterials.map((material) => (
                        <li key={material.id} onMouseDown={() => handleSelectMaterial(material)} className="p-3 hover:bg-blue-50 cursor-pointer border-b">
                          <div className="font-medium">{material.name}</div>
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
                <input type="number" value={newMaterial.material_quantity} onChange={(e) => setNewMaterial({ ...newMaterial, material_quantity: e.target.value })} placeholder="Quantity" className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="0.01" />
                <input type="number" value={newMaterial.price} onChange={(e) => setNewMaterial({ ...newMaterial, price: e.target.value })} placeholder={selectedMaterial?.unit_cost || "Price"} className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" min="0" step="0.01" />
                <button type="button" onClick={handleAddOrUpdateMaterial} className="bg-blue-700 text-white p-3 rounded-lg">
                  {editingMaterialIndex !== null ? "Update Material" : "Add Material"}
                </button>
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

          <div className="flex justify-center pt-4">
            <button type="submit" disabled={uploading} className={`bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 px-12 rounded-xl font-medium text-lg ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}>
              {uploading ? "Uploading Image..." : "Create Product"}
            <button 
              type="submit" 
              disabled={uploading}
              className={`bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white p-4 px-16 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 ${
                uploading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Uploading Image...
                </span>
              ) : (
                'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct;
