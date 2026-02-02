import { useEffect, useState } from "react";
import { 
  ArrowUpDown, Package, Truck, Building2, Calendar, FileText, 
  Store, ShoppingBag, Factory, Layers, Tag, MoreVertical, 
  Eye, Edit, CreditCard, DollarSign, Trash2, CheckCircle, XCircle,
  ExternalLink, User, Check, AlertCircle, Loader2
} from "lucide-react";

export default function AllPurchase() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [activeView, setActiveView] = useState("detailed");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [viewPaymentModalOpen, setViewPaymentModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchPurchases();
    fetchAccounts();
  }, []);

  const fetchPurchases = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/purchases");
      if (!res.ok) throw new Error("Failed to fetch purchases");
      const data = await res.json();
      setPurchases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const fetchPaymentHistory = async (purchaseId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/purchases/${purchaseId}/payments`);
      if (!res.ok) throw new Error("Failed to fetch payment history");
      const data = await res.json();
      setPaymentHistory(data.payments || []);
    } catch (err) {
      console.error("Error fetching payment history:", err);
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
    setViewModalOpen(true);
    setActiveDropdown(null);
  };

  // const handleEdit = (purchase) => {
  //   setSelectedPurchase(purchase);
  //   setEditModalOpen(true);
  //   setActiveDropdown(null);
  // };

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

  // Format purchase items data for table display
  const formatPurchaseItemsData = (purchases) => {
    return purchases.flatMap((purchase, purchaseIndex) =>
      purchase.purchaseItems?.map((item, itemIndex) => {
        const itemInfo = getItemTypeAndName(item);
        const dueAmount = calculateDueAmount(purchase);
        
        return {
          id: `${purchase.id}-${item.id}`,
          "#": purchaseIndex * 10 + itemIndex + 1,
          "purchase ref": purchase.reference,
          "item type": itemInfo.type,
          material: itemInfo.type === 'Material' ? itemInfo.name : '-',
          product: itemInfo.type === 'Product' ? itemInfo.name : '-',
          supplier: purchase.supplier?.name || "-",
          quantity: `${item.quantity} ${itemInfo.unit}`,
          "unit price": `$${item.unitPrice?.toFixed(2) || "0.00"}`,
          "total price": `$${item.totalPrice?.toFixed(2) || "0.00"}`,
          "purchase total": `$${purchase.grandTotal?.toFixed(2) || "0.00"}`,
          due: dueAmount > 0 ? `$${dueAmount.toFixed(2)}` : "Paid",
          status: dueAmount > 0 ? "pending" : "paid",
          date: new Date(purchase.createdAt).toLocaleDateString(),
          destination: getDestinationForTable(purchase),
          rawDate: purchase.createdAt,
          rawUnitPrice: item.unitPrice,
          rawTotalPrice: item.totalPrice,
          rawItemType: item.itemType,
          icon: itemInfo.icon,
          purchaseId: purchase.id,
          actions: ""
        };
      }) || []
    );
  };

  // Get destination for the detailed table
  const getDestinationForTable = (purchase) => {
    if (purchase.destination) {
      const dest = purchase.destination;
      return `${dest.type}: ${dest.name}`;
    }
    
    return "-";
  };

  // Get item type and name
  const getItemTypeAndName = (item) => {
    if (item.itemType === 'material' && item.material) {
      return {
        type: 'Material',
        name: item.material.name,
        icon: <Package size={14} className="text-blue-500" />,
        unit: item.material.unit || ""
      };
    } else if (item.itemType === 'product' && item.product) {
      return {
        type: 'Product',
        name: item.product.name,
        icon: <Tag size={14} className="text-green-500" />,
        unit: "unit"
      };
    }
    return {
      type: 'Unknown',
      name: '-',
      icon: null,
      unit: ""
    };
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
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
      const response = await fetch(`http://localhost:3001/api/purchases/${selectedPurchase.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          payment_method: paymentMethod,
          accountId: selectedAccount,
          createdById: 1, // Replace with actual user ID from auth context
          note: paymentNote,
          purpose: 'Purchase Payment'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      const result = await response.json();
      
      // Refresh purchases list
      await fetchPurchases();
      
      // Close modal and reset form
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

  // Handle purchase deletion
  const handleDeleteSubmit = async () => {
    if (!selectedPurchase) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/purchases/${selectedPurchase.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete purchase');
      }

      const result = await response.json();
      
      // Refresh purchases list
      await fetchPurchases();
      
      // Close modal
      setDeleteModalOpen(false);
      
      alert(result.message || "Purchase deleted successfully!");
      
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert(error.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
            <Package className="text-white" size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Purchase Orders
          </h1>
        </div>
      </div>
      <div className="text-center py-12 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading purchases...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
            <Package className="text-white" size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Purchase Orders
          </h1>
        </div>
      </div>
      <div className="backdrop-blur-lg bg-red-50/50 border border-red-200/50 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">!</span>
        </div>
        <p className="text-red-700 font-medium text-lg">❌ {error}</p>
        <button 
          onClick={fetchPurchases}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl xl:max-w-full p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Package className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Purchase Orders
                </h1>
                <p className="text-gray-600 mt-1">Manage all purchase orders and payments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Purchases</p>
                <p className="text-xl font-bold text-blue-600">{purchases.length}</p>
              </div>
              
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Due</p>
                <p className="text-xl font-bold text-amber-600">
                  ${purchases.reduce((sum, p) => sum + calculateDueAmount(p), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Layers size={24} />
              Purchase Data View
            </h2>
            <div className="flex bg-white/60 rounded-lg p-1">
              <button
                onClick={() => setActiveView("summary")}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${activeView === "summary" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md" : "text-gray-600 hover:bg-white/80"}`}
              >
                Summary View
              </button>
              <button
                onClick={() => setActiveView("detailed")}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${activeView === "detailed" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md" : "text-gray-600 hover:bg-white/80"}`}
              >
                Detailed Items
              </button>
            </div>
          </div>
        </div>

        {/* Purchase Table (Detailed View) */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Package size={24} />
                  Purchase Orders
                </h2>
                <p className="text-gray-600 mt-1">Click on actions for more options</p>
              </div>
              <div className="text-sm text-gray-500">
                Showing {purchases.length} purchases
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  {['reference', 'supplier', 'grand total', 'due amount', 'date', 'destination', 'status', 'actions'].map((key) => (
                    <th
                      key={key}
                      className="p-3 text-left font-medium text-gray-700 cursor-pointer"
                    >
                      <div className="flex items-center gap-[5px] capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                        {key !== 'actions' && (
                          <ArrowUpDown
                            onClick={() => handleSort(key)}
                            className="hover:bg-gray-200 p-[5px] rounded-md text-[1.6rem] cursor-pointer"
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const dueAmount = calculateDueAmount(purchase);
                  const isPaid = dueAmount <= 0;
                  
                  return (
                    <tr
                      key={purchase.id}
                      className="border-t border-white/50 hover:bg-white/30"
                    >
                      <td className="p-3">
                        <div className="font-medium text-blue-600">{purchase.reference}</div>
                        <div className="text-xs text-gray-500">ID: {purchase.id}</div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-gray-500" />
                          <span className="font-medium">{purchase.supplier?.name || "-"}</span>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="font-bold text-green-600">
                          ${purchase.grandTotal?.toFixed(2) || "0.00"}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className={`font-bold ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                          {isPaid ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle size={14} />
                              Paid
                            </span>
                          ) : (
                            `$${dueAmount.toFixed(2)}`
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-500" />
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {purchase.destination?.type === 'store' ? (
                            <Store size={14} className="text-blue-500" />
                          ) : purchase.destination?.type === 'shop' ? (
                            <ShoppingBag size={14} className="text-purple-500" />
                          ) : purchase.destination?.type === 'factory' ? (
                            <Factory size={14} className="text-amber-500" />
                          ) : null}
                          <span>
                            {purchase.destination ? 
                              `${purchase.destination.type}: ${purchase.destination.name}` : 
                              "-"
                            }
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isPaid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      
                      <td className="p-3">
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => handleDropdownToggle(purchase.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                          >
                            <MoreVertical size={18} className="text-gray-600" />
                          </button>
                          
                          {activeDropdown === purchase.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
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
                                
                                <button
                                  onClick={() => handleViewPayment(purchase)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                                >
                                  <DollarSign size={16} />
                                  View Payments
                                </button>
                                
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

          {purchases.length === 0 && (
            <div className="p-12 text-center">
              <div className="p-6 bg-white/50 rounded-full inline-block mb-6">
                <Package size={48} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchases Found</h3>
              <p className="text-gray-600">There are no purchase orders in the system yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      
      {/* View Modal */}
      {viewModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Eye size={24} />
                  Purchase Details - {selectedPurchase.reference}
                </h3>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Supplier</h4>
                  <p className="text-lg font-semibold">{selectedPurchase.supplier?.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Destination</h4>
                  <p className="text-lg font-semibold">
                    {selectedPurchase.destination ? 
                      `${selectedPurchase.destination.type}: ${selectedPurchase.destination.name}` : 
                      "-"
                    }
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Total Amount</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedPurchase.grandTotal?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Amount</h4>
                  <p className={`text-2xl font-bold ${calculateDueAmount(selectedPurchase) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedPurchase).toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Date</h4>
                  <p className="text-lg">
                    {new Date(selectedPurchase.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    calculateDueAmount(selectedPurchase) <= 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {calculateDueAmount(selectedPurchase) <= 0 ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold mb-4">Items Purchased</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
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
                        <tr key={index} className="border-t">
                          <td className="p-3">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {item.itemType}
                            </span>
                          </td>
                          <td className="p-3">
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {/* {editModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Edit size={24} />
                  Edit Purchase
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <AlertCircle size={48} className="mx-auto mb-4 text-amber-500" />
                <p className="text-lg font-medium mb-2">Edit Feature Coming Soon</p>
                <p>Purchase editing functionality is under development.</p>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Add Payment Modal */}
      {addPaymentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
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