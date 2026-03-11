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
  Search,
  X,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Globe
} from "lucide-react";

const OutletsList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1
  });
  const [filter, setFilter] = useState({
    isActive: "",
    sortBy: "createdAt",
    sortDir: "desc"
  });

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOutlet, setViewingOutlet] = useState(null);

  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = MEDIA_BASE_URL || '';
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    }
    return `${baseUrl}/uploads/${imagePath}`;
  };

  useEffect(() => {
    if (!token) {
      alert("Authentication required. Please login.");
      navigate("/login");
      return;
    }
    fetchOutlets();
  }, [token, navigate, pagination.page, appliedSearch, filter]);

  const fetchOutlets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: appliedSearch,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir
      });

      if (filter.isActive) {
        params.append("isActive", filter.isActive);
      }

      const response = await axios.get(
        `${API_ROUTES.OUTLETS}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOutlets(response.data.outlets || []);
      setPagination({
        page: response.data.currentPage,
        limit: pagination.limit,
        totalCount: response.data.totalCount,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error("Error fetching outlets:", error);
      setError(error.response?.data?.error || "Failed to fetch outlets");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this outlet?")) {
      return;
    }

    try {
      await axios.delete(API_ROUTES.OUTLET(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOutlets();
    } catch (error) {
      console.error("Error deleting outlet:", error);
      alert(error.response?.data?.error || "Failed to delete outlet");
    }
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPagination({ ...pagination, page: 1 });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setPagination({ ...pagination, page: 1 });
  };

  const openViewModal = (outlet) => {
    setViewingOutlet(outlet);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingOutlet(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && outlets.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
          <p className="text-gray-600">Loading outlets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
              <MapPin className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Outlets
              </h1>
              <p className="text-gray-600 mt-2">Manage your business outlets and locations</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate("/homepage/outlet-create-edit")}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
          >
            <Plus size={20} />
            Add New Outlet
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-bold">Error loading outlets:</p>
            <p>{error}</p>
            <button 
              onClick={fetchOutlets}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search by name, address, or mobile..."
                  className="w-full p-2 pl-10 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-0"
                />
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Search
              </button>
              {appliedSearch && (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="isActive"
              value={filter.isActive}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-0"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              name="sortBy"
              value={filter.sortBy}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-0"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Name</option>
              <option value="id">ID</option>
              <option value="isActive">Status</option>
            </select>
          </div>
        </div>

        {/* Outlets Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200/50 bg-white/60">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Address</th>
                <th className="py-3 px-4 text-left">Mobile</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outlets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <MapPin size={48} className="text-gray-300" />
                      <p className="text-lg font-medium">No outlets found</p>
                      <p className="text-sm">Click "Add New Outlet" to create one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                outlets.map((outlet, index) => (
                  <tr 
                    key={outlet.id} 
                    className={`border-b border-gray-100 hover:bg-white/80 transition-colors duration-200 ${
                      index % 2 === 0 ? 'bg-white/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">#{outlet.id}</td>
                    <td className="py-3 px-4">
                      {outlet.image ? (
                        <div className="relative group w-16 h-16">
                          <img
                            src={getImageUrl(outlet.image)}
                            alt={outlet.name}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-blue-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              `;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={20} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                          <ImageIcon size={24} className="text-gray-500" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-800">{outlet.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-700">{outlet.address}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Phone size={14} className="text-gray-500" />
                        <span className="text-sm">{outlet.mobile}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          outlet.isActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {outlet.isActive ? (
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
                      {formatDate(outlet.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(outlet)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/homepage/outlet-edit/${outlet.id}`)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors duration-200"
                          title="Edit Outlet"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(outlet.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                          title="Delete Outlet"
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination({ ...pagination, limit: Number(e.target.value), page: 1 });
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-semibold">
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                </span>{" "}
                of <span className="font-semibold">{pagination.totalCount}</span> outlets
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
              >
                <ChevronsLeft size={16} className="text-gray-600" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <span className="px-4 py-2 bg-white/80 rounded-lg text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
              >
                <ChevronsRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {isViewModalOpen && viewingOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeViewModal}></div>
          
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <Eye className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Outlet Details</h2>
                    <p className="text-sm text-gray-600">ID: #{viewingOutlet.id}</p>
                  </div>
                </div>
                <button
                  onClick={closeViewModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Outlet Image */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Outlet Image</h3>
                  {viewingOutlet.image ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-blue-200">
                      <img
                        src={getImageUrl(viewingOutlet.image)}
                        alt={viewingOutlet.name}
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon size={48} className="text-gray-400" />
                      <p className="text-gray-500 ml-2">No image available</p>
                    </div>
                  )}
                </div>

                {/* Outlet Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Outlet Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium text-gray-800">{viewingOutlet.name}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Mobile</p>
                      <p className="font-medium text-gray-800">{viewingOutlet.mobile}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-medium text-gray-800">{viewingOutlet.address}</p>
                    </div>
                    {viewingOutlet.googleMapLink && (
                      <div className="p-4 bg-white/60 rounded-lg col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Google Maps Link</p>
                        <a 
                          href={viewingOutlet.googleMapLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <Globe size={16} />
                          View on Google Maps
                        </a>
                      </div>
                    )}
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          viewingOutlet.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {viewingOutlet.isActive ? (
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
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Created At</p>
                      <p className="font-medium text-gray-800">{formatDate(viewingOutlet.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigate(`/homepage/outlet-edit/${viewingOutlet.id}`)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
                >
                  <Edit size={18} />
                  Edit Outlet
                </button>
                <button
                  onClick={closeViewModal}
                  className="px-6 py-2 bg-gray-200/60 text-gray-700 font-medium rounded-lg hover:bg-gray-300/80 transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletsList;