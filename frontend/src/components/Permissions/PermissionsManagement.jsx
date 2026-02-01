import { useEffect, useState } from "react";
import { 
  Shield, 
  UserPlus, 
  List, 
  Key, 
  Save, 
  Trash2, 
  Edit, 
  Users,
  Check,
  X,
  Search,
  Filter,
  CheckSquare,
  Square,
  Plus,
  UserCheck,
  LayoutDashboard,
  Package,
  Tag,
  Factory,
  Warehouse,
  Store,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  Truck,
  CreditCard,
  BarChart3,
  User
} from "lucide-react";

export default function PermissionsManagement() {
  const [activeTab, setActiveTab] = useState("permissions");
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Permissions form state
  const [permissionName, setPermissionName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [editingPermission, setEditingPermission] = useState(null);
  
  // User assignment state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchPermission, setSearchPermission] = useState("");
  
  // Permission categories with icons
  const permissionCategories = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard size={18} className="text-blue-500" />,
      permissions: ['view']
    },
    {
      id: 'material',
      name: 'Material',
      icon: <Package size={18} className="text-green-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'product',
      name: 'Product',
      icon: <Tag size={18} className="text-purple-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'production',
      name: 'Production',
      icon: <Factory size={18} className="text-amber-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'scrap_record',
      name: 'Scrap Record',
      icon: <Warehouse size={18} className="text-red-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'repair',
      name: 'Repair',
      icon: <Factory size={18} className="text-orange-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'factory',
      name: 'Factory',
      icon: <Factory size={18} className="text-cyan-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'stores',
      name: 'Stores',
      icon: <Store size={18} className="text-indigo-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'shop',
      name: 'Shop',
      icon: <ShoppingBag size={18} className="text-pink-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'purchase',
      name: 'Purchase',
      icon: <ShoppingCart size={18} className="text-teal-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'sale',
      name: 'Sale',
      icon: <Receipt size={18} className="text-emerald-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'transfer',
      name: 'Transfer',
      icon: <Truck size={18} className="text-gray-600" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'accounts',
      name: 'Accounts',
      icon: <CreditCard size={18} className="text-yellow-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'report',
      name: 'Report',
      icon: <BarChart3 size={18} className="text-violet-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    },
    {
      id: 'user',
      name: 'User',
      icon: <User size={18} className="text-rose-500" />,
      permissions: ['create', 'read', 'edit', 'delete']
    }
  ];

  // Initialize selected permissions
  useEffect(() => {
    if (editingPermission) {
      // Parse existing permissions into checkbox state
      const parsedPermissions = {};
      const currentPerms = Array.isArray(editingPermission.permissions) 
        ? editingPermission.permissions 
        : [];
      
      permissionCategories.forEach(category => {
        category.permissions.forEach(perm => {
          const permissionString = `${category.id}_${perm}`;
          parsedPermissions[permissionString] = currentPerms.includes(permissionString);
        });
      });
      
      setSelectedPermissions(parsedPermissions);
    } else {
      // Reset to empty state
      const initialPermissions = {};
      permissionCategories.forEach(category => {
        category.permissions.forEach(perm => {
          const permissionString = `${category.id}_${perm}`;
          initialPermissions[permissionString] = false;
        });
      });
      setSelectedPermissions(initialPermissions);
    }
  }, [editingPermission]);

  // Filtered data
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchUser.toLowerCase())
  );
  
  const filteredPermissions = permissions.filter(perm =>
    perm.name?.toLowerCase().includes(searchPermission.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [permsRes, usersRes] = await Promise.all([
        fetch("http://localhost:3001/api/permissions"),
        fetch("http://localhost:3001/api/users")
      ]);
      
      if (!permsRes.ok) throw new Error("Failed to fetch permissions");
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      
      const permsData = await permsRes.json();
      const usersData = await usersRes.json();
      
      setPermissions(permsData);
      setUsers(usersData.filter(user => user.role !== "ADMIN"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionString) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionString]: !prev[permissionString]
    }));
  };

  const handleSelectAllCategory = (categoryId) => {
    const category = permissionCategories.find(c => c.id === categoryId);
    const allSelected = category.permissions.every(perm => 
      selectedPermissions[`${categoryId}_${perm}`]
    );
    
    const updatedPermissions = { ...selectedPermissions };
    category.permissions.forEach(perm => {
      updatedPermissions[`${categoryId}_${perm}`] = !allSelected;
    });
    
    setSelectedPermissions(updatedPermissions);
  };

  const getSelectedPermissionsArray = () => {
    return Object.entries(selectedPermissions)
      .filter(([_, isSelected]) => isSelected)
      .map(([permissionString]) => permissionString);
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    if (!permissionName.trim()) {
      alert("Please enter a permission name");
      return;
    }

    const selectedPermsArray = getSelectedPermissionsArray();
    if (selectedPermsArray.length === 0) {
      alert("Please select at least one permission");
      return;
    }

    try {
      const endpoint = editingPermission 
        ? `http://localhost:3001/api/permissions/${editingPermission.id}`
        : "http://localhost:3001/api/permissions";
      
      const method = editingPermission ? "PUT" : "POST";
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: permissionName,
          permissions: selectedPermsArray
        })
      });

      if (!res.ok) throw new Error("Failed to save permission");
      
      // Reset form
      setPermissionName("");
      const resetPermissions = {};
      permissionCategories.forEach(category => {
        category.permissions.forEach(perm => {
          resetPermissions[`${category.id}_${perm}`] = false;
        });
      });
      setSelectedPermissions(resetPermissions);
      setEditingPermission(null);
      
      // Refresh data
      fetchData();
      
      alert(editingPermission ? "Permission updated!" : "Permission created!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    setPermissionName(permission.name);
  };

  const handleDeletePermission = async (id) => {
    if (!confirm("Are you sure you want to delete this permission?")) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/permissions/${id}`, {
        method: "DELETE"
      });
      
      if (!res.ok) throw new Error("Failed to delete permission");
      
      fetchData();
      alert("Permission deleted!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssignPermission = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedPermissionId) {
      alert("Please select both user and permission");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/users/${selectedUserId}/permission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId: selectedPermissionId })
      });

      if (!res.ok) throw new Error("Failed to assign permission");
      
      // Reset form
      setSelectedUserId("");
      setSelectedPermissionId("");
      
      // Refresh data
      fetchData();
      
      alert("Permission assigned successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemovePermission = async (userId) => {
    if (!confirm("Remove permission from this user?")) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/users/${userId}/permission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId: null })
      });

      if (!res.ok) throw new Error("Failed to remove permission");
      
      fetchData();
      alert("Permission removed!");
    } catch (err) {
      alert(err.message);
    }
  };

  // Check if all permissions in a category are selected
  const isCategoryAllSelected = (categoryId) => {
    const category = permissionCategories.find(c => c.id === categoryId);
    return category.permissions.every(perm => 
      selectedPermissions[`${categoryId}_${perm}`]
    );
  };

  // Check if any permission in a category is selected
  const isCategoryAnySelected = (categoryId) => {
    const category = permissionCategories.find(c => c.id === categoryId);
    return category.permissions.some(perm => 
      selectedPermissions[`${categoryId}_${perm}`]
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-purple-100/50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Permissions Management
            </h1>
          </div>
        </div>
        <div className="text-center py-12 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl xl:max-w-full p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-purple-100/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
                <Shield className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Permissions Management
                </h1>
                <p className="text-gray-600 mt-1">Manage system permissions and user assignments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Permissions</p>
                <p className="text-xl font-bold text-purple-600">{permissions.length}</p>
              </div>
              
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Users with Permissions</p>
                <p className="text-xl font-bold text-indigo-600">
                  {users.filter(u => u.permissionId).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <div className="flex border-b border-white/50">
            <button
              onClick={() => setActiveTab("permissions")}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all duration-300 ${
                activeTab === "permissions"
                  ? "text-purple-600 border-b-2 border-purple-500"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/20"
              }`}
            >
              <Key size={20} />
              Manage Permissions
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-medium transition-all duration-300 ${
                activeTab === "assignments"
                  ? "text-purple-600 border-b-2 border-purple-500"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/20"
              }`}
            >
              <UserCheck size={20} />
              Assign to Users
            </button>
          </div>
        </div>

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            {/* Create/Edit Permission Form */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                  {editingPermission ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingPermission ? "Edit Permission" : "Create New Permission"}
                </h2>
              </div>

              <form onSubmit={handleCreatePermission} className="space-y-6">
                {/* Permission Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permission Name
                  </label>
                  <input
                    type="text"
                    value={permissionName}
                    onChange={(e) => setPermissionName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-white/60 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Cashier, Manager, Inventory_Manager"
                    required
                  />
                </div>

                {/* Permissions Grid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Permissions
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissionCategories.map((category) => (
                      <div 
                        key={category.id}
                        className="border border-white/60 rounded-xl p-4 bg-white/20 backdrop-blur-sm"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/50">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            <h3 className="font-semibold text-gray-800">{category.name}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectAllCategory(category.id)}
                            className="text-xs px-2 py-1 bg-white/60 rounded hover:bg-white/80 transition-colors"
                          >
                            {isCategoryAllSelected(category.id) ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        {/* Permission Checkboxes */}
                        <div className="space-y-2">
                          {category.permissions.map((perm) => {
                            const permissionString = `${category.id}_${perm}`;
                            return (
                              <label 
                                key={permissionString}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/30 cursor-pointer transition-colors"
                              >
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions[permissionString] || false}
                                    onChange={() => handlePermissionToggle(permissionString)}
                                    className="sr-only"
                                  />
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                    selectedPermissions[permissionString]
                                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 border-transparent'
                                      : 'border-gray-300 bg-white'
                                  }`}>
                                    {selectedPermissions[permissionString] && (
                                      <Check size={14} className="text-white" />
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm text-gray-700 capitalize">
                                  {perm}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Category Summary */}
                        <div className="mt-3 pt-2 border-t border-white/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {category.permissions.filter(perm => 
                                selectedPermissions[`${category.id}_${perm}`]
                              ).length} of {category.permissions.length} selected
                            </span>
                            {isCategoryAnySelected(category.id) && !isCategoryAllSelected(category.id) && (
                              <span className="text-amber-600">Partial</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Permissions Summary */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={18} className="text-blue-600" />
                    <span className="font-medium text-gray-800">Selected Permissions</span>
                    <span className="ml-auto px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700">
                      {getSelectedPermissionsArray().length} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedPermissionsArray().length > 0 ? (
                      getSelectedPermissionsArray().map((perm) => (
                        <span
                          key={perm}
                          className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                        >
                          {perm}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No permissions selected</span>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 flex items-center gap-2 shadow-lg"
                  >
                    <Save size={20} />
                    {editingPermission ? "Update Permission" : "Create Permission"}
                  </button>
                  {editingPermission && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPermission(null);
                        setPermissionName("");
                        const resetPermissions = {};
                        permissionCategories.forEach(category => {
                          category.permissions.forEach(perm => {
                            resetPermissions[`${category.id}_${perm}`] = false;
                          });
                        });
                        setSelectedPermissions(resetPermissions);
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
                    >
                      <X size={20} />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Permissions List */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <List className="text-purple-600" size={20} />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">All Permissions</h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    {permissions.length} permission set{permissions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {permissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="p-6 bg-white/50 rounded-full inline-block mb-6">
                    <Key size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Permissions Found</h3>
                  <p className="text-gray-600">Create your first permission set above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">Name</th>
                        <th className="p-4 text-left font-medium text-gray-700">Permissions</th>
                        <th className="p-4 text-left font-medium text-gray-700">Assigned Users</th>
                        <th className="p-4 text-left font-medium text-gray-700">Created</th>
                        <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((permission) => (
                        <tr key={permission.id} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-4">
                            <div className="font-medium text-purple-700">{permission.name}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2 max-w-md">
                              {Array.isArray(permission.permissions) ? (
                                permission.permissions.map((perm, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                                    title={perm}
                                  >
                                    {perm}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">No permissions</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-gray-500" />
                              <span className="font-medium">
                                {permission.users?.length || 0} user{permission.users?.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-600">
                            {new Date(permission.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPermission(permission)}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(permission.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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
              )}
            </div>
          </div>
        )}

        {/* Assignments Tab - Keep as before */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            {/* Assignment Form */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                  <UserPlus className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Assign Permission to User
                </h2>
              </div>

              <form onSubmit={handleAssignPermission} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* User Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select User
                    </label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={searchUser}
                          onChange={(e) => setSearchUser(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/60 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Search users..."
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-white/60 bg-white/30">
                        {filteredUsers.map(user => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`p-3 border-b border-white/50 cursor-pointer transition-colors hover:bg-white/50 ${
                              selectedUserId === user.id ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{user.name || 'No Name'}</div>
                                <div className="text-sm text-gray-600">{user.email}</div>
                              </div>
                              {selectedUserId === user.id && (
                                <Check className="text-purple-600" size={18} />
                              )}
                            </div>
                            {user.permission && (
                              <div className="mt-2 text-xs bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                                Current: {user.permission.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Permission Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Permission
                    </label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={searchPermission}
                          onChange={(e) => setSearchPermission(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/60 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Search permissions..."
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-white/60 bg-white/30">
                        {filteredPermissions.map(permission => (
                          <div
                            key={permission.id}
                            onClick={() => setSelectedPermissionId(permission.id)}
                            className={`p-3 border-b border-white/50 cursor-pointer transition-colors hover:bg-white/50 ${
                              selectedPermissionId === permission.id ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{permission.name}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {Array.isArray(permission.permissions) 
                                    ? `${permission.permissions.length} permission${permission.permissions.length !== 1 ? 's' : ''}`
                                    : 'No permissions'
                                  }
                                </div>
                              </div>
                              {selectedPermissionId === permission.id && (
                                <Check className="text-purple-600" size={18} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedUserId || !selectedPermissionId}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  <UserCheck size={20} />
                  Assign Permission
                </button>
              </form>
            </div>

            {/* Users with Permissions List */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="text-purple-600" size={20} />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Users with Permissions</h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    {users.filter(u => u.permissionId).length} user{users.filter(u => u.permissionId).length !== 1 ? 's' : ''} with permissions
                  </div>
                </div>
              </div>

              {users.filter(u => u.permissionId).length === 0 ? (
                <div className="p-12 text-center">
                  <div className="p-6 bg-white/50 rounded-full inline-block mb-6">
                    <Users size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Users with Permissions</h3>
                  <p className="text-gray-600">Assign permissions to users using the form above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-4 text-left font-medium text-gray-700">User</th>
                        <th className="p-4 text-left font-medium text-gray-700">Email</th>
                        <th className="p-4 text-left font-medium text-gray-700">Role</th>
                        <th className="p-4 text-left font-medium text-gray-700">Assigned Permission</th>
                        <th className="p-4 text-left font-medium text-gray-700">Permissions List</th>
                        <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.permissionId).map(user => (
                        <tr key={user.id} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-4">
                            <div className="font-medium text-gray-800">{user.name || 'No Name'}</div>
                          </td>
                          <td className="p-4 text-gray-600">{user.email}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN' 
                                ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-700' 
                                : 'bg-gradient-to-r from-green-100 to-green-50 text-green-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-purple-700">
                              {user.permission?.name || 'No Permission'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2 max-w-md">
                              {user.permission?.permissions && Array.isArray(user.permission.permissions) ? (
                                user.permission.permissions.slice(0, 5).map((perm, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded"
                                    title={perm}
                                  >
                                    {perm}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">No permissions</span>
                              )}
                              {user.permission?.permissions && Array.isArray(user.permission.permissions) && user.permission.permissions.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{user.permission.permissions.length - 5} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleRemovePermission(user.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-50 text-red-600 rounded-lg font-medium hover:from-red-200 hover:to-red-100 transition-all duration-300 flex items-center gap-2"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}