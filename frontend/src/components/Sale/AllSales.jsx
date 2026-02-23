import { ArrowUpDown, ClipboardList, TrendingUp, DollarSign, Calendar, Store, User, Tag, CreditCard, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Eye, Edit, Trash2, X, Loader2, Package, Phone, Mail, MapPin, FileText, CreditCard as CreditCardIcon, Banknote, Building, AlertCircle, CheckCircle, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ROUTES } from '../../config';

export default function AllSales() {
  const [sales, setSales] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editForm, setEditForm] = useState({ customer: "", discount: "" });
  const [activeViewTab, setActiveViewTab] = useState("items");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchSales();
    fetchBankAccounts();
  }, [currentPage, itemsPerPage]);

  const fetchSales = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_ROUTES.SHOP_SALES}?page=${currentPage}&limit=${itemsPerPage}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      
      // Handle paginated response format
      setSales(data.sales || []);
      setTotalPages(data.pagination?.totalPages || 0);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.BANK_ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch {
      setBankAccounts([]);
    }
  };

  const fetchPaymentHistory = async (saleId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/${saleId}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPaymentHistory(data.payments || []);
    } catch {
      setPaymentHistory([]);
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatSalesData = (sales) => {
    return sales.map(sale => {
      // Format customer display
      let customerDisplay = "-";
      if (sale.customer) {
        if (typeof sale.customer === 'object') {
          customerDisplay = sale.customer.name || sale.customer.mobile || "Customer";
        } else {
          customerDisplay = sale.customer;
        }
      }

      return {
        id: sale.id,
        reference: sale.reference,
        shop: sale.shop?.name || "-",
        customer: customerDisplay,
        customerObject: sale.customer, // Store original customer object for details
        total: `$${sale.totalAmount?.toFixed(2) || "0.00"}`,
        discount: `$${sale.discount?.toFixed(2) || "0.00"}`,
        "grand total": `$${sale.grandTotal?.toFixed(2) || "0.00"}`,
        paid: `$${sale.paidAmount?.toFixed(2) || "0.00"} (${sale.paymentType || "cash"})`,
        date: new Date(sale.createdAt).toLocaleDateString(),
        rawDate: sale.createdAt,
        actions: ""
      };
    });
  };

  // Apply sorting to the current page's data
  const sortedData = sortConfig.key ? 
    [...formatSalesData(sales)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
      }

      if (sortConfig.key === 'total' || sortConfig.key === 'discount' || sortConfig.key === 'grand total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', '')) || 0;
        const valueB = parseFloat(b[sortConfig.key].replace('$', '')) || 0;
        return sortConfig.direction === 'ascending' ? valueA - valueB : valueB - valueA;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    }) : 
    formatSalesData(sales);

  // Use sortedData for display
  const currentItems = sortedData;

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

  const tableHeaders = sales.length > 0 ? 
    Object.keys(formatSalesData(sales)[0]).filter(key => key !== 'id' && key !== 'rawDate' && key !== 'customerObject') : 
    ['reference', 'shop', 'customer', 'total', 'discount', 'grand total', 'paid', 'date', 'actions'];

  // Calculate summary statistics from current page sales
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0;

  const getColumnIcon = (key) => {
    switch(key) {
      case 'reference': return <Tag size={14} className="mr-2" />;
      case 'shop': return <Store size={14} className="mr-2" />;
      case 'customer': return <User size={14} className="mr-2" />;
      case 'total': return <DollarSign size={14} className="mr-2" />;
      case 'discount': return <Tag size={14} className="mr-2" />;
      case 'grand total': return <TrendingUp size={14} className="mr-2" />;
      case 'paid': return <CreditCard size={14} className="mr-2" />;
      case 'date': return <Calendar size={14} className="mr-2" />;
      default: return <Tag size={14} className="mr-2" />;
    }
  };

  const calculateDueAmount = (sale) => {
    const grandTotal = parseFloat(sale.grandTotal) || 0;
    const paidAmount = parseFloat(sale.paidAmount) || 0;
    return Math.max(0, grandTotal - paidAmount);
  };

  const handleView = async (sale) => {
    setSelectedSale(sale);
    setActiveViewTab("items");
    await fetchPaymentHistory(sale.id);
    setViewModalOpen(true);
    setActiveDropdown(null);
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setEditForm({
      customer: sale.customer?.name || sale.customer || "",
      discount: sale.discount || 0
    });
    setEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = (sale) => {
    setSelectedSale(sale);
    setDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleAddPayment = (sale) => {
    setSelectedSale(sale);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setBankAccountId("");
    setPaymentNote("");
    setAddPaymentModalOpen(true);
    setActiveDropdown(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedSale) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/${selectedSale.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerId: selectedSale.customer?.id || null,
          discount: parseFloat(editForm.discount) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sale");
      setEditModalOpen(false);
      fetchSales(); // Refresh the list
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedSale) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/${selectedSale.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete sale");
      setDeleteModalOpen(false);
      fetchSales(); // Refresh the list
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedSale) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert("Payment amount must be greater than 0");
      return;
    }
    if (["bank", "card"].includes(paymentMethod) && !bankAccountId) {
      alert("Please select a bank account for card/bank payments");
      return;
    }
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/${selectedSale.id}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
          note: paymentNote
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add payment");
      alert("Payment done!");
      setAddPaymentModalOpen(false);
      await fetchPaymentHistory(selectedSale.id);
      fetchSales(); // Refresh the list
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
              <ClipboardList className="text-emerald-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                All Sales
              </h1>
              <p className="text-gray-600 mt-1">Overview of all sales transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Filter size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">
              {totalCount} {totalCount === 1 ? 'Sale' : 'Sales'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Discounts</p>
              <h3 className="text-2xl font-bold text-gray-900">${totalDiscount.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10">
              <Tag className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average Sale</p>
              <h3 className="text-2xl font-bold text-gray-900">${averageSale.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-card overflow-hidden border border-white/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                {tableHeaders.map((key) => (
                  <th
                    key={key}
                    className="p-4 text-left font-medium text-gray-700 border-b border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      {getColumnIcon(key)}
                      <span className="font-semibold">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                      {key !== 'actions' && (
                        <ArrowUpDown
                          onClick={() => handleSort(key)}
                          className="glass-icon-button p-1.5 rounded-md hover:bg-gray-200/50 transition-colors cursor-pointer"
                          size={16}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => {
                const sale = sales.find(s => s.id === item.id);
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-white/10 hover:bg-white/10 transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-white/5' : ''
                    }`}
                  >
                    {tableHeaders.map((key) => (
                      <td key={key} className="p-4">
                        {key === 'actions' ? (
                          <div className="relative dropdown-container">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                              <MoreVertical size={18} className="text-gray-600" />
                            </button>

                            {activeDropdown === item.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleView(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                  >
                                    <Eye size={16} />
                                    View Details
                                  </button>

                                  <button
                                    onClick={() => handleEdit(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
                                  >
                                    <Edit size={16} />
                                    Edit Sale
                                  </button>

                                  {calculateDueAmount(sale) > 0 && (
                                    <button
                                      onClick={() => handleAddPayment(sale)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
                                    >
                                      <CreditCard size={16} />
                                      Add Payment
                                    </button>
                                  )}

                                  <div className="border-t my-1"></div>

                                  <button
                                    onClick={() => handleDelete(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                                  >
                                    <Trash2 size={16} />
                                    Delete Sale
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : key === 'customer' ? (
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <div>
                              {sale?.customer ? (
                                typeof sale.customer === 'object' ? (
                                  <div>
                                    <p className="font-medium text-gray-800">{sale.customer.name || 'Customer'}</p>
                                    {sale.customer.mobile && (
                                      <p className="text-xs text-gray-500">{sale.customer.mobile}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-medium text-gray-800">{sale.customer}</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center ${
                            key === 'total' || key === 'grand total' ? 'font-semibold text-gray-900' :
                            key === 'discount' ? 'text-amber-600' :
                            key === 'paid' ? 'font-medium text-blue-600' :
                            'text-gray-700'
                          }`}>
                            {key === 'paid' && (
                              <CreditCard size={12} className="mr-2 text-gray-400" />
                            )}
                            {key === 'date' && (
                              <Calendar size={12} className="mr-2 text-gray-400" />
                            )}
                            {item[key]}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!sales?.length && (
            <div className="text-center py-12">
              <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <ClipboardList className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 text-lg font-medium">No sales data found</p>
              <p className="text-gray-400 text-sm mt-1">Start making sales to see them here</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="glass-card p-4 mt-4 border border-white/20 backdrop-blur-xl">
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
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>{" "}
                of <span className="font-semibold">{totalCount}</span> sales
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
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
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
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
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

      {/* View Details Modal */}
      {viewModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl shadow-lg">
                    <Receipt className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sale Details</h2>
                    <p className="text-gray-600">{selectedSale.reference}</p>
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
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveViewTab("items")}
                  className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                    activeViewTab === "items"
                      ? "text-emerald-600 border-b-2 border-emerald-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sale Items
                </button>
                <button
                  onClick={() => setActiveViewTab("payments")}
                  className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                    activeViewTab === "payments"
                      ? "text-emerald-600 border-b-2 border-emerald-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Payment History
                </button>
              </div>

              {activeViewTab === "items" ? (
                <>
                  {/* Sale Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Sale Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Reference</span>
                          <span className="font-medium text-gray-900">{selectedSale.reference}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Shop</span>
                          <span className="font-medium text-gray-900">{selectedSale.shop?.name || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer</span>
                          <span className="font-medium text-gray-900">
                            {selectedSale.customer?.name || selectedSale.customer || "Walk-in Customer"}
                          </span>
                        </div>
                        {selectedSale.customer?.mobile && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Mobile</span>
                            <span className="font-medium text-gray-900">{selectedSale.customer.mobile}</span>
                          </div>
                        )}
                        {selectedSale.customer?.email && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email</span>
                            <span className="font-medium text-gray-900">{selectedSale.customer.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Date</span>
                          <span className="font-medium text-gray-900">{new Date(selectedSale.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Subtotal</span>
                          <span className="font-medium text-gray-900">${selectedSale.totalAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Discount</span>
                          <span className="font-medium text-amber-600">-${selectedSale.discount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Grand Total</span>
                          <span className="font-bold text-gray-900">${selectedSale.grandTotal?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Paid Amount</span>
                          <span className="font-medium text-green-600">${selectedSale.paidAmount?.toFixed(2)}</span>
                        </div>
                        {calculateDueAmount(selectedSale) > 0 && (
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Due Amount</span>
                            <span className="font-bold text-red-600">${calculateDueAmount(selectedSale).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sale Items Table */}
                  <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Sale Items</h3>
                    <div className="overflow-hidden rounded-lg border border-white/60">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-gray-400 to-gray-700 text-white">
                          <tr>
                            <th className="py-3 px-4 text-left font-medium">Product/Material</th>
                            <th className="py-3 px-4 text-left font-medium">Type</th>
                            <th className="py-3 px-4 text-left font-medium">Quantity</th>
                            <th className="py-3 px-4 text-left font-medium">Price</th>
                            <th className="py-3 px-4 text-left font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                          {selectedSale.saleItems?.map((item, index) => (
                            <tr key={index} className="hover:bg-white/30 transition-colors duration-150">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Package size={14} className="text-purple-500" />
                                  <span className="font-medium text-gray-800">
                                    {item.product?.name || item.material?.name || 'Unknown'}
                                  </span>
                                </div>
                                {(item.product?.barcode || item.material?.barcode) && (
                                  <span className="text-xs text-gray-500 ml-6">
                                    {item.product?.barcode || item.material?.barcode}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  item.productId 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.productId ? 'Product' : 'Material'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                  {item.quantity} {item.material?.unit || ''}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-900">
                                ${item.unitPrice?.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 font-semibold text-gray-900">
                                ${item.totalPrice?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
                  {paymentHistory.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-white/60">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-gray-400 to-gray-700 text-white">
                          <tr>
                            <th className="py-3 px-4 text-left font-medium">Date</th>
                            <th className="py-3 px-4 text-left font-medium">Amount</th>
                            <th className="py-3 px-4 text-left font-medium">Method</th>
                            <th className="py-3 px-4 text-left font-medium">Reference</th>
                            <th className="py-3 px-4 text-left font-medium">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                          {paymentHistory.map((payment, index) => (
                            <tr key={index} className="hover:bg-white/30 transition-colors duration-150">
                              <td className="py-3 px-4 text-gray-700">
                                {new Date(payment.createdAt).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-medium text-green-600">
                                ${payment.amount?.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                                  payment.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {payment.payment_method === 'cash' && <Banknote size={12} />}
                                  {payment.payment_method === 'card' && <CreditCardIcon size={12} />}
                                  {payment.payment_method === 'bank' && <Building size={12} />}
                                  {payment.payment_method}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{payment.reference || '-'}</td>
                              <td className="py-3 px-4 text-gray-600">{payment.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="glass-icon p-3 rounded-full inline-flex mb-3 bg-gray-100/50">
                        <CreditCardIcon className="text-gray-400" size={24} />
                      </div>
                      <p className="text-gray-500">No payment records found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-white/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Edit Sale</h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={editForm.customer}
                  onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Note: This only updates the customer name in this sale record</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editForm.discount}
                    onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter discount amount (not percentage)</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/50 flex justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Update Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-white/50 bg-gradient-to-r from-red-500/10 to-rose-500/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Sale</h2>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete sale <span className="font-semibold">{selectedSale.reference}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                All associated items and payment records will also be permanently removed.
              </p>
              {selectedSale.paidAmount > 0 && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ This sale has payments. Deleting it will also remove payment records.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Sale'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {addPaymentModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAddPaymentModalOpen(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-white/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Add Payment</h2>
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Sale Reference: <span className="font-semibold">{selectedSale.reference}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Due Amount: <span className="font-bold text-red-600">${calculateDueAmount(selectedSale).toFixed(2)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    max={calculateDueAmount(selectedSale)}
                    className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === "cash"
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Banknote size={20} />
                    <span className="text-xs">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === "card"
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCardIcon size={20} />
                    <span className="text-xs">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      paymentMethod === "bank"
                        ? "bg-purple-100 border-purple-500 text-purple-700"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Building size={20} />
                    <span className="text-xs">Bank</span>
                  </button>
                </div>
              </div>

              {["card", "bank"].includes(paymentMethod) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    required
                  >
                    <option value="">Select an account</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number} (${account.balance?.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add a note about this payment"
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-white/50 flex justify-end gap-3">
              <button
                onClick={() => setAddPaymentModalOpen(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={paymentLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={paymentLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}