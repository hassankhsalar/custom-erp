import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usePermission } from '../hooks/usePermission'; // Import usePermission
import { 
  ChevronDown, ChevronRight, ChevronLeft, ChevronRightIcon,
  Home, ShoppingCart, Factory, Package, 
  Layers, Store, Users, Settings, 
  BarChart3, Truck, Database,
  FileText, ClipboardList, CreditCard,
  Box, Warehouse, ShoppingBag,
  UserPlus, Building, Shield,
  Bell, HelpCircle, Moon,
  Wrench,
  Recycle,
  BookA,
  NotebookPen,
  Calendar,
  TableProperties,
  Wallet,
  Briefcase
} from 'lucide-react';

const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser, loading, error } = useCurrentUser();
  const { hasPermission } = usePermission(); // Initialize usePermission

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: <Home color='white' size={18} />,
      path: '/dashboard',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100/50',
      textColor: 'text-blue-700',
      permissionKey: null,
    },
    {
      name: 'Sale',
      icon: <ShoppingCart color='white' size={18} />,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100/50',
      textColor: 'text-emerald-700',
      permissionKey: ['sales_create', 'sales_read'],
      subItems: [
        { name: 'POS', path: '/sale/pos', icon: <CreditCard size={16} />, permissionKey: 'sales_create' },
        { name: 'All Sales', path: '/sale/all', icon: <FileText size={16} />, permissionKey: 'sales_read' },
        { name: 'Create Sale', path: '/sale/create', icon: <ShoppingCart size={16} />, permissionKey: 'sales_create' },
        { name: 'Sale Return', path: '/sale/return', icon: <ClipboardList size={16} />, permissionKey: ['sales_return_create', 'sales_create'] },
        { name: 'All Sale Returns', path: '/sale/allreturns', icon: <FileText size={16} />, permissionKey: ['sales_return_read', 'sales_read'] },
        { name: 'Warranty', path: '/sale/warranty', icon: <Shield size={16} />, permissionKey: ['sales_read'] },
        { name: 'Customers', path: '/customers/all', icon: <Users size={16} />, permissionKey: ['customer_read', 'customer_create'] }
      ]
    },
    {
      name: 'Production',
      icon: <Factory color='white' size={18} />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100/50',
      textColor: 'text-amber-700',
      permissionKey: ['production_read', 'production_create'],
      subItems: [
        { name: 'All Production', path: '/productions/all', icon: <Factory size={16} />, permissionKey: 'production_read' },
        { name: 'New Production', path: '/productions/new', icon: <Package size={16} />, permissionKey: 'production_create' }
      ]
    },
    {
      name: 'Purchase',
      icon: <Package color='white' size={18} />,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-gradient-to-r from-violet-50 to-purple-100/50',
      textColor: 'text-violet-700',
      permissionKey: ['purchases_read', 'purchases_create'],
      subItems: [
        { name: 'All Purchase', path: '/purchase/all', icon: <Package size={16} />, permissionKey: 'purchases_read' },
        { name: 'New Purchase', path: '/purchase/new', icon: <ShoppingCart size={16} />, permissionKey: 'purchases_create' },
        { name: 'All Supplier', path: '/purchase/all-supplier', icon: <Users size={16} />, permissionKey: ['supplier_read', 'supplier_create'] },
        { name: 'Add Supplier', path: '/purchase/add-supplier', icon: <UserPlus size={16} />, permissionKey: 'supplier_create' }
      ]
    },
    {
      name: 'Transfer',
      icon: <Truck color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      permissionKey: ['transfers_read', 'transfers_create'],
      subItems: [
        { name: 'Add Transfer', path: '/transfer/add', icon: <Truck size={16} />, permissionKey: 'transfers_create' },
        { name: 'All Transfers', path: '/transfers', icon: <Truck size={16} />, permissionKey: ['transfers_read'] }
      ]
    },
    {
      name: 'Products',
      icon: <Box color='white' size={18} />,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-pink-700',
      permissionKey: ['product_read', 'product_create'],
      subItems: [
        { name: 'All Products', path: '/products/all', icon: <Box size={16} />, permissionKey: 'product_read' },
        { name: 'Create Product', path: '/products/create', icon: <Package size={16} />, permissionKey: 'product_create' }
      ]
    },

    
    {
      name: 'Repair',
      icon: <Wrench color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-cyan-700',
      permissionKey: ['repairs_read', 'repairs_create'],
      subItems: [
        { name: 'Repaired Products', path: '/productrepair', icon: <Box size={16} />, permissionKey: 'repairs_read' },
        { name: 'Repair Product', path: '/addrepairproduct', icon: <Box size={16} />, permissionKey: 'repairs_create' },
        { name: 'Repaired Materials', path: '/materialrepair', icon: <Package size={16} />, permissionKey: 'repairs_read' },
        { name: 'Repair Materials', path: '/addrepairmaterial', icon: <Package size={16} />, permissionKey: 'repairs_create' },
      ] 
    },

    
    {
      name: 'Damage Record',
      icon: <Recycle color='white' size={18} />,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-red-700',
      permissionKey: ['damage_read', 'damage_create'],
      subItems: [
        { name: 'Products Damage Records', path: '/scraprecord', icon: <Box size={16} />, permissionKey: 'damage_read' },
        { name: 'Material Damage Records', path: '/materialscraprecord', icon: <Package size={16} />, permissionKey: 'damage_read' },
      ] 
    },

    {
      name: 'Materials',
      icon: <Layers color='white' size={18} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-gradient-to-r from-teal-50 to-emerald-100/50',
      textColor: 'text-teal-700',
      permissionKey: ['material_read', 'material_create'],
      subItems: [
        { name: 'All Materials', path: '/materials/all', icon: <Layers size={16} />, permissionKey: 'material_read' },
        { name: 'Add Material', path: '/materials/add', icon: <Package size={16} />, permissionKey: 'material_create' }
      ]
    },
    {
      name: 'Factory',
      icon: <Factory color='white' size={18} />,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-100/50',
      textColor: 'text-orange-700',
      permissionKey: ['factory_read', 'factory_create'],
      subItems: [
        { name: 'All Factory', path: '/factories/all', icon: <Factory size={16} />, permissionKey: 'factory_read' },
        { name: 'Add Factory', path: '/factories/add', icon: <Building size={16} />, permissionKey: 'factory_create' }
      ]
    },
    {
      name: 'Stores',
      icon: <Warehouse color='white' size={18} />,
      color: 'from-sky-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-sky-50 to-blue-100/50',
      textColor: 'text-sky-700',
      permissionKey: ['store_read', 'store_create'],
      subItems: [
        { name: 'All Store', path: '/stores/all', icon: <Warehouse size={16} />, permissionKey: 'store_read' },
        { name: 'Add Store', path: '/stores/add', icon: <Store size={16} />, permissionKey: 'store_create' }
      ]
    },
    {
      name: 'Shop',
      icon: <ShoppingBag color='white' size={18} />,
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'bg-gradient-to-r from-fuchsia-50 to-pink-100/50',
      textColor: 'text-fuchsia-700',
      permissionKey: ['shop_read', 'shop_create'],
      subItems: [
        { name: 'All Shop', path: '/shop/all', icon: <ShoppingBag size={16} />, permissionKey: 'shop_read' },
        { name: 'Add Shop', path: '/shop/add', icon: <Store size={16} />, permissionKey: 'shop_create' }
      ]
    },
    {
      name: 'Accounts',
      icon: <BookA color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      permissionKey: ['account_read', 'account_create', 'cash_register_create', 'bank_account_read'],
      subItems: [
        { name: 'Add Account', path: '/addaccount', icon: <NotebookPen size={16} />, permissionKey: 'account_create' },
        { name: 'Account List', path: '/allaccounts', icon: <TableProperties size={16} />, permissionKey: 'account_read' },
        { name: 'Assign Account', path: '/assignaccount', icon: <TableProperties size={16} />, permissionKey: ['account_create', 'account_assign'] },
        { name: 'Assign CashRegister', path: '/cashregisterassign', icon: <TableProperties size={16} />, permissionKey: ['cash_register_create', 'cash_register_assign'] },
        { name: 'Add CashRegister', path: '/addcashregister', icon: <TableProperties size={16} />, permissionKey: 'cash_register_create' },
        { name: 'Bank Accounts', path: '/bank-accounts', icon: <TableProperties size={16} />, permissionKey: ['bank_account_read', 'bank_account_create'] },
        { name: 'General Ledger', path: '/accounts/general-ledger', icon: <TableProperties size={16} />, permissionKey: 'general_ledger_report' },
        { name: 'Balance Sheet', path: '/accounts/balance-sheet', icon: <TableProperties size={16} />, permissionKey: 'balance_sheet_report' },
      ]
    },
    {
      name: 'HRM',
      icon: <Users color='white' size={18} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-gradient-to-r from-teal-50 to-emerald-100/50',
      textColor: 'text-teal-700',
      permissionKey: ['hrm_read', 'hrm_employee_manage'],
      subItems: [
        { name: 'Employees', path: '/hrm/employees', icon: <Users size={16} />, permissionKey: 'hrm_employee_manage' },
        { name: 'Attendance', path: '/hrm/attendance', icon: <ClipboardList size={16} />, permissionKey: 'clock_in_out_manage' },
        { name: 'Holidays', path: '/hrm/holidays', icon: <Calendar size={16} />, permissionKey: 'holiday_manage' },
        { name: 'Leave Categories', path: '/hrm/leave-categories', icon: <Calendar size={16} />, permissionKey: 'leave_category_manage' },
        { name: 'Leave Requests', path: '/hrm/leave-requests', icon: <Calendar size={16} />, permissionKey: 'leave_read' },
        { name: 'Payroll', path: '/hrm/payroll', icon: <Briefcase size={16} />, permissionKey: 'payroll_manage' }
      ]
    },
    {
      name: 'Expense',
      icon: <Wallet color='white' size={18} />,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-gradient-to-r from-rose-50 to-pink-100/50',
      textColor: 'text-rose-700',
      permissionKey: ['expenses_read', 'salary_read'],
      subItems: [
        { name: 'Expense Category', path: '/expense/categories', icon: <Wallet size={16} />, permissionKey: 'expenses_read' },
        { name: 'Expenses', path: '/expense/list', icon: <Wallet size={16} />, permissionKey: 'expenses_read' },
        { name: 'Salaries', path: '/expense/salaries', icon: <Briefcase size={16} />, permissionKey: 'salary_read' }
      ]
    },
    {
      name: 'Report',
      icon: <BarChart3 color='white' size={18} />,
      color: 'from-lime-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-lime-50 to-green-100/50',
      textColor: 'text-lime-700',
      permissionKey: ['general_ledger_report', 'trial_balance_report', 'balance_sheet_report', 'cash_and_bank_report', 'sales_report', 'purchases_report', 'stock_report', 'transfer_report', 'profit_loss_report', 'purchase_sales_report', 'customer_report', 'supplier_report', 'best_selling_product_report', 'worst_selling_product_report'],
      subItems: [
        { name: 'Sale Report', path: '/report/sale', icon: <BarChart3 size={16} />, permissionKey: ['sales_report'] },
        { name: 'Purchase Report', path: '/report/purchase', icon: <BarChart3 size={16} />, permissionKey: ['purchases_report'] },
        { name: 'Production Report', path: '/report/production', icon: <BarChart3 size={16} />, permissionKey: ['production_report'] },
        { name: 'Wastage Report', path: '/report/wastage', icon: <BarChart3 size={16} />, permissionKey: ['wastage_report'] },
        { name: 'Trial Balance', path: '/report/trial-balance', icon: <BarChart3 size={16} />, permissionKey: ['trial_balance_report'] },
        { name: 'Cash & Bank', path: '/report/cash-bank', icon: <BarChart3 size={16} />, permissionKey: ['cash_and_bank_report'] },
        { name: 'Stock Report', path: '/report/stock', icon: <BarChart3 size={16} />, permissionKey: ['stock_report'] },
        { name: 'Transfer Report', path: '/report/transfer', icon: <BarChart3 size={16} />, permissionKey: ['transfer_report'] },
        // { name: 'Profit & Loss', path: '/report/profit-loss', icon: <BarChart3 size={16} />, permissionKey: ['profit_loss_report'] },
        { name: 'Purchase vs Sales', path: '/report/purchase-sales', icon: <BarChart3 size={16} />, permissionKey: ['purchase_sales_report'] },
        { name: 'Customer Report', path: '/report/customer', icon: <BarChart3 size={16} />, permissionKey: ['customer_report'] },
        { name: 'Supplier Report', path: '/report/supplier', icon: <BarChart3 size={16} />, permissionKey: ['supplier_report'] },
        { name: 'Best/Worst Selling', path: '/report/best-selling', icon: <BarChart3 size={16} />, permissionKey: ['best_selling_product_report'] }
      ]
    },
    {
      name: 'Users',
      icon: <Users color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-cyan-50 to-blue-100/50',
      textColor: 'text-cyan-700',
      permissionKey: ['user_read', 'user_create', 'role_create'],
      subItems: [
        { name: 'All User', path: '/users/all', icon: <Users size={16} />, permissionKey: 'user_read' },
        { name: 'Create User', path: '/users/create', icon: <UserPlus size={16} />, permissionKey: 'user_create' },
        { name: 'Assign User', path: '/assignuser', icon: <UserPlus size={16} />, permissionKey: ['user_assign', 'user_create'] },
        { name: 'Assigned List', path: '/assignedusers', icon: <UserPlus size={16} />, permissionKey: ['user_associate_read', 'user_read'] },
        { name: 'Role & Permissions', path: '/managepermissions', icon: <UserPlus size={16} />, permissionKey: ['role_create', 'role_update', 'role_delete'] }
      ]
    },
    {
      name: 'Settings',
      icon: <Settings color='white' size={18} />,
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-100/50',
      textColor: 'text-gray-700',
      permissionKey: ['general_settings_edit', 'admin'],
      subItems: [
        { name: 'Settings', path: '/settings', icon: <Settings size={16} />, permissionKey: ['general_settings_edit', 'admin'] },
        { name: 'Activity Log', path: '/settings/activity-log', icon: <FileText size={16} />, permissionKey: ['general_settings_edit', 'admin'] }
      ]
    }
  ];

  return (
    <div className={`${isCollapsed ? 'w-24' : 'w-64'} max-h-[100vh] overflow-y-auto bg-gradient-to-br from-white via-gray-50 to-white text-gray-800 p-6 min-h-full shadow-2xl backdrop-blur-sm border-r border-gray-200/50 transition-all duration-300 relative`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-2 top-26 py-1 px-1.5 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
      >
        {isCollapsed ? (
          <ChevronRight size={18} className="text-gray-600" />
        ) : (
          <ChevronLeft size={18} className="text-gray-600" />
        )}
      </button>

      {/* Sidebar Header */}
      <div className="mb-8">
        {/* User Info Card */}
        <div className={`p-4 rounded-2xl mb-4 bg-gradient-to-r from-white to-gray-50/80 backdrop-blur-sm border border-gray-200/70 shadow-sm ${isCollapsed ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-sm">
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {currentUser?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-600">
                {currentUser?.permission?.name || 'Administrator'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {menuItems.map((item) => {
          // Determine if the top-level item should be displayed at all
          const shouldShowTopLevelItem = item.path 
            ? hasPermission(item.permissionKey) 
            : (item.subItems && item.subItems.some(subItem => hasPermission(subItem.permissionKey)));

          if (!shouldShowTopLevelItem) {
            return null;
          }

          return (
            <div key={item.name} className="relative">
              {item.path ? (
                // Render direct link if path exists
                <Link
                  to={item.path}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 hover:border-gray-200/70 border border-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (<span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all`}>
                    {item.name}
                  </span>)}
                </Link>
              ) : (
                // Render dropdown if subItems exist
                <>
                  <button
                    onClick={() => toggleMenu(item.name.toLowerCase())}
                    className="group text-left w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/80 hover:border-gray-200/70 border border-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                        {item.icon}
                      </div>
                      {!isCollapsed && (<span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all`}>
                        {item.name}
                      </span>)}
                    </div>
                    {openMenus[item.name.toLowerCase()] ? (
                      <ChevronDown size={16} className="text-gray-500 group-hover:text-gray-700 transition-colors" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-gray-700 transition-colors" />
                    )}
                  </button>
                  
                  {openMenus[item.name.toLowerCase()] && item.subItems && (
                    <div className="ml-4 mt-2 pl-6 border-l border-gray-200/50 space-y-1">
                      {item.subItems.map((subItem) => (
                        // Conditionally render sub-item
                        hasPermission(subItem.permissionKey) ? (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50/70 hover:pl-4 transition-all duration-200"
                        >
                          <div className="p-1.5 rounded-md bg-gray-100/50 group-hover:bg-white shadow-sm">
                            {subItem.icon}
                          </div>
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 group-hover:font-medium transition-all">
                            {subItem.name}
                          </span>
                        </Link>
                        ) : null
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Actions - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="mt-6 p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-blue-100/30 border border-blue-200/50">
          <p className="text-xs font-medium text-blue-700 mb-2">Quick Actions</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-md">
              Add Stock
            </button>
            <button className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium hover:from-emerald-600 hover:to-green-700 transition-all hover:shadow-md">
              New Order
            </button>
          </div>
        </div>
      )}

      {/* Footer Stats - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="mt-8 pt-6 border-t border-gray-200/50">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/30 border border-green-200/50">
              <p className="text-xs text-gray-600">Active Users</p>
              <p className="text-lg font-bold text-green-600">24</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-200/50">
              <p className="text-xs text-gray-600">Today Sales</p>
              <p className="text-lg font-bold text-blue-600">$12.5K</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              © 2026 codesbreak
            </p>
          </div>
        </div>
      )}

      {/* Collapsed Footer */}
      {isCollapsed && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <p className="text-xs text-gray-500 rotate-90 whitespace-nowrap">
            © 2026
          </p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
