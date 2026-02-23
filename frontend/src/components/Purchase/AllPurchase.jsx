import { useEffect, useState } from "react";
import { 
  ArrowUpDown, Package, Truck, Building2, Calendar, 
  Store, ShoppingBag, Factory, MoreVertical, 
  Eye, CreditCard, DollarSign, Trash2, CheckCircle, XCircle,
  AlertCircle, Loader2, TrendingDown, FileText, MapPin,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, Settings, User, Clock, Shield, Edit,
  X
} from "lucide-react";
import { API_ROUTES } from "../../config";

export default function AllPurchase() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [viewPaymentModalOpen, setViewPaymentModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addShipmentModalOpen, setAddShipmentModalOpen] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [shipmentItems, setShipmentItems] = useState([]);
  const [shipmentNote, setShipmentNote] = useState("");
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState("items");
  
  // Form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPurchases();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.PURCHASES}?page=${currentPage}&limit=${itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      const data = await res.json();
      
      // Handle paginated response
      if (data && data.data && data.pagination) {
        setPurchases(data.data);
        setTotalCount(data.pagination.totalCount);
        // Adjust current page if it exceeds total pages
        if (data.pagination.totalPages > 0 && currentPage > data.pagination.totalPages) {
          setCurrentPage(data.pagination.totalPages);
        }
      } else if (Array.isArray(data)) {
        // Fallback for non-paginated response
        setPurchases(data);
        setTotalCount(data.length);
      } else {
        setPurchases([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_ROUTES.ACCOUNTS}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const fetchPaymentHistory = async (purchaseId) => {
    try {
      const res = await fetch(`${API_ROUTES.PURCHASES}/${purchaseId}/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch payment history");
      const data = await res.json();
      setPaymentHistory(data.payments || []);
    } catch (err) {
      console.error("Error fetching payment history:", err);
    }
  };

  const fetchShipments = async (purchaseId) => {
    try {
      const res = await fetch(`${API_ROUTES.PURCHASES}/${purchaseId}/shipments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      const shipmentList = data.shipments || [];
      setShipments(shipmentList);
      return shipmentList;
    } catch (err) {
      console.error("Error fetching shipments:", err);
      setShipments([]);
      return [];
    }
  };

  const handleDropdownToggle = (purchaseId) => {
    setActiveDropdown(activeDropdown === purchaseId ? null : purchaseId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Action handlers
  const handleView = (purchase) => {
    setSelectedPurchase(purchase);
    setActiveViewTab("items");
    setViewModalOpen(true);
    fetchPaymentHistory(purchase.id);
    fetchShipments(purchase.id);
    setActiveDropdown(null);
  };

  const handleAddPayment = (purchase) => {
    setSelectedPurchase(purchase);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
    setSelectedAccount(accounts[0]?.id || "");
    setAddPaymentModalOpen(true);
    setActiveDropdown(null);
  };

  const handleViewPayment = async (purchase) => {
    setSelectedPurchase(purchase);
    await fetchPaymentHistory(purchase.id);
    setViewPaymentModalOpen(true);
    setActiveDropdown(null);
  };

  const buildShipmentItems = (purchase, shipmentList) => {
    const receivedByItemId = {};
    shipmentList.forEach((shipment) => {
      shipment.items?.forEach((si) => {
        if (!si.purchaseItemId) return;
        receivedByItemId[si.purchaseItemId] = (receivedByItemId[si.purchaseItemId] || 0) + (parseFloat(si.received_quantity) || 0);
      });
    });

    return (purchase.purchaseItems || []).map((item) => {
      const receivedSoFar = receivedByItemId[item.id] || 0;
      const remaining = Math.max(0, (parseFloat(item.quantity) || 0) - receivedSoFar);
      const itemName = item.itemType === 'material' ? item.material?.name : item.product?.name;
      return {
        purchaseItemId: item.id,
        itemType: item.itemType,
        name: itemName || "-",
        orderedQuantity: parseFloat(item.quantity) || 0,
        receivedSoFar,
        remaining,
        receivedQuantity: remaining > 0 ? remaining : 0
      };
    });
  };

  const handleAddShipment = async (purchase) => {
    setSelectedPurchase(purchase);
    setShipmentNote("");
    const shipmentList = await fetchShipments(purchase.id);
    const itemsForShipment = buildShipmentItems(purchase, shipmentList).filter(i => i.remaining > 0);
    setShipmentItems(itemsForShipment);
    setAddShipmentModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = (purchase) => {
    setSelectedPurchase(purchase);
    setDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  // Calculate due amount
  const calculateDueAmount = (purchase) => {
    const grandTotal = parseFloat(purchase.grandTotal) || 0;
    const paidAmount = parseFloat(purchase.paidAmount) || 0;
    return Math.max(0, grandTotal - paidAmount);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Sorting logic (applied to current page data only)
  const sortedPurchases = sortConfig.key ? [...purchases].sort((a, b) => {
    const direction = sortConfig.direction === 'ascending' ? 1 : -1;

    if (sortConfig.key === 'grand total') {
      return ((a.grandTotal || 0) - (b.grandTotal || 0)) * direction;
    }
    if (sortConfig.key === 'due amount') {
      return (calculateDueAmount(a) - calculateDueAmount(b)) * direction;
    }
    if (sortConfig.key === 'date') {
      return (new Date(a.createdAt) - new Date(b.createdAt)) * direction;
    }
    if (sortConfig.key === 'status') {
      const aStatus = calculateDueAmount(a) <= 0 ? 'paid' : 'pending';
      const bStatus = calculateDueAmount(b) <= 0 ? 'paid' : 'pending';
      return aStatus.localeCompare(bStatus) * direction;
    }
    if (sortConfig.key === 'supplier') {
      return (a.supplier?.name || '').localeCompare(b.supplier?.name || '') * direction;
    }
    if (sortConfig.key === 'reference') {
      return (a.reference || '').localeCompare(b.reference || '') * direction;
    }
    if (sortConfig.key === 'destination') {
      const aDest = a.destination ? `${a.destination.type}: ${a.destination.name}` : '';
      const bDest = b.destination ? `${b.destination.type}: ${b.destination.name}` : '';
      return aDest.localeCompare(bDest) * direction;
    }
    return 0;
  }) : purchases;

  // Pagination calculations
  const currentItems = sortedPurchases;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const indexOfFirstItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalCount);

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

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    if (!selectedPurchase || !paymentAmount || !selectedAccount) {
      alert("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(paymentAmount);
    const dueAmount = calculateDueAmount(selectedPurchase);

    if (amount <= 0) {
      alert("Payment amount must be greater than 0");
      return;
    }

    if (amount > dueAmount) {
      alert(`Payment amount ($${amount.toFixed(2)}) exceeds due amount ($${dueAmount.toFixed(2)})`);
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          payment_method: paymentMethod,
          accountId: selectedAccount,
          createdById: 1,
          note: paymentNote,
          purpose: 'Purchase Payment'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      const result = await response.json();
      
      await fetchPurchases();
      
      setAddPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNote("");
      setSelectedAccount("");
      
      alert(result.message || "Payment recorded successfully!");
      
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleShipmentSubmit = async () => {
    if (!selectedPurchase) return;
    const itemsToSend = shipmentItems
      .filter(i => parseFloat(i.receivedQuantity) > 0)
      .map(i => ({
        purchaseItemId: i.purchaseItemId,
        receivedQuantity: parseFloat(i.receivedQuantity)
      }));

    if (itemsToSend.length === 0) {
      alert("Please enter received quantities for shipment.");
      return;
    }

    setShipmentLoading(true);
    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToSend,
          note: shipmentNote
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add shipment');
      }

      await fetchPurchases();
      await fetchShipments(selectedPurchase.id);
      setAddShipmentModalOpen(false);
      setShipmentItems([]);
      setShipmentNote("");
    } catch (error) {
      console.error('Error adding shipment:', error);
      alert(error.message || 'Failed to add shipment');
    } finally {
      setShipmentLoading(false);
    }
  };

  // Handle purchase deletion
  const handleDeleteSubmit = async () => {
    if (!selectedPurchase) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.PURCHASES}/${selectedPurchase.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete purchase');
      }

      const result = await response.json();
      
      await fetchPurchases();
      
      setDeleteModalOpen(false);
      
      alert(result.message || "Purchase deleted successfully!");
      
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert(error.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Calculate statistics
  const totalDueAmount = purchases.reduce((sum, p) => sum + calculateDueAmount(p), 0);
  const totalPaidAmount = purchases.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0), 0);
  const totalGrandTotal = purchases.reduce((sum, p) => sum + (parseFloat(p.grandTotal) || 0), 0);
  const pendingShipments = purchases.filter(p => p.shippingStatus !== 'received').length;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
          <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <p className="text-red-500 text-lg font-medium mb-4">Error: {error}</p>
          <button
            onClick={fetchPurchases}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Package className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Purchase Orders
                </h1>
                <p className="text-gray-600 mt-2">Manage all purchase orders, payments, and shipments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60">
              <Filter size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {totalCount} {totalCount === 1 ? 'Purchase' : 'Purchases'}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">${totalGrandTotal.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600">${totalPaidAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-amber-600">${totalDueAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingDown size={24} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Shipments</p>
                <p className="text-2xl font-bold text-purple-600">{pendingShipments}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Truck size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {purchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <Package size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Purchases Found</h3>
              <p className="text-gray-600 mb-6">There are no purchase orders in the system yet.</p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300">
                <Settings size={20} />
                Create First Purchase
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      {[
                        { key: 'reference', label: 'Reference', icon: <FileText size={14} /> },
                        { key: 'supplier', label: 'Supplier', icon: <Building2 size={14} /> },
                        { key: 'grand total', label: 'Total', icon: <DollarSign size={14} /> },
                        { key: 'due amount', label: 'Due', icon: <AlertCircle size={14} /> },
                        { key: 'date', label: 'Date', icon: <Calendar size={14} /> },
                        { key: 'destination', label: 'Destination', icon: <MapPin size={14} /> },
                        { key: 'shipping status', label: 'Status', icon: <Truck size={14} /> },
                        { key: 'actions', label: 'Actions', icon: null }
                      ].map(({ key, label, icon }) => (
                        <th
                          key={key}
                          className="p-4 text-left font-medium text-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {icon && <span className="text-gray-500">{icon}</span>}
                            <span>{label}</span>
                            {key !== 'actions' && (
                              <ArrowUpDown
                                onClick={() => handleSort(key)}
                                className="ml-1 p-1 hover:bg-gray-200 rounded-md cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                                size={18}
                              />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((purchase, index) => {
                      const dueAmount = calculateDueAmount(purchase);
                      const isPaid = dueAmount.toFixed(2) <= 0.00;
                      
                      return (
                        <tr
                          key={purchase.id}
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div>
                              <span className="font-medium text-blue-600">{purchase.reference}</span>
                              <div className="text-xs text-gray-500 mt-1">ID: #{purchase.id}</div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {purchase.supplier?.name?.charAt(0) || 'S'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-800">{purchase.supplier?.name || '-'}</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className="font-bold text-green-600">${purchase.grandTotal?.toFixed(2) || "0.00"}</span>
                          </td>
                          
                          <td className="p-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle size={12} />
                                Paid
                              </span>
                            ) : (
                              <span className="font-bold text-amber-600">${dueAmount.toFixed(2)}</span>
                            )}
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-gray-700">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {purchase.destination?.type === 'store' ? (
                                <Store size={14} className="text-blue-500" />
                              ) : purchase.destination?.type === 'shop' ? (
                                <ShoppingBag size={14} className="text-purple-500" />
                              ) : purchase.destination?.type === 'factory' ? (
                                <Factory size={14} className="text-amber-500" />
                              ) : null}
                              <span className="text-gray-700">
                                {purchase.destination ? 
                                  `${purchase.destination.type}: ${purchase.destination.name}` : 
                                  "-"
                                }
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              purchase.shippingStatus === 'received'
                                ? 'bg-green-100 text-green-700'
                                : purchase.shippingStatus === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {purchase.shippingStatus === 'received' ? (
                                <CheckCircle size={12} />
                              ) : purchase.shippingStatus === 'pending' ? (
                                <Clock size={12} />
                              ) : (
                                <Truck size={12} />
                              )}
                              {purchase.shippingStatus || 'pending'}
                            </span>
                          </td>
                          
                          <td className="p-4">
                            <div className="relative dropdown-container">
                              <button
                                onClick={() => handleDropdownToggle(purchase.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical size={18} className="text-gray-600" />
                              </button>
                              
                              {activeDropdown === purchase.id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleView(purchase)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                    >
                                      <Eye size={16} />
                                      View Details
                                    </button>
                                    
                                    {!isPaid && (
                                      <button
                                        onClick={() => handleAddPayment(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
                                      >
                                        <CreditCard size={16} />
                                        Add Payment
                                      </button>
                                    )}

                                    {purchase.shippingStatus !== 'received' && (
                                      <button
                                        onClick={() => handleAddShipment(purchase)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                                      >
                                        <Truck size={16} />
                                        Add Shipment
                                      </button>
                                    )}
                                    
                                    <div className="border-t my-1"></div>
                                    
                                    <button
                                      onClick={() => handleDelete(purchase)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                                    >
                                      <Trash2 size={16} />
                                      Delete Purchase
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalCount > 0 && (
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
                        Showing <span className="font-semibold">{indexOfFirstItem}</span> to{" "}
                        <span className="font-semibold">{indexOfLastItem}</span>{" "}
                        of <span className="font-semibold">{totalCount}</span> purchases
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
                                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
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
                                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals - View details */}
      {viewModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Purchase Details</h2>
                    <p className="text-gray-600">{selectedPurchase.reference}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Supplier</h4>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Building2 size={18} className="text-blue-500" />
                    {selectedPurchase.supplier?.name}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Destination</h4>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {selectedPurchase.destination?.type === 'store' ? (
                      <Store size={18} className="text-blue-500" />
                    ) : selectedPurchase.destination?.type === 'shop' ? (
                      <ShoppingBag size={18} className="text-purple-500" />
                    ) : (
                      <Factory size={18} className="text-amber-500" />
                    )}
                    {selectedPurchase.destination ? 
                      `${selectedPurchase.destination.type}: ${selectedPurchase.destination.name}` : 
                      "-"
                    }
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Amount</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Amount</h4>
                  <p className={`text-2xl font-bold ${calculateDueAmount(selectedPurchase) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date</h4>
                  <p className="text-lg flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    {new Date(selectedPurchase.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    calculateDueAmount(selectedPurchase) <= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {calculateDueAmount(selectedPurchase) <= 0 ? (
                      <CheckCircle size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {calculateDueAmount(selectedPurchase) <= 0 ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {["items", "payments", "shipments"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveViewTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeViewTab === tab
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {activeViewTab === "items" && (
                  <div className="overflow-x-auto rounded-xl border border-white/60">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100/80">
                        <tr>
                          <th className="p-3 text-left">Type</th>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3 text-left">Quantity</th>
                          <th className="p-3 text-left">Unit Price</th>
                          <th className="p-3 text-left">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.purchaseItems?.map((item, index) => (
                          <tr key={index} className="border-t border-white/50 hover:bg-white/30">
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.itemType === 'material' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {item.itemType}
                              </span>
                            </td>
                            <td className="p-3 font-medium">
                              {item.itemType === 'material' ? item.material?.name : item.product?.name}
                            </td>
                            <td className="p-3">{item.quantity}</td>
                            <td className="p-3">${item.unitPrice?.toFixed(2)}</td>
                            <td className="p-3 font-semibold">${item.totalPrice?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeViewTab === "payments" && (
                  <div className="space-y-3">
                    {paymentHistory.length > 0 ? (
                      paymentHistory.map((txn, index) => (
                        <div key={index} className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign size={18} className="text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">Payment #{index + 1}</div>
                                <div className="text-sm text-gray-600">{new Date(txn.createdAt).toLocaleString()}</div>
                                <div className="text-sm text-gray-600 mt-1">Method: {txn.payment_method}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600 text-lg">
                                ${txn.amount?.toFixed(2)}
                              </div>
                              {txn.note && (
                                <div className="text-xs text-gray-500 mt-1">{txn.note}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                          <DollarSign size={48} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500">No payments recorded yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeViewTab === "shipments" && (
                  <div className="space-y-4">
                    {shipments.length > 0 ? (
                      shipments.map((shipment) => (
                        <div key={shipment.id} className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Truck size={18} className="text-purple-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">{shipment.reference || `Shipment #${shipment.id}`}</div>
                                <div className="text-sm text-gray-600">{new Date(shipment.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {shipment.status || "pending"}
                            </span>
                          </div>
                          <div className="overflow-x-auto mt-3">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/50">
                                <tr>
                                  <th className="p-2 text-left">Item</th>
                                  <th className="p-2 text-left">Received Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shipment.items?.map((si) => (
                                  <tr key={si.id} className="border-t border-white/30">
                                    <td className="p-2">
                                      {si.itemType === 'material' ? si.material?.name : si.product?.name}
                                    </td>
                                    <td className="p-2 font-medium">{si.received_quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-white/50 rounded-full inline-block mb-4">
                          <Truck size={48} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500">No shipments recorded yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}

      

      {/* Add Payment Modal */}
      {addPaymentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CreditCard size={24} />
                  Add Payment
                </h3>
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={paymentLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Reference:</span>
                  <span className="font-bold text-blue-600">{selectedPurchase.reference}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Total:</span>
                  <span className="font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Due Amount:</span>
                  <span className="font-bold text-amber-600">
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-10 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter payment amount"
                      max={calculateDueAmount(selectedPurchase)}
                      min="0.01"
                      step="0.01"
                      disabled={paymentLoading}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account *
                  </label>
                  <select 
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={paymentLoading}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_number}) - ${account.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={paymentLoading}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Add payment notes..."
                    disabled={paymentLoading}
                  ></textarea>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={paymentLoading || !paymentAmount || !selectedAccount}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Shipment Modal */}
      {addShipmentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Truck size={24} />
                  Add Shipment
                </h3>
                <button
                  onClick={() => setAddShipmentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={shipmentLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {shipmentItems.length === 0 ? (
                <div className="text-center text-gray-600">
                  No remaining quantities to receive.
                </div>
              ) : (
                <div className="space-y-4">
                  {shipmentItems.map((item) => (
                    <div key={item.purchaseItemId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <span className="text-xs text-gray-600">{item.itemType}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500">Ordered</div>
                          <div className="font-semibold">{item.orderedQuantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Received</div>
                          <div className="font-semibold">{item.receivedSoFar}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Remaining</div>
                          <div className="font-semibold">{item.remaining}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Receive Now</div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={item.remaining}
                            value={item.receivedQuantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShipmentItems(prev => prev.map(si => (
                                si.purchaseItemId === item.purchaseItemId
                                  ? { ...si, receivedQuantity: val }
                                  : si
                              )));
                            }}
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Note</label>
                    <textarea
                      value={shipmentNote}
                      onChange={(e) => setShipmentNote(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      rows="3"
                      placeholder="Optional note..."
                    ></textarea>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAddShipmentModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={shipmentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleShipmentSubmit}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={shipmentLoading || shipmentItems.length === 0}
                >
                  {shipmentLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Shipment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {viewPaymentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign size={24} />
                  Payment History - {selectedPurchase.reference}
                </h3>
                <button
                  onClick={() => setViewPaymentModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Purchase Reference:</span>
                  <span className="font-bold text-blue-600">{selectedPurchase.reference}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Remaining Due:</span>
                  <span className={`font-bold ${calculateDueAmount(selectedPurchase) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Payment History List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800 mb-4">Payment History</h4>
                
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((txn, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-800">
                          Payment #{index + 1}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(txn.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Method: {txn.payment_method}
                        </div>
                        {txn.account && (
                          <div className="text-sm text-gray-600">
                            Account: {txn.account.name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ${txn.amount?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {txn.note || 'No notes'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Trash2 size={24} className="text-red-600" />
                  Delete Purchase
                </h3>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={deleteLoading}
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  Are you sure?
                </h4>
                <p className="text-gray-600">
                  You are about to delete purchase <span className="font-bold">{selectedPurchase.reference}</span>. 
                  This action cannot be undone.
                </p>
                
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <p className="text-red-700 text-sm">
                    ⚠️ This will delete all purchase items and payment records associated with this purchase.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteSubmit}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={deleteLoading || selectedPurchase.paidAmount > 0}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Purchase'
                  )}
                </button>
              </div>
              
              {selectedPurchase.paidAmount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-700 text-sm text-center">
                    ⚠️ Cannot delete purchase with existing payments (${selectedPurchase.paidAmount}). 
                    Refund payments first.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}