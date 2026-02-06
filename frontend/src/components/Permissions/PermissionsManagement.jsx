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
  User,
  Scale,
  Award,
  Layers,
  Building2,
  Banknote,
  Coins,
  ArrowLeftRight,
  FileSpreadsheet,
  AlertTriangle,
  Wrench,
  Wallet,
  Briefcase,
  Calendar,
  Users as UsersIcon,
  Settings,
  Database,
  DatabaseBackup,
  UserCog,
  KeyRound,
  Building,
  UserCircle,
  UserPlus as UserPlusIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  FileBarChart,
  ClipboardCheck,
  ClipboardList,
  PackageCheck,
  PackageX,
  Calculator,
  History,
  LogOut,
  Activity,
  BanknoteIcon
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
  
  // All permissions list (exact names as they should be sent to backend)
  const allPermissions = [
    // Product and material management permissions
    'material_create', 'material_read', 'material_edit', 'material_delete',
    'product_read', 'product_create', 'product_edit', 'product_delete',
    'unit_read', 'unit_create', 'unit_edit', 'unit_delete',
    'brand_read', 'brand_create', 'brand_edit', 'brand_delete',
    'product_category_read', 'product_category_create', 'product_category_edit', 'product_category_delete',

    // Store factory, shop management permissions
    'factory_create', 'factory_edit', 'factory_delete', 'factory_read',
    'store_create', 'store_edit', 'store_delete', 'store_read',
    'shop_create', 'shop_edit', 'shop_delete', 'shop_read',
    'inventory_adjustment_create', 'inventory_adjustment_read',

    // Add cash register and bank account permissions
    'cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete',
    'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit',
    'bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete',
    'bank_account_deposit', 'bank_account_withdraw',

    // Add account permissions
    'account_read', 'account_create', 'account_edit', 'account_delete',
    'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement', 'account_balance',

    // Add purchase permissions
    'purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchases_change_status', 'purchase_add_payment',
    'purchases_return_create', 'purchases_return_edit', 'purchases_return_delete', 'purchases_return_read',

    // Add production permissions
    'production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status', 

    // Add sales permissions
    'sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_add_payment',
    'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read',

    // Add transfer permissions
    'transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_receive',

    // Add Wastage/Damage permissions
    'damage_create', 'damage_edit', 'damage_delete', 'damage_read',

    // Add Repair permissions
    'repairs_create', 'repairs_edit', 'repairs_delete', 'repairs_read',

    // Add Expense permissions
    'expenses_create', 'expenses_edit', 'expenses_delete', 'expenses_read',

    // Add Salary and HRM permissions
    'salary_create', 'salary_edit', 'salary_delete', 'salary_read',
    'leave_approve', 'leave_read', 'holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read',
    
    // Add Report permissions
    'general_ledger_report', 'trial_balance_report', 'balance_sheet_report', 'cash_and_bank_report',
    'sales_report', 'purchases_report', 'stock_report', 'transfer_report',
    'profit_loss_report', 'purchase_sales_report', 'customer_report', 'supplier_report',
    'best_selling_product_report', 'worst_selling_product_report', 'profit_calender_report',

    // Add user management permissions
    'user_create', 'user_edit', 'user_delete', 'user_read', 'user_activate_deactivate', 'user_logout', 'user_associate_create', 'user_activity_log_read',

    // Add role and permission management permissions
    'role_create', 'role_edit', 'role_delete', 'role_read',

    // Add customer permissions
    'customer_read', 'customer_create', 'customer_edit', 'customer_delete',

    // Add supplier permissions
    'supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete',

    // System Management
    'general_settings_edit', 'company_settings_edit', 
    'data_import', 'data_export',
  ];

  // Group permissions by category for better organization in UI - SEPARATE CATEGORIES
  const permissionCategories = [
    // Material Management
    {
      key: 'material',
      name: 'Material',
      icon: <Package size={18} className="text-green-500" />,
      permissions: ['material_create', 'material_read', 'material_edit', 'material_delete']
    },
    // Product Management
    {
      key: 'product',
      name: 'Product',
      icon: <Tag size={18} className="text-purple-500" />,
      permissions: ['product_read', 'product_create', 'product_edit', 'product_delete']
    },
    // Unit Management
    {
      key: 'unit',
      name: 'Unit',
      icon: <Scale size={18} className="text-amber-500" />,
      permissions: ['unit_read', 'unit_create', 'unit_edit', 'unit_delete']
    },
    // Brand Management
    {
      key: 'brand',
      name: 'Brand',
      icon: <Award size={18} className="text-pink-500" />,
      permissions: ['brand_read', 'brand_create', 'brand_edit', 'brand_delete']
    },
    // Product Category Management
    {
      key: 'product_category',
      name: 'Product Category',
      icon: <Layers size={18} className="text-indigo-500" />,
      permissions: ['product_category_read', 'product_category_create', 'product_category_edit', 'product_category_delete']
    },
    // Factory Management
    {
      key: 'factory',
      name: 'Factory',
      icon: <Factory size={18} className="text-cyan-500" />,
      permissions: ['factory_create', 'factory_edit', 'factory_delete', 'factory_read']
    },
    // Store Management
    {
      key: 'store',
      name: 'Store',
      icon: <Store size={18} className="text-indigo-500" />,
      permissions: ['store_create', 'store_edit', 'store_delete', 'store_read']
    },
    // Shop Management
    {
      key: 'shop',
      name: 'Shop',
      icon: <ShoppingBag size={18} className="text-pink-500" />,
      permissions: ['shop_create', 'shop_edit', 'shop_delete', 'shop_read']
    },
    // Inventory Adjustment
    {
      key: 'inventory_adjustment',
      name: 'Inventory Adjustment',
      icon: <PackageCheck size={18} className="text-teal-500" />,
      permissions: ['inventory_adjustment_create', 'inventory_adjustment_read']
    },
    // Cash Register Management
    {
      key: 'cash_register',
      name: 'Cash Register',
      icon: <Coins size={18} className="text-yellow-600" />,
      permissions: [
        'cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete',
        'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit'
      ]
    },
    // Bank Account Management
    {
      key: 'bank_account',
      name: 'Bank Account',
      icon: <BanknoteIcon size={18} className="text-blue-600" />,
      permissions: [
        'bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete',
        'bank_account_deposit', 'bank_account_withdraw'
      ]
    },
    // Account Management
    {
      key: 'account',
      name: 'Accounts',
      icon: <CreditCard size={18} className="text-yellow-500" />,
      permissions: [
        'account_read', 'account_create', 'account_edit', 'account_delete',
        'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement', 'account_balance'
      ]
    },
    // Purchase Management
    {
      key: 'purchase',
      name: 'Purchase',
      icon: <ShoppingCart size={18} className="text-teal-500" />,
      permissions: [
        'purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchases_change_status', 'purchase_add_payment'
      ]
    },
    // Purchase Return Management
    {
      key: 'purchases_return',
      name: 'Purchase Return',
      icon: <PackageX size={18} className="text-rose-500" />,
      permissions: ['purchases_return_create', 'purchases_return_edit', 'purchases_return_delete', 'purchases_return_read']
    },
    // Production Management
    {
      key: 'production',
      name: 'Production',
      icon: <Factory size={18} className="text-amber-500" />,
      permissions: ['production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status']
    },
    // Sales Management
    {
      key: 'sales',
      name: 'Sales',
      icon: <Receipt size={18} className="text-emerald-500" />,
      permissions: [
        'sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_add_payment'
      ]
    },
    // Sales Return Management
    {
      key: 'sales_return',
      name: 'Sales Return',
      icon: <ArrowLeftRight size={18} className="text-red-500" />,
      permissions: ['sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read']
    },
    // Transfer Management
    {
      key: 'transfer',
      name: 'Transfer',
      icon: <Truck size={18} className="text-gray-600" />,
      permissions: ['transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_receive']
    },
    // Damage/Wastage Management
    {
      key: 'damage',
      name: 'Wastage/Damage',
      icon: <AlertTriangle size={18} className="text-red-500" />,
      permissions: ['damage_create', 'damage_edit', 'damage_delete', 'damage_read']
    },
    // Repair Management
    {
      key: 'repairs',
      name: 'Repairs',
      icon: <Wrench size={18} className="text-orange-600" />,
      permissions: ['repairs_create', 'repairs_edit', 'repairs_delete', 'repairs_read']
    },
    // Expense Management
    {
      key: 'expenses',
      name: 'Expenses',
      icon: <Wallet size={18} className="text-rose-600" />,
      permissions: ['expenses_create', 'expenses_edit', 'expenses_delete', 'expenses_read']
    },
    // Salary Management
    {
      key: 'salary',
      name: 'Salary',
      icon: <Briefcase size={18} className="text-green-600" />,
      permissions: ['salary_create', 'salary_edit', 'salary_delete', 'salary_read']
    },
    // Leave Management
    {
      key: 'leave',
      name: 'Leave',
      icon: <Calendar size={18} className="text-sky-500" />,
      permissions: ['leave_approve', 'leave_read']
    },
    // Holiday Management
    {
      key: 'holiday',
      name: 'Holiday',
      icon: <Calendar size={18} className="text-purple-500" />,
      permissions: ['holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read']
    },
    // Customer Management
    {
      key: 'customer',
      name: 'Customer',
      icon: <UserCircle size={18} className="text-blue-500" />,
      permissions: ['customer_read', 'customer_create', 'customer_edit', 'customer_delete']
    },
    // Supplier Management
    {
      key: 'supplier',
      name: 'Supplier',
      icon: <Building size={18} className="text-orange-500" />,
      permissions: ['supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete']
    },
    // User Management
    {
      key: 'user',
      name: 'User Management',
      icon: <UserCog size={18} className="text-rose-500" />,
      permissions: [
        'user_create', 'user_edit', 'user_delete', 'user_read', 
        'user_activate_deactivate', 'user_logout', 'user_associate_create', 'user_activity_log_read'
      ]
    },
    // Role & Permission Management
    {
      key: 'role',
      name: 'Role & Permissions',
      icon: <KeyRound size={18} className="text-purple-600" />,
      permissions: ['role_create', 'role_edit', 'role_delete', 'role_read']
    },
    // Reports
    {
      key: 'report',
      name: 'Reports',
      icon: <BarChart3 size={18} className="text-violet-500" />,
      permissions: [
        'general_ledger_report', 'trial_balance_report', 'balance_sheet_report', 'cash_and_bank_report',
        'sales_report', 'purchases_report', 'stock_report', 'transfer_report',
        'profit_loss_report', 'purchase_sales_report', 'customer_report', 'supplier_report',
        'best_selling_product_report', 'worst_selling_product_report', 'profit_calender_report'
      ]
    },
    // System Management
    {
      key: 'system',
      name: 'System Management',
      icon: <Settings size={18} className="text-gray-600" />,
      permissions: ['general_settings_edit', 'company_settings_edit', 'data_import', 'data_export']
    },
    // Dashboard
    {
      key: 'dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard size={18} className="text-blue-500" />,
      permissions: ['view']
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
      
      // Initialize all permissions as false
      allPermissions.forEach(perm => {
        parsedPermissions[perm] = currentPerms.includes(perm);
      });
      
      setSelectedPermissions(parsedPermissions);
    } else {
      // Reset to empty state
      const initialPermissions = {};
      allPermissions.forEach(perm => {
        initialPermissions[perm] = false;
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
      fetch("http://localhost:3001/api/user-management") // Changed to user-management
    ]);
    
    if (!permsRes.ok) throw new Error("Failed to fetch permissions");
    if (!usersRes.ok) throw new Error("Failed to fetch users");
    
    const permsData = await permsRes.json();
    const usersData = await usersRes.json();
    
    console.log('Permissions data:', permsData);
    console.log('Users with permissions data:', usersData);
    console.log('First user permission:', usersData[0]?.permission);
    
    setPermissions(permsData);
    // Filter out admin users - check if role property exists
    setUsers(usersData.filter(user => user.role !== "ADMIN" && user.role !== "admin"));
  } catch (err) {
    setError(err.message);
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
  }
};

  const handlePermissionToggle = (permissionName) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionName]: !prev[permissionName]
    }));
  };

  const handleSelectAllCategory = (categoryKey) => {
    const category = permissionCategories.find(c => c.key === categoryKey);
    const allSelected = category.permissions.every(perm => 
      selectedPermissions[perm]
    );
    
    const updatedPermissions = { ...selectedPermissions };
    category.permissions.forEach(perm => {
      updatedPermissions[perm] = !allSelected;
    });
    
    setSelectedPermissions(updatedPermissions);
  };

  const handleSelectAllPermissions = () => {
    const allSelected = allPermissions.every(perm => selectedPermissions[perm]);
    
    const updatedPermissions = { ...selectedPermissions };
    allPermissions.forEach(perm => {
      updatedPermissions[perm] = !allSelected;
    });
    
    setSelectedPermissions(updatedPermissions);
  };

  const getSelectedPermissionsArray = () => {
    return Object.entries(selectedPermissions)
      .filter(([_, isSelected]) => isSelected)
      .map(([permissionName]) => permissionName);
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    if (!permissionName.trim()) {
      alert("Please enter a role name");
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
      allPermissions.forEach(perm => {
        resetPermissions[perm] = false;
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
    const res = await fetch(`http://localhost:3001/api/user-management/${selectedUserId}/permission`, {
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
    const res = await fetch(`http://localhost:3001/api/user-management/${userId}/permission`, {
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
  const isCategoryAllSelected = (categoryKey) => {
    const category = permissionCategories.find(c => c.key === categoryKey);
    return category.permissions.every(perm => selectedPermissions[perm]);
  };

  // Check if any permission in a category is selected
  const isCategoryAnySelected = (categoryKey) => {
    const category = permissionCategories.find(c => c.key === categoryKey);
    return category.permissions.some(perm => selectedPermissions[perm]);
  };

  // Helper function to format permission names for display (remove underscores)
  const formatPermissionDisplay = (permissionName) => {
    // Replace underscores with spaces and capitalize first letter of each word
    return permissionName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to get a short label for checkboxes
  const getShortPermissionLabel = (permissionName) => {
    const parts = permissionName.split('_');
    const action = parts[parts.length - 1];
    
    const actionMap = {
      'create': 'Create',
      'read': 'View',
      'edit': 'Edit',
      'delete': 'Delete',
      'approve': 'Approve',
      'open': 'Open',
      'close': 'Close',
      'withdraw': 'Withdraw',
      'deposit': 'Deposit',
      'transfer': 'Transfer',
      'statement': 'Statement',
      'balance': 'Balance',
      'logout': 'Logout',
      'change_status': 'Change Status',
      'add_payment': 'Add Payment',
      'edit_today': 'Edit Today',
      'receive': 'Receive',
      'activate_deactivate': 'Activate/Deactivate',
      'associate_create': 'Create Associate',
      'activity_log_read': 'Activity Log',
      'report': 'Report'
    };
    
    return actionMap[action] || 
      action.charAt(0).toUpperCase() + action.slice(1);
  };

  // Count selected permissions in a category
  const countSelectedInCategory = (categoryKey) => {
    const category = permissionCategories.find(c => c.key === categoryKey);
    return category.permissions.filter(perm => selectedPermissions[perm]).length;
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

              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Available Permission Types</p>
                <p className="text-xl font-bold text-blue-600">{allPermissions.length}</p>
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
              Assign Role to Users
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
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={permissionName}
                    onChange={(e) => setPermissionName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Cashier, Manager, Inventory_Manager"
                    required
                  />
                </div>

                {/* Select All Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 flex items-center gap-2"
                  >
                    <CheckSquare size={16} />
                    {allPermissions.every(perm => selectedPermissions[perm]) 
                      ? "Deselect All" 
                      : "Select All"
                    }
                  </button>
                </div>

                {/* Permissions Grid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Permissions ({getSelectedPermissionsArray().length} selected)
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {permissionCategories.map((category) => (
                      <div 
                        key={category.key}
                        className="border border-white/60 rounded-xl p-4 bg-white/20 backdrop-blur-sm"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/50">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            <h3 className="font-semibold text-gray-800">{category.name}</h3>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                              {countSelectedInCategory(category.key)}/{category.permissions.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectAllCategory(category.key)}
                            className="text-xs px-2 py-1 bg-white/60 rounded hover:bg-white/80 transition-colors"
                          >
                            {isCategoryAllSelected(category.key) ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        {/* Permission Checkboxes */}
                        <div className="space-y-2">
                          {category.permissions.map((permission) => (
                            <label 
                              key={permission}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/30 cursor-pointer transition-colors"
                            >
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions[permission] || false}
                                  onChange={() => handlePermissionToggle(permission)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  selectedPermissions[permission]
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 border-transparent'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {selectedPermissions[permission] && (
                                    <Check size={14} className="text-white" />
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {getShortPermissionLabel(permission)}
                                </span>
                                <div className="text-xs text-gray-500 truncate" title={formatPermissionDisplay(permission)}>
                                  {formatPermissionDisplay(permission)}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Category Summary */}
                        <div className="mt-3 pt-2 border-t border-white/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {countSelectedInCategory(category.key)} of {category.permissions.length} selected
                            </span>
                            {isCategoryAnySelected(category.key) && !isCategoryAllSelected(category.key) && (
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
                    <span className="font-medium text-gray-800">Selected Permissions Summary</span>
                    <span className="ml-auto px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-700">
                      {getSelectedPermissionsArray().length} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
                    {getSelectedPermissionsArray().length > 0 ? (
                      getSelectedPermissionsArray().map((perm) => (
                        <span
                          key={perm}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200"
                          title={perm}
                        >
                          {formatPermissionDisplay(perm)}
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
                        allPermissions.forEach(perm => {
                          resetPermissions[perm] = false;
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
                                permission.permissions.slice(0, 6).map((perm, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                                    title={perm}
                                  >
                                    {formatPermissionDisplay(perm)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">No permissions</span>
                              )}
                              {Array.isArray(permission.permissions) && permission.permissions.length > 6 && (
                                <span className="text-xs text-gray-500">
                                  +{permission.permissions.length - 6} more
                                </span>
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

        {/* Assignments Tab */}
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
                        <th className="p-4 text-left font-medium text-gray-700">Sample Permissions</th>
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
                                user.permission.permissions.slice(0, 4).map((perm, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium rounded"
                                    title={perm}
                                  >
                                    {formatPermissionDisplay(perm)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">No permissions</span>
                              )}
                              {user.permission?.permissions && Array.isArray(user.permission.permissions) && user.permission.permissions.length > 4 && (
                                <span className="text-xs text-gray-500">
                                  +{user.permission.permissions.length - 4} more
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