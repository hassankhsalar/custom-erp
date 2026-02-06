import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import {
  ArrowLeft,
  Eye,
  Package,
  Truck,
  Calendar,
  Building,
  Store,
  Factory,
  DollarSign,
  Filter,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Edit,
  MoreVertical,
  Check,
  X,
  FileText,
  MapPin,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Percent
} from 'lucide-react';

const ProductRepair = () => {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromTypeFilter, setFromTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modal states
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [successQuantities, setSuccessQuantities] = useState({});
  const [failQuantities, setFailQuantities] = useState({});

  const getToken = () => localStorage.getItem('token');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ROUTES.PRODUCT_REPAIRS, getAuthHeaders());
      setRepairs(response.data.repairs || response.data || []);
    } catch (error) {
      console.error('Error fetching repairs:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
  if (!selectedRepair) return;

  try {
    setUpdatingStatus(true);
    
    // Prepare returned products data
    const returnedProducts = selectedRepair.productRepairItem.map(item => ({
      productId: item.productId,
      successQuantity: parseFloat(successQuantities[item.id] || 0),
      failQuantity: parseFloat(failQuantities[item.id] || 0)
    }));

    const response = await axios.patch(
      `${API_ROUTES.PRODUCT_REPAIRS}/${selectedRepair.id}/status`,
      {
        status: 'completed', // Make sure this matches the status field
        returnedProducts
      },
      getAuthHeaders()
    );

    alert('Repair status updated successfully!');
    setShowStatusModal(false);
    fetchRepairs(); // Refresh the list
  } catch (error) {
    console.error('Error updating repair status:', error);
    alert(error.response?.data?.error || 'Failed to update repair status');
  } finally {
    setUpdatingStatus(false);
  }
};

  const openDetailsModal = (repair) => {
    setSelectedRepair(repair);
    setShowDetailsModal(true);
  };

  const openStatusModal = (repair) => {
    setSelectedRepair(repair);
    
    // Initialize success/fail quantities
    const successInit = {};
    const failInit = {};
    
    repair.productRepairItem.forEach(item => {
      successInit[item.id] = item.success || 0;
      failInit[item.id] = item.fail || 0;
    });
    
    setSuccessQuantities(successInit);
    setFailQuantities(failInit);
    setShowStatusModal(true);
  };

  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch = 
      repair.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `#${repair.id}`.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || repair.status === statusFilter;
    const matchesFromType = fromTypeFilter === 'all' || repair.from === fromTypeFilter;
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const repairDate = new Date(repair.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);
      
      switch (dateFilter) {
        case 'today':
          matchesDate = repairDate.toDateString() === today.toDateString();
          break;
        case 'yesterday':
          matchesDate = repairDate.toDateString() === yesterday.toDateString();
          break;
        case 'last7':
          matchesDate = repairDate >= last7Days;
          break;
        case 'last30':
          matchesDate = repairDate >= last30Days;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesFromType && matchesDate;
  });

  // Analytics calculations
  const analytics = {
    totalRepairs: repairs.length,
    pendingRepairs: repairs.filter(r => r.status === 'pending' || !r.status).length,
    completedRepairs: repairs.filter(r => r.status === 'completed').length,
    inProgressRepairs: repairs.filter(r => r.status === 'in_progress').length,
    totalProductsSent: repairs.reduce((sum, r) => sum + (r.productRepairItem?.length || 0), 0),
    totalUnits: repairs.reduce((sum, r) => 
      sum + (r.productRepairItem?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0),
    totalShippingCost: repairs.reduce((sum, r) => sum + (r.shippingCost || 0), 0),
    completionRate: repairs.length > 0 
      ? (repairs.filter(r => r.status === 'completed').length / repairs.length * 100).toFixed(1) 
      : 0
  };

  const getFromIcon = (fromType) => {
    switch (fromType) {
      case 'store': return <Store size={18} className="text-blue-600" />;
      case 'shop': return <Building size={18} className="text-green-600" />;
      case 'factory': return <Factory size={18} className="text-purple-600" />;
      default: return <Building size={18} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'in_progress': return <RefreshCw size={16} className="text-blue-600" />;
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <XCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Source Type', 'Source ID', 'Destination', 'Status', 'Products Count', 'Total Units', 'Shipping Cost', 'Created Date', 'Note'];
    const csvData = repairs.map(repair => [
      repair.id,
      repair.from,
      repair.fromId,
      repair.destination,
      repair.status || 'pending',
      repair.productRepairItem?.length || 0,
      repair.productRepairItem?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      repair.shippingCost || 0,
      new Date(repair.createdAt).toLocaleDateString(),
      repair.note || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-repairs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Product Repair Management</h1>
                <p className="text-gray-600">Track and manage product repair requests</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToCSV}
                className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={() => navigate('/addrepairproduct')}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-600 transition-all shadow-lg flex items-center gap-2"
              >
                <Truck size={20} />
                New Repair Request
              </button>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Repairs</p>
                  <p className="text-2xl font-bold text-blue-700">{analytics.totalRepairs}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Package size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{analytics.pendingRepairs}</p>
                </div>
                <div className="p-2 bg-yellow-200 rounded-lg">
                  <Clock size={20} className="text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{analytics.completedRepairs}</p>
                </div>
                <div className="p-2 bg-green-200 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{analytics.inProgressRepairs}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <RefreshCw size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Products Sent</p>
                  <p className="text-2xl font-bold text-purple-700">{analytics.totalProductsSent}</p>
                </div>
                <div className="p-2 bg-purple-200 rounded-lg">
                  <Package size={20} className="text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Units</p>
                  <p className="text-2xl font-bold text-orange-700">{analytics.totalUnits}</p>
                </div>
                <div className="p-2 bg-orange-200 rounded-lg">
                  <TrendingUp size={20} className="text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Shipping Cost</p>
                  <p className="text-2xl font-bold text-red-700">${analytics.totalShippingCost.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-red-200 rounded-lg">
                  <DollarSign size={20} className="text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold text-emerald-700">{analytics.completionRate}%</p>
                </div>
                <div className="p-2 bg-emerald-200 rounded-lg">
                  <Percent size={20} className="text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search repairs..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
              />
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <select
                value={fromTypeFilter}
                onChange={(e) => setFromTypeFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All Sources</option>
                <option value="store">Store</option>
                <option value="shop">Shop</option>
                <option value="factory">Factory</option>
              </select>
            </div>
            
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={fetchRepairs}
                className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFromTypeFilter('all');
                  setDateFilter('all');
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Repairs List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading repair requests...</p>
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Repair Requests Found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your filters or create a new repair request</p>
              <button
                onClick={() => navigate('/addrepairproduct')}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-600 transition-all"
              >
                Create New Repair Request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="p-4 text-left font-semibold text-gray-700">ID</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Source</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Destination</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Products</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Status</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Created</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepairs.map((repair) => (
                    <tr key={repair.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-bold text-gray-800">#{repair.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getFromIcon(repair.from)}
                          <div>
                            <div className="font-medium capitalize">{repair.from}</div>
                            <div className="text-xs text-gray-500">ID: {repair.fromId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-400" />
                          <div>
                            <div className="font-medium truncate max-w-xs">{repair.destination}</div>
                            {repair.note && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{repair.note}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-gray-400" />
                            <span className="font-medium">{repair.productRepairItem?.length || 0} items</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {repair.productRepairItem?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} units
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(repair.status || 'pending')}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(repair.status || 'pending')}`}>
                            {repair.status || 'pending'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={12} />
                            {new Date(repair.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(repair.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailsModal(repair)}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye size={14} />
                            <span className="hidden md:inline">View</span>
                          </button>
                          
                          {(repair.status === 'pending' || repair.status === 'in_progress') && (
                            <button
                              onClick={() => openStatusModal(repair)}
                              className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                              title="Update Status"
                            >
                              <Edit size={14} />
                              <span className="hidden md:inline">Update</span>
                            </button>
                          )}
                          
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!loading && filteredRepairs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredRepairs.length} of {repairs.length} repair requests
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Repair Request Details</h2>
                  <p className="text-gray-600">ID: #{selectedRepair.id}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Source Information</h3>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        {getFromIcon(selectedRepair.from)}
                        <div>
                          <div className="font-bold text-gray-800 capitalize">{selectedRepair.from}</div>
                          <div className="text-sm text-gray-600">ID: {selectedRepair.fromId}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Destination</h3>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="font-bold text-gray-800">{selectedRepair.destination}</div>
                        {selectedRepair.note && (
                          <div className="text-sm text-gray-600 mt-1">{selectedRepair.note}</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping & Status</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <div className="text-sm text-gray-500">Shipping Cost</div>
                          <div className="font-bold text-gray-800">${selectedRepair.shippingCost?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <div className="text-sm text-gray-500">Status</div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(selectedRepair.status || 'pending')}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRepair.status || 'pending').replace('border-', '')}`}>
                              {selectedRepair.status || 'pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">Created</div>
                          <div className="text-sm text-gray-600">
                            {new Date(selectedRepair.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <RefreshCw size={16} className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">Last Updated</div>
                          <div className="text-sm text-gray-600">
                            {new Date(selectedRepair.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {selectedRepair.document && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Attached Document</h3>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <FileText size={20} className="text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">Document</div>
                            <div className="text-sm text-gray-600">Click to download</div>
                          </div>
                          <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200">
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Products Sent for Repair</h3>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Product</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Success</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Fail</th>
                          <th className="p-3 text-left text-sm font-medium text-gray-700">Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.productRepairItem?.map((item) => {
                          const success = item.success || 0;
                          const fail = item.fail || 0;
                          const pending = item.quantity - success - fail;
                          
                          return (
                            <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Package size={14} className="text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                                    <div className="text-xs text-gray-500">ID: {item.productId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-medium">{item.quantity}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={14} className="text-green-500" />
                                  <span className={success > 0 ? 'font-bold text-green-600' : 'text-gray-500'}>
                                    {success}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <XCircle size={14} className="text-red-500" />
                                  <span className={fail > 0 ? 'font-bold text-red-600' : 'text-gray-500'}>
                                    {fail}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={pending > 0 ? 'font-bold text-yellow-600' : 'text-gray-500'}>
                                  {pending}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                {(selectedRepair.status === 'pending' || selectedRepair.status === 'in_progress') && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setTimeout(() => openStatusModal(selectedRepair), 100);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-600 transition-all"
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Update Repair Status</h2>
                  <p className="text-gray-600">ID: #{selectedRepair.id} • {selectedRepair.destination}</p>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Enter success and fail quantities for each product</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Successfully repaired products will be added back to stock. Failed products remain as scrap.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {selectedRepair.productRepairItem?.map((item) => {
                  const currentSuccess = successQuantities[item.id] || 0;
                  const currentFail = failQuantities[item.id] || 0;
                  const maxQuantity = item.quantity;
                  const remaining = maxQuantity - currentSuccess - currentFail;
                  
                  return (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Package size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{item.product?.name || 'Unknown Product'}</div>
                            <div className="text-sm text-gray-600">ID: {item.productId} • Max: {maxQuantity} units</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Remaining: <span className="font-bold">{remaining}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <CheckCircle size={14} className="inline mr-1 text-green-500" />
                            Successfully Repaired
                          </label>
                          <input
                            type="number"
                            value={successQuantities[item.id] || 0}
                            onChange={(e) => {
                              const value = Math.max(0, Math.min(maxQuantity - (failQuantities[item.id] || 0), parseFloat(e.target.value) || 0));
                              setSuccessQuantities(prev => ({
                                ...prev,
                                [item.id]: value
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-300"
                            min="0"
                            max={maxQuantity - (failQuantities[item.id] || 0)}
                            step="1"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Will be added back to {selectedRepair.from} stock
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <XCircle size={14} className="inline mr-1 text-red-500" />
                            Failed Repair
                          </label>
                          <input
                            type="number"
                            value={failQuantities[item.id] || 0}
                            onChange={(e) => {
                              const value = Math.max(0, Math.min(maxQuantity - (successQuantities[item.id] || 0), parseFloat(e.target.value) || 0));
                              setFailQuantities(prev => ({
                                ...prev,
                                [item.id]: value
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                            min="0"
                            max={maxQuantity - (successQuantities[item.id] || 0)}
                            step="1"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Will remain as scrap at {selectedRepair.from}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Success: {currentSuccess}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>Fail: {currentFail}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span>Pending: {remaining}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-600">Total Summary</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="font-bold text-green-600">
                        {Object.values(successQuantities).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)} Success
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" />
                      <span className="font-bold text-red-600">
                        {Object.values(failQuantities).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)} Fail
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">New Status</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-500" />
                    <span className="font-bold text-green-600">Completed</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingStatus ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Complete Repair
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRepair;