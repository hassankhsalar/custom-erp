import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { Image as ImageIcon, Upload, X, Plus } from "lucide-react";

const emptyAltUnit = { unitname: "", multiplier: "" };

const AddMaterial = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [material, setMaterial] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    barcode: "",
    unit: "",
    unit_cost: "",
    sale_price: "",
    alert_quantity: "",
    image: null,
  });
  const [alternativeNames, setAlternativeNames] = useState([]);
  const [altNameInput, setAltNameInput] = useState("");
  const [alternativeUnits, setAlternativeUnits] = useState([]);
  const [altUnitDraft, setAltUnitDraft] = useState(emptyAltUnit);
  const [unitSuggestions, setUnitSuggestions] = useState([]);

  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  useEffect(() => {
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
        console.error("Error loading master data:", error);
      }
    };
    fetchMasterData();
  }, [token]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!material.unit || !token) {
        setUnitSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(API_ROUTES.MASTER_DATA_UNIT_RELATION_SUGGESTIONS(material.unit), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnitSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setUnitSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [material.unit, token]);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await axios.post(`${API_ROUTES.UPLOADS}/product`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.imageUrl;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMaterial((prevMaterial) => ({ ...prevMaterial, [name]: value }));
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
    if (unitname.toLowerCase() === material.unit.toLowerCase()) return;
    if (alternativeUnits.some((u) => u.unitname.toLowerCase() === unitname.toLowerCase())) return;
    setAlternativeUnits((prev) => [...prev, { unitname, multiplier }]);
    if (!incoming) setAltUnitDraft(emptyAltUnit);
  };

  const handleRemoveAltUnit = (index) => {
    setAlternativeUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
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
          console.error("Image upload failed:", uploadError);
          alert("Failed to upload image. Material will be created without an image.");
        }
      }

      const materialData = {
        ...material,
        unit_cost: material.unit_cost ? parseFloat(material.unit_cost) : 0,
        sale_price: material.sale_price ? parseFloat(material.sale_price) : null,
        alert_quantity: material.alert_quantity ? parseFloat(material.alert_quantity) : 0,
        image: imageUrl,
        alternative_names: alternativeNames,
        alternative_units: alternativeUnits,
      };

      await axios.post(API_ROUTES.MATERIALS, materialData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      alert("Material created successfully!");
      navigate("/materials/all");
    } catch (error) {
      console.error("Error creating material:", error);
      alert(error.response?.data?.error || "Error creating material. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Add New Material</h1>
            <p className="text-gray-600 mt-2">Create a new material for inventory management</p>
          </div>
          <button onClick={() => navigate("/materials/all")} className="bg-gray-100/80 px-4 py-2.5 rounded-lg border">
            Back to Materials
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Material Information</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Image</label>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-300/50 bg-gray-50/50 flex items-center justify-center">
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Material preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No image uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <input type="file" id="image-upload" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploadingImage} />
                    <label htmlFor="image-upload" className="flex items-center justify-center w-full p-4 rounded-lg border-2 border-dashed border-blue-300/50 bg-blue-50/30 cursor-pointer">
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-blue-600">{uploadingImage ? "Uploading..." : "Upload Image"}</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input type="text" name="name" value={material.name} onChange={handleChange} required className="w-full p-3 border rounded-lg bg-white/80" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alternative Names</label>
                      <div className="flex gap-2">
                        <input type="text" value={altNameInput} onChange={(e) => setAltNameInput(e.target.value)} placeholder="Add another name" className="w-full p-3 border rounded-lg bg-white/80" />
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea name="description" value={material.description} onChange={handleChange} rows="3" className="w-full p-3 border rounded-lg bg-white/80 resize-none" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                        <input list="material-unit-list" name="unit" value={material.unit} onChange={handleChange} required className="w-full p-3 border rounded-lg bg-white/80" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                        <input list="material-brand-list" name="brand" value={material.brand} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white/80" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <input list="material-category-list" name="category" value={material.category} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white/80" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alternative Units</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          list="material-unit-list"
                          placeholder="Unit name"
                          value={altUnitDraft.unitname}
                          onChange={(e) => setAltUnitDraft((prev) => ({ ...prev, unitname: e.target.value }))}
                          className="w-full p-3 border rounded-lg bg-white/80"
                        />
                        <input
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          placeholder="Multiplier"
                          value={altUnitDraft.multiplier}
                          onChange={(e) => setAltUnitDraft((prev) => ({ ...prev, multiplier: e.target.value }))}
                          className="w-full p-3 border rounded-lg bg-white/80"
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
                              <span>{unit.unitname} = {unit.multiplier} x {material.unit || "base unit"}</span>
                              <button type="button" onClick={() => handleRemoveAltUnit(idx)}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Barcode / SKU</label>
                      <input type="text" name="barcode" value={material.barcode} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white/80" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost *</label>
                      <input type="number" name="unit_cost" value={material.unit_cost} onChange={handleChange} required min="0" step="0.01" className="w-full p-3 border rounded-lg bg-white/80" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                      <input type="number" step="0.01" min="0" name="sale_price" value={material.sale_price} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white/80" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alert Quantity</label>
                      <input type="number" name="alert_quantity" value={material.alert_quantity} onChange={handleChange} min="0" step="0.01" className="w-full p-3 border rounded-lg bg-white/80" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button type="button" onClick={() => navigate("/materials/all")} className="bg-gray-100/80 p-3 px-8 rounded-xl border" disabled={uploadingImage}>
              Cancel
            </button>
            <button type="submit" disabled={uploadingImage} className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 px-12 rounded-xl font-medium text-lg ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}>
              {uploadingImage ? "Creating..." : "Add Material"}
            </button>
          </div>
        </form>

        <datalist id="material-unit-list">
          {units.map((unit) => (
            <option key={unit.id} value={unit.name} />
          ))}
        </datalist>
        <datalist id="material-brand-list">
          {brands.map((brand) => (
            <option key={brand.id} value={brand.name} />
          ))}
        </datalist>
        <datalist id="material-category-list">
          {categories.map((category) => (
            <option key={category.id} value={category.name} />
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default AddMaterial;
