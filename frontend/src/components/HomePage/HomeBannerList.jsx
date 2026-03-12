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
  Layout,
  X
} from "lucide-react";

const HomeBannerList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1
  });
  const [filter, setFilter] = useState({
    sortBy: "createdAt",
    sortDir: "desc"
  });

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingBanner, setViewingBanner] = useState(null);

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
    fetchBanners();
  }, [token, navigate, pagination.page, filter]);

  const fetchBanners = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filter.sortBy,
        sortDir: filter.sortDir
      });

      const response = await axios.get(
        `${API_ROUTES.HOME_BANNERS}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBanners(response.data.banners || []);
      setPagination({
        page: response.data.currentPage,
        limit: pagination.limit,
        totalCount: response.data.totalCount,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error("Error fetching home banners:", error);
      setError(error.response?.data?.error || "Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) {
      return;
    }

    try {
      await axios.delete(API_ROUTES.HOME_BANNER(id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert(error.response?.data?.error || "Failed to delete banner");
    }
  };

  const openViewModal = (banner) => {
    setViewingBanner(banner);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingBanner(null);
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

  const handleRefresh = () => {
    fetchBanners();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && banners.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <Layout className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Home Banners
              </h1>
              <p className="text-gray-600 mt-2">Manage your homepage banner slides</p>
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
              onClick={() => navigate("/home-banners/create")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
            >
              <Plus size={20} />
              Add New Banner
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-bold">Error loading banners:</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              name="sortBy"
              value={filter.sortBy}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
            >
              <option value="createdAt">Date Created</option>
              <option value="heading">Heading</option>
              <option value="title">Title</option>
              <option value="id">ID</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <select
              name="sortDir"
              value={filter.sortDir}
              onChange={handleFilterChange}
              className="p-2 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-0"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Banners Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200/50 bg-white/60">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Heading</th>
                <th className="py-3 px-4 text-left">Title</th>
                <th className="py-3 px-4 text-left">Button Text</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Layout size={48} className="text-gray-300" />
                      <p className="text-lg font-medium">No banners found</p>
                      <p className="text-sm">Click "Add New Banner" to create one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                banners.map((banner, index) => (
                  <tr 
                    key={banner.id} 
                    className={`border-b border-gray-100 hover:bg-white/80 transition-colors duration-200 ${
                      index % 2 === 0 ? 'bg-white/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">#{banner.id}</td>
                    <td className="py-3 px-4">
                      {banner.image ? (
                        <div className="relative group w-16 h-16">
                          <img
                            src={getImageUrl(banner.image)}
                            alt={banner.title}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
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
                        <p className="font-medium text-gray-800 truncate">{banner.heading}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-gray-700 truncate">{banner.title}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {banner.button ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {banner.button}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No button</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatDate(banner.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(banner)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/home-banners/edit/${banner.id}`)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors duration-200"
                          title="Edit Banner"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                          title="Delete Banner"
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
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
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
                of <span className="font-semibold">{pagination.totalCount}</span> banners
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
      {isViewModalOpen && viewingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeViewModal}></div>
          
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Eye className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Banner Details</h2>
                    <p className="text-sm text-gray-600">ID: #{viewingBanner.id}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Banner Image */}
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Banner Image</h3>
                  {viewingBanner.image ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                      <img
                        src={getImageUrl(viewingBanner.image)}
                        alt={viewingBanner.title}
                        className="w-full max-h-96 object-contain bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon size={48} className="text-gray-400" />
                      <p className="text-gray-500 ml-2">No image available</p>
                    </div>
                  )}
                </div>

                {/* Banner Details */}
                <div className="col-span-1 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Banner Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Heading</p>
                      <p className="font-medium text-gray-800">{viewingBanner.heading}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Title</p>
                      <p className="font-medium text-gray-800">{viewingBanner.title}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Button Text</p>
                      <p className="font-medium text-gray-800">{viewingBanner.button || 'No button'}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Created At</p>
                      <p className="font-medium text-gray-800">{formatDate(viewingBanner.createdAt)}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Description</p>
                      <p className="font-medium text-gray-800 bg-white/60 p-4 rounded-lg">
                        {viewingBanner.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => navigate(`/home-banners/edit/${viewingBanner.id}`)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
                >
                  <Edit size={18} />
                  Edit Banner
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

export default HomeBannerList;