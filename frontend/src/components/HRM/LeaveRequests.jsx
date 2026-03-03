import { useEffect, useState, useRef, useCallback } from "react";
import { API_ROUTES } from "../../config";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  User,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FileText,
  Send,
  AlertTriangle,
  Award,
  BriefcaseMedical,
  Home,
  Plane,
  School,
  X
} from "lucide-react";

// Debounce function for search
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ 
    categoryId: "", 
    startDate: "", 
    endDate: "", 
    reason: "" 
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [searchingCategories, setSearchingCategories] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const categoryRef = useRef(null);
  const token = localStorage.getItem("token");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.HRM}/leave-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_ROUTES.HRM}/leave-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCategories();
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
      errors.categoryId = "Please select a leave type";
    }
    if (!form.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!form.endDate) {
      errors.endDate = "End date is required";
    }
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      errors.dateRange = "End date cannot be earlier than start date";
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
      await fetch(`${API_ROUTES.HRM}/leave-requests`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(form)
      });
      setForm({ categoryId: "", startDate: "", endDate: "", reason: "" });
      setCategorySearchQuery("");
      setFormErrors({});
      fetchRequests();
    } catch (error) {
      console.error("Error creating leave request:", error);
      alert("Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) {
      return;
    }

    try {
      await fetch(`${API_ROUTES.HRM}/leave-requests/${id}/${action}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ note: "" })
      });
      fetchRequests();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Failed to ${action} request`);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave request?")) {
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.HRM}/leave-requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete leave request");
      fetchRequests();
    } catch (error) {
      alert(error.message || "Failed to delete leave request");
    }
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("sick") || name.includes("medical")) return <BriefcaseMedical size={16} />;
    if (name.includes("vacation") || name.includes("holiday")) return <Plane size={16} />;
    if (name.includes("personal")) return <Home size={16} />;
    if (name.includes("study") || name.includes("training")) return <School size={16} />;
    if (name.includes("maternity") || name.includes("paternity")) return <Award size={16} />;
    return <CalendarDays size={16} />;
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle size={12} />
            Rejected
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertCircle size={12} />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const getDurationDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateStatistics = () => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status?.toLowerCase() === "pending").length;
    const approvedRequests = requests.filter(r => r.status?.toLowerCase() === "approved").length;
    const rejectedRequests = requests.filter(r => r.status?.toLowerCase() === "rejected").length;
    
    return { totalRequests, pendingRequests, approvedRequests, rejectedRequests };
  };

  const { totalRequests, pendingRequests, approvedRequests, rejectedRequests } = calculateStatistics();

  // Filter and sort requests
  const filteredRequests = requests.filter(request => {
    // Search filter
    const matchesSearch = 
      searchQuery === "" ||
      request.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.status?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = 
      statusFilter === "all" || 
      request.status?.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort logic
    switch(sortBy) {
      case "newest":
        return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
      case "oldest":
        return new Date(a.createdAt || a.startDate) - new Date(b.createdAt || b.startDate);
      case "duration_high":
        return getDurationDays(b.startDate, b.endDate) - getDurationDays(a.startDate, a.endDate);
      case "duration_low":
        return getDurationDays(a.startDate, a.endDate) - getDurationDays(b.startDate, b.endDate);
      default:
        return 0;
    }
  });

  const toggleRequestDetails = (id) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
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
    setForm({ categoryId: "", startDate: "", endDate: "", reason: "" });
    setCategorySearchQuery("");
    setFormErrors({});
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
                <Calendar className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Leave Requests
                </h1>
                <p className="text-gray-600 mt-2">Manage and track employee leave requests</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchRequests}
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
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">{totalRequests}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pendingRequests}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{approvedRequests}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedRequests}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6 mb-6">
          {/* New Request Form */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">New Leave Request</h2>
                <p className="text-sm text-gray-600">Submit a new leave request</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Category Search */}
              <div className="relative" ref={categoryRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for leave type..."
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
                          "No leave categories available"}
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer border-b border-white/30 last:border-b-0"
                          onClick={() => selectCategory(category)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-blue-600">
                              {getCategoryIcon(category.name)}
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
                    <p className="text-xs text-gray-500 mb-2">Popular leave types:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 4).map((category) => (
                        <button
                          type="button"
                          key={category.id}
                          onClick={() => selectCategory(category)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {getCategoryIcon(category.name)}
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
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => {
                        setForm({ ...form, startDate: e.target.value });
                        setFormErrors(prev => ({ ...prev, startDate: null, dateRange: null }));
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 border ${
                        formErrors.startDate || formErrors.dateRange ? 'border-red-300' : 'border-white/40'
                      } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                    />
                  </div>
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => {
                        setForm({ ...form, endDate: e.target.value });
                        setFormErrors(prev => ({ ...prev, endDate: null, dateRange: null }));
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 border ${
                        formErrors.endDate || formErrors.dateRange ? 'border-red-300' : 'border-white/40'
                      } bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
                    />
                  </div>
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Date range error */}
              {formErrors.dateRange && (
                <div className="px-3 py-2 bg-gradient-to-r from-red-50/50 to-rose-50/50 rounded-lg border border-red-200/50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700">{formErrors.dateRange}</span>
                  </div>
                </div>
              )}

              {form.startDate && form.endDate && !formErrors.dateRange && (
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Duration:</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {getDurationDays(form.startDate, form.endDate)} day{getDurationDays(form.startDate, form.endDate) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason (Optional)
                </label>
                <textarea
                  placeholder="Briefly explain the reason for leave..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
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
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Submit Request
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

          {/* Leave Requests Table */}
          <div className="lg:col-span-2 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <CalendarDays size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">All Leave Requests</h2>
                  <p className="text-sm text-gray-600">Manage and review leave requests</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full sm:w-64"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="duration_high">Longest Duration</option>
                    <option value="duration_low">Shortest Duration</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading leave requests...</p>
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                  <CalendarDays size={48} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Leave Requests Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== "all" ? 
                    "No matching requests found. Try adjusting your filters." : 
                    "Submit your first leave request using the form."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                        <th className="p-4 text-left font-medium text-gray-700">Leave Type</th>
                        <th className="p-4 text-left font-medium text-gray-700">Duration</th>
                        <th className="p-4 text-left font-medium text-gray-700">Status</th>
                        <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request, index) => {
                        const duration = getDurationDays(request.startDate, request.endDate);
                        const isExpanded = expandedRequestId === request.id;
                        
                        return (
                          <Fragment key={request.id}>
                            <tr className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white/10' : ''
                            }`}>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                                    {request.user?.name?.charAt(0).toUpperCase() || request.user?.username?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {request.user?.name || request.user?.username || 'Unknown User'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {request.user?.email || 'No email'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600">
                                    {getCategoryIcon(request.category?.name)}
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {request.category?.name || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-gray-700">
                                      {new Date(request.startDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400" />
                                    <span className="font-bold text-blue-600">
                                      {duration} day{duration !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                {getStatusBadge(request.status)}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleRequestDetails(request.id)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                    title={isExpanded ? "Hide Details" : "View Details"}
                                  >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  
                                  {request.status?.toLowerCase() === "pending" && (
                                    <>
                                      <button
                                        onClick={() => handleApprove(request.id, "approve")}
                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-300"
                                        title="Approve"
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                      
                                      <button
                                        onClick={() => handleApprove(request.id, "reject")}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                        title="Reject"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteRequest(request.id)}
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
                                <td colSpan="5" className="p-4">
                                  <div className="backdrop-blur-sm bg-white/50 rounded-xl p-4 border border-white/40">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Details</h4>
                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-xs text-gray-500">Submitted On</p>
                                            <p className="font-medium">
                                              {request.createdAt ? 
                                                new Date(request.createdAt).toLocaleDateString('en-US', { 
                                                  weekday: 'long', 
                                                  year: 'numeric', 
                                                  month: 'long', 
                                                  day: 'numeric' 
                                                }) : 
                                                'N/A'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">Leave Period</p>
                                            <p className="font-medium">
                                              {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}
                                            </p>
                                          </div>
                                          {request.reason && (
                                            <div>
                                              <p className="text-xs text-gray-500">Reason</p>
                                              <p className="font-medium text-gray-800">{request.reason}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Employee Information</h4>
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <User size={14} className="text-gray-400" />
                                            <span className="font-medium">{request.user?.name || request.user?.username || 'Unknown'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-gray-400" />
                                            <span className="font-medium">{request.user?.employeeProfile?.designation || 'No designation'}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <BriefcaseMedical size={14} className="text-gray-400" />
                                            <span className="font-medium">{request.category?.name || 'No category'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {request.note && (
                                      <div className="mt-4 p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                          <AlertTriangle size={14} className="text-amber-600" />
                                          <span className="text-sm font-semibold text-amber-800">Admin Note</span>
                                        </div>
                                        <p className="text-sm text-amber-700">{request.note}</p>
                                      </div>
                                    )}
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
                {filteredRequests.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredRequests.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                    {statusFilter !== "all" && ` with status "${statusFilter}"`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Fragment import at the top and use it
const Fragment = ({ children }) => <>{children}</>;
