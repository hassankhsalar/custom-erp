import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import { 
  Package,
  ShoppingBag,
  Truck,
  Store,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  DollarSign,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  Search,
  X,
  Loader2,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

// Status configuration
const statusColors = {
  pending: { 
    bg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    light: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    label: 'Pending', 
    icon: Clock 
  },
  confirmed: { 
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    light: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    label: 'Confirmed', 
    icon: CheckCircle 
  },
  processing: { 
    bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
    light: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    label: 'Processing', 
    icon: Package 
  },
  ready: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    label: 'Ready for Pickup', 
    icon: ShoppingBag 
  },
  completed: { 
    bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    light: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    label: 'Completed', 
    icon: Check 
  },
  cancelled: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500',
    light: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    label: 'Cancelled', 
    icon: XCircle 
  }
};

const paymentStatusColors = {
  unpaid: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500',
    light: 'bg-red-50',
    text: 'text-red-800',
    label: 'Unpaid',
    icon: AlertCircle
  },
  paid: { 
    bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
    light: 'bg-green-50',
    text: 'text-green-800',
    label: 'Paid',
    icon: Check
  },
  refunded: { 
    bg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    light: 'bg-yellow-50',
    text: 'text-yellow-800',
    label: 'Refunded',
    icon: RefreshCw
  }
};

const OrderOverviewCards = memo(function OrderOverviewCards({ overview }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-blue-600">{overview.totalOrders}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-xl">
            <ShoppingBag size={24} className="text-blue-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-yellow-50/60 to-amber-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-600">{overview.pendingOrders}</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-xl">
            <Clock size={24} className="text-amber-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-green-50/60 to-emerald-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completed Orders</p>
            <p className="text-2xl font-bold text-emerald-600">{overview.completedOrders}</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Check size={24} className="text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-purple-600">৳{overview.totalRevenue}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-xl">
            <DollarSign size={24} className="text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
});

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
  const [statusModal, setStatusModal] = useState({ isOpen: false, order: null, newStatus: '' });
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [appliedSortBy, setAppliedSortBy] = useState('createdAt');
  const [appliedSortDir, setAppliedSortDir] = useState('desc');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filterOpen, setFilterOpen] = useState(false);

  // Overview stats
  const [overview, setOverview] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(appliedSearch && { search: appliedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentFilter && { paymentStatus: paymentFilter }),
        ...(typeFilter && { orderType: typeFilter }),
        sortBy: appliedSortBy,
        sortDir: appliedSortDir,
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      });

      const response = await axios.get(`${API_ROUTES.ORDERS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOrders(response.data.orders || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalOrders(response.data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        showNotification('error', 'Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, statusFilter, paymentFilter, typeFilter, appliedSortBy, appliedSortDir, dateRange, currentPage, itemsPerPage, token, navigate]);

  // Fetch overview stats
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      // This endpoint would need to be created in your backend
      const response = await axios.get(`${API_ROUTES.ORDERS}/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOverview({
        totalOrders: response.data.totalOrders || 0,
        pendingOrders: response.data.pendingOrders || 0,
        completedOrders: response.data.completedOrders || 0,
        totalRevenue: response.data.totalRevenue || 0
      });
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoadingOverview(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      showNotification('error', 'Authentication required. Please login.');
      navigate('/login');
      return;
    }
    fetchOrders();
    fetchOverview();
  }, [fetchOrders, fetchOverview, navigate, token]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== appliedSearch) {
        setCurrentPage(1);
        setAppliedSearch(searchInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch]);

  const handleViewOrder = (order) => {
    setModal({ isOpen: true, type: 'details', data: order });
  };

  const handleStatusUpdate = (order) => {
    setStatusModal({ isOpen: true, order, newStatus: order.status });
  };

  const handleUpdateStatus = async () => {
    if (!statusModal.order || !statusModal.newStatus) return;

    setUpdating(true);
    try {
      if (statusModal.newStatus === 'completed' && statusModal.order.status !== 'completed') {
        await axios.patch(
          `${API_ROUTES.ORDER_STATUS(statusModal.order.id)}`,
          { status: statusModal.newStatus, deductStock: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification('success', 'Order completed and stock deducted successfully');
      } else {
        await axios.patch(
          `${API_ROUTES.ORDER_STATUS(statusModal.order.id)}`,
          { status: statusModal.newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification('success', 'Order status updated successfully');
      }

      setStatusModal({ isOpen: false, order: null, newStatus: '' });
      fetchOrders();
      fetchOverview();
    } catch (error) {
      console.error('Error updating order status:', error);
      showNotification('error', error.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async (orderId, paymentStatus) => {
    try {
      await axios.patch(
        `${API_ROUTES.ORDER_PAYMENT_STATUS(orderId)}`,
        { paymentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', 'Payment status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      showNotification('error', 'Failed to update payment status');
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedSearch(searchInput);
    setAppliedSortBy(sortBy);
    setAppliedSortDir(sortDir);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('');
    setPaymentFilter('');
    setTypeFilter('');
    setSortBy('createdAt');
    setSortDir('desc');
    setAppliedSortBy('createdAt');
    setAppliedSortDir('desc');
    setDateRange({ start: null, end: null });
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const config = statusColors[status] || statusColors.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${config.bg}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const config = paymentStatusColors[status] || paymentStatusColors.unpaid;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${config.bg}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg backdrop-blur-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50/90 border-green-200 text-green-800' 
            : 'bg-red-50/90 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {notification.message}
          </div>
        </div>
      )}

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <ShoppingBag className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Order Management
                </h1>
                <p className="text-gray-600 mt-2">Manage and track all customer orders</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-white/60 rounded-xl hover:bg-white transition-all duration-300"
              >
                <Filter size={18} />
                Filters
              </button>
              <button
                onClick={() => {
                  fetchOrders();
                  fetchOverview();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-white/60 rounded-xl hover:bg-white transition-all duration-300"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <OrderOverviewCards overview={overview} />

        {/* Filters Panel */}
        {filterOpen && (
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-xl mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Order #, customer, phone..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Order Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">All Status</option>
                  {Object.entries(statusColors).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Payment Status</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">All Payments</option>
                  {Object.entries(paymentStatusColors).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Order Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">All Types</option>
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="createdAt">Order Date</option>
                  <option value="total">Total Amount</option>
                  <option value="status">Status</option>
                  <option value="customerName">Customer Name</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Order Direction</label>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg bg-white/80 border border-gray-300 text-gray-700 hover:bg-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg transition-all duration-300"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Pagination Info */}
              {orders.length > 0 && (
                <div className="mb-4 text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalOrders)} of {totalOrders} orders
                </div>
              )}

              {/* Orders Table */}
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Order #</th>
                      <th className="p-4 text-left font-medium text-gray-700">Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">Customer</th>
                      <th className="p-4 text-left font-medium text-gray-700">Type</th>
                      <th className="p-4 text-left font-medium text-gray-700">Total</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Payment</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Package size={48} className="text-gray-300" />
                            <p className="text-gray-500">No orders found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order, index) => (
                        <tr key={order.id} className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}>
                          <td className="p-4 font-medium">
                            {order.orderNumber || `#${order.id}`}
                          </td>
                          <td className="p-4 text-gray-600">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{order.customerName}</p>
                              <p className="text-xs text-gray-500">{order.customerMobile}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              {order.orderType === 'pickup' ? (
                                <Store size={14} className="text-gray-500" />
                              ) : (
                                <Truck size={14} className="text-gray-500" />
                              )}
                              <span className="capitalize text-sm">{order.orderType}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-blue-600">
                            ৳{order.total}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-4">
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewOrder(order)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(order)}
                                className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                title="Update Status"
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {orders.length > 0 && (
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
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="First page"
                      >
                        <ChevronsLeft size={16} className="text-gray-600" />
                      </button>

                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-gray-600" />
                      </button>

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
                      </div>

                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-gray-600" />
                      </button>

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

      {/* View Order Details Modal */}
      {modal.isOpen && modal.type === 'details' && modal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ isOpen: false, type: null, data: null })}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <ShoppingBag className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
                    <p className="text-gray-600">{modal.data.orderNumber || `Order #${modal.data.id}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(modal.data.status)}
                  {getPaymentStatusBadge(modal.data.paymentStatus)}
                  <button
                    onClick={() => setModal({ isOpen: false, type: null, data: null })}
                    className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Customer Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User size={18} className="text-blue-500" />
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{modal.data.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <p className="text-sm">{modal.data.customerMobile}</p>
                    </div>
                    {modal.data.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <p className="text-sm">{modal.data.customerEmail}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-purple-500" />
                    Order Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Type:</span>
                      <div className="flex items-center gap-1">
                        {modal.data.orderType === 'pickup' ? (
                          <Store size={14} className="text-gray-500" />
                        ) : (
                          <Truck size={14} className="text-gray-500" />
                        )}
                        <span className="capitalize text-sm">{modal.data.orderType}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="text-sm">{formatDate(modal.data.createdAt)}</p>
                    </div>
                    
                    {modal.data.orderType === 'pickup' && modal.data.outlet && (
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-gray-400" />
                        <p className="text-sm">{modal.data.outlet.name} - {modal.data.outlet.address}</p>
                      </div>
                    )}

                    {modal.data.orderType === 'delivery' && modal.data.deliveryAddress && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <p className="text-sm">{modal.data.deliveryAddress}</p>
                      </div>
                    )}

                    {modal.data.notes && (
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        <p className="text-sm text-gray-600">Note: {modal.data.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={18} className="text-emerald-500" />
                  Order Items ({modal.data.items?.length || 0})
                </h3>
                <div className="overflow-hidden rounded-lg border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">Product</th>
                        <th className="p-3 text-right font-medium text-gray-700">Quantity</th>
                        <th className="p-3 text-right font-medium text-gray-700">Price</th>
                        <th className="p-3 text-right font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modal.data.items?.map((item, index) => (
                        <tr key={index} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-3 font-medium">{item.productName}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">৳{item.price}</td>
                          <td className="p-3 text-right font-semibold">৳{item.total || item.price * item.quantity}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50/50 font-bold">
                        <td colSpan="3" className="p-3 text-right">Total:</td>
                        <td className="p-3 text-right text-blue-600">৳{modal.data.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Information */}
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-amber-500" />
                  Payment Information
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getPaymentStatusBadge(modal.data.paymentStatus)}
                  </div>
                  <select
                    value={modal.data.paymentStatus}
                    onChange={(e) => {
                      handlePaymentStatusUpdate(modal.data.id, e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {Object.entries(paymentStatusColors).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModal({ isOpen: false, type: null, data: null })}
                  className="px-6 py-2 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setModal({ isOpen: false, type: null, data: null });
                    handleStatusUpdate(modal.data);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModal.isOpen && statusModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setStatusModal({ isOpen: false, order: null, newStatus: '' })}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-white/50">
              <h3 className="text-xl font-bold text-gray-800">Update Order Status</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Order #{statusModal.order.orderNumber || statusModal.order.id}
              </p>

              <select
                value={statusModal.newStatus}
                onChange={(e) => setStatusModal({ ...statusModal, newStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select status</option>
                {Object.entries(statusColors).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {statusModal.newStatus === 'completed' && statusModal.order.status !== 'completed' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <Package size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Stock Deduction</p>
                    <p className="text-sm text-blue-600">This will deduct the ordered quantities from product stock</p>
                  </div>
                </div>
              )}

              {statusModal.newStatus === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Warning</p>
                    <p className="text-sm text-red-600">Are you sure you want to cancel this order?</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/50 flex justify-end gap-3">
              <button
                onClick={() => setStatusModal({ isOpen: false, order: null, newStatus: '' })}
                className="px-4 py-2 bg-gray-200/60 text-gray-700 rounded-lg hover:bg-gray-300/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating || !statusModal.newStatus || statusModal.newStatus === statusModal.order.status}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating && <Loader2 size={16} className="animate-spin" />}
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;