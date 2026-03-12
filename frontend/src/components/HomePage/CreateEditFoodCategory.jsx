import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { Upload, X, Eye, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CreateEditFoodCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const isEditMode = !!id;

  const [category, setCategory] = useState({
    name: "",
    isActive: true
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) {
      alert("Authentication required. Please login.");
      navigate("/login");
      return;
    }

    if (isEditMode) {
      fetchCategory();
    }
  }, [token, navigate, id]);

  const fetchCategory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ROUTES.FOOD_CATEGORY(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setCategory({
        name: data.name || "",
        isActive: data.isActive
      });
      if (data.image) {
        setExistingImage(data.image);
        setImagePreview(getImageUrl(data.image));
      }
    } catch (error) {
      console.error("Error fetching category:", error);
      alert("Failed to fetch category data");
      navigate("/food-categories");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = MEDIA_BASE_URL || '';
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    }
    return `${baseUrl}/uploads/${imagePath}`;
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setCategory(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert("Please upload an image file");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview("");
    setExistingImage("");
  };

  const uploadImage = async () => {
    if (!image) return existingImage || null;
    
    const formData = new FormData();
    formData.append("image", image);
    
    try {
      setUploading(true);
      const response = await axios.post(`${API_ROUTES.UPLOADS}/food-category`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
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

  const validateForm = () => {
    const newErrors = {};
    if (!category.name.trim()) {
      newErrors.name = "Category name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      let imageUrl = existingImage;
      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) return;
      }

      const categoryData = {
        name: category.name.trim(),
        image: imageUrl,
        isActive: category.isActive
      };

      if (isEditMode) {
        await axios.put(API_ROUTES.FOOD_CATEGORY(id), categoryData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        alert("Category updated successfully!");
      } else {
        await axios.post(API_ROUTES.FOOD_CATEGORIES, categoryData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        alert("Category created successfully!");
      }

      navigate("/homepage/foodcategorylist");
    } catch (error) {
      console.error("Error saving category:", error);
      alert(error.response?.data?.error || `Error ${isEditMode ? "updating" : "creating"} category`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/homepage/foodcategorylist")}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl shadow-lg">
              <Upload className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                {isEditMode ? "Edit Category" : "Create New Category"}
              </h1>
              <p className="text-gray-600 mt-2">
                {isEditMode ? "Update food category information" : "Add a new food category"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Category Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <div className="relative rounded-xl overflow-hidden border-2 border-orange-300/50 bg-white">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-lg transition-colors duration-200"
                        title="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(imagePreview, "_blank")}
                      className="flex items-center gap-2 text-sm text-orange-600 mt-2 hover:underline"
                    >
                      <Eye size={16} /> View Full Image
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white/50 hover:bg-white/80 transition-all duration-200">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload category image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
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

              {/* Right Column - Form Fields */}
              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={category.name}
                    onChange={handleChange}
                    placeholder="e.g., Pizza, Burgers, Sushi"
                    className={`w-full p-3 border rounded-lg bg-white/80 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-0 transition-all duration-200 ${
                      errors.name ? 'border-red-300' : 'border-gray-300/50'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Active Status Toggle */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={category.isActive}
                      onChange={handleChange}
                      className="w-5 h-5 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Category</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Inactive categories will not be displayed on the website
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/homepage/foodcategorylist")}
              className="px-8 py-3 rounded-xl bg-gray-500 text-white font-medium hover:bg-gray-600 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-medium text-lg ${
                uploading ? 'opacity-70 cursor-not-allowed' : 'hover:from-orange-700 hover:to-yellow-700'
              } transition-all duration-200`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading Image...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  {isEditMode ? "Update Category" : "Create Category"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditFoodCategory;