import { ArrowUpDown, ClipboardList, TrendingUp, DollarSign, Calendar, Store, User, Tag, CreditCard, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Eye, Edit, Trash2, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ROUTES } from '../../config';

export default function AllSales() {
  const [sales, setSales] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);
    fetch(`${API_ROUTES.SHOP_SALES}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setSales(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    setCurrentPage(1); // Reset to first page when sorting
  };

  const formatSalesData = (sales) => {
    return sales.map(sale => ({
      id: sale.id,
      reference: sale.reference,
      shop: sale.shop?.name || "-",
      customer: sale.customer || "-",
      total: `$${sale.totalAmount?.toFixed(2) || "0.00"}`,
      discount: `$${sale.discount?.toFixed(2) || "0.00"}`,
      "grand total": `$${sale.grandTotal?.toFixed(2) || "0.00"}`,
      paid: `$${sale.paidAmount?.toFixed(2) || "0.00"} (${sale.paymentType || "cash"})`,
      date: new Date(sale.createdAt).toLocaleDateString(),
      rawDate: sale.createdAt,
      actions: ""
    }));
  };

  // Calculate pagination
  const sortedData = sortConfig.key ? 
    [...formatSalesData(sales)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      if (sortConfig.key === 'total' || sortConfig.key === 'discount' || sortConfig.key === 'grand total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', '')) || 0;
        const valueB = parseFloat(b[sortConfig.key].replace('$', '')) || 0;
        if (sortConfig.direction === 'ascending') {
          return valueA - valueB;
        }
        return valueB - valueA;
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

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

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
    Object.keys(formatSalesData(sales)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['reference', 'shop', 'customer', 'total', 'discount', 'grand total', 'paid', 'date', 'actions'];

  // Calculate summary statistics
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
      case 'payment': return <CreditCard size={14} className="mr-2" />;
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
      customer: sale.customer || "",
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
          customer: editForm.customer,
          discount: parseFloat(editForm.discount) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sale");
      setEditModalOpen(false);
      const refreshed = await fetch(API_ROUTES.SHOP_SALES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newSales = await refreshed.json();
      setSales(newSales);
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
      setSales(prev => prev.filter(s => s.id !== selectedSale.id));
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
      setAddPaymentModalOpen(false);
      await fetchPaymentHistory(selectedSale.id);
      const refreshed = await fetch(API_ROUTES.SHOP_SALES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newSales = await refreshed.json();
      setSales(newSales);
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4 md:p-6">
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
              {sales.length} {sales.length === 1 ? 'Sale' : 'Sales'}
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
                    className="p-4 text-left font-medium text-gray-700 cursor-pointer border-b border-white/20"
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
              {currentItems.map((item, index) => (
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
                                  onClick={() => handleView(sales.find(s => s.id === item.id))}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                >
                                  <Eye size={16} />
                                  View Details
                                </button>

                                <button
                                  onClick={() => handleEdit(sales.find(s => s.id === item.id))}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
                                >
                                  <Edit size={16} />
                                  Edit Sale
                                </button>

                                {calculateDueAmount(sales.find(s => s.id === item.id)) > 0 && (
                                  <button
                                    onClick={() => handleAddPayment(sales.find(s => s.id === item.id))}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
                                  >
                                    <CreditCard size={16} />
                                    Add Payment
                                  </button>
                                )}

                                <div className="border-t my-1"></div>

                                <button
                                  onClick={() => handleDelete(sales.find(s => s.id === item.id))}
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
                          <div>
                            <p className="font-medium text-gray-800">{item.customer.name}</p>
                            <p className="text-sm text-gray-500">{item.customer.mobile}</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center ${
                          key === 'total' || key === 'grand total' ? 'font-semibold text-gray-900' :
                          key === 'discount' ? 'text-amber-600' :
                          key === 'payment' ? 'font-medium text-blue-600' :
                          'text-gray-700'
                        }`}>
                          {key === 'payment' && (
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
              ))}
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
      {sales.length > 0 && (
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
                Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-semibold">
                  {Math.min(indexOfLastItem, sortedData.length)}
                </span>{" "}
                of <span className="font-semibold">{sortedData.length}</span> sales
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

      {/* Footer Stats */}
      {sales.length > 0 && (
        <div className="glass-card p-4 mt-4 border border-white/20 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                <span className="text-sm font-medium text-gray-700">
                  Showing <span className="text-emerald-600 font-bold">{currentItems.length}</span> of{" "}
                  <span className="text-emerald-600 font-bold">{sortedData.length}</span> sales
                </span>
              </div>
              <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                <span className="text-sm font-medium text-gray-700">
                  Sorted by: <span className="text-blue-600 font-medium">
                    {sortConfig.key ? sortConfig.key.replace(/([A-Z])/g, ' $1') : 'Date'} 
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Page <span className="font-semibold">{currentPage}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Eye size={24} />
                  Sale Details - {selectedSale.reference}
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
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Shop</h4>
                  <p className="text-lg font-semibold">{selectedSale.shop?.name || "-"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Customer</h4>
                  <p className="text-lg font-semibold">{selectedSale.customer || "-"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Grand Total</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedSale.grandTotal?.toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Amount</h4>
                  <p className={`text-2xl font-bold ${calculateDueAmount(selectedSale) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${calculateDueAmount(selectedSale).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {["items", "payments"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveViewTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeViewTab === tab
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {activeViewTab === "items" && (
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
                        {selectedSale.saleItems?.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {item.productId ? "product" : "material"}
                              </span>
                            </td>
                            <td className="p-3">
                              {item.product?.name || item.material?.name}
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
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <div className="font-medium text-gray-800">Payment #{index + 1}</div>
                            <div className="text-sm text-gray-600">{new Date(txn.createdAt).toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Method: {txn.payment_method}</div>
                            {txn.account && (
                              <div className="text-sm text-gray-600">Account: {txn.account.name}</div>
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {addPaymentModalOpen && selectedSale && (
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
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              {(paymentMethod === "card" || paymentMethod === "bank") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Bank</option>
                    {bankAccounts.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows="2"
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Edit size={24} />
                  Edit Sale
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <input
                  type="text"
                  value={editForm.customer}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                <input
                  type="number"
                  value={editForm.discount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, discount: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Trash2 size={24} className="text-red-600" />
                  Delete Sale
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
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete sale <span className="font-semibold">{selectedSale.reference}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubmit}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
