import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { Upload, X, Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CreateValuedCustomer = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const token = localStorage.getItem("token");
  const isEditMode = !!id;

  const [customer, setCustomer] = useState({
    isActive: true,
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      alert("Authentication required. Please login.");
      navigate("/login");
      return;
    }

    if (isEditMode) {
      fetchCustomer();
    } else {
      setLoading(false);
    }
  }, [token, navigate, id]);

  const fetchCustomer = async () => {
    try {
      const response = await axios.get(API_ROUTES.VALUED_CUSTOMER(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setCustomer({
        isActive: data.isActive,
      });
      if (data.image) {
        setExistingImage(data.image);
        setImagePreview(data.image);
      }
    } catch (error) {
      console.error("Error fetching valued customer:", error);
      alert("Failed to fetch valued customer data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setCustomer((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
    setExistingImage("");
  };

  const uploadImage = async () => {
    if (!image) return existingImage || null;
    
    const formData = new FormData();
    formData.append("image", image);
    
    try {
      setUploading(true);
      const response = await axios.post(`${API_ROUTES.UPLOADS}/valued-customer`, formData, {
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

    try {
      let imageUrl = existingImage;
      if (image) {
        imageUrl = await uploadImage();
        if (!imageUrl) return;
      }

      const customerData = {
        image: imageUrl,
        isActive: customer.isActive,
      };

      if (isEditMode) {
        await axios.put(API_ROUTES.VALUED_CUSTOMER(id), customerData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        alert("Valued customer updated successfully!");
      } else {
        await axios.post(API_ROUTES.VALUED_CUSTOMERS, customerData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        alert("Valued customer created successfully!");
      }

      navigate("/homepage/valuedcustomer");
    } catch (error) {
      console.error("Error saving valued customer:", error);
      alert(error.response?.data?.error || `Error ${isEditMode ? "updating" : "creating"} valued customer`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {isEditMode ? "Edit Valued Customer" : "Create New Valued Customer"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Customer Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Image</label>
                {imagePreview ? (
                  <div className="relative">
                    <div className="w-40 h-40 rounded-lg overflow-hidden border-2 border-blue-300/50">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(imagePreview, "_blank")}
                      className="flex items-center gap-2 text-sm text-blue-600 mt-2"
                    >
                      <Eye size={16} /> View Full Preview
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white/50 hover:bg-white/80 transition-all duration-200">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-xs text-gray-500">Click to upload image</p>
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

              {/* Status */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={customer.isActive}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Customer</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4 gap-4">
            <button
              type="button"
              onClick={() => navigate("/valued-customers")}
              className="px-8 py-3 rounded-xl bg-gray-500 text-white font-medium hover:bg-gray-600 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className={`px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-700 text-white font-medium text-lg ${
                uploading ? "opacity-70 cursor-not-allowed" : "hover:from-green-700 hover:to-emerald-800"
              } transition-all duration-200`}
            >
              {uploading ? "Uploading Image..." : isEditMode ? "Update Customer" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateValuedCustomer;