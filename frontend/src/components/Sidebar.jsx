import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usePermission } from '../hooks/usePermission'; // Import usePermission
import { API_ROUTES } from '../config';
import { useAuth } from '../context/AuthContext';
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
  Undo2,
  AlertTriangle,
  BookA,
  NotebookPen,
  Calendar,
  TableProperties,
  Wallet,
  Briefcase,
  History,
  Boxes,
} from 'lucide-react';

const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const { currentUser, loading, error } = useCurrentUser();
  const { hasPermission } = usePermission(); // Initialize usePermission
  const { socket } = useAuth();
  const canViewActiveUsers = hasPermission('user_read');

  useEffect(() => {
    if (!canViewActiveUsers) {
      setActiveUsersCount(0);
      return;
    }

    const fetchActiveUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ROUTES.USER_ACTIVE_SESSIONS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveUsersCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch (err) {
        setActiveUsersCount(0);
      }
    };

    fetchActiveUsers();
  }, [canViewActiveUsers]);

  useEffect(() => {
    if (!socket || !canViewActiveUsers) return undefined;

    const handleActiveUsersUpdate = (sessions) => {
      setActiveUsersCount(Array.isArray(sessions) ? sessions.length : 0);
    };

    socket.on('active-users:update', handleActiveUsersUpdate);
    return () => {
      socket.off('active-users:update', handleActiveUsersUpdate);
    };
  }, [socket, canViewActiveUsers]);

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
      permissionKey: ['dashboard_read'],
    },
    {
      name: 'Sale',
      icon: <ShoppingCart color='white' size={18} />,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100/50',
      textColor: 'text-emerald-700',
      permissionKey: ['sales_create', 'previous_date_sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_open_close', 'sales_add_payment', 'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read', 'customer_read', 'customer_create', 'customer_edit', 'customer_delete', 'customer_clear_due'],
      subItems: [
        { name: 'POS', path: '/sale/pos', icon: <CreditCard size={16} />, permissionKey: 'sales_create' },
        { name: 'All Sales', path: '/sale/all', icon: <FileText size={16} />, permissionKey: ['sales_create', 'previous_date_sales_create', 'sales_edit', 'sales_delete', 'sales_read', 'sales_change_status', 'sales_edit_today', 'sales_open_close', 'sales_add_payment' ] },
        { name: 'Edit Requests', path: '/sale/edit-requests', icon: <ClipboardList size={16} />, permissionKey: 'sales_open_close' },
        { name: 'Create Sale', path: '/sale/create', icon: <ShoppingCart size={16} />, permissionKey: ['sales_create', 'previous_date_sales_create'] },
        { name: 'Sale Return', path: '/sale/return', icon: <ClipboardList size={16} />, permissionKey: ['sales_return_create'] },
        { name: 'All Sale Returns', path: '/sale/allreturns', icon: <FileText size={16} />, permissionKey: [ 'sales_return_create', 'sales_return_edit', 'sales_return_delete', 'sales_return_read'] },
        { name: 'Warranty', path: '/sale/warranty', icon: <Shield size={16} />, permissionKey: ['sales_warranty' ] },
        { name: 'Customers', path: '/customers/all', icon: <Users size={16} />, permissionKey: ['customer_read', 'customer_create', 'customer_edit', 'customer_delete', 'customer_clear_due'] }
      ]
    },
    {
      name: 'Production',
      icon: <Factory color='white' size={18} />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100/50',
      textColor: 'text-amber-700',
      permissionKey: ['production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status'],
      subItems: [
        { name: 'All Production', path: '/productions/all', icon: <Factory size={16} />, permissionKey: ['production_create', 'production_edit', 'production_delete', 'production_read', 'production_change_status'] },
        { name: 'New Production', path: '/productions/new', icon: <Package size={16} />, permissionKey: 'production_create' }
      ]
    },
    {
      name: 'Purchase',
      icon: <Package color='white' size={18} />,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-gradient-to-r from-violet-50 to-purple-100/50',
      textColor: 'text-violet-700',
      permissionKey: ['purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchase_add_payment', 'purchase_add_shipment', 'purchases_return_create', 'purchases_return_add_payment', 'purchases_return_add_shipment', 'purchases_return_delete', 'purchases_return_read', 'supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete', 'supplier_clear_due' ],
      subItems: [
        { name: 'All Purchase', path: '/purchase/all', icon: <Package size={16} />, permissionKey: ['purchases_create', 'purchases_edit', 'purchases_delete', 'purchases_read', 'purchase_add_payment', 'purchase_add_shipment' ] },
        { name: 'All Returns', path: '/purchase/returns', icon: <Undo2 size={16} />, permissionKey: ['purchases_return_create', 'purchases_return_add_payment', 'purchases_return_add_shipment', 'purchases_return_delete', 'purchases_return_read'] },
        { name: 'New Purchase', path: '/purchase/new', icon: <ShoppingCart size={16} />, permissionKey: 'purchases_create' },
        { name: 'Purchase Return', path: '/purchase/return', icon: <Recycle size={16} />, permissionKey: 'purchases_return_create' },
        { name: 'All Supplier', path: '/purchase/all-supplier', icon: <Users size={16} />, permissionKey: ['supplier_read', 'supplier_create', 'supplier_edit', 'supplier_delete', 'supplier_clear_due'] },
        { name: 'Add Supplier', path: '/purchase/add-supplier', icon: <UserPlus size={16} />, permissionKey: 'supplier_create' }
      ]
    },
    {
      name: 'Transfer',
      icon: <Truck color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      permissionKey: ['transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_receive', 'transfer_return'],
      subItems: [
        { name: 'All Transfers', path: '/transfers', icon: <Truck size={16} />, permissionKey: ['transfers_create', 'transfers_edit', 'transfers_delete', 'transfers_read', 'transfers_change_status', 'transfers_receive', 'transfer_return'] },
        { name: 'Add Transfer', path: '/transfer/add', icon: <Truck size={16} />, permissionKey: 'transfers_create' }
      ]
    },
    {
      name: 'Requisition',
      icon: <ClipboardList color='white' size={18} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-gradient-to-r from-teal-50 to-emerald-100/50',
      textColor: 'text-teal-700',
      permissionKey: ['requisition_create', 'requisition_read', 'requisition_update', 'requisition_delete', 'requisition_approve', 'production_order_read', 'transfer_order_read', 'purchase_order_read'],
      subItems: [
        { name: 'Requisition List', path: '/requisition/list', icon: <ClipboardList size={16} />, permissionKey: ['requisition_create', 'requisition_read', 'requisition_update', 'requisition_delete', 'requisition_approve', 'production_order_read', 'transfer_order_read', 'purchase_order_read'] },
        { name: 'Create Requisition', path: '/requisition/create', icon: <NotebookPen size={16} />, permissionKey: 'requisition_create' },
      ]
    },
    {
      name: 'Repair',
      icon: <Wrench color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-cyan-700',
      permissionKey: ['repairs_create', 'repairs_read', 'repairs_receive', 'repairs_delete'],
      subItems: [
        { name: 'Repaired Item', path: '/repair/items', icon: <Box size={16} />, permissionKey: ['repairs_create', 'repairs_read', 'repairs_receive', 'repairs_delete'] },
        { name: 'Add Repair', path: '/repair/new', icon: <Wrench size={16} />, permissionKey: 'repairs_create' },
      ] 
    },
    {
      name: 'Damage Record',
      icon: <Recycle color='white' size={18} />,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-red-700',
      permissionKey: ['damage_create', 'damage_read', 'damage_edit', 'damage_delete', 'damage_return_create', 'damage_return_read', 'damage_return_add_payment', 'damage_return_add_shipment', 'damage_return_delete'],
      subItems: [
        { name: 'Damage Records', path: '/damage-record', icon: <AlertTriangle size={16} />, permissionKey: ['damage_create', 'damage_read', 'damage_edit', 'damage_delete'] },
        { name: 'Damage Return Records', path: '/purchase/returns?type=damage_return', icon: <ClipboardList size={16} />, permissionKey: ['damage_return_create', 'damage_return_read', 'damage_return_add_payment', 'damage_return_add_shipment', 'damage_return_delete'] },
        { name: 'New Damage', path: '/damage-record/new', icon: <Recycle size={16} />, permissionKey: 'damage_create' },
        { name: 'New Damage Return', path: '/purchase/damage-return', icon: <Undo2 size={16} />, permissionKey: 'damage_return_create' },
      ]
    },

    {
      name: 'Products',
      icon: <Box color='white' size={18} />,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-pink-700',
      permissionKey: ['product_read', 'product_create', 'product_edit', 'product_delete'],
      subItems: [
        { name: 'All Products', path: '/products/all', icon: <Box size={16} />, permissionKey: ['product_read', 'product_create', 'product_edit', 'product_delete'] },
        { name: 'Create Product', path: '/products/create', icon: <Package size={16} />, permissionKey: 'product_create' }
      ]
    },
    {
      name: 'Materials',
      icon: <Layers color='white' size={18} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-gradient-to-r from-teal-50 to-emerald-100/50',
      textColor: 'text-teal-700',
      permissionKey: ['material_create', 'material_read', 'material_edit', 'material_delete'],
      subItems: [
        { name: 'All Materials', path: '/materials/all', icon: <Layers size={16} />, permissionKey: ['material_create', 'material_read', 'material_edit', 'material_delete'] },
        { name: 'Add Material', path: '/materials/add', icon: <Package size={16} />, permissionKey: 'material_create' }
      ]
    },
    {
      name: 'Factory',
      icon: <Factory color='white' size={18} />,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-100/50',
      textColor: 'text-orange-700',
      permissionKey: ['factory_create', 'factory_edit', 'factory_delete', 'factory_read', 'factory_inventory_manage',  'factory_inventory_adjustment_create', 'factory_inventory_adjustment_read'],
      subItems: [
        { name: 'All Factory', path: '/factories/all', icon: <Factory size={16} />, permissionKey: ['factory_create', 'factory_edit', 'factory_delete', 'factory_read'] },
        { name: 'Add Factory', path: '/factories/add', icon: <Building size={16} />, permissionKey: 'factory_create' },
        { name: 'Inventory', path: '/factoryinventory', icon: <Boxes size={16} />, permissionKey: [ 'factory_inventory_manage', 'factory_inventory_adjustment_create', 'factory_inventory_adjustment_read'] },
        { name: 'Adjustment History', path: '/factoryinventory/adjustments', icon: <History size={16} />, permissionKey: ['factory_inventory_adjustment_read'] }
      ]
    },
    {
      name: 'Stores',
      icon: <Warehouse color='white' size={18} />,
      color: 'from-sky-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-sky-50 to-blue-100/50',
      textColor: 'text-sky-700',
      permissionKey: ['store_create', 'store_edit', 'store_delete', 'store_read', 'store_inventory_manage', 'store_inventory_adjustment_create', 'store_inventory_adjustment_read'],
      subItems: [
        { name: 'All Store', path: '/stores/all', icon: <Warehouse size={16} />, permissionKey: ['store_create', 'store_edit', 'store_delete', 'store_read'] },
        { name: 'Add Store', path: '/stores/add', icon: <Store size={16} />, permissionKey: 'store_create' },
        { name: 'Inventory', path: '/storeinventory', icon: <Boxes size={16} />, permissionKey: [ 'store_inventory_manage', 'store_inventory_adjustment_create', 'store_inventory_adjustment_read'] },
        { name: 'Adjustment History', path: '/storeinventory/adjustments', icon: <History size={16} />, permissionKey: ['store_inventory_adjustment_read'] }
      ]
    },
    {
      name: 'Shop',
      icon: <ShoppingBag color='white' size={18} />,
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'bg-gradient-to-r from-fuchsia-50 to-pink-100/50',
      textColor: 'text-fuchsia-700',
      permissionKey: ['shop_create', 'shop_edit', 'shop_delete', 'shop_read', 'shop_inventory_manage', 'shop_inventory_adjustment_create', 'shop_inventory_adjustment_read'],
      subItems: [
        { name: 'All Shop', path: '/shop/all', icon: <ShoppingBag size={16} />, permissionKey: ['shop_create', 'shop_edit', 'shop_delete', 'shop_read'] },
        { name: 'Add Shop', path: '/shop/add', icon: <Store size={16} />, permissionKey: 'shop_create' },
        { name: 'Inventory', path: '/shopinventory', icon: <Boxes size={16} />, permissionKey: [ 'shop_inventory_manage', 'shop_inventory_adjustment_create', 'shop_inventory_adjustment_read'] },
        { name: 'Adjustment History', path: '/shopinventory/adjustments', icon: <History size={16} />, permissionKey: ['shop_inventory_adjustment_read'] }
      ]
    },
    {
      name: 'Accounts',
      icon: <BookA color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      permissionKey: ['account_read', 'account_create', 'account_edit', 'account_delete', 'account_assign', 'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement',
        'cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete', 'cash_register_assign', 'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit', 'cash_register_daily_record',
        'bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete', 'bank_account_deposit', 'bank_account_withdraw',
        'general_ledger_report', 'balance_sheet_report'
      ],
      subItems: [
        { name: 'Account List', path: '/allaccounts', icon: <TableProperties size={16} />, permissionKey: ['account_read', 'account_create', 'account_edit', 'account_delete', 'account_deposit', 'account_withdraw', 'account_transfer', 'account_statement', 'account_assign'] },
        { name: 'Add Account', path: '/addaccount', icon: <NotebookPen size={16} />, permissionKey: 'account_create' },
        { name: 'Assign Account', path: '/assignaccount', icon: <TableProperties size={16} />, permissionKey: "account_assign" },
        { name: 'Cash Register List', path: '/cashregister-list', icon: <TableProperties size={16} />, permissionKey: ['cash_register_read', 'cash_register_create', 'cash_register_edit', 'cash_register_delete', 'cash_register_assign', 'cash_register_open', 'cash_register_close', 'cash_register_withdraw', 'cash_register_deposit' ] },
        { name: 'Assign CashRegister', path: '/cashregisterassign', icon: <TableProperties size={16} />, permissionKey: 'cash_register_assign' },
        { name: 'Cash Register Records', path: '/cash-register-records', icon: <TableProperties size={16} />, permissionKey: ['cash_register_open', 'cash_register_close', 'cash_register_daily_record'] },
        { name: 'Add CashRegister', path: '/addcashregister', icon: <TableProperties size={16} />, permissionKey: 'cash_register_create' },
        { name: 'Bank Accounts', path: '/bank-accounts', icon: <TableProperties size={16} />, permissionKey: ['bank_account_read', 'bank_account_create', 'bank_account_edit', 'bank_account_delete', 'bank_account_deposit', 'bank_account_withdraw'] },
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
      permissionKey: ['leave_request_create', 'leave_request_edit', 'leave_request_delete', 'leave_read', 'leave_approve', 
        'holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read',
        'hrm_employee_manage', 'clock_in_out_manage', 'approve_clock_in_out', 'leave_category_manage', 'payroll_manage'
      ],
      subItems: [
        { name: 'Employees', path: '/hrm/employees', icon: <Users size={16} />, permissionKey: 'hrm_employee_manage' },
        { name: 'Attendance', path: '/hrm/attendance', icon: <ClipboardList size={16} />, permissionKey: 'clock_in_out_manage' },
        { name: 'Holidays', path: '/hrm/holidays', icon: <Calendar size={16} />, permissionKey: ['holiday_create', 'holiday_edit', 'holiday_delete', 'holiday_read' ] },
        { name: 'Leave Categories', path: '/hrm/leave-categories', icon: <Calendar size={16} />, permissionKey: 'leave_category_manage' },
        { name: 'Leave Requests', path: '/hrm/leave-requests', icon: <Calendar size={16} />, permissionKey: ['leave_read', 'leave_request_delete', 'leave_approve'] },
        { name: 'Payroll', path: '/hrm/payroll', icon: <Briefcase size={16} />, permissionKey: 'payroll_manage' }
      ]
    },
    {
      name: 'Expense',
      icon: <Wallet color='white' size={18} />,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-gradient-to-r from-rose-50 to-pink-100/50',
      textColor: 'text-rose-700',
      permissionKey: ['expenses_create', 'expenses_read', 'expenses_edit', 'expenses_delete', 'expense_category_manage',
        'salary_create', 'salary_edit', 'salary_delete', 'salary_read', 'approve_salary', 'payroll_manage'
      ],
      subItems: [
        { name: 'Expense Category', path: '/expense/categories', icon: <Wallet size={16} />, permissionKey: 'expense_category_manage' },
        { name: 'Expenses', path: '/expense/list', icon: <Wallet size={16} />, permissionKey: ['expenses_create', 'expenses_read', 'expenses_edit', 'expenses_delete'] },
        { name: 'Salaries', path: '/expense/salaries', icon: <Briefcase size={16} />, permissionKey: [ 'salary_edit', 'salary_delete', 'salary_read', 'approve_salary', 'payroll_manage'] }
      ]
    },
    {
      name: 'Report',
      icon: <BarChart3 color='white' size={18} />,
      color: 'from-lime-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-lime-50 to-green-100/50',
      textColor: 'text-lime-700',
      permissionKey: [ 'sales_report', 'purchases_report', 'production_report', 'wastage_report', 'trial_balance_report', 'cash_and_bank_report', 'stock_report', 'daily_stock_report', 'transfer_report', 'purchase_sales_report', 'customer_report', 'supplier_report', 'best_selling_report' ],
      subItems: [
        { name: 'Sale Report', path: '/report/sale', icon: <BarChart3 size={16} />, permissionKey: ['sales_report'] },
        { name: 'Purchase Report', path: '/report/purchase', icon: <BarChart3 size={16} />, permissionKey: ['purchases_report'] },
        { name: 'Production Report', path: '/report/production', icon: <BarChart3 size={16} />, permissionKey: ['production_report'] },
        { name: 'Wastage Report', path: '/report/wastage', icon: <BarChart3 size={16} />, permissionKey: ['wastage_report'] },
        { name: 'Trial Balance', path: '/report/trial-balance', icon: <BarChart3 size={16} />, permissionKey: ['trial_balance_report'] },
        { name: 'Cash & Bank', path: '/report/cash-bank', icon: <BarChart3 size={16} />, permissionKey: ['cash_and_bank_report'] },
        { name: 'Stock Report', path: '/report/stock', icon: <BarChart3 size={16} />, permissionKey: ['stock_report'] },
        { name: 'Daily Stock Report', path: '/report/daily-stock', icon: <BarChart3 size={16} />, permissionKey: ['daily_stock_report'] },
        { name: 'Transfer Report', path: '/report/transfer', icon: <BarChart3 size={16} />, permissionKey: ['transfer_report'] },
        { name: 'Purchase vs Sales', path: '/report/purchase-sales', icon: <BarChart3 size={16} />, permissionKey: ['purchase_sales_report'] },
        { name: 'Customer Report', path: '/report/customer', icon: <BarChart3 size={16} />, permissionKey: ['customer_report'] },
        { name: 'Supplier Report', path: '/report/supplier', icon: <BarChart3 size={16} />, permissionKey: ['supplier_report'] },
        { name: 'Best/Worst Selling', path: '/report/best-selling', icon: <BarChart3 size={16} />, permissionKey: ['best_selling_report'] }
      ]
    },
    {
      name: 'Users',
      icon: <Users color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-cyan-50 to-blue-100/50',
      textColor: 'text-cyan-700',
      permissionKey: ['user_create', 'user_edit', 'user_delete', 'user_read', 'user_activate_deactivate', 'user_logout', 'user_associate_create',
        'role_create', 'role_edit', 'role_delete', 'role_read', 'role_assign'
      ],
      subItems: [
        { name: 'All User', path: '/users/all', icon: <Users size={16} />, permissionKey: ['user_create', 'user_edit', 'user_delete', 'user_read', 'user_activate_deactivate', 'user_logout'] },
        { name: 'Create User', path: '/users/create', icon: <UserPlus size={16} />, permissionKey: 'user_create' },
        { name: 'Assign User', path: '/assignuser', icon: <UserPlus size={16} />, permissionKey: ['user_associate_create', 'user_create'] },
        { name: 'Assigned List', path: '/assignedusers', icon: <UserPlus size={16} />, permissionKey: ['user_associate_create', 'user_read'] },
        { name: 'Role & Permissions', path: '/managepermissions', icon: <UserPlus size={16} />, permissionKey: ['role_read', 'role_create', 'role_edit', 'role_delete', 'role_assign'] }
      ]
    },
    {
      name: 'Settings',
      icon: <Settings color='white' size={18} />,
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-100/50',
      textColor: 'text-gray-700',
      permissionKey: ['general_settings', 'printer_settings', 'print_label', 'unit_manage', 'category_manage', 'brand_manage', 'activity_log'],
      subItems: [
        { name: 'Settings', path: '/settings', icon: <Settings size={16} />, permissionKey: 'general_settings' },
        { name: 'Printer Settings', path: '/settings/printer', icon: <Settings size={16} />, permissionKey: 'printer_settings' },
        { name: 'Print Barcode', path: '/settings/print-label', icon: <TableProperties size={16} />, permissionKey: 'print_label' },
        { name: 'Units', path: '/settings/units', icon: <TableProperties size={16} />, permissionKey: 'unit_manage' },
        { name: 'Category', path: '/settings/categories', icon: <TableProperties size={16} />, permissionKey: 'category_manage' },
        { name: 'Brand', path: '/settings/brands', icon: <TableProperties size={16} />, permissionKey: 'brand_manage' },
        { name: 'Activity Log', path: '/settings/activity-log', icon: <FileText size={16} />, permissionKey: 'activity_log' }
      ]
    }
  ];

  return (
  <div className={`${isCollapsed ? 'w-24' : 'w-64'} h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-white text-gray-800 transition-all duration-300 relative overflow-hidden`}>
    {/* Collapse Toggle Button - */}
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className={`absolute ${isCollapsed ? '-right-3' : '-right-2'} top-26 py-1 px-1.5 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-20`}
    >
      {isCollapsed ? (
        <ChevronRight size={18} className="text-gray-600" />
      ) : (
        <ChevronLeft size={18} className="text-gray-600" />
      )}
    </button>

    {/* Sidebar Header */}
    <div className="flex-shrink-0 p-4 pb-0">
      {/* User Info Card */}
      <div className={`p-4 rounded-2xl mb-4 bg-gradient-to-r from-white to-gray-50/80 backdrop-blur-sm border border-gray-200/70 shadow-sm ${isCollapsed ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-sm">
            <Users size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {currentUser?.name || 'Admin User'}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {currentUser?.permission?.name || 'Administrator'}
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Navigation Menu - */}
    <div className="flex-1 overflow-y-auto px-2">
      <nav className="space-y-1 pb-4">
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
                  <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all truncate`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ) : (
                // Render dropdown if subItems exist
                <>
                  <button
                    onClick={() => toggleMenu(item.name.toLowerCase())}
                    className="group text-left w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/80 hover:border-gray-200/70 border border-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all truncate`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      openMenus[item.name.toLowerCase()] ? (
                        <ChevronDown size={16} className="flex-shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      ) : (
                        <ChevronRight size={16} className="flex-shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      )
                    )}
                  </button>
                  
                  {!isCollapsed && openMenus[item.name.toLowerCase()] && item.subItems && (
                    <div className="ml-4 mt-2 pl-6 border-l border-gray-200/50 space-y-1">
                      {item.subItems.map((subItem) => (
                        // Conditionally render sub-item
                        hasPermission(subItem.permissionKey) ? (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50/70 hover:pl-4 transition-all duration-200"
                        >
                          <div className="flex-shrink-0 p-1.5 rounded-md bg-gray-100/50 group-hover:bg-white shadow-sm">
                            {subItem.icon}
                          </div>
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 group-hover:font-medium transition-all truncate">
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
    </div>

    {/* Footer Section */}
    {!isCollapsed && (
      <div className="flex-shrink-0 p-4 pt-0">
        {/* Quick Actions */}
        {
          hasPermission(['sales_report', 'purchase_create']) && (
            <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-blue-100/30 border border-blue-200/50">
              <p className="text-xs font-medium text-blue-700 mb-2">Quick Actions</p>
              <div className="flex gap-2">
                {hasPermission('sales_report') && (
                  <Link to="/report/best-selling" className="flex-1">
                    <button className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-md">
                      Sales
                    </button>
                  </Link>
                )}
                {hasPermission('purchase_create') && (
                  <Link to="/purchase/new" className="flex-1">
                    <button className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium hover:from-emerald-600 hover:to-green-700 transition-all hover:shadow-md">
                      Add Stock
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )
        }

        {/* Footer Stats */}
        <div className="mt-1 pt-1 border-t border-gray-200/50">
          {canViewActiveUsers && (
            <Link
              to="/users/all?mode=active"
              className="flex items-center justify-between p-3 mb-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100/30 border border-green-200/50 hover:shadow-md transition-all"
            >
              <p className="text-xs text-gray-600">Active Users</p>
              <div className="flex items-center gap-1">
                <div className='h-2 w-2 rounded-full bg-green-600'></div>
                <p className="text-lg font-bold text-green-600">{activeUsersCount}</p>
              </div>
            </Link>
          )}
          {!isCollapsed && (
          <div className="flex items-center justify-between hidden sm:hidden md:flex md:justify-center">
            <p className="text-xs text-gray-500 mb-1">
              ©{new Date().getFullYear()} Codesbreak. <br /> All rights reserved.
            </p>
          </div>
          )}
        </div>
      </div>
    )}
  </div>
);
};

export default Sidebar;
