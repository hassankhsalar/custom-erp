import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { 
  ChevronDown, ChevronRight, 
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
  TableProperties
} from 'lucide-react';

const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState({});
  const { currentUser, loading, error } = useCurrentUser();

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
      textColor: 'text-blue-700'
    },
    {
      name: 'Sale',
      icon: <ShoppingCart color='white' size={18} />,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100/50',
      textColor: 'text-emerald-700',
      subItems: [
        { name: 'POS', path: '/sale/pos', icon: <CreditCard size={16} /> },
        { name: 'All Sales', path: '/sale/all', icon: <FileText size={16} /> },
        { name: 'Create Sale', path: '/sale/create', icon: <ShoppingCart size={16} /> },
        { name: 'Sale Return', path: '/sale/return', icon: <ClipboardList size={16} /> },
        { name: 'All Sale Returns', path: '/sale/allreturns', icon: <FileText size={16} /> }
      ]
    },
    {
      name: 'Production',
      icon: <Factory color='white' size={18} />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100/50',
      textColor: 'text-amber-700',
      subItems: [
        { name: 'All Production', path: '/productions/all', icon: <Factory size={16} /> },
        { name: 'New Production', path: '/productions/new', icon: <Package size={16} /> }
      ]
    },
    {
      name: 'Purchase',
      icon: <Package color='white' size={18} />,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-gradient-to-r from-violet-50 to-purple-100/50',
      textColor: 'text-violet-700',
      subItems: [
        { name: 'All Purchase', path: '/purchase/all', icon: <Package size={16} /> },
        { name: 'New Purchase', path: '/purchase/new', icon: <ShoppingCart size={16} /> },
        { name: 'All Supplier', path: '/purchase/all-supplier', icon: <Users size={16} /> },
        { name: 'Add Supplier', path: '/purchase/add-supplier', icon: <UserPlus size={16} /> }
      ]
    },
    {
      name: 'Transfer',
      icon: <Truck color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      subItems: [
        { name: 'Add Transfer', path: '/transfer/add', icon: <Truck size={16} /> },
        { name: 'Store to store transfer', path: '/transfer/store-to-store', icon: <Warehouse size={16} /> },
        { name: 'Store to factory', path: '/transfer/store-to-factory', icon: <Factory size={16} /> },
        { name: 'Store to Shop', path: '/transfer/store-to-shop', icon: <ShoppingBag size={16} /> },
        { name: 'Factory to factory', path: '/transfer/factory-to-factory', icon: <Factory size={16} /> },
        { name: 'Factory to store', path: '/transfer/factory-to-store', icon: <Warehouse size={16} /> },
        { name: 'Factory to shop', path: '/transfer/factory-to-shop', icon: <ShoppingBag size={16} /> },
        { name: 'Shop to shop', path: '/transfer/shop-to-shop', icon: <ShoppingBag size={16} /> },
        { name: 'Shop to store', path: '/transfer/shop-to-store', icon: <Warehouse size={16} /> },
        { name: 'Shop to factory', path: '/transfer/shop-to-factory', icon: <Factory size={16} /> }
      ]
    },
    {
      name: 'Products',
      icon: <Box color='white' size={18} />,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-pink-700',
      subItems: [
        { name: 'All Products', path: '/products/all', icon: <Box size={16} /> },
        { name: 'Create Product', path: '/products/create', icon: <Package size={16} /> }
      ]
    },

    
    {
      name: 'Repair',
      icon: <Wrench color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-pink-700',
      subItems: [
        { name: 'Repaired Products', path: '/productrepair', icon: <Box size={16} /> },
        { name: 'Repair Product', path: '/addrepairproduct', icon: <Box size={16} /> },
        { name: 'Repaired Materials', path: '/materialrepair', icon: <Package size={16} /> },
        { name: 'Repair Materials', path: '/addrepairmaterial', icon: <Package size={16} /> },
      ] 
    },

    
    {
      name: 'Scrap Record',
      icon: <Recycle color='white' size={18} />,
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-pink-50 to-rose-100/50',
      textColor: 'text-pink-700',
      subItems: [
        { name: 'Products Scrap Records', path: '/scraprecord', icon: <Box size={16} /> },
        { name: 'Material Scrap Records', path: '/materialscraprecord', icon: <Package size={16} /> },
      ] 
    },

    {
      name: 'Materials',
      icon: <Layers color='white' size={18} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-gradient-to-r from-teal-50 to-emerald-100/50',
      textColor: 'text-teal-700',
      subItems: [
        { name: 'All Materials', path: '/materials/all', icon: <Layers size={16} /> },
        { name: 'Add Material', path: '/materials/add', icon: <Package size={16} /> },
        { name: 'Scrape Materials', path: '/materials/scrape', icon: <Database size={16} /> },
        { name: 'Recover Materials', path: '/materials/recover', icon: <Database size={16} /> }
      ]
    },
    {
      name: 'Factory',
      icon: <Factory color='white' size={18} />,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-100/50',
      textColor: 'text-orange-700',
      subItems: [
        { name: 'All Factory', path: '/factories/all', icon: <Factory size={16} /> },
        { name: 'Add Factory', path: '/factories/add', icon: <Building size={16} /> }
      ]
    },
    {
      name: 'Stores',
      icon: <Warehouse color='white' size={18} />,
      color: 'from-sky-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-sky-50 to-blue-100/50',
      textColor: 'text-sky-700',
      subItems: [
        { name: 'All Store', path: '/stores/all', icon: <Warehouse size={16} /> },
        { name: 'Add Store', path: '/stores/add', icon: <Store size={16} /> },
        { name: 'Manage Transfer', path: '/transfers', icon: <Truck size={16} /> }
      ]
    },
    {
      name: 'Shop',
      icon: <ShoppingBag color='white' size={18} />,
      color: 'from-fuchsia-500 to-pink-500',
      bgColor: 'bg-gradient-to-r from-fuchsia-50 to-pink-100/50',
      textColor: 'text-fuchsia-700',
      subItems: [
        { name: 'All Shop', path: '/shop/all', icon: <ShoppingBag size={16} /> },
        { name: 'Add Shop', path: '/shop/add', icon: <Store size={16} /> }
      ]
    },
    {
      name: 'Accounts',
      icon: <BookA color='white' size={18} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-100/50',
      textColor: 'text-indigo-700',
      subItems: [
        { name: 'Add Account', path: '/addaccount', icon: <NotebookPen size={16} /> },
        { name: 'Account List', path: '/allaccounts', icon: <TableProperties size={16} /> },
        { name: 'Assign Account', path: '/assignaccount', icon: <TableProperties size={16} /> },
        { name: 'Assign CashRegister', path: '/cashregisterassign', icon: <TableProperties size={16} /> },
        { name: 'Add CashRegister', path: '/addcashregister', icon: <TableProperties size={16} /> },
      ]
    },
    {
      name: 'Report',
      icon: <BarChart3 color='white' size={18} />,
      color: 'from-lime-500 to-green-500',
      bgColor: 'bg-gradient-to-r from-lime-50 to-green-100/50',
      textColor: 'text-lime-700',
      subItems: [
        { name: 'Sale Report', path: '/report/sale', icon: <BarChart3 size={16} /> },
        { name: 'Purchase Report', path: '/report/purchase', icon: <BarChart3 size={16} /> },
        { name: 'Production Report', path: '/report/production', icon: <BarChart3 size={16} /> },
        { name: 'Wastage Report', path: '/report/wastage', icon: <BarChart3 size={16} /> },
        { name: 'Scrape Report', path: '/report/scrape', icon: <BarChart3 size={16} /> }
      ]
    },
    {
      name: 'Users',
      icon: <Users color='white' size={18} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-gradient-to-r from-cyan-50 to-blue-100/50',
      textColor: 'text-cyan-700',
      subItems: [
        { name: 'All User', path: '/users/all', icon: <Users size={16} /> },
        { name: 'Create User', path: '/users/create', icon: <UserPlus size={16} /> },
        { name: 'Assign User', path: '/assignuser', icon: <UserPlus size={16} /> },
        { name: 'Assigned List', path: '/assignedusers', icon: <UserPlus size={16} /> },
        { name: 'Role & Permissions', path: '/managepermissions', icon: <UserPlus size={16} /> }
      ]
    },
    {
      name: 'Settings',
      icon: <Settings color='white' size={18} />,
      color: 'from-gray-500 to-slate-500',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-100/50',
      textColor: 'text-gray-700',
      subItems: [
        { name: 'Settings', path: '/settings', icon: <Settings size={16} /> }
      ]
    }
  ];

  return (
    <div className="w-64 bg-gradient-to-br from-white via-gray-50 to-white text-gray-800 p-6 min-h-full shadow-2xl backdrop-blur-sm border-r border-gray-200/50">
      {/* Sidebar Header */}
      <div className="mb-8">
      
        {/* User Info Card */}
        <div className="p-4 rounded-2xl mb-4 bg-gradient-to-r from-white to-gray-50/80 backdrop-blur-sm border border-gray-200/70 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-sm">
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {currentUser?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-600">
                {currentUser?.username || 'Administrator'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <div key={item.name} className="relative">
            {item.path ? (
              <Link
                to={item.path}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 hover:border-gray-200/70 border border-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                  {item.icon}
                </div>
                <span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all`}>
                  {item.name}
                </span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleMenu(item.name.toLowerCase())}
                  className="group w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/80 hover:border-gray-200/70 border border-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${item.color} shadow-sm`}>
                      {item.icon}
                    </div>
                    <span className={`font-medium ${item.textColor} group-hover:${item.textColor} group-hover:brightness-125 transition-all`}>
                      {item.name}
                    </span>
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
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Actions */}
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

      {/* Footer Stats */}
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
    </div>
  );
};

export default Sidebar;