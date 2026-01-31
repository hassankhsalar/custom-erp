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
  StarOff,
  Plus,
  X,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Eye,
  EyeOff,
  Calendar,
  Shield,
  Key
} from "lucide-react";

export default function AssignAccount() {
  const [entities, setEntities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityAssignments, setEntityAssignments] = useState([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [expandedEntities, setExpandedEntities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, store, shop, factory
  const [showOnlyWithAccounts, setShowOnlyWithAccounts] = useState(false);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [stats, setStats] = useState({
    totalEntities: 0,
    totalAccounts: 0,
    assignedEntities: 0,
    unassignedEntities: 0,
    totalBalance: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const [entitiesRes, accountsRes] = await Promise.all([
        fetch("http://localhost:3001/api/assign-account/entities"),
        fetch("http://localhost:3001/api/assign-account/available-accounts")
      ]);

      if (!entitiesRes.ok || !accountsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const entitiesData = await entitiesRes.json();
      const accountsData = await accountsRes.json();

      setEntities(entitiesData);
      setAccounts(accountsData);

      // Calculate statistics
      const assignedEntities = entitiesData.filter(e => 
        e.assignedAccounts && e.assignedAccounts.length > 0
      ).length;
      
      const totalBalance = entitiesData.reduce((sum, entity) => {
        const entityBalance = entity.assignedAccounts?.reduce((accSum, assignment) => {
          return accSum + (parseFloat(assignment.account?.balance) || 0);
        }, 0) || 0;
        return sum + entityBalance;
      }, 0);

      setStats({
        totalEntities: entitiesData.length,
        totalAccounts: accountsData.length,
        assignedEntities,
        unassignedEntities: entitiesData.length - assignedEntities,
        totalBalance
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignments for selected entity
  const fetchEntityAssignments = async (entity) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/assign-account/entity/${entity.type}/${entity.id}`
      );
      
      if (!res.ok) throw new Error("Failed to fetch assignments");
      
      const data = await res.json();
      setEntityAssignments(data);
      setSelectedEntity(entity);
    } catch (err) {
      setError(err.message);
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

  // Handle account assignment
  const handleAssignAccount = async (e) => {
    e.preventDefault();
    
    if (!selectedEntity || !selectedAccount) {
      setError("Please select both entity and account");
      return;
    }

    try {
      // In a real app, you would get the current user's ID from auth context
      const assignedById = 1; // Replace with actual user ID from auth

      const res = await fetch("http://localhost:3001/api/assign-account/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entityType: selectedEntity.type,
          entityId: selectedEntity.id,
          accountId: selectedAccount,
          isPrimary,
          assignedById
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to assign account");
      }

      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      // Reset form
      setSelectedAccount("");
      setIsPrimary(false);
      setShowAssignForm(false);
      setError("");
      
      // Show success message
      alert("Account assigned successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle removing assignment
  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm("Are you sure you want to remove this account assignment?")) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/assign-account/assignment/${assignmentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to remove assignment");

      // Refresh data
      fetchData();
      
      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      alert("Account assignment removed successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle setting primary account
  const handleSetPrimary = async (assignmentId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/assign-account/set-primary/${assignmentId}`,
        { method: "PUT" }
      );

      if (!res.ok) throw new Error("Failed to set primary account");

      // Refresh assignments for current entity
      if (selectedEntity) {
        fetchEntityAssignments(selectedEntity);
      }
      
      alert("Primary account updated successfully!");
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

    // Filter by account assignment status
    if (showOnlyWithAccounts) {
      return entity.assignedAccounts && entity.assignedAccounts.length > 0;
    }

    return true;
  });

  // Get filtered accounts
  const filteredAccounts = accounts.filter(account => {
    if (!showInactiveAccounts && account.status === 'inactive') {
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

  // Get account status color
  const getAccountStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inactive": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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

  // Calculate entity balance
  const calculateEntityBalance = (entity) => {
    if (!entity.assignedAccounts || entity.assignedAccounts.length === 0) {
      return 0;
    }
    return entity.assignedAccounts.reduce((sum, assignment) => {
      return sum + (parseFloat(assignment.account?.balance) || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading account assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Link className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Assign Accounts
              </h1>
              <p className="text-gray-600 mt-1">
                Link financial accounts to stores, shops, and factories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className=" px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
              <span className="text-sm font-medium text-gray-700">
                <BarChart3 size={16} className="inline mr-2" />
                {stats.totalEntities} Entities
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-card p-4 mb-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-red-500/10 to-red-600/10">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-red-700 font-medium">{error}</p>
              <button
                onClick={() => setError("")}
                className="text-red-600 text-sm mt-1 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Available Accounts</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalAccounts}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <CreditCard className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Assigned Entities</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.assignedEntities}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <Link className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Unassigned Entities</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.unassignedEntities}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10">
              <Unlink className="text-amber-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Balance</p>
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(stats.totalBalance)}
              </h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <DollarSign className="text-emerald-600" size={20} />
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
                <p className="text-gray-600 text-sm">Select an entity to assign accounts</p>
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
                    checked={showOnlyWithAccounts}
                    onChange={(e) => setShowOnlyWithAccounts(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">With accounts only</span>
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
                          {entity.assignedAccounts?.length > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {entity.assignedAccounts.length} account{entity.assignedAccounts.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {entity.assignedAccounts?.some(a => a.isPrimary) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Star size={12} className="fill-amber-500" />
                              Primary
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
                        {entity.assignedAccounts && entity.assignedAccounts.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <DollarSign size={14} className="text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">
                              {formatCurrency(calculateEntityBalance(entity))}
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
                      {entity.assignedAccounts?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Assigned Accounts:</p>
                          {entity.assignedAccounts.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-2 rounded bg-white/50 border border-white/30"
                            >
                              <div className="flex items-center gap-2">
                                <CreditCard size={16} className="text-gray-500" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {assignment.account.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    #{assignment.account.account_number}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatCurrency(assignment.account.balance)}
                                </span>
                                {assignment.isPrimary && (
                                  <Star size={14} className="text-amber-500 fill-amber-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No accounts assigned yet</p>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEntityClick(entity);
                          setShowAssignForm(true);
                        }}
                        className="mt-3  px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                      >
                        <Plus size={14} className="inline mr-1" />
                        Assign Account
                      </button>
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
                  <Key size={24} className="text-purple-600" />
                  {selectedEntity ? `${selectedEntity.name} - Accounts` : 'Entity Details'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {selectedEntity
                    ? `Manage account assignments for this ${selectedEntity.type}`
                    : 'Select an entity from the list to view and manage its account assignments'}
                </p>
              </div>
              {selectedEntity && (
                <button
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className=" px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Assign Account
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

              {/* Assign Account Form */}
              {showAssignForm && (
                <div className="glass-card-inner p-4 mb-6 bg-gradient-to-r from-green-50/50 to-green-100/50 border border-green-200/30 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Link size={20} className="text-green-600" />
                      Assign New Account
                    </h3>
                    <button
                      onClick={() => setShowAssignForm(false)}
                      className="glass-icon-button p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleAssignAccount}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Account
                        </label>
                        <select
                          value={selectedAccount}
                          onChange={(e) => setSelectedAccount(e.target.value)}
                          className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-300/50"
                          required
                        >
                          <option value="">Choose an account...</option>
                          {filteredAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} (#{account.account_number}) - {formatCurrency(account.balance)} - {account.status}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            id="isPrimary"
                            checked={isPrimary}
                            onChange={(e) => setIsPrimary(e.target.checked)}
                            className="rounded text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700 font-medium">
                            Set as primary account
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showInactiveAccounts}
                            onChange={(e) => setShowInactiveAccounts(e.target.checked)}
                            className="rounded text-gray-600 focus:ring-gray-500"
                          />
                          <span className="text-sm text-gray-700">
                            Show inactive accounts
                          </span>
                        </label>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1  px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-medium"
                        >
                          <Link size={18} className="inline mr-2" />
                          Assign Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAssignForm(false)}
                          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Assigned Accounts List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-600" />
                    Assigned Accounts
                    <span className="glass-tag px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {entityAssignments.length}
                    </span>
                  </h3>
                  {entityAssignments.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Total: {formatCurrency(
                        entityAssignments.reduce((sum, a) => sum + (parseFloat(a.account?.balance) || 0), 0)
                      )}
                    </div>
                  )}
                </div>
                
                {entityAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {entityAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`glass-card-inner p-4 border rounded-lg transition-all duration-200 ${
                          assignment.isPrimary
                            ? 'border-amber-300/50 bg-gradient-to-r from-amber-50/50 to-amber-100/50'
                            : 'border-white/30 bg-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`glass-icon p-2 rounded-lg ${
                              assignment.account.status === 'active'
                                ? 'bg-emerald-500/10'
                                : 'bg-red-500/10'
                            }`}>
                              <CreditCard className={
                                assignment.account.status === 'active'
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              } size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-gray-800">
                                  {assignment.account.name}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAccountStatusColor(assignment.account.status)}`}>
                                  {assignment.account.status}
                                </span>
                                {assignment.isPrimary && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Star size={12} className="fill-amber-500" />
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                  Account #: {assignment.account.account_number}
                                </p>
                                <p className="text-sm font-medium text-gray-700">
                                  Balance: {formatCurrency(assignment.account.balance)}
                                </p>
                                {assignment.assignedBy && (
                                  <p className="text-xs text-gray-500">
                                    Assigned by: {assignment.assignedBy.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!assignment.isPrimary && (
                              <button
                                onClick={() => handleSetPrimary(assignment.id)}
                                className="glass-icon-button p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
                                title="Set as Primary"
                              >
                                <StarOff size={18} className="text-amber-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="glass-icon-button p-2 rounded-lg hover:bg-red-100/50 transition-colors"
                              title="Remove Assignment"
                            >
                              <Unlink size={18} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            Assigned on: {new Date(assignment.assignedAt).toLocaleDateString()}
                          </div>
                          {assignment.isPrimary && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <Shield size={12} />
                              Primary Account
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                      <CreditCard className="text-gray-400" size={48} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      No Accounts Assigned
                    </h4>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      This {selectedEntity.type} doesn't have any accounts assigned yet.
                      Assign accounts to manage financial transactions.
                    </p>
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className=" px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-medium"
                    >
                      <Plus size={20} className="inline mr-2" />
                      Assign First Account
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
                Choose a store, shop, or factory from the list to view and manage its account assignments.
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

      {/* Footer Info */}
      <div className="glass-card p-4 mt-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last updated:</span> {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredEntities.length} entities displayed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {accounts.filter(a => a.status === 'active').length} active accounts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}