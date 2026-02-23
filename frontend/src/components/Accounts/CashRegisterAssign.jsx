import { useEffect, useState } from "react";
import {
  Building2,
  Store,
  Factory,
  CreditCard,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Search,
  Filter,
  UserCircle,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Users,
  Building,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  X,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Calendar,
  Shield,
  Key,
  ShoppingCart,
  Receipt,
  Calculator,
  Wallet,
  Package,
  Settings,
  Trash2,
  Edit,
  MoreVertical,
  CheckSquare,
  Square,
  Upload,
  Download,
  Printer,
  Eye,
  EyeOff,
  Clock,
  TrendingUp,
  Percent,
  Target,
  Bell,
  AlertTriangle,
  Wrench,
  Power,
  Banknote
} from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { API_ROUTES } from '../../config';

export default function CashRegisterAssign() {

  const {currentUser} = useCurrentUser();

  const [entities, setEntities] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [allCashRegisters, setAllCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityAssignments, setEntityAssignments] = useState([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showMultiAssignForm, setShowMultiAssignForm] = useState(false);
  const [selectedCashRegisters, setSelectedCashRegisters] = useState([]);
  const [notes, setNotes] = useState("");
  const [expandedEntities, setExpandedEntities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, store, shop, factory
  const [showOnlyWithRegisters, setShowOnlyWithRegisters] = useState(false);
  const token = localStorage.getItem('token');
  const [stats, setStats] = useState({
    totalEntities: 0,
    totalCashRegisters: 0,
    assignedCashRegisters: 0,
    unassignedCashRegisters: 0,
    assignmentsByType: {},
    assignmentPercentage: 0
  });
  const [viewMode, setViewMode] = useState("entities"); // "entities" or "registers"
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive, maintenance
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [unassignReason, setUnassignReason] = useState("");

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
  setLoading(true);
  setError("");
  setSuccess("");
  
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      // Optional: Redirect to login
      // window.location.href = '/login';
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const [entitiesRes, cashRegistersRes, statsRes, allCashRegistersRes] = await Promise.all([
      fetch(`${API_ROUTES.CASHREGISTERASSIGN}/entities`, { headers }),
      fetch(`${API_ROUTES.CASHREGISTERASSIGN}/available-cash-registers?status=active`, { headers }),
      fetch(`${API_ROUTES.CASHREGISTERASSIGN}/stats`, { headers }),
      fetch(`${API_ROUTES.CASHREGISTERASSIGN}/all-cash-registers`, { headers })
    ]);

    // Check for authentication errors
    const responses = [entitiesRes, cashRegistersRes, statsRes, allCashRegistersRes];
    for (const res of responses) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        setError("Session expired. Please log in again.");
        // Optional: Redirect to login
        // window.location.href = '/login';
        setLoading(false);
        return;
      }
    }

    // Check for other errors
    if (!entitiesRes.ok || !cashRegistersRes.ok || !statsRes.ok || !allCashRegistersRes.ok) {
      throw new Error("Failed to fetch data");
    }

    const entitiesData = await entitiesRes.json();
    const cashRegistersData = await cashRegistersRes.json();
    const statsData = await statsRes.json();
    const allCashRegistersData = await allCashRegistersRes.json();

    setEntities(entitiesData);
    setCashRegisters(cashRegistersData);
    setAllCashRegisters(allCashRegistersData);
    setStats(statsData);
    
  } catch (err) {
    console.error("Error fetching data:", err);
    setError(err.message || "An error occurred while fetching data");
  } finally {
    setLoading(false);
  }
};

  // Fetch assignments for selected entity
  const fetchEntityAssignments = async (entity) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError("Authentication required. Please log in.");
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const res = await fetch(
      `${API_ROUTES.CASHREGISTERASSIGN}/entity/${entity.type}/${entity.id}`,
      { headers }
    );
    
    // Check for authentication errors
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      setError("Session expired. Please log in again.");
      return;
    }
    
    if (!res.ok) {
      throw new Error(`Failed to fetch assignments: ${res.statusText}`);
    }
    
    const data = await res.json();
    setEntityAssignments(data);
    setSelectedEntity(entity);
    setError(""); // Clear any previous errors on success
  } catch (err) {
    console.error("Error fetching entity assignments:", err);
    setError(err.message || "An error occurred while fetching assignments");
  }
};

  // Handle entity selection
  const handleEntityClick = (entity) => {
    if (selectedEntity?.id === entity.id && selectedEntity?.type === entity.type) {
      // Toggle expansion
      setExpandedEntities(prev => ({
        ...prev,
        [`${entity.type}-${entity.id}`]: !prev[`${entity.type}-${entity.id}`]
      }));
    } else {
      // Fetch assignments for new entity
      fetchEntityAssignments(entity);
      setExpandedEntities(prev => ({
        ...prev,
        [`${entity.type}-${entity.id}`]: true
      }));
    }
  };

  // Toggle cash register selection
  const toggleCashRegisterSelection = (cashRegisterId) => {
    setSelectedCashRegisters(prev => {
      if (prev.includes(cashRegisterId)) {
        return prev.filter(id => id !== cashRegisterId);
      } else {
        return [...prev, cashRegisterId];
      }
    });
  };

  // Select all/none cash registers
  const toggleAllCashRegisters = () => {
    if (selectedCashRegisters.length === filteredCashRegisters.length) {
      setSelectedCashRegisters([]);
    } else {
      setSelectedCashRegisters(filteredCashRegisters.map(cr => cr.id));
    }
  };

  // Handle single cash register assignment
  const handleAssignCashRegister = async (e) => {
    e.preventDefault();
    
    if (!selectedEntity || selectedCashRegisters.length !== 1) {
      setError("Please select an entity and exactly one cash register");
      return;
    }

    try {
      const assignedById = currentUser?.id; // user ID from auth

      const res = await fetch(`${API_ROUTES.CASHREGISTERASSIGN}/assign`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entityType: selectedEntity.type,
          entityId: selectedEntity.id,
          cashRegisterId: selectedCashRegisters[0],
          notes,
          assignedById
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to assign cash register");
      }

      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      // Reset form
      setSelectedCashRegisters([]);
      setNotes("");
      setShowAssignForm(false);
      setError("");
      setSuccess("Cash register assigned successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle multiple cash register assignment
  const handleAssignMultipleCashRegisters = async (e) => {
    e.preventDefault();
    
    if (!selectedEntity || selectedCashRegisters.length === 0) {
      setError("Please select an entity and at least one cash register");
      return;
    }

    try {
      const assignedById = currentUser?.id; //user ID from auth

      const res = await fetch(`${API_ROUTES.CASHREGISTERASSIGN}/assign-multiple`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entityType: selectedEntity.type,
          entityId: selectedEntity.id,
          cashRegisterIds: selectedCashRegisters,
          notes,
          assignedById
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to assign cash registers");
      }

      const result = await res.json();
      
      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      // Reset form
      setSelectedCashRegisters([]);
      setNotes("");
      setShowMultiAssignForm(false);
      setError("");
      
      if (result.success) {
        setSuccess(`Successfully assigned ${result.assigned.length} cash register(s)!`);
        if (result.errors && result.errors.length > 0) {
          setError(`Some errors occurred: ${result.errors.join(", ")}`);
        }
      } else {
        setError(result.message || "Failed to assign cash registers");
      }
      
      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle unassign cash register
  const handleUnassignCashRegister = async (assignmentId, reason = "") => {
    try {
      const res = await fetch(
        `${API_ROUTES.CASHREGISTERASSIGN}/unassign/${assignmentId}`,
        {
          method: "PUT",
          headers: {
          'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ unassignReason: reason })
        }
      );

      if (!res.ok) throw new Error("Failed to unassign cash register");

      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      setShowUnassignModal(false);
      setSelectedAssignment(null);
      setUnassignReason("");
      setSuccess("Cash register unassigned successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle unassign all cash registers from entity
  const handleUnassignAll = async () => {
    if (!selectedEntity || !confirm(`Are you sure you want to unassign ALL cash registers from ${selectedEntity.name}?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_ROUTES.CASHREGISTERASSIGN}/unassign-all/${selectedEntity.type}/${selectedEntity.id}`,
        {
          method: "PUT",
          headers: {
          'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ unassignReason: "Bulk unassignment" })
        }
      );

      if (!res.ok) throw new Error("Failed to unassign cash registers");

      const result = await res.json();
      
      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      setSuccess(`Successfully unassigned ${result.count} cash register(s) from ${selectedEntity.name}!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle update cash register status
  const handleUpdateStatus = async (cashRegisterId, newStatus) => {
    if (!confirm(`Change cash register status to ${newStatus}?`)) {
      return;
    }

    try {
      const res = await fetch(
        `${API_ROUTES.CASHREGISTERASSIGN}/cash-register/${cashRegisterId}/status`,
        {
          method: "PUT",
          headers: {
          'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            status: newStatus,
            reason: "Status updated by user"
          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      // Refresh data
      fetchData();
      
      setSuccess(`Cash register status updated to ${newStatus} successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter entities based on search and filters
  const filteredEntities = entities.filter(entity => {
    // Filter by type
    if (filterType !== "all" && entity.type !== filterType) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        entity.name?.toLowerCase().includes(searchLower) ||
        entity.address?.toLowerCase().includes(searchLower) ||
        entity.manager?.toLowerCase().includes(searchLower) ||
        entity.mobile?.includes(searchTerm) ||
        entity.type?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by cash register assignment status
    if (showOnlyWithRegisters) {
      return entity.assignedCashRegisters && entity.assignedCashRegisters.length > 0;
    }

    return true;
  });

  // Filter cash registers based on status
  const filteredCashRegisters = cashRegisters.filter(cr => {
    if (statusFilter !== "all" && cr.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Filter all cash registers for register view
  const filteredAllCashRegisters = allCashRegisters.filter(cr => {
    if (statusFilter !== "all" && cr.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Get entity icon based on type
  const getEntityIcon = (type) => {
    switch (type) {
      case "store": return <Store size={20} />;
      case "shop": return <Building2 size={20} />;
      case "factory": return <Factory size={20} />;
      default: return <Building size={20} />;
    }
  };

  // Get entity type color
  const getEntityTypeColor = (type) => {
    switch (type) {
      case "store": return "bg-blue-100 text-blue-800 border-blue-200";
      case "shop": return "bg-green-100 text-green-800 border-green-200";
      case "factory": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get cash register status color
  const getCashRegisterStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inactive": return "bg-red-100 text-red-800 border-red-200";
      case "maintenance": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get cash register status icon
  const getCashRegisterStatusIcon = (status) => {
    switch (status) {
      case "active": return <CheckCircle size={14} className="text-emerald-600" />;
      case "inactive": return <XCircle size={14} className="text-red-600" />;
      case "maintenance": return <Wrench size={14} className="text-amber-600" />;
      default: return <Clock size={14} className="text-gray-600" />;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading cash register assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Calculator className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Cash Register Assignment
              </h1>
              <p className="text-gray-600 mt-1">
                Assign cash registers to stores, shops, and factories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("entities")}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === "entities"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white/50 text-gray-700 hover:bg-white/80"
                }`}
              >
                <Building2 size={18} className="inline mr-2" />
                Entities View
              </button>
              <button
                onClick={() => setViewMode("registers")}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === "registers"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-white/50 text-gray-700 hover:bg-white/80"
                }`}
              >
                <Calculator size={18} className="inline mr-2" />
                Registers View
              </button>
            </div>
            <button
              onClick={fetchData}
              className=" px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="glass-card p-4 mb-6 border border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-emerald-700 font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-card p-4 mb-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-red-500/10 to-red-600/10">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Entities</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalEntities}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Building className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Registers</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalCashRegisters}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <Calculator className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Assigned</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.assignedCashRegisters}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {stats.assignmentPercentage}% assigned
              </p>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <Link className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Available</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.unassignedCashRegisters}</h3>
              <p className="text-xs text-gray-500 mt-1">
                Ready for assignment
              </p>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10">
              <Wallet className="text-amber-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Cash in Hand</p>
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(allCashRegisters.reduce((sum, cr) => sum + (cr.cash_in_hand || 0), 0))}
              </h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <Banknote className="text-emerald-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {viewMode === "entities" ? (
        /* ENTITIES VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Entities List */}
          <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg">
            <div className="p-6 border-b border-white/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Building2 size={24} className="text-blue-600" />
                    Entities List
                  </h2>
                  <p className="text-gray-600 text-sm">Select an entity to assign cash registers</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                    <span className="text-sm font-medium text-gray-700">
                      {filteredEntities.length} of {entities.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search entities by name, address, or contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="glass-input px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="all">All Types</option>
                      <option value="store">Stores</option>
                      <option value="shop">Shops</option>
                      <option value="factory">Factories</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 glass-input px-3 py-2 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyWithRegisters}
                      onChange={(e) => setShowOnlyWithRegisters(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">With registers only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Entities List */}
            <div className="overflow-y-auto max-h-[600px]">
              {filteredEntities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                    <Search className="text-gray-400" size={48} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No entities found</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    {searchTerm ? 'No entities match your search criteria' : 'No entities available'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className=" px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                filteredEntities.map((entity) => (
                  <div
                    key={`${entity.type}-${entity.id}`}
                    className={`p-4 border-b border-white/10 hover:bg-white/5 transition-all duration-200 cursor-pointer group ${
                      selectedEntity?.id === entity.id && selectedEntity?.type === entity.type
                        ? 'bg-blue-50/50 border-l-4 border-l-blue-500'
                        : ''
                    }`}
                    onClick={() => handleEntityClick(entity)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`glass-icon p-2 rounded-lg ${
                          entity.type === 'store' ? 'bg-blue-500/10' :
                          entity.type === 'shop' ? 'bg-green-500/10' :
                          'bg-purple-500/10'
                        }`}>
                          {getEntityIcon(entity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-800">{entity.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(entity.type)}`}>
                              {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                            </span>
                            {entity.assignedCashRegisters?.length > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {entity.assignedCashRegisters.length} register{entity.assignedCashRegisters.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {entity.address && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin size={14} />
                                {entity.address}
                              </p>
                            )}
                            {entity.manager && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Users size={14} />
                                {entity.manager}
                              </p>
                            )}
                            {entity.mobile && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone size={14} />
                                {entity.mobile}
                              </p>
                            )}
                          </div>
                          {entity.assignedCashRegisters && entity.assignedCashRegisters.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <Banknote size={14} className="text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-700">
                                {entity.assignedCashRegisters.length} register{entity.assignedCashRegisters.length > 1 ? 's' : ''} assigned
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedEntities[`${entity.type}-${entity.id}`] ? (
                          <ChevronUp size={20} className="text-gray-400 group-hover:text-gray-600" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Expanded View */}
                    {expandedEntities[`${entity.type}-${entity.id}`] && (
                      <div className="mt-4 ml-10 pl-4 border-l-2 border-gray-200/30">
                        {entity.assignedCashRegisters?.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">Assigned Cash Registers:</p>
                            {entity.assignedCashRegisters.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-2 rounded bg-white/50 border border-white/30"
                              >
                                <div className="flex items-center gap-2">
                                  <Calculator size={16} className="text-gray-500" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {assignment.cashRegister.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Cash in hand: {formatCurrency(assignment.cashRegister.cash_in_hand)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCashRegisterStatusColor(assignment.cashRegister.status)}`}>
                                    {assignment.cashRegister.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No cash registers assigned yet</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEntityClick(entity);
                              setShowAssignForm(true);
                            }}
                            className="flex-1  px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                          >
                            <Plus size={14} className="inline mr-1" />
                            Assign Register
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEntityClick(entity);
                              setShowMultiAssignForm(true);
                            }}
                            className="flex-1  px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300"
                          >
                            <Plus size={14} className="inline mr-1" />
                            Assign Multiple
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Assignment Details */}
          <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Calculator size={24} className="text-purple-600" />
                    {selectedEntity ? `${selectedEntity.name} - Cash Registers` : 'Entity Details'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {selectedEntity
                      ? `Manage cash register assignments for this ${selectedEntity.type}`
                      : 'Select an entity from the list to view and manage its cash register assignments'}
                  </p>
                </div>
                {selectedEntity && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAssignForm(!showAssignForm)}
                      className=" px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Assign One
                    </button>
                    <button
                      onClick={() => setShowMultiAssignForm(!showMultiAssignForm)}
                      className=" px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Assign Multiple
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selectedEntity ? (
              <div className="p-6">
                {/* Entity Info Card */}
                <div className="glass-card-inner p-4 mb-6 bg-gradient-to-r from-blue-50/50 to-blue-100/50 border border-blue-200/30 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`glass-icon p-2 rounded-lg ${
                        selectedEntity.type === 'store' ? 'bg-blue-500/10' :
                        selectedEntity.type === 'shop' ? 'bg-green-500/10' :
                        'bg-purple-500/10'
                      }`}>
                        {getEntityIcon(selectedEntity.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800 text-lg">{selectedEntity.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(selectedEntity.type)}`}>
                            {selectedEntity.type.charAt(0).toUpperCase() + selectedEntity.type.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          {selectedEntity.address && (
                            <div className="flex items-start gap-2">
                              <MapPin size={16} className="text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">Address</p>
                                <p className="text-sm font-medium">{selectedEntity.address}</p>
                              </div>
                            </div>
                          )}
                          {selectedEntity.manager && (
                            <div className="flex items-start gap-2">
                              <Users size={16} className="text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">Manager</p>
                                <p className="text-sm font-medium">{selectedEntity.manager}</p>
                              </div>
                            </div>
                          )}
                          {selectedEntity.mobile && (
                            <div className="flex items-start gap-2">
                              <Phone size={16} className="text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">Contact</p>
                                <p className="text-sm font-medium">{selectedEntity.mobile}</p>
                              </div>
                            </div>
                          )}
                          {selectedEntity.email && (
                            <div className="flex items-start gap-2">
                              <Mail size={16} className="text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="text-sm font-medium">{selectedEntity.email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Assign Form */}
                {showAssignForm && (
                  <div className="glass-card-inner p-4 mb-6 bg-gradient-to-r from-blue-50/50 to-blue-100/50 border border-blue-200/30 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Link size={20} className="text-blue-600" />
                        Assign Single Cash Register
                      </h3>
                      <button
                        onClick={() => {
                          setShowAssignForm(false);
                          setSelectedCashRegisters([]);
                          setNotes("");
                        }}
                        className="glass-icon-button p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <form onSubmit={handleAssignCashRegister}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Cash Register (Choose one)
                          </label>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredCashRegisters.map((cashRegister) => (
                              <div
                                key={cashRegister.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  selectedCashRegisters.includes(cashRegister.id)
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white/50 border-gray-200 hover:bg-gray-50/50'
                                }`}
                                onClick={() => {
                                  setSelectedCashRegisters([cashRegister.id]);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      selectedCashRegisters.includes(cashRegister.id)
                                        ? 'bg-blue-100'
                                        : 'bg-gray-100'
                                    }`}>
                                      <Calculator size={18} className={
                                        selectedCashRegisters.includes(cashRegister.id)
                                          ? 'text-blue-600'
                                          : 'text-gray-600'
                                      } />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800">{cashRegister.name}</p>
                                      <p className="text-sm text-gray-600">
                                        Cash in hand: {formatCurrency(cashRegister.cash_in_hand)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCashRegisterStatusColor(cashRegister.status)}`}>
                                      {cashRegister.status}
                                    </span>
                                    {selectedCashRegisters.includes(cashRegister.id) && (
                                      <CheckCircle size={18} className="text-blue-600" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-300/50"
                            rows="2"
                            placeholder="Add any notes about this assignment..."
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={selectedCashRegisters.length !== 1}
                            className={`flex-1  px-4 py-3 text-white rounded-lg transition-all duration-300 font-medium ${
                              selectedCashRegisters.length === 1
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <Link size={18} className="inline mr-2" />
                            Assign Cash Register
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Multiple Assign Form */}
                {showMultiAssignForm && (
                  <div className="glass-card-inner p-4 mb-6 bg-gradient-to-r from-purple-50/50 to-purple-100/50 border border-purple-200/30 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Link size={20} className="text-purple-600" />
                        Assign Multiple Cash Registers
                      </h3>
                      <button
                        onClick={() => {
                          setShowMultiAssignForm(false);
                          setSelectedCashRegisters([]);
                          setNotes("");
                        }}
                        className="glass-icon-button p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <form onSubmit={handleAssignMultipleCashRegisters}>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Select Cash Registers (Choose multiple)
                            </label>
                            <button
                              type="button"
                              onClick={toggleAllCashRegisters}
                              className="text-sm text-purple-600 hover:text-purple-800"
                            >
                              {selectedCashRegisters.length === filteredCashRegisters.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredCashRegisters.map((cashRegister) => (
                              <div
                                key={cashRegister.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  selectedCashRegisters.includes(cashRegister.id)
                                    ? 'bg-purple-50 border-purple-300'
                                    : 'bg-white/50 border-gray-200 hover:bg-gray-50/50'
                                }`}
                                onClick={() => toggleCashRegisterSelection(cashRegister.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      selectedCashRegisters.includes(cashRegister.id)
                                        ? 'bg-purple-100'
                                        : 'bg-gray-100'
                                    }`}>
                                      <Calculator size={18} className={
                                        selectedCashRegisters.includes(cashRegister.id)
                                          ? 'text-purple-600'
                                          : 'text-gray-600'
                                      } />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800">{cashRegister.name}</p>
                                      <p className="text-sm text-gray-600">
                                        Cash in hand: {formatCurrency(cashRegister.cash_in_hand)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCashRegisterStatusColor(cashRegister.status)}`}>
                                      {cashRegister.status}
                                    </span>
                                    {selectedCashRegisters.includes(cashRegister.id) ? (
                                      <CheckSquare size={18} className="text-purple-600" />
                                    ) : (
                                      <Square size={18} className="text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Selected: {selectedCashRegisters.length} cash register(s)
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-gray-300/50"
                            rows="2"
                            placeholder="Add any notes about these assignments..."
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={selectedCashRegisters.length === 0}
                            className={`flex-1  px-4 py-3 text-white rounded-lg transition-all duration-300 font-medium ${
                              selectedCashRegisters.length > 0
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <Link size={18} className="inline mr-2" />
                            Assign {selectedCashRegisters.length} Cash Register{selectedCashRegisters.length !== 1 ? 's' : ''}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Assigned Cash Registers List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Calculator size={20} className="text-blue-600" />
                      Assigned Cash Registers
                      <span className="glass-tag px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {entityAssignments.length}
                      </span>
                    </h3>
                    {entityAssignments.length > 0 && (
                      <button
                        onClick={handleUnassignAll}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Unlink size={16} />
                        Unassign All
                      </button>
                    )}
                  </div>
                  
                  {entityAssignments.length > 0 ? (
                    <div className="space-y-3">
                      {entityAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="glass-card-inner p-4 border rounded-lg transition-all duration-200 border-white/30 bg-white/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`glass-icon p-2 rounded-lg ${
                                assignment.cashRegister.status === 'active'
                                  ? 'bg-emerald-500/10'
                                  : assignment.cashRegister.status === 'maintenance'
                                  ? 'bg-amber-500/10'
                                  : 'bg-red-500/10'
                              }`}>
                                <Calculator className={
                                  assignment.cashRegister.status === 'active'
                                    ? 'text-emerald-600'
                                    : assignment.cashRegister.status === 'maintenance'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                                } size={20} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-semibold text-gray-800">
                                    {assignment.cashRegister.name}
                                  </h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCashRegisterStatusColor(assignment.cashRegister.status)}`}>
                                    {assignment.cashRegister.status}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">
                                    Cash in hand: {formatCurrency(assignment.cashRegister.cash_in_hand)}
                                  </p>
                                  {assignment.cashRegister.last_opened && (
                                    <p className="text-sm text-gray-600">
                                      Last opened: {new Date(assignment.cashRegister.last_opened).toLocaleDateString()}
                                    </p>
                                  )}
                                  {assignment.assignedBy && (
                                    <p className="text-xs text-gray-500">
                                      Assigned by: {assignment.assignedBy.name}
                                    </p>
                                  )}
                                  {assignment.notes && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      <span className="font-medium">Notes:</span> {assignment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="dropdown dropdown-end">
                                <button className="glass-icon-button p-2 rounded-lg hover:bg-gray-100/50 transition-colors">
                                  <MoreVertical size={18} />
                                </button>
                                <ul className="dropdown-content menu p-2 shadow-lg bg-white rounded-lg w-48 z-10">
                                  <li>
                                    <button
                                      onClick={() => {
                                        setSelectedAssignment(assignment);
                                        setShowUnassignModal(true);
                                      }}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Unlink size={16} />
                                      Unassign
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      onClick={() => handleUpdateStatus(assignment.cashRegister.id, 'maintenance')}
                                      className="text-amber-600 hover:bg-amber-50"
                                    >
                                      <Wrench size={16} />
                                      Set to Maintenance
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              Assigned on: {new Date(assignment.assignedAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(assignment.assignedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                        <Calculator className="text-gray-400" size={48} />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        No Cash Registers Assigned
                      </h4>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        This {selectedEntity.type} doesn't have any cash registers assigned yet.
                        Assign cash registers to manage transactions.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setShowAssignForm(true)}
                          className=" px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
                        >
                          <Plus size={20} className="inline mr-2" />
                          Assign One Register
                        </button>
                        <button
                          onClick={() => setShowMultiAssignForm(true)}
                          className=" px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-medium"
                        >
                          <Plus size={20} className="inline mr-2" />
                          Assign Multiple
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-blue-100/50 to-blue-200/50">
                  <Building2 className="text-blue-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Select an Entity</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Choose a store, shop, or factory from the list to view and manage its cash register assignments.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600">Store</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">Shop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-gray-600">Factory</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* REGISTERS VIEW */
        <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg">
          <div className="p-6 border-b border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Calculator size={24} className="text-green-600" />
                  All Cash Registers
                </h2>
                <p className="text-gray-600 text-sm">
                  View and manage all cash registers and their assignments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="glass-input px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                  <span className="text-sm font-medium text-gray-700">
                    {filteredAllCashRegisters.length} registers
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Cash Register
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Status
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Cash in Hand
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Assigned To
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Last Activity
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAllCashRegisters.map((cashRegister) => (
                  <tr
                    key={cashRegister.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`glass-icon p-2 rounded-lg ${getCashRegisterStatusColor(cashRegister.status).replace('border-', 'bg-').replace(' text-', '/10 ')}`}>
                          <Calculator size={20} className={
                            cashRegister.status === 'active' ? 'text-emerald-600' :
                            cashRegister.status === 'maintenance' ? 'text-amber-600' :
                            'text-red-600'
                          } />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{cashRegister.name}</p>
                          <p className="text-sm text-gray-600">
                            ID: {cashRegister.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${getCashRegisterStatusColor(cashRegister.status)}`}>
                        {getCashRegisterStatusIcon(cashRegister.status)}
                        {cashRegister.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Banknote size={16} className="text-emerald-600" />
                        <span className="font-medium text-gray-800">
                          {formatCurrency(cashRegister.cash_in_hand)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {cashRegister.assignments && cashRegister.assignments.length > 0 ? (
                        <div className="space-y-1">
                          {cashRegister.assignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(assignment.entityType)}`}>
                                {assignment.entityType}
                              </span>
                              <span className="text-sm text-gray-700">
                                {assignment.entityType === 'store' ? 'Store' :
                                 assignment.entityType === 'shop' ? 'Shop' : 'Factory'} ID: {assignment.entityId}
                              </span>
                              {assignment.assignedBy && (
                                <span className="text-xs text-gray-500">
                                  by {assignment.assignedBy.name}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {cashRegister.last_opened && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar size={12} />
                            Opened: {new Date(cashRegister.last_opened).toLocaleDateString()}
                          </div>
                        )}
                        {cashRegister.last_closed && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar size={12} />
                            Closed: {new Date(cashRegister.last_closed).toLocaleDateString()}
                          </div>
                        )}
                        {!cashRegister.last_opened && !cashRegister.last_closed && (
                          <span className="text-sm text-gray-500 italic">No activity</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {cashRegister.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(cashRegister.id, 'inactive')}
                            className="glass-icon-button p-2 rounded-lg hover:bg-red-100/50 transition-colors"
                            title="Deactivate"
                          >
                            <Power size={16} className="text-red-600" />
                          </button>
                        )}
                        {cashRegister.status === 'inactive' && (
                          <button
                            onClick={() => handleUpdateStatus(cashRegister.id, 'active')}
                            className="glass-icon-button p-2 rounded-lg hover:bg-emerald-100/50 transition-colors"
                            title="Activate"
                          >
                            <Power size={16} className="text-emerald-600" />
                          </button>
                        )}
                        {cashRegister.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(cashRegister.id, 'maintenance')}
                            className="glass-icon-button p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
                            title="Set to Maintenance"
                          >
                            <Wrench size={16} className="text-amber-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAllCashRegisters.length === 0 && (
              <div className="text-center py-12">
                <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                  <Calculator className="text-gray-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No cash registers found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {statusFilter !== 'all' ? `No cash registers with status "${statusFilter}"` : 'No cash registers available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unassign Modal */}
      {showUnassignModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card border border-white/20 backdrop-blur-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={24} className="text-red-600" />
                  Unassign Cash Register
                </h3>
                <button
                  onClick={() => {
                    setShowUnassignModal(false);
                    setSelectedAssignment(null);
                    setUnassignReason("");
                  }}
                  className="glass-icon-button p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to unassign <span className="font-semibold">{selectedAssignment.cashRegister.name}</span> from {selectedEntity?.name}?
                </p>
                
                <div className="glass-card-inner p-4 mb-4 bg-gradient-to-r from-red-50/50 to-red-100/50 border border-red-200/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calculator size={20} className="text-red-600" />
                    <div>
                      <p className="font-medium text-gray-800">{selectedAssignment.cashRegister.name}</p>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCashRegisterStatusColor(selectedAssignment.cashRegister.status)}`}>
                          {selectedAssignment.cashRegister.status}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Cash in hand: {formatCurrency(selectedAssignment.cashRegister.cash_in_hand)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for unassigning (Optional)
                  </label>
                  <textarea
                    value={unassignReason}
                    onChange={(e) => setUnassignReason(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 border border-gray-300/50"
                    rows="2"
                    placeholder="Why are you unassigning this cash register?"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleUnassignCashRegister(selectedAssignment.id, unassignReason)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 font-medium"
                >
                  <Unlink size={18} className="inline mr-2" />
                  Unassign
                </button>
                <button
                  onClick={() => {
                    setShowUnassignModal(false);
                    setSelectedAssignment(null);
                    setUnassignReason("");
                  }}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="glass-card p-4 mt-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last updated:</span> {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {stats.assignedCashRegisters} assigned • {stats.unassignedCashRegisters} available
              </span>
            </div>
            <div className="flex items-center gap-1">
              {Object.entries(stats.assignmentsByType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    type === 'store' ? 'bg-blue-500' :
                    type === 'shop' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">{type}: {count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}