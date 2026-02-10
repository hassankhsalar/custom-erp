import { useEffect, useState, useRef, useCallback } from "react";
import { API_ROUTES } from "../../config";
import {
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
  const [form, setForm] = useState({ 
    categoryId: "", 
    amount: "", 
    date: new Date().toISOString().split('T')[0], 
    description: "" 
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [searchingCategories, setSearchingCategories] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const categoryRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [salaries, setSalaries] = useState([]);
  // const [form, setForm] = useState({ categoryId: "", accountId: "", amount: "", date: "", description: "", salaryId: "" });
  const token = localStorage.getItem("token");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.EXPENSES}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
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
    fetchExpenses();
    fetchCategories();
    fetchAccounts();
    fetchSalaries();
  }, []);

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
        amount: "", 
        date: new Date().toISOString().split('T')[0], 
        description: "" 
      });
      setCategorySearchQuery("");
      setFormErrors({});
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

  // Filter and sort expenses
  const filteredExpenses = expenses.filter(expense => {
    // Search filter
    const matchesSearch = 
      searchQuery === "" ||
      expense.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.amount?.toString().includes(searchQuery) ||
      new Date(expense.date).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase());

    // Date filter
    const expenseDate = new Date(expense.date);
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const matchesDate = 
      dateFilter === "all" ||
      (dateFilter === "today" && expenseDate.toDateString() === new Date().toDateString()) ||
      (dateFilter === "week" && expenseDate >= startOfWeek) ||
      (dateFilter === "month" && expenseDate >= startOfMonth);

    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    // Sort logic
    switch(sortBy) {
      case "newest":
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
      case "oldest":
        return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
      case "amount_high":
        return parseFloat(b.amount) - parseFloat(a.amount);
      case "amount_low":
        return parseFloat(a.amount) - parseFloat(b.amount);
      default:
        return 0;
    }
  });

  const toggleExpenseDetails = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
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
      amount: "", 
      date: new Date().toISOString().split('T')[0], 
      description: "" 
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
                <p className="text-2xl font-bold text-purple-600">{expenses.length}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* New Expense Form */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Add New Expense</h2>
                <p className="text-sm text-gray-600">Record a new business expense</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Category Search */}
              <div className="relative" ref={categoryRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expense Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for expense category..."
                    value={categorySearchQuery}
                    onChange={(e) => handleCategorySearch(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className={`w-full px-4 py-2.5 border ${
                      formErrors.categoryId ? 'border-red-300' : form.categoryId ? 'border-emerald-300' : 'border-white/40'
                    } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10`}
                  />
                  {(categorySearchQuery || form.categoryId) && (
                    <button
                      type="button"
                      onClick={clearCategorySelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {/* Error message */}
                {formErrors.categoryId && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.categoryId}</p>
                )}
                
                {/* Selected category confirmation */}
                {form.categoryId && !formErrors.categoryId && (
                  <div className="mt-2 px-3 py-2 bg-gradient-to-r from-emerald-50/50 to-green-50/50 rounded-lg border border-emerald-200/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        Selected: {categories.find(c => c.id === form.categoryId)?.name || 'Unknown Category'}
                      </span>
                    </div>
                  </div>
                )}
                
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white/95 backdrop-blur-lg border border-white/60 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {searchingCategories ? (
                      <div className="p-4 text-center">
                        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Searching categories...</p>
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {categorySearchQuery ? 
                          `No categories found for "${categorySearchQuery}"` : 
                          "No expense categories available"}
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer border-b border-white/30 last:border-b-0"
                          onClick={() => selectCategory(category)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getCategoryColor(category.name)}`}>
                              <Tag size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {category.name}
                              </div>
                              {category.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {category.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {/* Category Suggestions */}
                {!showCategoryDropdown && categories.length > 0 && !form.categoryId && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Common categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 4).map((category) => (
                        <button
                          type="button"
                          key={category.id}
                          onClick={() => selectCategory(category)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Tag size={12} />
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
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

              <div className="flex gap-3">
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

          {/* Expenses Table */}
          <div className="lg:col-span-2 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Expense History</h2>
                  <p className="text-sm text-gray-600">All recorded expenses</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
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
                <div className="flex gap-2">
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
                </div>
              </div>
            </div>

            {loading ? (
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
                    "Add your first expense using the form on the left."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-white/60">
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
                </div>
                
                {/* Summary */}
                {filteredExpenses.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{filteredExpenses.length}</span> of <span className="font-semibold">{expenses.length}</span> expense{expenses.length !== 1 ? 's' : ''}
                        {searchQuery && ` matching "${searchQuery}"`}
                        {dateFilter !== "all" && ` from ${dateFilter}`}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

// Add Fragment component
const Fragment = ({ children }) => <>{children}</>;