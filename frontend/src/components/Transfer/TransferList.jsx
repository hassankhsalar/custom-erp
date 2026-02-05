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
  ChevronDown
} from 'lucide-react';

const TransferList = ({ fromType, toType, title }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    fetchTransfers();
  }, [fromType, toType, page, statusFilter]);

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
          page,
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
    setPage(newPage);
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
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'on_the_way':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'transfer_done':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
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
      case 'on_the_way':
        return <Truck className="w-4 h-4" />;
      case 'transfer_done':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h1>
            <p className="text-gray-600 mt-2">
              {totalItems} records • Page {page} of {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg">
              + New Transfer
            </button>
          </div>
        </div>

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
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 min-w-[160px]"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="on_the_way">On the Way</option>
                <option value="transfer_done">Transfer Done</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
            <button className="px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 text-sm font-medium">More Filters</span>
            </button>
          </div>
        </div>

        {/* Selected Actions Bar */}
        {selectedTransfers.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-blue-700 font-medium">
                {selectedTransfers.length} transfer{selectedTransfers.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-medium">
                Bulk Update
              </button>
              <button className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium">
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading transfers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
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
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-medium mb-2">No transfers found</p>
          <p className="text-gray-600 mb-6">Create your first transfer to get started</p>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-lg">
            Create New Transfer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
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
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((transfer) => {
                    const statusColors = getStatusColor(transfer.status);
                    return (
                      <tr 
                        key={transfer.id} 
                        className={`hover:bg-gray-50 transition-colors duration-150 ${selectedTransfers.includes(transfer.id) ? 'bg-blue-50' : ''}`}
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
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">{transfer.fromName}</div>
                              <div className="text-xs text-gray-500">({transfer.from})</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">{transfer.toName}</div>
                              <div className="text-xs text-gray-500">({transfer.to})</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">
                              ${parseFloat(transfer.shipping_cost || 0).toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{transfer.totalProducts}</span>
                            <span className="text-xs text-gray-500">items</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
                            {getStatusIcon(transfer.status)}
                            <span className="text-sm font-medium">{formatStatus(transfer.status)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openStatusModal(transfer)}
                              disabled={transfer.status === 'transfer_done'}
                              className={`p-2 rounded-lg ${transfer.status === 'transfer_done' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                              title="Change Status"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              disabled={transfer.status === 'transfer_done'}
                              className={`p-2 rounded-lg ${transfer.status === 'transfer_done' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}
                              title="Edit Transfer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-white border border-gray-200 rounded-xl">
              <div className="text-sm text-gray-600">
                Showing page {page} of {totalPages} • {totalItems} total transfers
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    page === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                          page === pageNum
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    page === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Update Transfer Status</h2>
                  <p className="text-gray-600 text-sm mt-1">{selectedTransfer.reference}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Status</label>
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(selectedTransfer.status).bg} ${getStatusColor(selectedTransfer.status).text}`}>
                    {getStatusIcon(selectedTransfer.status)}
                    <span className="font-medium">{formatStatus(selectedTransfer.status)}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update to</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['processing', 'on_the_way', 'transfer_done'].map((status) => {
                      const colors = getStatusColor(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNewStatus(status)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                            newStatus === status
                              ? `${colors.bg} ${colors.border} border-2 scale-105`
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {getStatusIcon(status)}
                          <span className="text-xs font-medium mt-2 text-gray-700">{formatStatus(status)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={newStatus === selectedTransfer.status}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  newStatus === selectedTransfer.status
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg'
                }`}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferList;