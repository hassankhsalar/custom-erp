import { useEffect, useState } from "react";
import {
  Users,
  User,
  Building2,
  Store,
  Factory,
  Calculator,
  CreditCard,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  UserMinus,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Shield,
  Briefcase,
  Home,
  Wallet,
  Banknote,
  BarChart3,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  List,
  Grid,
  UserX,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AllAssignedUsers() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, store, shop, factory, cashRegister, account
  const [filterUser, setFilterUser] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // table, grid
  const [expandedRows, setExpandedRows] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    assignmentsByType: {},
    assignmentsByUser: {},
    uniqueUsers: 0,
    uniqueEntities: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const [assignmentsRes, usersRes] = await Promise.all([
        fetch("http://localhost:3001/api/assign-user/all-assignments"),
        fetch("http://localhost:3001/api/assign-user/available-users")
      ]);

      if (!assignmentsRes.ok || !usersRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const assignmentsData = await assignmentsRes.json();
      const usersData = await usersRes.json();

      setAssignments(assignmentsData);
      setUsers(usersData);

      // Calculate statistics
      const assignmentsByType = {};
      const assignmentsByUser = {};
      const uniqueUsers = new Set();
      const uniqueEntities = new Set();

      assignmentsData.forEach(assignment => {
        // Count by type
        assignmentsByType[assignment.associateName] = (assignmentsByType[assignment.associateName] || 0) + 1;
        
        // Count by user
        const userId = assignment.userId;
        assignmentsByUser[userId] = (assignmentsByUser[userId] || 0) + 1;
        
        // Track unique users and entities
        uniqueUsers.add(userId);
        uniqueEntities.add(`${assignment.associateName}-${assignment.associateId}`);
      });

      setStats({
        totalAssignments: assignmentsData.length,
        assignmentsByType,
        assignmentsByUser,
        uniqueUsers: uniqueUsers.size,
        uniqueEntities: uniqueEntities.size
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle remove assignment
  const handleRemoveAssignment = async (assignmentId, userName, entityName) => {
    if (!confirm(`Are you sure you want to remove ${userName} from ${entityName}?`)) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/api/assign-user/assignment/${assignmentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to remove assignment");

      // Refresh data
      fetchData();
      
      setSuccess("Assignment removed successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (assignmentId) => {
    setExpandedRows(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // Filter and sort assignments
  const filteredAssignments = assignments
    .filter(assignment => {
      // Filter by entity type
      if (filterType !== "all" && assignment.associateName !== filterType) {
        return false;
      }

      // Filter by user
      if (filterUser !== "all" && assignment.userId.toString() !== filterUser) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          assignment.user?.name?.toLowerCase().includes(searchLower) ||
          assignment.user?.email?.toLowerCase().includes(searchLower) ||
          assignment.entityName?.toLowerCase().includes(searchLower) ||
          assignment.associateName?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nested properties
      if (sortConfig.key === 'userName') {
        aValue = a.user?.name || a.user?.email || '';
        bValue = b.user?.name || b.user?.email || '';
      } else if (sortConfig.key === 'entityName') {
        aValue = a.entityName || '';
        bValue = b.entityName || '';
      }

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle date sorting
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return 0;
    });

  // Get entity icon based on type
  const getEntityIcon = (type) => {
    switch (type) {
      case "store": return <Store size={18} />;
      case "shop": return <Building2 size={18} />;
      case "factory": return <Factory size={18} />;
      case "cashRegister": return <Calculator size={18} />;
      case "account": return <CreditCard size={18} />;
      default: return <Briefcase size={18} />;
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['ID', 'User Name', 'User Email', 'User Role', 'Entity Type', 'Entity Name', 'Entity ID', 'Assignment Date'],
      ...filteredAssignments.map(a => [
        a.id,
        a.user?.name || '',
        a.user?.email || '',
        a.user?.role || '',
        getEntityTypeLabel(a.associateName),
        a.entityName || '',
        a.associateId,
        formatDate(a.user?.createdAt || new Date())
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading assigned users...</p>
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
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <UserCheck className="text-purple-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                All Assigned Users
              </h1>
              <p className="text-gray-600 mt-1">
                Complete list of user assignments across all entities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/assign-user")}
              className="glass-button px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <UserPlus size={18} />
              Assign Users
            </button>
            <button
              onClick={fetchData}
              className="glass-button px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center gap-2"
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
              <p className="text-sm font-medium text-gray-600 mb-1">Total Assignments</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalAssignments}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <UserCheck className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Unique Users</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.uniqueUsers}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {users.length} total users
              </p>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Users className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Unique Entities</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.uniqueEntities}</h3>
            </div>
            <div className="glass-icon p-2 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <Building2 className="text-green-600" size={20} />
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

      {/* Controls */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <List size={24} className="text-blue-600" />
              Assignments List
            </h2>
            <p className="text-gray-600 text-sm">
              Showing {filteredAssignments.length} of {assignments.length} assignments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === "table"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white/50 text-gray-700 hover:bg-white/80"
                }`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === "grid"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-white/50 text-gray-700 hover:bg-white/80"
                }`}
              >
                <Grid size={18} />
              </button>
            </div>
            <button
              onClick={exportToCSV}
              className="glass-button px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-300 flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by user name, email, or entity name..."
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

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="glass-input px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Entity Types</option>
                <option value="store">Stores</option>
                <option value="shop">Shops</option>
                <option value="factory">Factories</option>
                <option value="cashRegister">Cash Registers</option>
                <option value="account">Accounts</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="glass-input px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                  <th 
                    className="p-4 text-left font-medium text-gray-700 border-b border-white/20 cursor-pointer"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      {sortConfig.key === 'id' && (
                        <ChevronDown size={16} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-left font-medium text-gray-700 border-b border-white/20 cursor-pointer"
                    onClick={() => handleSort('userName')}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      User
                      {sortConfig.key === 'userName' && (
                        <ChevronDown size={16} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-left font-medium text-gray-700 border-b border-white/20 cursor-pointer"
                    onClick={() => handleSort('associateName')}
                  >
                    <div className="flex items-center gap-2">
                      Entity Type
                      {sortConfig.key === 'associateName' && (
                        <ChevronDown size={16} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-left font-medium text-gray-700 border-b border-white/20 cursor-pointer"
                    onClick={() => handleSort('entityName')}
                  >
                    <div className="flex items-center gap-2">
                      Entity Name
                      {sortConfig.key === 'entityName' && (
                        <ChevronDown size={16} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    User Role
                  </th>
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center">
                      <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                        <UserX className="text-gray-400" size={48} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No assignments found</h3>
                      <p className="text-gray-600 max-w-md mx-auto mb-6">
                        {searchTerm || filterType !== "all" || filterUser !== "all"
                          ? 'No assignments match your search criteria'
                          : 'No user assignments found in the system'}
                      </p>
                      {(searchTerm || filterType !== "all" || filterUser !== "all") && (
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setFilterType("all");
                            setFilterUser("all");
                          }}
                          className="glass-button px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <>
                      <tr
                        key={assignment.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-600">#{assignment.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="glass-icon p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                              <User size={18} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {assignment.user?.name || assignment.user?.email}
                              </p>
                              <p className="text-sm text-gray-600">
                                {assignment.user?.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`glass-icon p-2 rounded-lg ${
                              assignment.associateName === 'store' ? 'bg-blue-500/10' :
                              assignment.associateName === 'shop' ? 'bg-green-500/10' :
                              assignment.associateName === 'factory' ? 'bg-purple-500/10' :
                              assignment.associateName === 'cashRegister' ? 'bg-amber-500/10' :
                              'bg-indigo-500/10'
                            }`}>
                              {getEntityIcon(assignment.associateName)}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(assignment.associateName)}`}>
                              {getEntityTypeLabel(assignment.associateName)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">
                              {assignment.entityName || `Unknown ${assignment.associateName}`}
                            </p>
                            <span className="text-sm text-gray-500">
                              (ID: {assignment.associateId})
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {assignment.user?.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleRowExpansion(assignment.id)}
                              className="glass-icon-button p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
                              title={expandedRows[assignment.id] ? "Hide Details" : "Show Details"}
                            >
                              {expandedRows[assignment.id] ? (
                                <ChevronUp size={18} className="text-gray-600" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRemoveAssignment(
                                assignment.id,
                                assignment.user?.name || assignment.user?.email,
                                assignment.entityName
                              )}
                              className="glass-icon-button p-2 rounded-lg hover:bg-red-100/50 transition-colors"
                              title="Remove Assignment"
                            >
                              <UserMinus size={18} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {expandedRows[assignment.id] && (
                        <tr className="bg-gray-50/30">
                          <td colSpan="6" className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/50 rounded-lg border border-gray-200">
                              {/* User Details */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <User size={18} className="text-blue-600" />
                                  User Details
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Name:</span>
                                    <span className="font-medium">{assignment.user?.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Email:</span>
                                    <span className="font-medium">{assignment.user?.email}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Role:</span>
                                    <span className="font-medium">{assignment.user?.role}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">User ID:</span>
                                    <span className="font-mono text-sm">{assignment.userId}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Joined:</span>
                                    <span className="font-medium">
                                      {formatDate(assignment.user?.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Entity Details */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  {getEntityIcon(assignment.associateName)}
                                  Entity Details
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Type:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(assignment.associateName)}`}>
                                      {getEntityTypeLabel(assignment.associateName)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Name:</span>
                                    <span className="font-medium">{assignment.entityName}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Entity ID:</span>
                                    <span className="font-mono text-sm">{assignment.associateId}</span>
                                  </div>
                                  {assignment.entityDetails?.address && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Address:</span>
                                      <span className="font-medium text-right">
                                        {assignment.entityDetails.address}
                                      </span>
                                    </div>
                                  )}
                                  {assignment.entityDetails?.mobile && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Contact:</span>
                                      <span className="font-medium">{assignment.entityDetails.mobile}</span>
                                    </div>
                                  )}
                                  {assignment.entityDetails?.cash_in_hand !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Cash in Hand:</span>
                                      <span className="font-medium">
                                        {formatCurrency(assignment.entityDetails.cash_in_hand)}
                                      </span>
                                    </div>
                                  )}
                                  {assignment.entityDetails?.balance !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Balance:</span>
                                      <span className="font-medium">
                                        {formatCurrency(assignment.entityDetails.balance)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.length === 0 ? (
            <div className="col-span-full">
              <div className="glass-card p-12 text-center border border-white/20 backdrop-blur-xl shadow-lg">
                <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                  <UserX className="text-gray-400" size={48} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No assignments found</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {searchTerm || filterType !== "all" || filterUser !== "all"
                    ? 'No assignments match your search criteria'
                    : 'No user assignments found in the system'}
                </p>
                {(searchTerm || filterType !== "all" || filterUser !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                      setFilterUser("all");
                    }}
                    className="glass-button px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="glass-card border border-white/20 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="glass-icon p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                          <User size={18} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          Assignment #{assignment.id}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {assignment.user?.name || assignment.user?.email}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {assignment.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignment(
                        assignment.id,
                        assignment.user?.name || assignment.user?.email,
                        assignment.entityName
                      )}
                      className="glass-icon-button p-2 rounded-lg hover:bg-red-100/50 transition-colors"
                      title="Remove Assignment"
                    >
                      <UserMinus size={18} className="text-red-600" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="glass-card-inner p-4 mb-4 bg-gradient-to-r from-blue-50/50 to-blue-100/50 border border-blue-200/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <User size={16} className="text-blue-600" />
                      <h4 className="font-medium text-gray-800">User Information</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {assignment.user?.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">User ID:</span>
                        <span className="font-mono text-sm">{assignment.userId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Joined:</span>
                        <span className="text-sm font-medium">
                          {formatDate(assignment.user?.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Entity Info */}
                  <div className={`glass-card-inner p-4 mb-4 border rounded-lg ${
                    assignment.associateName === 'store' ? 'border-blue-200/30 bg-gradient-to-r from-blue-50/50 to-blue-100/50' :
                    assignment.associateName === 'shop' ? 'border-green-200/30 bg-gradient-to-r from-green-50/50 to-green-100/50' :
                    assignment.associateName === 'factory' ? 'border-purple-200/30 bg-gradient-to-r from-purple-50/50 to-purple-100/50' :
                    assignment.associateName === 'cashRegister' ? 'border-amber-200/30 bg-gradient-to-r from-amber-50/50 to-amber-100/50' :
                    'border-indigo-200/30 bg-gradient-to-r from-indigo-50/50 to-indigo-100/50'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {getEntityIcon(assignment.associateName)}
                      <h4 className="font-medium text-gray-800">Entity Information</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEntityTypeColor(assignment.associateName)}`}>
                          {getEntityTypeLabel(assignment.associateName)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="font-medium text-right">
                          {assignment.entityName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Entity ID:</span>
                        <span className="font-mono text-sm">{assignment.associateId}</span>
                      </div>
                      {assignment.entityDetails?.address && (
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-gray-600">Address:</span>
                          <span className="font-medium text-right text-sm">
                            {assignment.entityDetails.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="flex items-center justify-between text-sm text-gray-500 border-t border-white/20 pt-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>Assigned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {formatDate(assignment.user?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary Footer */}
      <div className="glass-card p-4 mt-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Summary:</span> {filteredAssignments.length} assignments displayed • 
            {Object.entries(stats.assignmentsByType || {}).map(([type, count]) => (
              <span key={type} className="ml-2">
                {getEntityTypeLabel(type)}: {count}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">
                {stats.uniqueUsers} unique users assigned
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}