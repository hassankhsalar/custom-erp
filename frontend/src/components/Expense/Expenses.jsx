import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { API_ROUTES } from "../../config";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  FileText,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  MoreVertical,
  Download,
  BarChart3,
  PieChart,
  Clock,
  Hash
} from "lucide-react";

// Debounce function for search
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  // const [form, setForm] = useState({ 
  //   categoryId: "", 
  //   amount: "", 
  //   date: new Date().toISOString().split('T')[0], 
  //   description: "" 
  // });
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadMode, setLoadMode] = useState("filter");
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [appliedDateFilter, setAppliedDateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedSortBy, setAppliedSortBy] = useState("newest");
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [searchingCategories, setSearchingCategories] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const categoryRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [form, setForm] = useState({ categoryId: "", accountId: "", amount: "", date: "", description: "", salaryId: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const token = localStorage.getItem("token");

  const fetchExpenses = async (page = 1, mode = "table") => {
    setLoading(true);
    setLoadMode(mode);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
      });
      if (appliedSearchQuery.trim()) params.set("search", appliedSearchQuery.trim());
      if (appliedDateFrom) params.set("dateFrom", appliedDateFrom);
      if (appliedDateTo) params.set("dateTo", appliedDateTo);
      if (appliedSortBy === "newest") {
        params.set("sortBy", "date");
        params.set("sortDir", "desc");
      } else if (appliedSortBy === "oldest") {
        params.set("sortBy", "date");
        params.set("sortDir", "asc");
      } else if (appliedSortBy === "amount_high") {
        params.set("sortBy", "amount");
        params.set("sortDir", "desc");
      } else if (appliedSortBy === "amount_low") {
        params.set("sortBy", "amount");
        params.set("sortDir", "asc");
      }
      const res = await fetch(`${API_ROUTES.EXPENSES}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setExpenses(rows);
      setTotalCount(Number(data?.pagination?.totalCount || rows.length || 0));
      setCurrentPage(Number(data?.pagination?.page || page));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_ROUTES.EXPENSES}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAccounts = async () => {
    const res = await fetch(`${API_ROUTES.ACCOUNTS}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  };

  const fetchSalaries = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}/salaries/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSalaries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchSalaries();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchExpenses(1, "filter");
  }, [appliedSearchQuery, appliedDateFilter, appliedDateFrom, appliedDateTo, appliedSortBy, itemsPerPage]);

  useEffect(() => {
    fetchExpenses(currentPage, "table");
  }, [currentPage]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
        setCategorySearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => {
    if (!categorySearchQuery) return true;
    const query = categorySearchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      (category.description && category.description.toLowerCase().includes(query))
    );
  });

  // Debounced search for categories
  const debouncedCategorySearch = useCallback(
    debounce((query) => {
      setSearchingCategories(false);
    }, 300),
    []
  );

  const handleCategorySearch = (query) => {
    setCategorySearchQuery(query);
    setSearchingCategories(true);
    debouncedCategorySearch(query);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.categoryId) {
      errors.categoryId = "Please select an expense category";
    }
    if (!form.accountId) {
      errors.accountId = "Please select an account";
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      errors.amount = "Please enter a valid amount greater than 0";
    }
    if (!form.date) {
      errors.date = "Please select a date";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await fetch(`${API_ROUTES.EXPENSES}`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount)
        })
      });
      setForm({ 
        categoryId: "", 
        accountId: "",
        amount: "", 
        date: new Date().toISOString().split('T')[0], 
        description: "",
        salaryId: ""
      });
      setCategorySearchQuery("");
      setFormErrors({});
      setShowCreateModal(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error creating expense:", error);
      alert("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await fetch(`${API_ROUTES.EXPENSES}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense");
    }
  };

  const getCategoryColor = (categoryName) => {
    const colors = {
      'office': 'bg-gradient-to-r from-blue-500 to-cyan-500',
      'travel': 'bg-gradient-to-r from-emerald-500 to-green-500',
      'food': 'bg-gradient-to-r from-amber-500 to-orange-500',
      'supplies': 'bg-gradient-to-r from-purple-500 to-pink-500',
      'utilities': 'bg-gradient-to-r from-red-500 to-rose-500',
      'maintenance': 'bg-gradient-to-r from-indigo-500 to-violet-500',
      'entertainment': 'bg-gradient-to-r from-yellow-500 to-amber-500',
      'other': 'bg-gradient-to-r from-gray-500 to-slate-500'
    };
    
    const name = categoryName?.toLowerCase() || 'other';
    for (const [key, color] of Object.entries(colors)) {
      if (name.includes(key)) return color;
    }
    return colors.other;
  };

  const calculateStatistics = () => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    
    // Calculate by category
    const categoryTotals = {};
    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Uncategorized';
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + parseFloat(expense.amount || 0);
    });
    
    // Get top categories
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    // This month's expenses
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
    }).reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    
    // Average expense
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    
    return { totalExpenses, topCategories, thisMonthExpenses, averageExpense };
  };

  const { totalExpenses, topCategories, thisMonthExpenses, averageExpense } = calculateStatistics();

  const filteredExpenses = expenses;

  const toggleExpenseDetails = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedDateFilter(dateFilter);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedSortBy(sortBy);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setAppliedSearchQuery("");
    setAppliedDateFilter("all");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setAppliedSortBy("newest");
    setCurrentPage(1);
  };

  const selectCategory = (category) => {
    setForm({ ...form, categoryId: category.id });
    setCategorySearchQuery(category.name);
    setFormErrors(prev => ({ ...prev, categoryId: null }));
    setShowCategoryDropdown(false);
  };

  const clearCategorySelection = () => {
    setForm({ ...form, categoryId: "" });
    setCategorySearchQuery("");
    setFormErrors(prev => ({ ...prev, categoryId: null }));
  };

  const clearForm = () => {
    setForm({ 
      categoryId: "", 
      accountId: "",
      amount: "", 
      date: new Date().toISOString().split('T')[0], 
      description: "",
      salaryId: ""
    });
    setCategorySearchQuery("");
    setFormErrors({});
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationItems = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const renderPagination = () => (
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
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
            <span className="font-semibold">{totalCount}</span> expenses
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronsLeft size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronLeft size={16} className="text-gray-600" /></button>
          <div className="flex items-center gap-1">
            {getPaginationItems().map((item, idx) =>
              item === "..." ? (
                <span key={`ellipsis-${idx}`} className="mx-1 text-gray-400">...</span>
              ) : (
                <button key={item} onClick={() => goToPage(item)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === item ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "hover:bg-white/50 text-gray-700"}`}>{item}</button>
              )
            )}
          </div>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronRight size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"><ChevronsRight size={16} className="text-gray-600" /></button>
        </div>
      </div>
    </div>
  );

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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <DollarSign className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Expense Management
                </h1>
                <p className="text-gray-600 mt-2">Track and manage your business expenses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchExpenses}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-white/40 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
              >
                <Plus size={18} />
                Create Expense
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(thisMonthExpenses)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Calendar size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Expense</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(averageExpense)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <BarChart3 size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-purple-600">{totalCount || expenses.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Hash size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <PieChart size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Top Expense Categories</h2>
                <p className="text-sm text-gray-600">Highest spending categories</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topCategories.map(([categoryName, amount], index) => (
                <div key={categoryName} className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${getCategoryColor(categoryName)} flex items-center justify-center`}>
                        <Tag size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{categoryName}</h3>
                        <p className="text-xs text-gray-500">Category</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(amount)}</div>
                      <div className="text-xs text-gray-500">
                        {((amount / totalExpenses) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getCategoryColor(categoryName).replace('bg-gradient-to-r', 'bg-gradient-to-r').split(' ')[0]}`}
                      style={{ width: `${(amount / totalExpenses) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Expenses Table */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:items-center gap-4 mb-6">
              <div className="flex flex-col sm:flex-row w-full gap-3">
                {/* Search */}
                <div className="relative grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full sm:w-64"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_high">Highest Amount</option>
                    <option value="amount_low">Lowest Amount</option>
                  </select>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  />
                </div>
              </div>
              <div className="w-full flex justify-end">
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium"
                >
                  Apply
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 border border-white/40 bg-white/60 rounded-xl text-sm font-medium text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {loading && loadMode === "filter" ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading expenses...</p>
                </div>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                  <FileText size={48} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Expenses Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || dateFilter !== "all" ? 
                    "No matching expenses found. Try adjusting your filters." : 
                    "Add your first expense using the Create Expense button."}
                </p>
              </div>
            ) : (
              <>
                {filteredExpenses.length > 0 && renderPagination()}
                <div className="overflow-x-auto rounded-xl border border-white/60">
                  {loading && loadMode === "table" ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">Category</th>
                        <th className="p-4 text-left font-medium text-gray-700">Amount</th>
                        <th className="p-4 text-left font-medium text-gray-700">Date</th>
                        <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense, index) => {
                        const isExpanded = expandedExpenseId === expense.id;
                        
                        return (
                          <Fragment key={expense.id}>
                            <tr className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white/10' : ''
                            }`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg ${getCategoryColor(expense.category?.name)} flex items-center justify-center`}>
                                    <Tag size={16} className="text-white" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {expense.category?.name || 'Uncategorized'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID: {expense.id}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col items-start gap-1">
                                  <div className="font-bold text-lg text-gray-900">
                                    {formatCurrency(parseFloat(expense.amount))}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Added on {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'Unknown'}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    {new Date(expense.date).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleExpenseDetails(expense.id)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                    title={isExpanded ? "Hide Details" : "View Details"}
                                  >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDelete(expense.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded Details */}
                            {isExpanded && (
                              <tr className="border-t border-blue-100/50 bg-blue-50/30">
                                <td colSpan="4" className="p-4">
                                  <div className="backdrop-blur-sm bg-white/50 rounded-xl p-4 border border-white/40">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Expense Details</h4>
                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-xs text-gray-500">Category</p>
                                            <p className="font-medium">{expense.category?.name || 'Uncategorized'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">Amount</p>
                                            <p className="font-bold text-lg text-gray-900">
                                              {formatCurrency(parseFloat(expense.amount))}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">Date</p>
                                            <p className="font-medium">
                                              {new Date(expense.date).toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Information</h4>
                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-xs text-gray-500">Description</p>
                                            <p className="font-medium text-gray-800">
                                              {expense.description || 'No description provided'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">Recorded</p>
                                            <p className="font-medium">
                                              {expense.createdAt ? 
                                                new Date(expense.createdAt).toLocaleDateString('en-US', { 
                                                  weekday: 'long', 
                                                  year: 'numeric', 
                                                  month: 'long', 
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }) : 
                                                'Unknown'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  )}
                </div>
                
                {/* Summary */}
                {filteredExpenses.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{filteredExpenses.length}</span> of <span className="font-semibold">{totalCount || expenses.length}</span> expense{(totalCount || expenses.length) !== 1 ? 's' : ''}
                        {appliedSearchQuery && ` matching "${appliedSearchQuery}"`}
                        {appliedDateFilter !== "all" && ` from ${appliedDateFilter}`}
                        {appliedDateFrom && ` from ${appliedDateFrom}`}
                        {appliedDateTo && ` to ${appliedDateTo}`}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Filtered Total:</div>
                        <div className="text-xl font-bold text-blue-600">
                          {formatCurrency(filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {filteredExpenses.length > 0 && renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Plus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Create Expense</h2>
                    <p className="text-gray-600">Record a new business expense</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
  
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Expense Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      setForm({ ...form, categoryId: e.target.value });
                      setFormErrors(prev => ({ ...prev, categoryId: null }));
                    }}
                    className={`w-full px-4 py-2.5 border ${
                      formErrors.categoryId ? 'border-red-300' : 'border-white/40'
                    } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.categoryId}</p>
                  )}
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.accountId}
                    onChange={(e) => {
                      setForm({ ...form, accountId: e.target.value });
                      setFormErrors(prev => ({ ...prev, accountId: null }));
                    }}
                    className={`w-full px-4 py-2.5 border ${
                      formErrors.accountId ? 'border-red-300' : 'border-white/40'
                    } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_number})
                      </option>
                    ))}
                  </select>
                  {formErrors.accountId && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.accountId}</p>
                  )}
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => {
                          setForm({ ...form, amount: e.target.value });
                          setFormErrors(prev => ({ ...prev, amount: null }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 border ${
                          formErrors.amount ? 'border-red-300' : 'border-white/40'
                        } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                      />
                    </div>
                    {formErrors.amount && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.amount}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => {
                          setForm({ ...form, date: e.target.value });
                          setFormErrors(prev => ({ ...prev, date: null }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 border ${
                          formErrors.date ? 'border-red-300' : 'border-white/40'
                        } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                      />
                    </div>
                    {formErrors.date && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.date}</p>
                    )}
                  </div>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Add details about this expense..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
  
                <div className="flex gap-3 mb-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Add Expense
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
