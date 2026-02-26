import { useEffect, useState, useRef, useCallback } from "react";
import { API_ROUTES } from "../../config";
import {
  Users,
  UserPlus,
  UserCheck,
  DollarSign,
  Calendar,
  Search,
  Briefcase,
  CheckCircle,
  XCircle,
  Edit,
  Mail,
  UserCog,
  Loader2,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  AlertTriangle,
  Database
} from "lucide-react";

// Debounce function for search
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    userId: "",
    designation: "",
    baseSalary: "",
    salaryType: "monthly",
    joiningDate: "",
    status: "active"
  });
  const [managerForm, setManagerForm] = useState({
    userId: "",
    managerId: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [managerSearchResults, setManagerSearchResults] = useState([]);
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  
  const userSearchRef = useRef(null);
  const managerSearchRef = useRef(null);
  const employeeSearchRef = useRef(null);
  const token = localStorage.getItem("token");

  // Statistics
  const activeEmployees = users.filter(u => u.employeeProfile?.status === "active").length;
  const inactiveEmployees = users.filter(u => u.employeeProfile?.status === "inactive").length;
  const totalSalary = users.reduce((sum, u) => sum + (u.employeeProfile?.baseSalary || 0), 0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROUTES.HRM}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      // Calculate total pages based on filtered users
      const filtered = filterUsersBasedOnSearch(data, searchQuery);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (managerSearchRef.current && !managerSearchRef.current.contains(event.target)) {
        setShowManagerDropdown(false);
      }
      if (employeeSearchRef.current && !employeeSearchRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Function to filter users based on search query
  const filterUsersBasedOnSearch = (usersList, query) => {
    if (!query) return usersList;
    
    const searchLower = query.toLowerCase();
    return usersList.filter(user => {
      return (
        (user.name?.toLowerCase().includes(searchLower)) ||
        (user.email?.toLowerCase().includes(searchLower)) ||
        (user.username?.toLowerCase().includes(searchLower)) ||
        (user.employeeProfile?.designation?.toLowerCase().includes(searchLower))
      );
    });
  };

  // LOCAL SEARCH ONLY - No API calls
  const performLocalSearch = (query, type) => {
    setSearching(true);
    
    setTimeout(() => {
      if (!query || query.trim().length < 1) {
        if (type === "user") setUserSearchResults([]);
        if (type === "manager") setManagerSearchResults([]);
        if (type === "employee") setEmployeeSearchResults([]);
        setSearching(false);
        return;
      }

      const searchLower = query.toLowerCase().trim();
      
      // Filter from existing users
      const filteredUsers = users.filter(user => {
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
        );
      }).slice(0, 10); // Limit to 10 results

      if (type === "user") setUserSearchResults(filteredUsers);
      if (type === "manager") setManagerSearchResults(filteredUsers);
      if (type === "employee") setEmployeeSearchResults(filteredUsers);
      
      setSearching(false);
    }, 150); // Small delay for better UX
  };

  // Debounced search function - LOCAL ONLY
  const debouncedSearch = useCallback(
    debounce((query, type) => {
      performLocalSearch(query, type);
    }, 300),
    [users] // Recreate when users change
  );

  const handleUserSearch = (query) => {
    setSelectedUserName(query);
    debouncedSearch(query, "user");
    setShowUserDropdown(true);
  };

  const handleManagerSearch = (query) => {
    setSelectedManagerName(query);
    debouncedSearch(query, "manager");
    setShowManagerDropdown(true);
  };

  const handleEmployeeSearch = (query) => {
    setSelectedEmployeeName(query);
    debouncedSearch(query, "employee");
    setShowEmployeeDropdown(true);
  };

  const handleUserSelect = (user) => {
    setForm({ ...form, userId: user.id });
    setSelectedUserName(user.name || user.username || user.email);
    setShowUserDropdown(false);
  };

  const handleManagerSelect = (manager) => {
    setManagerForm({ ...managerForm, managerId: manager.id });
    setSelectedManagerName(manager.name || manager.username || manager.email);
    setShowManagerDropdown(false);
  };

  const handleEmployeeSelect = (employee) => {
    setManagerForm({ ...managerForm, userId: employee.id });
    setSelectedEmployeeName(employee.name || employee.username || employee.email);
    setShowEmployeeDropdown(false);
  };

  const clearUserSelection = () => {
    setForm({ ...form, userId: "" });
    setSelectedUserName("");
    setUserSearchResults([]);
  };

  const clearManagerSelection = () => {
    setManagerForm({ ...managerForm, managerId: "" });
    setSelectedManagerName("");
    setManagerSearchResults([]);
  };

  const clearEmployeeSelection = () => {
    setManagerForm({ ...managerForm, userId: "" });
    setSelectedEmployeeName("");
    setEmployeeSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId) {
      alert("Please select a user");
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.HRM}/employees`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        const profile = await res.json();
        alert("Employee profile saved successfully!");
        setForm({
          userId: "",
          designation: "",
          baseSalary: "",
          salaryType: "monthly",
          joiningDate: "",
          status: "active"
        });
        setSelectedUserName("");
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("Failed to save employee");
    }
  };

  const handleManagerAssign = async (e) => {
    e.preventDefault();
    if (!managerForm.userId || !managerForm.managerId) {
      alert("Please select both employee and manager");
      return;
    }

    if (managerForm.userId === managerForm.managerId) {
      alert("Employee cannot be their own manager");
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.HRM}/employees/${managerForm.userId}/manager`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ managerId: managerForm.managerId, isPrimary: true })
      });

      if (res.ok) {
        alert("Manager assigned successfully!");
        setManagerForm({ userId: "", managerId: "" });
        setSelectedEmployeeName("");
        setSelectedManagerName("");
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to assign manager");
      }
    } catch (error) {
      console.error("Error assigning manager:", error);
      alert("Failed to assign manager");
    }
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm("Delete this employee? This removes employee profile and manager mapping.")) {
      return;
    }

    try {
      setDeletingId(userId);
      const res = await fetch(`${API_ROUTES.HRM}/employees/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete employee");
      await fetchUsers();
    } catch (error) {
      alert(error.message || "Failed to delete employee");
    } finally {
      setDeletingId(null);
    }
  };

  const getManagerName = (user) => {
    if (user.reportsTo && user.reportsTo.length > 0) {
      const primaryManager = user.reportsTo.find(r => r.isPrimary) || user.reportsTo[0];
      return primaryManager.manager?.name || primaryManager.manager?.username || "No name";
    }
    return "-";
  };

  const getStatusBadge = (status) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle size={12} />
        Inactive
      </span>
    );
  };

  // Filter users for table based on search query
  const filteredUsers = filterUsersBasedOnSearch(users, searchQuery);
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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

  // Update total pages when search or items per page changes
  useEffect(() => {
    setTotalPages(Math.ceil(filteredUsers.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when search changes
  }, [filteredUsers.length, itemsPerPage]);

  // Get selected user info for display
  const getSelectedUserInfo = (id, type) => {
    if (!id) return "";
    const user = users.find(u => u.id === id);
    if (user) {
      return user.name || user.username || user.email;
    }
    return "";
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
                <Users className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Employee Management
                </h1>
                <p className="text-gray-600 mt-2">Manage employee profiles, assignments, and details</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{activeEmployees}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-amber-600">{inactiveEmployees}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <XCircle size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Salary</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${totalSalary.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <DollarSign size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Forms Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Add/Edit Employee Form */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <UserPlus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Employee Profile</h2>
                <p className="text-sm text-gray-600">Add or update employee information</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Search */}
              <div className="relative" ref={userSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select User <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search users..."
                    value={selectedUserName || getSelectedUserInfo(form.userId, "user")}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    onFocus={() => {
                      if (selectedUserName || form.userId) {
                        handleUserSearch(selectedUserName || getSelectedUserInfo(form.userId, "user"));
                      }
                      setShowUserDropdown(true);
                    }}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10"
                    required
                  />
                  {(selectedUserName || form.userId) && (
                    <button
                      type="button"
                      onClick={clearUserSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white/95 backdrop-blur-lg border border-white/60 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {searching ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-500" size={20} />
                        <p className="text-sm text-gray-500 mt-2">Searching {users.length} users...</p>
                      </div>
                    ) : userSearchResults.length > 0 ? (
                      userSearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer border-b border-white/30 last:border-b-0"
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {user.name || user.username}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </div>
                              {user.employeeProfile?.designation && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {user.employeeProfile.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : selectedUserName ? (
                      <div className="p-4 text-center text-gray-500">
                        No users found for "{selectedUserName}"
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Start typing to search {users.length} users
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Base Salary
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.baseSalary}
                      onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Salary Type
                  </label>
                  <select
                    value={form.salaryType}
                    onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Joining Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={form.joiningDate}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                Save Employee Profile
              </button>
            </form>
          </div>

          {/* Assign Manager Form */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl">
                <UserCheck size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Assign Manager</h2>
                <p className="text-sm text-gray-600">Assign or change employee's manager</p>
              </div>
            </div>

            <form onSubmit={handleManagerAssign} className="space-y-4">
              {/* Employee Search */}
              <div className="relative" ref={employeeSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search employees..."
                    value={selectedEmployeeName || getSelectedUserInfo(managerForm.userId, "employee")}
                    onChange={(e) => handleEmployeeSearch(e.target.value)}
                    onFocus={() => {
                      if (selectedEmployeeName || managerForm.userId) {
                        handleEmployeeSearch(selectedEmployeeName || getSelectedUserInfo(managerForm.userId, "employee"));
                      }
                      setShowEmployeeDropdown(true);
                    }}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10"
                    required
                  />
                  {(selectedEmployeeName || managerForm.userId) && (
                    <button
                      type="button"
                      onClick={clearEmployeeSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {showEmployeeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white/95 backdrop-blur-lg border border-white/60 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {searching ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-500" size={20} />
                        <p className="text-sm text-gray-500 mt-2">Searching {users.length} employees...</p>
                      </div>
                    ) : employeeSearchResults.length > 0 ? (
                      employeeSearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer border-b border-white/30 last:border-b-0"
                          onClick={() => handleEmployeeSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white text-sm font-semibold">
                              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'E'}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {user.name || user.username}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </div>
                              {user.employeeProfile?.designation && (
                                <div className="text-xs text-emerald-600 mt-1">
                                  {user.employeeProfile.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : selectedEmployeeName ? (
                      <div className="p-4 text-center text-gray-500">
                        No employees found for "{selectedEmployeeName}"
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Start typing to search {users.length} employees
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manager Search */}
              <div className="relative" ref={managerSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Manager <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search managers..."
                    value={selectedManagerName || getSelectedUserInfo(managerForm.managerId, "manager")}
                    onChange={(e) => handleManagerSearch(e.target.value)}
                    onFocus={() => {
                      if (selectedManagerName || managerForm.managerId) {
                        handleManagerSearch(selectedManagerName || getSelectedUserInfo(managerForm.managerId, "manager"));
                      }
                      setShowManagerDropdown(true);
                    }}
                    className="w-full px-4 py-2.5 border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10"
                    required
                  />
                  {(selectedManagerName || managerForm.managerId) && (
                    <button
                      type="button"
                      onClick={clearManagerSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {showManagerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white/95 backdrop-blur-lg border border-white/60 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {searching ? (
                      <div className="p-4 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-500" size={20} />
                        <p className="text-sm text-gray-500 mt-2">Searching {users.length} managers...</p>
                      </div>
                    ) : managerSearchResults.length > 0 ? (
                      managerSearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-blue-50/50 cursor-pointer border-b border-white/30 last:border-b-0"
                          onClick={() => handleManagerSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800">
                                {user.name || user.username}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </div>
                              {user.employeeProfile?.designation && (
                                <div className="text-xs text-amber-600 mt-1">
                                  {user.employeeProfile.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : selectedManagerName ? (
                      <div className="p-4 text-center text-gray-500">
                        No managers found for "{selectedManagerName}"
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        Start typing to search {users.length} managers
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <UserCheck size={20} />
                Assign Manager
              </button>
            </form>
          </div>
        </div>

        {/* Employees Table */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">All Employees</h2>
                <p className="text-sm text-gray-600">List of all employees and their details</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} employee{users.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading employees...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <Users size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Employees Found</h3>
              <p className="text-gray-600">Start by creating your first employee profile</p>
            </div>
          ) : (
            <>
              {searchQuery && (
                <div className="mb-4 text-sm text-gray-600">
                  Search results for: <span className="font-medium">"{searchQuery}"</span>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                      <th className="p-4 text-left font-medium text-gray-700">Designation</th>
                      <th className="p-4 text-left font-medium text-gray-700">Salary</th>
                      <th className="p-4 text-left font-medium text-gray-700">Type</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Manager</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, index) => (
                      <tr
                        key={user.id}
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{user.name || user.username}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-700">
                              {user.employeeProfile?.designation || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-gray-400" />
                            <span className="font-bold text-gray-900">
                              ${(user.employeeProfile?.baseSalary || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                            {user.employeeProfile?.salaryType || 'monthly'}
                          </span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(user.employeeProfile?.status || 'active')}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <UserCog size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-700">
                              {getManagerName(user)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setForm({
                                  userId: user.id,
                                  designation: user.employeeProfile?.designation || '',
                                  baseSalary: user.employeeProfile?.baseSalary || '',
                                  salaryType: user.employeeProfile?.salaryType || 'monthly',
                                  joiningDate: user.employeeProfile?.joiningDate?.split('T')[0] || '',
                                  status: user.employeeProfile?.status || 'active'
                                });
                                setSelectedUserName(user.name || user.username || user.email);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(user.id)}
                              disabled={deletingId === user.id}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300 disabled:opacity-60"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredUsers.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
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
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                          {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                        </span>{" "}
                        of <span className="font-semibold">{filteredUsers.length}</span> employees
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
