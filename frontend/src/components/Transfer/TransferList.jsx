import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Eye, 
  Edit2, 
  CheckCircle, 
  AlertCircle,
  Truck,
  Package,
  DollarSign,
  FileText,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  X,
  Calendar,
  Factory,
  Store,
  Layers
} from 'lucide-react';

const TransferList = ({ fromType, toType, title }) => {
  const [transfers, setTransfers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransfers, setSelectedTransfers] = useState([]);

  // Status Change Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Details Modal State
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, data: null });

  useEffect(() => {
    fetchTransfers();
  }, [fromType, toType, currentPage, statusFilter, itemsPerPage]);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.TRANSFERS, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from: fromType,
          to: toType,
          page: currentPage,
          limit: itemsPerPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      console.log(response.data);
      setTransfers(response.data.transfers);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setError('Failed to fetch transfers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const openStatusModal = (transfer) => {
    setSelectedTransfer(transfer);
    setNewStatus(transfer.status);
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
    setSelectedTransfer(null);
    setNewStatus('');
  };

  const openDetailsModal = (transfer) => {
    setDetailsModal({ isOpen: true, data: transfer });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, data: null });
  };

  const handleStatusUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ROUTES.TRANSFERS}/${selectedTransfer.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeStatusModal();
      fetchTransfers();
    } catch (error) {
      alert('Failed to update transfer status');
      console.error('Error updating transfer status:', error);
    }
  };

  const handleRefresh = () => {
    fetchTransfers();
  };

  const handleTransferSelect = (transferId) => {
    setSelectedTransfers(prev => 
      prev.includes(transferId) 
        ? prev.filter(id => id !== transferId)
        : [...prev, transferId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransfers.length === transfers.length) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(transfers.map(t => t.id));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return { 
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500', 
          iconBg: 'bg-amber-100',
          text: 'text-amber-600'
        };
      case 'being_shipped':
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
          iconBg: 'bg-blue-100',
          text: 'text-blue-600'
        };
      case 'transferred':
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500', 
          iconBg: 'bg-emerald-100',
          text: 'text-emerald-600'
        };
      case 'not_received':
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
          iconBg: 'bg-emerald-100',
          text: 'text-emerald-600'
        };
      default:
        return { 
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600', 
          iconBg: 'bg-gray-100',
          text: 'text-gray-600'
        };
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\w\S*/g, function(txt){
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'being_shipped':
        return <Truck className="w-4 h-4" />;
      case 'transferred':
        return <CheckCircle className="w-4 h-4" />;
      case 'not_received':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
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
  const processingTransfers = transfers.filter(t => t.status === 'processing').length;
  const onTheWayTransfers = transfers.filter(t => t.status === 'being_shipped').length;
  const completedTransfers = transfers.filter(t => t.status === 'transferred').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                <Truck className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {title}
                </h1>
                <p className="text-gray-600 mt-2">Monitor and manage all transfer operations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Transfers</p>
                <p className="text-2xl font-bold text-blue-600">{transfers.length}</p>
              </div>
              
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Settings size={20} />
                New Transfer
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-amber-600">{processingTransfers}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On the Way</p>
                <p className="text-2xl font-bold text-blue-600">{onTheWayTransfers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Truck size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{completedTransfers}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search transfers by reference, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="being_shipped">Being Shipped</option>
                  <option value="transferred">Transferred</option>
                  <option value="not_received">Not Received</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <button className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200 flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 text-sm font-medium">More Filters</span>
              </button>
              <button
                onClick={handleRefresh}
                className="p-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Selected Actions Bar */}
          {selectedTransfers.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-blue-700 font-medium">
                  {selectedTransfers.length} transfer{selectedTransfers.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 text-blue-700 rounded-lg hover:bg-white text-sm font-medium">
                  Bulk Update
                </button>
                <button className="px-3 py-2 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium">
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Table Section */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading transfers...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-2">{error}</p>
              <button
                onClick={fetchTransfers}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : transfers.length === 0 ? (
            <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl p-8 text-center">
              <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 text-lg font-medium mb-2">No transfers found</p>
              <p className="text-gray-600 mb-6">Create your first transfer to get started</p>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-lg">
                Create New Transfer
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-b border-gray-200">
                      <tr>
                        <th className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedTransfers.length === transfers.length && transfers.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-400"
                          />
                        </th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Reference</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">From → To</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Shipping Cost</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Items</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {transfers.map((transfer) => {
                        const statusColors = getStatusColor(transfer.status);
                        return (
                          <tr 
                            key={transfer.id} 
                            className={`hover:bg-white/30 transition-colors duration-150 ${selectedTransfers.includes(transfer.id) ? 'bg-blue-50/30' : ''}`}
                          >
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={selectedTransfers.includes(transfer.id)}
                                onChange={() => handleTransferSelect(transfer.id)}
                                className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-400"
                              />
                            </td>
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-gray-900">{transfer.reference}</div>
                                {transfer.note && (
                                  <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                                    <FileText className="w-3 h-3 inline mr-1" />
                                    {transfer.note}
                                  </div>
                                )}
                                {transfer.date && (
                                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(transfer.date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* From section */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${transfer.from === 'factory' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                      {transfer.from === 'factory' ? (
                                        <Factory className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <Store className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">{transfer.fromName}</div>
                                      <div className="text-xs text-gray-500 truncate">({transfer.from})</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex-shrink-0 px-2">
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>

                                {/* To section */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${transfer.to === 'factory' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                      {transfer.to === 'factory' ? (
                                        <Factory className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <Store className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">{transfer.toName}</div>
                                      <div className="text-xs text-gray-500 truncate">({transfer.to})</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="font-bold text-gray-900">
                                  ${parseFloat(transfer.shipping_cost || 0).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                                  <Package className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="text-center">
                                  <span className="font-bold text-lg text-gray-900 block">{transfer.totalProducts}</span>
                                  <span className="text-xs text-gray-500">items</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-normal ${statusColors.bg}`}>
                                {getStatusIcon(transfer.status)}
                                <span>{formatStatus(transfer.status)}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDetailsModal(transfer)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {transfer.status != 'transferred' && (
                                  <button
                                    onClick={() => openStatusModal(transfer)}
                                    disabled={transfer.status === 'transfer_done'}
                                    className={`p-2 rounded-lg ${transfer.status === 'transfer_done' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                    title="Change Status"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  disabled={transfer.status === 'transferred'}
                                  className={`p-2 rounded-lg ${transfer.status === 'transferred' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                                  title="Edit Transfer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  title="More Options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              {transfers.length > 0 && (
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
                          <option value="100">100</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * itemsPerPage, transfers.length)}
                        </span>{" "}
                        of <span className="font-semibold">{totalItems}</span> transfers
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
                                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
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
                                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
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

      {/* Status Change Modal */}
      {isStatusModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Update Transfer Status</h2>
                    <p className="text-gray-600 text-sm mt-1">{selectedTransfer.reference}</p>
                  </div>
                </div>
                <button
                  onClick={closeStatusModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${getStatusColor(selectedTransfer.status).bg} text-white`}>
                    {getStatusIcon(selectedTransfer.status)}
                    <span className="font-semibold">{formatStatus(selectedTransfer.status)}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Update to</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['processing', 'pending', 'being_shipped', 'transferred', 'not_received'].map((status) => {
                      const colors = getStatusColor(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNewStatus(status)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                            newStatus === status
                              ? `${colors.bg} text-white border-transparent scale-105`
                              : 'bg-white/80 border border-white/60 hover:bg-white'
                          }`}
                        >
                          {getStatusIcon(status)}
                          <span className="text-xs font-medium mt-2">{formatStatus(status)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeStatusModal}
                  className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={newStatus === selectedTransfer.status}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    newStatus === selectedTransfer.status
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <CheckCircle size={18} />
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.data && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Transfer Details</h2>
                    <p className="text-gray-600">{detailsModal.data.reference}</p>
                  </div>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    Transfer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Reference</p>
                      <p className="font-medium">{detailsModal.data.reference}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className="mt-1">
                        {(() => {
                          const status = getStatusColor(detailsModal.data.status);
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${status.bg}`}>
                              {getStatusIcon(detailsModal.data.status)}
                              {formatStatus(detailsModal.data.status)}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {detailsModal.data.note && (
                      <div>
                        <p className="text-sm text-gray-600">Note</p>
                        <p className="font-medium">{detailsModal.data.note}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    Financial Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Shipping Cost</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${parseFloat(detailsModal.data.shipping_cost || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Items</p>
                      <p className="font-medium text-xl">{detailsModal.data.totalProducts}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Factory size={18} className="text-blue-600" />
                    From
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{detailsModal.data.fromName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium capitalize">{detailsModal.data.from}</p>
                    </div>
                  </div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Store size={18} className="text-green-600" />
                    To
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{detailsModal.data.toName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium capitalize">{detailsModal.data.to}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-purple-600" />
                  Products ({detailsModal.data.totalProducts || 0})
                </h3>
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl border border-white/60 p-4">
                  <p className="text-gray-600 text-center">
                    Product details would appear here
                  </p>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50">
              <div className="flex justify-end">
                <button
                  onClick={closeDetailsModal}
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

export default TransferList;
