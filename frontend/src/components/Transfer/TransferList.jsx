import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { usePermission } from '../../hooks/usePermission';
import { API_ROUTES } from '../../config';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
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
  Layers,
  Edit2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TransferList = ({ fromType, toType, title }) => {
  const { hasPermission } = usePermission();
  const [transfers, setTransfers] = useState([]);
  const [associations, setAssociations] = useState({ shops: [], stores: [], factories: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadMode, setLoadMode] = useState('filter');
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromFilter, setFromFilter] = useState(fromType || 'all');
  const [fromLocationId, setFromLocationId] = useState('all');
  const [toFilter, setToFilter] = useState(toType || 'all');
  const [toLocationId, setToLocationId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    fromFilter: fromType || 'all',
    fromLocationId: 'all',
    toFilter: toType || 'all',
    toLocationId: 'all',
    statusFilter: 'all',
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
  });
  const [overview, setOverview] = useState({ totalCount: 0, byStatus: {}, totalShippingCost: 0 });
  const [locationOptions, setLocationOptions] = useState({ shop: [], store: [], factory: [] });
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  // Details Modal State
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, data: null });

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('token');
        const [shopsRes, storesRes, factoriesRes] = await Promise.all([
          axios.get(API_ROUTES.SHOPS, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(API_ROUTES.STORES, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(API_ROUTES.FACTORIES, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setLocationOptions({
          shop: Array.isArray(shopsRes.data) ? shopsRes.data : [],
          store: Array.isArray(storesRes.data) ? storesRes.data : [],
          factory: Array.isArray(factoriesRes.data) ? factoriesRes.data : [],
        });
      } catch (_) {
        setLocationOptions({ shop: [], store: [], factory: [] });
      }
    };
    fetchLocations();
  }, []);

  const filterParams = useMemo(() => ({
    from: appliedFilters.fromFilter !== 'all' ? appliedFilters.fromFilter : undefined,
    fromId: appliedFilters.fromFilter !== 'all' && appliedFilters.fromLocationId !== 'all' ? appliedFilters.fromLocationId : undefined,
    to: appliedFilters.toFilter !== 'all' ? appliedFilters.toFilter : undefined,
    toId: appliedFilters.toFilter !== 'all' && appliedFilters.toLocationId !== 'all' ? appliedFilters.toLocationId : undefined,
    status: appliedFilters.statusFilter !== 'all' ? appliedFilters.statusFilter : undefined,
    search: appliedFilters.searchQuery.trim() || undefined,
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
  }), [appliedFilters]);

  const fetchOverview = async (params) => {
    const token = localStorage.getItem('token');
    const overviewRes = await axios.get(API_ROUTES.TRANSFERS_OVERVIEW, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    setOverview({
      totalCount: Number(overviewRes.data?.totalCount || 0),
      byStatus: overviewRes.data?.byStatus || {},
      totalShippingCost: Number(overviewRes.data?.totalShippingCost || 0),
    });
  };

  const fetchTransfers = async (mode = 'table', page = currentPage, limit = itemsPerPage, params = filterParams) => {
    setLoading(true);
    setLoadMode(mode);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.TRANSFERS, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          ...params,
          page,
          limit,
        },
      });
      setTransfers(response.data.transfers);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.totalItems);
      setAssociations(response.data.associations || { shops: [], stores: [], factories: [] });
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setError('Failed to fetch transfers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = (transfer) => {
    setDetailsModal({ isOpen: true, data: transfer });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, data: null });
  };

  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchTransfers('filter', 1, itemsPerPage, filterParams);
    fetchOverview(filterParams).catch((error) => {
      console.error('Error fetching transfer overview:', error);
    });
  }, [filterParams]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchTransfers('table', currentPage, itemsPerPage, filterParams);
  }, [currentPage, itemsPerPage]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchTransfers('table', currentPage, itemsPerPage, filterParams),
        fetchOverview(filterParams),
      ]);
    } catch (error) {
      console.error('Error refreshing transfers:', error);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      fromFilter,
      fromLocationId,
      toFilter,
      toLocationId,
      statusFilter,
      searchQuery,
      dateFrom,
      dateTo,
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const empty = {
      fromFilter: fromType || 'all',
      fromLocationId: 'all',
      toFilter: toType || 'all',
      toLocationId: 'all',
      statusFilter: 'all',
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
    };
    setFromFilter(empty.fromFilter);
    setFromLocationId(empty.fromLocationId);
    setToFilter(empty.toFilter);
    setToLocationId(empty.toLocationId);
    setStatusFilter(empty.statusFilter);
    setSearchQuery(empty.searchQuery);
    setDateFrom(empty.dateFrom);
    setDateTo(empty.dateTo);
    setAppliedFilters(empty);
    setCurrentPage(1);
  };

  const handleDeleteTransfer = async (transferId) => {
    if (!hasPermission('transfers_delete')) return;
    const confirmed = window.confirm('Delete this transfer? Stock will be reconciled automatically.');
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(API_ROUTES.TRANSFER_BY_ID(transferId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTransfers('table', currentPage, itemsPerPage, filterParams);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete transfer');
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
      case 'on_the_way':
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
          iconBg: 'bg-blue-100',
          text: 'text-blue-600'
        };
      case 'complete':
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500', 
          iconBg: 'bg-emerald-100',
          text: 'text-emerald-600'
        };
      case 'partial':
      case 'receive_with_missing':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
          iconBg: 'bg-yellow-100',
          text: 'text-yellow-700'
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

  const canReceiveTransfer = (transfer) => {
    if (!transfer) return false;
    if (transfer.to === 'shop') return associations.shops.includes(transfer.toId);
    if (transfer.to === 'store') return associations.stores.includes(transfer.toId);
    if (transfer.to === 'factory') return associations.factories.includes(transfer.toId);
    return false;
  };

  const formatStatus = (status) => {
    if (!status) return '';
    switch (status) {
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'on_the_way':
        return 'Shipping';
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'Partial';
      case 'receive_with_missing':
        return 'Receive With Missing';
      case 'not_received':
        return 'Cancel';
      default:
        return status.replace(/_/g, ' ').replace(/\w\S*/g, function(txt){
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'on_the_way':
        return <Truck className="w-4 h-4" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4" />;
      case 'partial':
      case 'receive_with_missing':
        return <AlertCircle className="w-4 h-4" />;
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
  const processingTransfers = Number(overview.byStatus?.processing || 0) + Number(overview.byStatus?.pending || 0);
  const onTheWayTransfers = Number(overview.byStatus?.on_the_way || 0);
  const completedTransfers = Number(overview.byStatus?.complete || 0);
  const renderPaginationControls = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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

          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span>{" "}
            of <span className="font-semibold">{totalItems}</span> transfers
          </div>
        </div>

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
  );

  if (loading && loadMode === 'filter') {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
              <Link to="/transfer/add" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Settings size={20} />
                New Transfer
              </Link>
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
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <select
                  value={fromFilter}
                  onChange={(e) => {
                    setFromFilter(e.target.value);
                    setFromLocationId('all');
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">From Type (All)</option>
                  <option value="store">Store</option>
                  <option value="shop">Shop</option>
                  <option value="factory">Factory</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={fromLocationId}
                  onChange={(e) => {
                    setFromLocationId(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={fromFilter === 'all'}
                  className="appearance-none w-full pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                >
                  <option value="all">{fromFilter === 'all' ? 'Select from type first' : 'All Locations'}</option>
                  {(locationOptions[fromFilter] || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={toFilter}
                  onChange={(e) => {
                    setToFilter(e.target.value);
                    setToLocationId('all');
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">To Type (All)</option>
                  <option value="store">Store</option>
                  <option value="shop">Shop</option>
                  <option value="factory">Factory</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={toLocationId}
                  onChange={(e) => {
                    setToLocationId(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={toFilter === 'all'}
                  className="appearance-none w-full pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                >
                  <option value="all">{toFilter === 'all' ? 'Select to type first' : 'All Locations'}</option>
                  {(locationOptions[toFilter] || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full pl-4 pr-10 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="on_the_way">On The Way</option>
                  <option value="partial">Partial</option>
                  <option value="complete">Complete</option>
                  <option value="not_received">Not Received</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div className="flex justify-between items-center flex-col lg:flex-row gap-3">
              <div className='md:grow w-full'>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="search-query">Search transfers</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="search-query"
                    placeholder="Search transfers by reference, note..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              <div className='w-full'>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="date-from">From Date</label>
                <input
                  type="datetime-local"
                  id="date-from"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className='w-full'>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="date-to">To Date</label>
                <input
                  type="datetime-local"
                  id="date-to"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className='flex items-center self-end gap-4'>
                <button
                  onClick={handleApplyFilters}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-colors duration-200"
                  title="Apply Filters"
                >
                  <Filter className="w-5 h-5" /> Filter
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl hover:bg-white transition-colors duration-200 text-gray-700"
                  title="Clear Filters"
                >
                  <X className="w-5 h-5" /> Clear
                </button>
              </div>
            </div>
          </div>

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
                onClick={() => fetchTransfers('table', currentPage, itemsPerPage, filterParams)}
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
              {transfers.length > 0 && renderPaginationControls()}

              <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-b border-gray-200">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Reference</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">From ? To</th>
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
                            className="hover:bg-white/30 transition-colors duration-150"
                          >
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
                            <td className="p-4 min-w-24">
                              <div className="flex items-center gap-2">
                                <div className=" text-xs">
                                  <div className="block">
                                    <span className="font-bold text-gray-900">{transfer.totalProducts} </span>
                                    <span className=" text-gray-500">items</span>
                                  </div>
                                  <div className="block">
                                    <span className="font-bold text-gray-900">{transfer.totalItems} </span>
                                    <span className=" text-gray-500">Types</span>
                                  </div>
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
                                {hasPermission('transfers_receive') && (
                                  <Link
                                    to={`/transfers/${transfer.id}/receive`}
                                    className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                                    title="Transfer Page"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Link>
                                )}
                                <Link
                                  to={`/transfers/${transfer.id}/receipts`}
                                  className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                  title="Receive History"
                                >
                                  <Layers className="w-4 h-4" />
                                </Link>
                                {hasPermission('transfers_edit') && (
                                  <Link
                                    to={`/transfer/edit/${transfer.id}`}
                                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                    title="Edit Transfer"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Link>
                                )}
                                {hasPermission('transfers_delete') && (
                                  <button
                                    onClick={() => handleDeleteTransfer(transfer.id)}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                    title="Delete Transfer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {transfers.length > 0 && renderPaginationControls()}
            </>
          )}
        </div>
      </div>

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

              {/* Items Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-purple-600" />
                  Items ({detailsModal.data.totalItems || 0})
                </h3>
                {detailsModal.data.transferItems && detailsModal.data.transferItems.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-white/60 bg-white/60 backdrop-blur-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-700">Item</th>
                          <th className="p-3 text-left font-medium text-gray-700">Type</th>
                          <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                          <th className="p-3 text-left font-medium text-gray-700">Avg Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsModal.data.transferItems.map((item, idx) => (
                          <tr key={`${item.item}-${item.itemId}-${idx}`} className="border-t border-white/50 hover:bg-white/40">
                            <td className="p-3 font-medium text-gray-800">
                              {item.name}
                              {item.selectedName && item.selectedName !== item.name && (
                                <div className="text-xs text-gray-500 mt-1">{item.selectedName}</div>
                              )}
                            </td>
                            <td className="p-3 text-gray-600 capitalize">{item.item}</td>
                            <td className="p-3 text-gray-700">
                              {item.quantity}
                              {item.selectedQuantity && item.selectedUnit && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.selectedQuantity} {item.selectedUnit}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-gray-700">
                              {item.avg_cost !== null && item.avg_cost !== undefined
                                ? `$${parseFloat(item.avg_cost).toFixed(2)}`
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl border border-white/60 p-4">
                    <p className="text-gray-600 text-center">
                      No items found for this transfer
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferList;

