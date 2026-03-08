import { ArrowUpDown, ClipboardList, TrendingUp, DollarSign, Calendar, Store, User, Tag, CreditCard, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Eye, Edit, Trash2, XCircle, Loader2, Search, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ROUTES } from '../../config';
import { Link, useNavigate } from "react-router-dom";
import { usePermission } from "../../hooks/usePermission";
import { useAuth } from "../../context/AuthContext";
import SearchableSelect from "../common/SearchableSelect";
import { printSaleInvoiceById, printSaleChallanById } from "./saleInvoicePrint";

export default function AllSales() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { currentUser } = useAuth();
  const canViewEditRequests = hasPermission("sales_open_close");
  const canManageTransaction = hasPermission("sales_open_close");
  const canEditSales = hasPermission(["sales_edit"]);
  const canDeleteSales = hasPermission(["sales_delete", "sales_open_close"]);
  const canGrantEditAccess = hasPermission("sales_open_close");
  const [sales, setSales] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "descending" });
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lockActionLoading, setLockActionLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [printingSaleId, setPrintingSaleId] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState("items");
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [selectedSaleForEditAccess, setSelectedSaleForEditAccess] = useState(null);
  const [editGrantMaxCount, setEditGrantMaxCount] = useState("");
  const [editGrantDurationMinutes, setEditGrantDurationMinutes] = useState("");
  const [customers, setCustomers] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [shops, setShops] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    customer: "",
    customerId: "",
    shopId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    customer: "",
    customerId: "",
    shopId: "",
  });
  const [overview, setOverview] = useState({
    totalRevenue: 0,
    totalDiscount: 0,
    averageSale: 0,
    saleCount: 0,
  });

  useEffect(() => {
    fetchBankAccounts();
    fetchUsers();
    fetchShops();
    fetchCustomer();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [currentPage, itemsPerPage, sortConfig, appliedFilters]);

  useEffect(() => {
    fetchOverview();
  }, [appliedFilters]);

  const getQueryParams = () => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(itemsPerPage));
    params.set("sortBy", mapSortKeyToServer(sortConfig.key));
    params.set("sortDir", sortConfig.direction === "ascending" ? "asc" : "desc");
    if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
    if (appliedFilters.customerId) params.set("customerId", appliedFilters.customerId);
    else if (appliedFilters.customer.trim()) params.set("customer", appliedFilters.customer.trim());
    if (appliedFilters.shopId) params.set("shopId", appliedFilters.shopId);
    return params.toString();
  };

  const getOverviewQueryParams = () => {
    const params = new URLSearchParams();
    if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
    if (appliedFilters.customerId) params.set("customerId", appliedFilters.customerId);
    else if (appliedFilters.customer.trim()) params.set("customer", appliedFilters.customer.trim());
    if (appliedFilters.shopId) params.set("shopId", appliedFilters.shopId);
    return params.toString();
  };

  const fetchCustomer = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(API_ROUTES.CUSTOMERS_ALL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch customers");
      const data = await response.json();
      setCustomers(Array.isArray(data?.customers) ? data.customers : Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    }
  }

  const fetchOverview = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setOverviewLoading(true);
    try {
      const query = getOverviewQueryParams();
      const url = query
        ? `${API_ROUTES.SHOP_SALES_OVERVIEW}?${query}`
        : API_ROUTES.SHOP_SALES_OVERVIEW;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch overview");
      const data = await response.json();
      setOverview({
        totalRevenue: Number(data.totalRevenue || 0),
        totalDiscount: Number(data.totalDiscount || 0),
        averageSale: Number(data.averageSale || 0),
        saleCount: Number(data.saleCount || 0),
      });
    } catch (error) {
      console.error("Error fetching sales overview:", error);
      setOverview({
        totalRevenue: 0,
        totalDiscount: 0,
        averageSale: 0,
        saleCount: 0,
      });
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchSales = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_ROUTES.SHOP_SALES}?${getQueryParams()}`, {
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

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.SHOP_SALES_SHOPS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch shops");
      const data = await res.json();
      setShops(Array.isArray(data) ? data : []);
    } catch (_) {
      setShops([]);
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
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const mapSortKeyToServer = (key) => {
    switch (key) {
      case "reference":
        return "reference";
      case "total":
        return "totalAmount";
      case "discount":
        return "discount";
      case "grand total":
        return "grandTotal";
      case "paid":
        return "paidAmount";
      case "date":
      default:
        return "createdAt";
    }
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

  const currentItems = formatSalesData(sales);

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

  const totalRevenue = overview.totalRevenue;
  const totalDiscount = overview.totalDiscount;
  const averageSale = overview.averageSale;

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
  const handlePrintInvoice = async (sale) => {
    const token = localStorage.getItem("token");
    if (!token || !sale?.id) return;
    setPrintingSaleId(sale.id);
    try {
      await printSaleInvoiceById(sale.id, token);
    } catch (err) {
      alert(err.message || "Failed to print invoice");
    } finally {
      setPrintingSaleId(null);
    }
  };

  const handlePrintChallan = async (sale) => {
    const token = localStorage.getItem("token");
    if (!token || !sale?.id) return;
    setPrintingSaleId(sale.id);
    try {
      await printSaleChallanById(sale.id, token);
    } catch (err) {
      alert(err.message || "Failed to print challan");
    } finally {
      setPrintingSaleId(null);
    }
  };

  const handleView = async (sale) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setViewLoading(true);
    setActiveViewTab("items");
    try {
      const [detailsRes] = await Promise.all([
        fetch(API_ROUTES.SHOP_SALES_DETAILS_BY_ID(sale.id), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchPaymentHistory(sale.id),
      ]);
      if (!detailsRes.ok) throw new Error("Failed to load sale details");
      const detailData = await detailsRes.json();
      setSelectedSale(detailData);
      setViewModalOpen(true);
    } catch (err) {
      alert(err.message || "Failed to load sale details");
    } finally {
      setViewLoading(false);
      setActiveDropdown(null);
    }
  };

  const sortableKeys = new Set(["reference", "total", "discount", "grand total", "paid", "date"]);

  const handleEdit = (sale) => {
    navigate(`/sale/edit/${sale.id}`);
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.USERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (_) {
      setAllUsers([]);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const empty = { dateFrom: "", dateTo: "", customer: "", customerId: "", shopId: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setCurrentPage(1);
  };

  const handleOpenEditAccess = async (sale, userId) => {
    if (!canGrantEditAccess || !userId) return;
    setGrantLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { userId };
      if (String(editGrantMaxCount).trim() !== "") {
        payload.maxEditCount = Number(editGrantMaxCount);
      }
      if (String(editGrantDurationMinutes).trim() !== "") {
        payload.accessDurationMinutes = Number(editGrantDurationMinutes);
      }
      const res = await fetch(API_ROUTES.SHOP_SALES_EDIT_ACCESS_OPEN(sale.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open sale edit access");
      await fetchSales();
      setEditAccessModalOpen(false);
      setSelectedSaleForEditAccess(null);
      setUserSearchTerm("");
      setEditGrantMaxCount("");
      setEditGrantDurationMinutes("");
    } catch (err) {
      alert(err.message);
    } finally {
      setGrantLoading(false);
      setActiveDropdown(null);
    }
  };

  const openEditAccessModal = (sale) => {
    setSelectedSaleForEditAccess(sale);
    setUserSearchTerm("");
    setEditGrantMaxCount("");
    setEditGrantDurationMinutes("");
    setEditAccessModalOpen(true);
    setActiveDropdown(null);
  };

  const handleCloseEditAccess = async (sale) => {
    setLockActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.SHOP_SALES_EDIT_ACCESS_CLOSE(sale.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close sale edit access");
      await fetchSales();
    } catch (err) {
      alert(err.message);
    } finally {
      setLockActionLoading(false);
      setActiveDropdown(null);
    }
  };

  const handleSetTransactionStatus = async (sale, status) => {
    setLockActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.SHOP_SALES_TRANSACTION_STATUS(sale.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update transaction status");
      await fetchSales();
    } catch (err) {
      alert(err.message);
    } finally {
      setLockActionLoading(false);
      setActiveDropdown(null);
    }
  };

  const handleRequestEditAccess = async (sale) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_ROUTES.SHOP_SALES_EDIT_ACCESS_REQUEST(sale.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request edit access");
      alert(data.message || "Edit access request sent.");
      setActiveDropdown(null);
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
    if (!amount || amount === 0) {
      alert("Payment amount cannot be zero");
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
      await fetchSales();
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

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
            {canViewEditRequests && (
              <Link to="/sale/edit-requests" className="px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-800 text-xs transition-all">
                Edit Requests
              </Link>
            )}
            <Filter size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">
              {totalCount} {totalCount === 1 ? 'Sale' : 'Sales'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="shadow-lg rounded-md p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {overviewLoading ? "..." : `$${totalRevenue.toFixed(2)}`}
              </h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="shadow-lg rounded-md p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Discounts</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {overviewLoading ? "..." : `$${totalDiscount.toFixed(2)}`}
              </h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10">
              <Tag className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="shadow-lg rounded-md p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average Sale</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {overviewLoading ? "..." : `$${averageSale.toFixed(2)}`}
              </h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card relative z-40 p-5 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="datetime-local"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="datetime-local"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Customer</label>
            <SearchableSelect
              name="customerId"
              value={String(filters.customerId || "")}
              onChange={(e) => setFilters((prev) => ({ ...prev, customerId: e.target.value, customer: "" }))}
              options={customers.map((customer) => ({
                value: String(customer.id),
                label: `${customer.name || "Unknown"} (${customer.mobile || "No mobile"})`,
              }))}
              placeholder="Search by name or mobile"
              className="w-full"
              inputClassName="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Shop</label>
            <select
              value={filters.shopId}
              onChange={(e) => setFilters((prev) => ({ ...prev, shopId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sort</label>
            <select
              value={`${sortConfig.key}|${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split("|");
                setSortConfig({ key, direction });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="date|descending">Newest First</option>
              <option value="date|ascending">Oldest First</option>
              <option value="grand total|descending">Grand Total High-Low</option>
              <option value="grand total|ascending">Grand Total Low-High</option>
              <option value="discount|descending">Discount High-Low</option>
              <option value="discount|ascending">Discount Low-High</option>
              <option value="reference|ascending">Reference A-Z</option>
              <option value="reference|descending">Reference Z-A</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            Apply
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="relative z-0 p-4 mt-4 border border-white/20 backdrop-blur-xl">
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
                      className={`h-8 min-w-8 p-2 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
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

      {/* Sales Table */}
      <div className="relative z-0 overflow-hidden border border-white/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                {tableHeaders.map((key) => (
                  <th
                    key={key}
                    className={`p-4 text-left font-medium text-gray-700 border-b border-white/20 ${
                      sortableKeys.has(key) ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getColumnIcon(key)}
                      <span className="font-semibold">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                      {sortableKeys.has(key) && (
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
              {loading ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-8">
                    <div className="glass-card p-8 text-center max-w-md mx-auto">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="mt-4 text-gray-600">Loading sales data...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.map((item, index) => {
                const sale = sales[index];
                const currentUserId = Number(currentUser?.id || currentUser?.userId || 0);
                const isEditGrantedToCurrentUser = Number(sale?.editGrantedToUserId || 0) === currentUserId;
                const openedDate = sale?.editOpenedAt ? Date.parse(sale?.editOpenedAt) : null;
                const availableMinuts = sale?.editAccessDurationMinutes;
                const canEditOnlyToday = hasPermission("sales_edit_today");
                const saleCreationDate = sale?.createdAt ? Date.parse(sale?.createdAt) : null;
                const canEditSalesToday = canEditOnlyToday && saleCreationDate && saleCreationDate > Date.now() - 24 * 60 * 60 * 1000;
                let isTimeValid = openedDate && availableMinuts && Date.now() - openedDate < availableMinuts * 60 * 1000;
                if( !availableMinuts ) isTimeValid = true;
                const canEditThisSale = canEditSales || (isEditGrantedToCurrentUser && isTimeValid) || canEditSalesToday;
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
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                                title="More Actions"
                              >
                                <MoreVertical size={18} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => handlePrintInvoice(sale)}
                                disabled={printingSaleId === sale.id}
                                className="p-2 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                                title="Print Invoice"
                              >
                                {printingSaleId === sale.id ? (
                                  <Loader2 size={18} className="text-emerald-600 animate-spin" />
                                ) : (
                                  <FileText size={18} className="text-emerald-600" />
                                )}
                              </button>
                              <button
                                onClick={() => handlePrintChallan(sale)}
                                disabled={printingSaleId === sale.id}
                                className="p-2 hover:bg-sky-50 rounded-lg transition disabled:opacity-50"
                                title="Print Challan"
                              >
                                {printingSaleId === sale.id ? (
                                  <Loader2 size={18} className="text-sky-600 animate-spin" />
                                ) : (
                                  <ClipboardList size={18} className="text-sky-600" />
                                )}
                              </button>
                            </div>

                            {activeDropdown === item.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleView(sale)}
                                    disabled={viewLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                  >
                                    <Eye size={16} />
                                    {viewLoading ? "Loading..." : "View Details"}
                                  </button>

                                {canEditThisSale && (
                                  <button
                                    onClick={() => handleEdit(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
                                  >
                                    <Edit size={16} />
                                    Edit Sale
                                  </button>
                                )}

                                {calculateDueAmount(sale) > 0 && sale?.transactionStatus !== "closed" && (
                                  <button
                                    onClick={() => handleAddPayment(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
                                  >
                                    <CreditCard size={16} />
                                    Add Payment
                                  </button>
                                )}

                                {canGrantEditAccess && (
                                  <button
                                    onClick={() => openEditAccessModal(sale)}
                                    disabled={lockActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition disabled:opacity-50"
                                  >
                                    <User size={16} />
                                    Open Edit For User
                                  </button>
                                )}

                                {!canEditThisSale && (
                                  <button
                                    onClick={() => handleRequestEditAccess(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition"
                                  >
                                    <Edit size={16} />
                                    Request Edit Access
                                  </button>
                                )}

                                {canGrantEditAccess && sale?.editStatus === "open" && (
                                  <button
                                    onClick={() => handleCloseEditAccess(sale)}
                                    disabled={lockActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-700 transition disabled:opacity-50"
                                  >
                                    <XCircle size={16} />
                                    Close Edit Access
                                  </button>
                                )}

                                {canManageTransaction && sale?.transactionStatus !== "closed" && (
                                  <button
                                    onClick={() => handleSetTransactionStatus(sale, "closed")}
                                    disabled={lockActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50"
                                  >
                                    <XCircle size={16} />
                                    Close Transaction
                                  </button>
                                )}

                                {canManageTransaction && sale?.transactionStatus === "closed" && (
                                  <button
                                    onClick={() => handleSetTransactionStatus(sale, "open")}
                                    disabled={lockActionLoading}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50"
                                  >
                                    <Edit size={16} />
                                    Reopen Transaction
                                  </button>
                                )}

                                  <div className="border-t my-1"></div>

                                {canDeleteSales && (
                                  <button
                                    onClick={() => handleDelete(sale)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                                  >
                                    <Trash2 size={16} />
                                    Delete Sale
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : key === 'customer' ? (
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-800">{sale?.customer?.name || item.customer || "-"}</p>
                            <p className="text-sm text-gray-500">{sale?.customer?.mobile || "-"}</p>
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
                )
              })}
            </tbody>
          </table>

          {!loading && !sales?.length && (
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
        <div className="relative z-0 p-4 mt-4 border border-white/20 backdrop-blur-xl">
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
                      className={`h-8 min-w-8 p-2 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
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
                  <p className="text-lg font-semibold">{selectedSale.customer?.name || "-"}</p>
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
                              <span className="text-sm text-gray-500 block">{item.selectedName}</span>
                              <span className="text-sm text-gray-500 block">{item.product?.barcode || item.material?.barcode}</span>
                            </td>
                            <td className="p-3">
                              {item.quantity} {item.product?.unit || item.material?.unit || "unit"}
                              <span className="text-sm text-gray-500 block">{item.selectedQuantity} {item.selectedUnit} </span>
                            </td>
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

      {/* Open Edit Access Modal */}
      {editAccessModalOpen && selectedSaleForEditAccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User size={22} />
                  Grant Sale Edit Access
                </h3>
                <button
                  onClick={() => {
                    setEditAccessModalOpen(false);
                    setSelectedSaleForEditAccess(null);
                    setUserSearchTerm("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={grantLoading}
                >
                  <XCircle size={22} className="text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Sale: <span className="font-semibold">{selectedSaleForEditAccess.reference}</span>
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max Edit Count (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editGrantMaxCount}
                    onChange={(e) => setEditGrantMaxCount(e.target.value)}
                    placeholder="Example: 2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Access Time in Minutes (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editGrantDurationMinutes}
                    onChange={(e) => setEditGrantDurationMinutes(e.target.value)}
                    placeholder="Example: 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search by name, email, username, or ID"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                {allUsers
                  .filter((u) => {
                    const q = userSearchTerm.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(u.id).includes(q) ||
                      String(u.name || "").toLowerCase().includes(q) ||
                      String(u.username || "").toLowerCase().includes(q) ||
                      String(u.email || "").toLowerCase().includes(q)
                    );
                  })
                  .map((user) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-800">{user.name || user.username || `User ${user.id}`}</p>
                        <p className="text-xs text-gray-500">{user.email} | @{user.username} | ID: {user.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEditAccess(selectedSaleForEditAccess, user.id)}
                        disabled={grantLoading}
                        className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {grantLoading ? "Granting..." : "Grant"}
                      </button>
                    </div>
                  ))}
                {allUsers.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">No users found.</div>
                )}
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

