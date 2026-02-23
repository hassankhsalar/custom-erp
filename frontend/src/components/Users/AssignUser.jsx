import {
  AlertCircle,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  Factory,
  Filter,
  Home,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Store,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { API_ROUTES } from '../../config';

export default function AssignUser() {
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityAssignments, setEntityAssignments] = useState([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [expandedEntities, setExpandedEntities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showOnlyWithUsers, setShowOnlyWithUsers] = useState(false);
  const token = localStorage.getItem('token');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEntities: 0,
    totalAssignments: 0,
    assignmentsByType: {},
    assignmentPercentage: 0
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false
  });
  const [pageSize, setPageSize] = useState(10);

  // Fetch data on component mount and when page/pageSize changes
  useEffect(() => {
    fetchData();
  }, [pagination.currentPage, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [entitiesRes, usersRes, statsRes] = await Promise.all([
        fetch(`${API_ROUTES.ASSIGNUSER}/entities?page=${pagination.currentPage}&limit=${pageSize}`, { headers }),
        fetch(`${API_ROUTES.ASSIGNUSER}/available-users`, { headers }),
        fetch(`${API_ROUTES.ASSIGNUSER}/stats`, { headers })
      ]);

      if (entitiesRes.status === 401 || usersRes.status === 401 || statsRes.status === 401) {
        localStorage.removeItem('token');
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      if (!entitiesRes.ok || !usersRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const entitiesData = await entitiesRes.json();
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      // Handle paginated response
      setEntities(entitiesData.data || []);
      setPagination(entitiesData.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: pageSize,
        hasNext: false,
        hasPrev: false
      });
      setUsers(usersData);
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
        `${API_ROUTES.ASSIGNUSER}/entity/${entity.type}/${entity.id}`,
        { headers }
      );
      
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        setError("Session expired. Please log in again.");
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch assignments: ${res.statusText}`);
      }
      
      const data = await res.json();
      setEntityAssignments(data.data || []);
      setSelectedEntity(entity);
      setError("");
      
    } catch (err) {
      console.error("Error fetching entity assignments:", err);
      setError(err.message || "An error occurred while fetching assignments");
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle entity selection
  const handleEntityClick = (entity) => {
    if (selectedEntity?.id === entity.id && selectedEntity?.type === entity.type) {
      setExpandedEntities(prev => ({
        ...prev,
        [`${entity.type}-${entity.id}`]: !prev[`${entity.type}-${entity.id}`]
      }));
    } else {
      fetchEntityAssignments(entity);
      setExpandedEntities(prev => ({
        ...prev,
        [`${entity.type}-${entity.id}`]: true
      }));
    }
  };

  // Handle user assignment
  const handleAssignUser = async (e) => {
    e.preventDefault();
    
    if (!selectedEntity || !selectedUser) {
      setError("Please select both entity and user");
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.ASSIGNUSER}/assign`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: selectedUser,
          associateName: selectedEntity.type,
          associateId: selectedEntity.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to assign user");
      }

      await fetchData();
      
      if (selectedEntity) {
        await fetchEntityAssignments(selectedEntity);
      }
      
      setSelectedUser("");
      setShowAssignForm(false);
      setError("");
      setSuccess("User assigned successfully!");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle removing assignment
  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm("Are you sure you want to remove this user assignment?")) {
      return;
    }

    try {
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
        `${API_ROUTES.ASSIGNUSER}/assignment/${assignmentId}`,
        { 
          method: "DELETE",
          headers 
        }
      );

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        setError("Session expired. Please log in again.");
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to remove assignment");
      }

      await fetchData();
      
      if (selectedEntity) {
        await fetchEntityAssignments(selectedEntity);
      }
      
      setSuccess("User assignment removed successfully!");
      
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (err) {
      console.error("Error removing assignment:", err);
      setError(err.message || "An error occurred while removing assignment");
    }
  };

  // Filter entities based on search and filters
  const filteredEntities = entities.filter(entity => {
    if (filterType !== "all" && entity.type !== filterType) {
      return false;
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        entity.name?.toLowerCase().includes(searchLower) ||
        entity.address?.toLowerCase().includes(searchLower) ||
        entity.manager?.toLowerCase().includes(searchLower) ||
        entity.mobile?.includes(searchTerm) ||
        entity.type?.toLowerCase().includes(searchLower) ||
        entity.account_number?.includes(searchTerm)
      );
    }

    if (showOnlyWithUsers) {
      return entity.assignedUsers && entity.assignedUsers.length > 0;
    }

    return true;
  });

  // Get entity icon based on type
  const getEntityIcon = (type) => {
    switch (type) {
      case "store": return <Store size={20} />;
      case "shop": return <Building2 size={20} />;
      case "factory": return <Factory size={20} />;
      case "cashRegister": return <Calculator size={20} />;
      case "account": return <CreditCard size={20} />;
      default: return <Briefcase size={20} />;
    }
  };

  // Get entity type color
  const getEntityTypeColor = (type) => {
    switch (type) {
      case "store": return "bg-blue-100 text-blue-800 border-blue-200";
      case "shop": return "bg-green-100 text-green-800 border-green-200";
      case "factory": return "bg-purple-100 text-purple-800 border-purple-200";
      case "cashRegister": return "bg-amber-100 text-amber-800 border-amber-200";
      case "account": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get entity type label
  const getEntityTypeLabel = (type) => {
    switch (type) {
      case "store": return "Store";
      case "shop": return "Shop";
      case "factory": return "Factory";
      case "cashRegister": return "Cash Register";
      case "account": return "Account";
      default: return type;
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading user assignments...</p>
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
              <UserPlus className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Assign Users
              </h1>
              <p className="text-gray-600 mt-1">
                Assign employees to stores, shops, factories, cash registers, and accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
              <span className="text-sm font-medium text-gray-700">
                <Users size={16} className="inline mr-2" />
                {stats.totalUsers} Users
              </span>
            </div>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalUsers}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Users className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Entities</p>
              <h3 className="text-xl font-bold text-gray-900">{pagination.totalItems}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <Building2 className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Assignments</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalAssignments}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {stats.assignmentPercentage}% assigned
              </p>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <UserPlus className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Stores</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.assignmentsByType?.store || 0}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Store className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Shops</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.assignmentsByType?.shop || 0}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <Home className="text-green-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Columns */}
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
                <p className="text-gray-600 text-sm">Select an entity to assign users</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                  <span className="text-sm font-medium text-gray-700">
                    {filteredEntities.length} of {pagination.totalItems}
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
                    <option value="cashRegister">Cash Registers</option>
                    <option value="account">Accounts</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 glass-input px-3 py-2 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyWithUsers}
                    onChange={(e) => setShowOnlyWithUsers(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">With users only</span>
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
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
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
                        entity.type === 'factory' ? 'bg-purple-500/10' :
                        entity.type === 'cashRegister' ? 'bg-amber-500/10' :
                        'bg-indigo-500/10'
                      }`}>
                        {getEntityIcon(entity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-800">{entity.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(entity.type)}`}>
                            {getEntityTypeLabel(entity.type)}
                          </span>
                          {entity.assignedUsers?.length > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {entity.assignedUsers.length} user{entity.assignedUsers.length > 1 ? 's' : ''}
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
                          {entity.account_number && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <CreditCard size={14} />
                              Account #: {entity.account_number}
                            </p>
                          )}
                          {entity.cash_in_hand !== undefined && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <DollarSign size={14} />
                              Cash: {formatCurrency(entity.cash_in_hand)}
                            </p>
                          )}
                        </div>
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
                      {entity.assignedUsers?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Assigned Users:</p>
                          {entity.assignedUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 rounded bg-white/50 border border-white/30"
                            >
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-500" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {user.name || user.email}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {user.email} • {user.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No users assigned yet</p>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEntityClick(entity);
                          setShowAssignForm(true);
                        }}
                        className="mt-3 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                      >
                        <Plus size={14} className="inline mr-1" />
                        Assign User
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls for Entities */}
          <div className="p-4 border-t border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="glass-input px-2 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPrev}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      pagination.hasPrev
                        ? 'hover:bg-white/50 text-gray-700'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title="First Page"
                  >
                    <ChevronsLeft size={18} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      pagination.hasPrev
                        ? 'hover:bg-white/50 text-gray-700'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title="Previous Page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  <span className="text-sm text-gray-600 mx-2">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      pagination.hasNext
                        ? 'hover:bg-white/50 text-gray-700'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title="Next Page"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNext}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      pagination.hasNext
                        ? 'hover:bg-white/50 text-gray-700'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title="Last Page"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Assignment Details (unchanged) */}
        <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Users size={24} className="text-purple-600" />
                  {selectedEntity ? `${selectedEntity.name} - Users` : 'Entity Details'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {selectedEntity
                    ? `Manage user assignments for this ${selectedEntity.type}`
                    : 'Select an entity from the list to view and manage user assignments'}
                </p>
              </div>
              {selectedEntity && (
                <button
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Assign User
                </button>
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
                      selectedEntity.type === 'factory' ? 'bg-purple-500/10' :
                      selectedEntity.type === 'cashRegister' ? 'bg-amber-500/10' :
                      'bg-indigo-500/10'
                    }`}>
                      {getEntityIcon(selectedEntity.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{selectedEntity.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(selectedEntity.type)}`}>
                          {getEntityTypeLabel(selectedEntity.type)}
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
                        {selectedEntity.account_number && (
                          <div className="flex items-start gap-2">
                            <CreditCard size={16} className="text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Account Number</p>
                              <p className="text-sm font-medium">{selectedEntity.account_number}</p>
                            </div>
                          </div>
                        )}
                        {selectedEntity.cash_in_hand !== undefined && (
                          <div className="flex items-start gap-2">
                            <DollarSign size={16} className="text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Cash in Hand</p>
                              <p className="text-sm font-medium">{formatCurrency(selectedEntity.cash_in_hand)}</p>
                            </div>
                          </div>
                        )}
                        {selectedEntity.status && (
                          <div className="flex items-start gap-2">
                            <Shield size={16} className="text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Status</p>
                              <p className="text-sm font-medium">{selectedEntity.status}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assign User Form */}
              {showAssignForm && (
                <div className="glass-card-inner p-4 mb-6 bg-gradient-to-r from-green-50/50 to-green-100/50 border border-green-200/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <UserPlus size={20} className="text-green-600" />
                      Assign User to {selectedEntity.name}
                    </h3>
                    <button
                      onClick={() => {
                        setShowAssignForm(false);
                        setSelectedUser("");
                      }}
                      className="glass-icon-button p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleAssignUser}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select User
                        </label>
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-300/50"
                          required
                        >
                          <option value="">Choose a user...</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email} ({user.role}) - {user.email}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-2">
                          {users.length} users available for assignment
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-medium"
                        >
                          <UserPlus size={18} className="inline mr-2" />
                          Assign User
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssignForm(false);
                            setSelectedUser("");
                          }}
                          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Assigned Users List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" />
                    Assigned Users
                    <span className="glass-tag px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {entityAssignments.length}
                    </span>
                  </h3>
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
                            <div className="glass-icon p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                              <User className="text-blue-600" size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-gray-800">
                                  {assignment.user.name || assignment.user.email}
                                </h4>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                  {assignment.user.role}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                  {assignment.user.email}
                                </p>
                                <p className="text-xs text-gray-500">
                                  User ID: {assignment.user.id}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="glass-icon-button p-2 rounded-lg hover:bg-red-100/50 transition-colors"
                              title="Remove Assignment"
                            >
                              <UserMinus size={18} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            Assigned on: {formatDate(assignment.user.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            Joined: {formatDate(assignment.user.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                      <Users className="text-gray-400" size={48} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      No Users Assigned
                    </h4>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      This {selectedEntity.type} doesn't have any users assigned yet.
                      Assign users to manage this entity.
                    </p>
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-medium"
                    >
                      <Plus size={20} className="inline mr-2" />
                      Assign First User
                    </button>
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
                Choose a store, shop, factory, cash register, or account from the list to view and manage user assignments.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
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
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-gray-600">Cash Register</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-sm text-gray-600">Account</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="glass-card p-4 mt-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last updated:</span> {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {stats.totalAssignments} assignments • {stats.totalUsers - stats.totalAssignments} users available
              </span>
            </div>
            <div className="flex items-center gap-1">
              {Object.entries(stats.assignmentsByType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    type === 'store' ? 'bg-blue-500' :
                    type === 'shop' ? 'bg-green-500' :
                    type === 'factory' ? 'bg-purple-500' :
                    type === 'cashRegister' ? 'bg-amber-500' :
                    'bg-indigo-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">{type}: {count}</span>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}