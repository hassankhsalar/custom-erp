import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { activeOnly } from '../../utils/softDelete';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Factory,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  X
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';

const AllFactory = () => {
  const [factories, setFactories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedFactoryId, setExpandedFactoryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [totalFactories, setTotalFactories] = useState(0);

  const { hasPermission } = usePermission();
  const canCreateFactory = hasPermission('factory_create');
  const canEditFactory = hasPermission('factory_edit');
  const canDeleteFactory = hasPermission('factory_delete');

  useEffect(() => {
    const fetchFactories = async () => {
      if (!token) {
        alert('Authentication required. Please login.');
        navigate('/login');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(API_ROUTES.FACTORIES, {
          params: { page: currentPage, limit: itemsPerPage },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setFactories(activeOnly(response.data.factories || response.data));
        setTotalPages(Math.ceil((response.data.totalCount || response.data.length) / itemsPerPage));
        setTotalFactories(response.data.totalCount || response.data.length);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching factories:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You do not have access to factories.');
        }
        setLoading(false);
      }
    };
    
    if (token) {
      fetchFactories();
    } else {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, token, navigate]);

  const handleDelete = async (id) => {
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      return;
    }

    if (window.confirm('Are you sure you want to delete this factory?')) {
      try {
        await axios.delete(`${API_ROUTES.FACTORIES}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        // Refetch factories after deletion
        const response = await axios.get(API_ROUTES.FACTORIES, {
          params: { page: currentPage, limit: itemsPerPage },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setFactories(activeOnly(response.data.factories || response.data));
        setTotalPages(Math.ceil((response.data.totalCount || response.data.length) / itemsPerPage));
        setTotalFactories(response.data.totalCount || response.data.length);
        alert('Factory deleted successfully!');
      } catch (error) {
        console.error('Error deleting factory:', error);
        
        if (error.response?.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          alert('Permission denied. You cannot delete factories.');
        } else {
          alert('Error deleting factory. Please try again.');
        }
      }
    }
  };

  const toggleDetails = (id) => {
    setExpandedFactoryId(expandedFactoryId === id ? null : id);
  };

  const openDetailsModal = (factory) => {
    setModal({ isOpen: true, type: 'details', data: factory });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
  };

  const getContactStatus = (factory) => {
    const hasPhone = factory.phone && factory.phone.trim() !== '';
    const hasEmail = factory.email && factory.email.trim() !== '';
    const hasManager = factory.manager && factory.manager.trim() !== '';
    
    if (hasPhone && hasEmail && hasManager) {
      return {
        text: 'Complete Contact',
        color: 'bg-gradient-to-r from-emerald-500 to-green-500',
        icon: <CheckCircle size={14} />
      };
    } else if (hasPhone || hasEmail || hasManager) {
      return {
        text: 'Partial Contact',
        color: 'bg-gradient-to-r from-amber-500 to-orange-500',
        icon: <AlertCircle size={14} />
      };
    } else {
      return {
        text: 'No Contact',
        color: 'bg-gradient-to-r from-red-500 to-rose-500',
        icon: <AlertCircle size={14} />
      };
    }
  };

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Calculate statistics
  const factoriesWithManager = factories.filter(f => f.manager && f.manager.trim() !== '').length;
  const factoriesWithEmail = factories.filter(f => f.email && f.email.trim() !== '').length;
  const factoriesWithPhone = factories.filter(f => f.phone && f.phone.trim() !== '').length;

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
                <Factory className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  All Factories
                </h1>
                <p className="text-gray-600 mt-2">Manage your factory locations and contacts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              { canCreateFactory && (
                <Link 
                  to="/factories/add" 
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus size={20} />
                  New Factory
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Factories</p>
                <p className="text-2xl font-bold text-blue-600">{totalFactories}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Factory size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Manager</p>
                <p className="text-2xl font-bold text-emerald-600">{factoriesWithManager}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Users size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-violet-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Email</p>
                <p className="text-2xl font-bold text-purple-600">{factoriesWithEmail}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Mail size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Phone</p>
                <p className="text-2xl font-bold text-amber-600">{factoriesWithPhone}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Phone size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading factories...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Factory Info</th>
                      <th className="p-4 text-left font-medium text-gray-700">Contact Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Location</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factories.map((factory, index) => {
                      const contactStatus = getContactStatus(factory);
                      
                      return (
                        <React.Fragment key={factory.id}>
                          <tr className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                                  <Building2 size={20} className="text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{factory.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Mail size={12} className="text-gray-400" />
                                    <p className="text-xs text-gray-500">{factory.email || 'No email'}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col items-start gap-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${contactStatus.color}`}>
                                  {contactStatus.icon}
                                  {contactStatus.text}
                                </div>
                                <div className="text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <User size={12} className="text-gray-400" />
                                    <span>{factory.manager || 'No manager'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Phone size={12} className="text-gray-400" />
                                    <span>{factory.phone || 'No phone'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-gray-400 mt-0.5" />
                                <div>
                                  <p className="font-medium text-gray-800">{factory.address || 'No address'}</p>
                                  {factory.address && (
                                    <p className="text-xs text-gray-500 mt-1">Location details available</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDetailsModal(factory)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                                
                                { canEditFactory && (
                                  <Link
                                    to={`/factories/edit/${factory.id}`}
                                    className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </Link>
                                )}
                                
                                { canDeleteFactory && (
                                  <button
                                    onClick={() => handleDelete(factory.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                
                               
                              </div>
                            </td>
                          </tr>
                          
                          
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                
                {factories.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Factory size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Factories Found</h3>
                    <p className="text-gray-600 mb-6">Get started by adding your first factory location</p>
                    <Link 
                      to="/factories/add" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Plus size={20} />
                      Add First Factory
                    </Link>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {factories.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
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
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * itemsPerPage, factories.length)}
                        </span>{" "}
                        of <span className="font-semibold">{totalFactories}</span> factories
                      </div>
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      {/* First page */}
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Previous page */}
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="mx-1 text-gray-400">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === totalPages
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                  : "hover:bg-white/50 text-gray-700"
                              }`}
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Next page */}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

                      {/* Last page */}
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Last page"
                      >
                        <ChevronsRight size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Factory Details Modal */}
      {modal.isOpen && modal.type === 'details' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Factory className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Factory Details</h2>
                    <p className="text-gray-600">{modal.data.name}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Factory Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Factory Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Factory Name</p>
                      <p className="font-medium text-lg text-gray-800">{modal.data.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Contact Status</p>
                      <div className="mt-2">
                        {(() => {
                          const status = getContactStatus(modal.data);
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${status.color}`}>
                              {status.icon}
                              {status.text}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Location Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" />
                    Location Details
                  </h3>
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">
                        {modal.data.address || 'No address provided'}
                      </p>
                      {modal.data.address && (
                        <p className="text-sm text-gray-500 mt-2">
                          Full factory location and address information
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-blue-600" />
                      <p className="text-sm font-medium text-gray-700">Manager</p>
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      {modal.data.manager || 'Not assigned'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={16} className="text-emerald-600" />
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">
                      {modal.data.phone || 'Not provided'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-purple-600" />
                      <p className="text-sm font-medium text-gray-700">Email</p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {modal.data.email || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
                <div className="text-gray-600">
                  <p>This factory is part of your manufacturing network. You can manage all contact details, location information, and operational parameters from this interface.</p>
                  <p className="mt-2 text-sm text-gray-500">Factory ID: {modal.data.id}</p>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50">
              <div className="flex justify-end gap-3">
                <Link
                  to={`/factories/edit/${modal.data.id}`}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Edit Factory
                </Link>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllFactory;
