import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Add this import
import { API_ROUTES } from '../../config';
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  DollarSign,
  Calendar,
  X,
  Save,
  Image as ImageIcon // Add this import
} from 'lucide-react';

const ScrapRecord = () => {
  const [scrapRecords, setScrapRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });

  useEffect(() => {
    fetchScrapRecords(currentPage);
  }, [currentPage]);

  const fetchScrapRecords = async (page) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_ROUTES.SCRAP_RECORDS}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    console.log('Scrap records response:', response.data);
    
    // Handle the response structure - it uses scrapProduct (singular)
    let records = [];
    if (response.data.scrapRecords) {
      records = response.data.scrapRecords.map(record => ({
        ...record,
        // Map scrapProduct to scrapProducts for consistency
        scrapProducts: record.scrapProduct || []
      }));
    }
    
    setScrapRecords(records);
    setCurrentPage(response.data.currentPage || 1);
    setTotalPages(response.data.totalPages || 1);
  } catch (error) {
    console.error('Error fetching scrap records:', error);
  } finally {
    setLoading(false);
  }
};

  const openModal = async (type, record = null) => {
  let recordData = record;
  if (type === 'details' && record) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.SCRAP_RECORDS}/${record.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Map scrapProduct to scrapProducts for consistency
      recordData = {
        ...response.data,
        scrapProducts: response.data.scrapProduct || []
      };
    } catch (error) {
      console.error('Error fetching scrap record details:', error);
      return;
    }
  }
  setModal({ isOpen: true, type, data: recordData });
};

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scrap record?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ROUTES.SCRAP_RECORDS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchScrapRecords(currentPage);
      } catch (error) {
        console.error('Error deleting scrap record:', error);
      }
    }
  };

  // Safe function to get scrap products
  const getScrapProducts = (record) => {
    return record.scrapProducts || [];
  };

  // Calculate total loss safely
  const getTotalLoss = (record) => {
    return record.totalLoss || 0;
  };

  // Helper function to get image URL (copied from AllProductions)
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `http://localhost:3001${imagePath}`;
    return `http://localhost:3001/uploads/${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
                <AlertTriangle className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Scrap Records
                </h1>
                <p className="text-gray-600 mt-2">Track and manage product scrap records</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Scrap Loss</p>
                <p className="text-2xl font-bold text-red-600">
                  ${scrapRecords.reduce((sum, record) => sum + getTotalLoss(record), 0).toFixed(2)}
                </p>
              </div>
              
              <Link 
                to="/addscraprecord" 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus size={20} />
                New Scrap Record
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading scrap records...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Reason</th>
                      <th className="p-4 text-left font-medium text-gray-700">Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">Products</th>
                      <th className="p-4 text-left font-medium text-gray-700">Total Loss</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapRecords.map(record => {
                      const scrapProducts = getScrapProducts(record);
                      return (
                        <tr key={record.id} className="border-t border-white/50 hover:bg-white/30 transition-colors duration-200">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <AlertTriangle size={16} className="text-red-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{record.reason || 'No reason provided'}</p>
                                <p className="text-xs text-gray-500">{record.note || 'No notes'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-700">
                                {record.createdAt 
                                  ? new Date(record.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : 'No date'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {scrapProducts.length > 0 ? (
                                scrapProducts.map((sp, index) => (
                                  <span
                                    key={sp.id || index}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                                    title={`${sp.product?.name || 'Product'}: ${sp.quantity || 0} units`}
                                  >
                                    <Package size={10} />
                                    {(sp.product?.name || 'Product').substring(0, 15)} ({sp.quantity || 0})
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No products</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {scrapProducts.length} product(s)
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold">
                              <DollarSign size={14} />
                              {getTotalLoss(record).toFixed(2)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openModal('details', record)}
                                className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                        
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {scrapRecords.length === 0 && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <AlertTriangle size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scrap Records Found</h3>
                    <p className="text-gray-600 mb-6">Create your first scrap record to track product losses</p>
                    <Link 
                      to="/addscraprecord"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Plus size={20} />
                      Create First Scrap Record
                    </Link>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/50">
                  <div className="text-sm text-gray-600">
                    Showing {scrapRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white/60 text-gray-700 hover:bg-white/80 hover:shadow-md'
                      }`}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    
                    <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg">
                      <span className="font-semibold text-gray-800">Page {currentPage}</span>
                      <span className="text-gray-500"> of {totalPages}</span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                        currentPage === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white/60 text-gray-700 hover:bg-white/80 hover:shadow-md'
                      }`}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-red-600">{scrapRecords.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-orange-50/60 to-amber-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products Scrapped</p>
                <p className="text-2xl font-bold text-orange-600">
                  {scrapRecords.reduce((total, record) => {
                    const scrapProducts = getScrapProducts(record);
                    return total + scrapProducts.reduce((sum, sp) => sum + (sp.quantity || 0), 0);
                  }, 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Package size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-yellow-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Loss per Record</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${scrapRecords.length > 0 
                    ? (scrapRecords.reduce((sum, record) => sum + getTotalLoss(record), 0) / scrapRecords.length).toFixed(2)
                    : '0.00'
                  }
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <DollarSign size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal - Shows all products in a scrap record */}
      {modal.isOpen && modal.type === 'details' && modal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Scrap Record Details</h2>
                    <p className="text-gray-600">Created on {new Date(modal.data.createdAt).toLocaleDateString()}</p>
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
              {/* Record Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-600" />
                    Record Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Reason</p>
                      <p className="font-medium text-red-700">{modal.data.reason || 'No reason'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Note</p>
                      <p className="font-medium">{modal.data.note || 'No notes'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Loss</p>
                      <p className="text-2xl font-bold text-red-600">${getTotalLoss(modal.data).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package size={18} className="text-orange-600" />
                    Summary
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Total Products</p>
                      <p className="font-medium">{getScrapProducts(modal.data).length} products</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Units</p>
                      <p className="font-medium">
                        {getScrapProducts(modal.data).reduce((sum, sp) => sum + (sp.quantity || 0), 0)} units
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Loss per Unit</p>
                      <p className="font-medium">
                        ${(getTotalLoss(modal.data) / Math.max(getScrapProducts(modal.data).reduce((sum, sp) => sum + (sp.quantity || 0), 1), 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-orange-600" />
                  Scrapped Products ({getScrapProducts(modal.data).length})
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">Product</th>
                        <th className="p-3 text-left font-medium text-gray-700">Barcode</th>
                        <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                        <th className="p-3 text-left font-medium text-gray-700">Loss per Unit</th>
                        <th className="p-3 text-left font-medium text-gray-700">Total Loss</th>
                        <th className="p-3 text-left font-medium text-gray-700">Cost Price</th>
                        <th className="p-3 text-left font-medium text-gray-700">Sale Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getScrapProducts(modal.data).map(sp => {
                        // Get product image from scrap product data
                        const productImage = sp.product?.image || sp.product?.photo || sp.product?.thumbnail;
                        const imageUrl = productImage ? getImageUrl(productImage) : null;
                        
                        return (
                          <tr key={sp.id} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                  {imageUrl ? (
                                    <img 
                                      src={imageUrl} 
                                      alt={sp.product?.name || 'Product'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={14} class="text-gray-400" /></div>';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <ImageIcon size={14} className="text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{sp.product?.name || 'N/A'}</p>
                                  <p className="text-xs text-gray-500">ID: {sp.productId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-gray-600">{sp.product?.barcode || 'N/A'}</td>
                            <td className="p-3 font-medium text-red-600">{sp.quantity || 0}</td>
                            <td className="p-3 font-medium">${(sp.lossPerUnit || 0).toFixed(2)}</td>
                            <td className="p-3 font-bold text-red-700">${((sp.quantity || 0) * (sp.lossPerUnit || 0)).toFixed(2)}</td>
                            <td className="p-3 text-gray-600">${sp.product?.cost?.toFixed(2) || '0.00'}</td>
                            <td className="p-3 text-gray-600">${sp.product?.sale_price?.toFixed(2) || '0.00'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-red-50/50">
                      <tr>
                        <td colSpan="4" className="p-3 text-right font-semibold text-gray-700">
                          Total:
                        </td>
                        <td className="p-3 font-bold text-red-700">
                          ${getScrapProducts(modal.data).reduce((sum, sp) => sum + ((sp.quantity || 0) * (sp.lossPerUnit || 0)), 0).toFixed(2)}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal would go here - similar to production modal but for scrap */}
    </div>
  );
};

export default ScrapRecord;