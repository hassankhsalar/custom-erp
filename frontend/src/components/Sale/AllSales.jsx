import { ArrowUpDown, ClipboardList, TrendingUp, DollarSign, Calendar, Store, User, Tag, CreditCard, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Eye, Edit, Trash2, XCircle, Loader2 } from "lucide-react";
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
      
      // Handle both array and paginated response formats
      if (Array.isArray(data)) {
        // Old format (backward compatibility)
        setSales(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
        setTotalCount(data.length);
      } else {
        // New paginated format
        setSales(data.sales || []);
        setTotalPages(data.pagination?.totalPages || 0);
        setTotalCount(data.pagination?.totalCount || 0);
      }
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
    // Since sorting is handled on backend, we need to fetch with sort params
    // For now, we'll just update the sort config and the table will re-render with sorted data
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

  // Use sortedData for display (this is the current page's data already from backend)
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
    Object.keys(formatSalesData(sales)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['reference', 'shop', 'customer', 'total', 'discount', 'grand total', 'paid', 'date', 'actions'];

  // Calculate summary statistics from all sales (using totalCount for display, but we don't have all sales data)
  // For accurate stats, we'd need a separate API endpoint
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
                      ) : key === 'customer' && typeof item.customer === 'object' ? (
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
    </div>
  );
}