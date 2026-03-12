import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { includesLooseNumber } from "../../utils/numberLooseSearch";
import { Upload, X, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../common/SearchableSelect";


const emptyAltUnit = { unitname: "", multiplier: "" };

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
  const categoryOptions = categories.map((category) => ({ value: category.name, label: category.name }));
  const brandOptions = brands.map((brand) => ({ value: brand.name, label: brand.name }));
  const unitOptions = units.map((unit) => ({ value: unit.name, label: unit.name }));

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
          axios.get(API_ROUTES.MATERIALS_ALL, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_UNITS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_BRANDS}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_ROUTES.MASTER_DATA_PRODUCT_CATEGORIES}?page=1&limit=200&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setAllMaterials(materialsRes.data.materials || []);
        setUnits(unitsRes.data.items || []);
        setBrands(brandsRes.data.items || []);
        setCategories(categoriesRes.data.items || []);
      } catch (error) {
        console.error("Error fetching base data:", error);
      }
    };
    fetchBaseData();
  }, [token]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMaterials(
        allMaterials.filter((material) => includesLooseNumber(material.name, searchTerm))
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
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditMaterial = (material, index) => {
    setEditingMaterialIndex(index);
    setSearchTerm(material.material_name);
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
      return;
    }

    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) return;
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
      setMaterials([]);
      setImage(null);
      setImagePreview("");
    } catch (error) {
      console.error("Error creating product:", error);
      alert(error.response?.data?.error || "Error creating product");
    }
  };

  const selectedMaterial = allMaterials.find((m) => m.id === parseInt(newMaterial.material_id, 10));

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create New Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
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
                    <SearchableSelect
                      name="category"
                      value={product.category}
                      onChange={handleProductChange}
                      options={categoryOptions}
                      placeholder="Select a category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <SearchableSelect
                      name="brand"
                      value={product.brand}
                      onChange={handleProductChange}
                      options={brandOptions}
                      placeholder="Select a brand"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                    <SearchableSelect
                      name="unit"
                      value={product.unit}
                      onChange={handleProductChange}
                      options={unitOptions}
                      placeholder="Select a unit"
                      required
                    />
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
                    <SearchableSelect
                      name="alternative_unit"
                      onChange={(e) => setAltUnitDraft((prev) => ({ ...prev, unitname: e.target.value }))}
                      options={unitOptions}
                      placeholder="Select a unit"
                      required
                    />
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
                </div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Materials</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{materials.length} item{materials.length !== 1 ? "s" : ""}</span>
            </div>

            {materials.length > 0 && (
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200/50 bg-white/60">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left">Material</th>
                      <th className="py-3 px-4 text-left">Quantity</th>
                      <th className="py-3 px-4 text-left">Price</th>
                      <th className="py-3 px-4 text-left">Actions</th>
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
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search material..." className="w-full p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 transition-all duration-200 outline-0" />
                {filteredMaterials.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 overflow-hidden rounded-lg border bg-white shadow-xl">
                    <ul className="max-h-60 overflow-y-auto">
                      {filteredMaterials.map((material) => (
                        <li key={material.id} onMouseDown={() => handleSelectMaterial(material)} className="p-3 hover:bg-blue-50 cursor-pointer border-b">
                          <div className="font-medium">{material.name}</div>
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
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button type="submit" disabled={uploading} className={`bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 px-12 rounded-xl font-medium text-lg ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}>
              {uploading ? "Uploading Image..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct;



