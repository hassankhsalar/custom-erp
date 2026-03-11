import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  CheckCircle,
  XCircle,
  X,
  Upload,
  Save
} from "lucide-react";

const ValuedCustomerList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [filter, setFilter] = useState({
    isActive: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    isActive: true,
    image: null
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  // Function to get full image URL (similar to AllProducts.jsx)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = MEDIA_BASE_URL || '';
    
    // If it starts with /uploads, append to base URL
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    } else {
      // Otherwise, assume it's a relative path
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  useEffect(() => {
    if (!token) {
      alert("Authentication required. Please login.");
      navigate("/login");
      return;
    }
    fetchCustomers();
  }, [token, navigate, pagination.page, filter.isActive, filter.sortBy, filter.sortDir]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("limit", pagination.limit);
      params.append("sortBy", filter.sortBy);
      params.append("sortDir", filter.sortDir);
      
      if (filter.isActive) {
        params.append("isActive", filter.isActive);
      }

      const url = `${API_ROUTES.VALUED_CUSTOMERS}?${params.toString()}`;
      console.log("Fetching from URL:", url);

      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log("Response data:", response.data);

      if (response.data.customers) {
        setCustomers(response.data.customers);
        setPagination({
          page: response.data.currentPage || 1,
          limit: pagination.limit,
          totalCount: response.data.totalCount || 0,
          totalPages: response.data.totalPages || 1,
        });
      } else if (Array.isArray(response.data)) {
        setCustomers(response.data);
        setPagination({
          ...pagination,
          totalCount: response.data.length,
          totalPages: Math.ceil(response.data.length / pagination.limit),
        });
      } else {
        console.error("Unexpected response format:", response.data);
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching valued customers:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        setError(`Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        setError("No response from server. Please check if the backend is running.");
      } else {
        setError(`Error: ${error.message}`);
      }
      
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this valued customer?")) {
      return;
    }

    try {
      await axios.delete(API_ROUTES.VALUED_CUSTOMER(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh the list after successful delete
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting valued customer:", error);
      alert(error.response?.data?.error || "Failed to delete valued customer");
    }
  };

  // Open edit modal
  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      isActive: customer.isActive,
      image: customer.image
    });
    setEditImagePreview(getImageUrl(customer.image) || "");
    setEditImageFile(null);
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCustomer(null);
    setEditFormData({ isActive: true, image: null });
    setEditImagePreview("");
    setEditImageFile(null);
  };

  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, type, checked, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle edit image change
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Remove edit image
  const handleRemoveEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview("");
    setEditFormData((prev) => ({ ...prev, image: null }));
  };

  // Upload image for edit
  const uploadEditImage = async () => {
    if (!editImageFile) return editFormData.image || null;
    
    const formData = new FormData();
    formData.append("image", editImageFile);
    
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

  // Handle edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingCustomer) return;
    
    try {
      let imageUrl = editFormData.image;
      if (editImageFile) {
        imageUrl = await uploadEditImage();
        if (!imageUrl) return;
      }

      const customerData = {
        image: imageUrl,
        isActive: editFormData.isActive,
      };

      await axios.put(API_ROUTES.VALUED_CUSTOMER(editingCustomer.id), customerData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
      });

      alert("Valued customer updated successfully!");
      closeEditModal();
      fetchCustomers(); // Refresh the list
    } catch (error) {
      console.error("Error updating valued customer:", error);
      alert(error.response?.data?.error || "Error updating valued customer");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page when filter changes
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading valued customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Background decorative elements - similar to AllProducts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <User className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Valued Customers
              </h1>
              <p className="text-gray-600 mt-2">Manage your valued customer profiles</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
            <button
              onClick={() => navigate("/homepage/createvaluedcustomer")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
            >
              <Plus size={20} />
              Add New Customer
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-bold">Error loading customers:</p>
            <p>{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="isActive"
              value={filter.isActive}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 outline-0"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              name="sortBy"
              value={filter.sortBy}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 outline-0"
            >
              <option value="createdAt">Date Created</option>
              <option value="id">ID</option>
              <option value="isActive">Status</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <select
              name="sortDir"
              value={filter.sortDir}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-violet-500 outline-0"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200/50 bg-white/60">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <User size={48} className="text-gray-300" />
                      <p className="text-lg font-medium">No valued customers found</p>
                      <p className="text-sm">Click "Add New Customer" to create one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => (
                  <tr 
                    key={customer.id} 
                    className={`border-b border-gray-100 hover:bg-white/80 transition-colors duration-200 ${
                      index % 2 === 0 ? 'bg-white/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">#{customer.id}</td>
                    <td className="py-3 px-4">
                      {customer.image ? (
                        <div className="relative group">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-300/50">
                            <img
                              src={getImageUrl(customer.image)}
                              alt={`Customer ${customer.id}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                      <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </div>
                          {/* Quick view overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300/50">
                          <ImageIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {customer.isActive ? (
                          <>
                            <CheckCircle size={12} />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {customer.image && (
                          <button
                            onClick={() => window.open(getImageUrl(customer.image), "_blank")}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                            title="View Full Image"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors duration-200"
                          title="Edit Customer"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                          title="Delete Customer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Similar to AllProducts */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination({ ...pagination, limit: Number(e.target.value), page: 1 });
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-semibold">
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                </span>{" "}
                of <span className="font-semibold">{pagination.totalCount}</span> customers
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-2">
              {/* First page */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="First page"
              >
                <ChevronsLeft size={16} className="text-gray-600" />
              </button>

              {/* Previous page */}
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Previous page"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : "hover:bg-white/50 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                  <>
                    <span className="mx-1 text-gray-400">...</span>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pagination.totalPages
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : "hover:bg-white/50 text-gray-700"
                      }`}
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next page */}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Next page"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>

              {/* Last page */}
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Last page"
              >
                <ChevronsRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={closeEditModal}
          ></div>
          
          {/* Modal */}
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                    <Edit className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Edit Customer</h2>
                    <p className="text-sm text-gray-600">ID: #{editingCustomer.id}</p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Image Upload Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Image
                  </label>
                  
                  {editImagePreview ? (
                    <div className="relative inline-block">
                      <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-300/50">
                        <img 
                          src={editImagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveEditImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg"
                      >
                        <X size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(editImagePreview, "_blank")}
                        className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline"
                      >
                        <Eye size={14} /> View Full Image
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white/50 hover:bg-white/80 transition-all duration-200">
                      <Upload className="w-6 h-6 mb-1 text-gray-400" />
                      <p className="text-xs text-gray-500">Click to upload new image</p>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        value="true"
                        checked={editFormData.isActive === true}
                        onChange={() => setEditFormData({ ...editFormData, isActive: true })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={16} />
                        <span>Active</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        value="false"
                        checked={editFormData.isActive === false}
                        onChange={() => setEditFormData({ ...editFormData, isActive: false })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle size={16} />
                        <span>Inactive</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Created At Display (read-only) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {formatDate(editingCustomer.createdAt)}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 bg-gray-200/60 text-gray-700 font-medium rounded-lg hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 ${
                      uploading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuedCustomerList;