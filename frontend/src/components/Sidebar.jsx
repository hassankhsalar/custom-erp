import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useEffect } from 'react';

const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState({});
  const { currentUser, loading, error } = useCurrentUser();
  const [userPermissions, setUserPermissions] = useState({});

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // console.log(currentUser);

  return (
    <div className="w-64 bg-black rounded-tr-lg text-white p-5 min-h-full shadow-lg"> {/* Black background, white text, padding, min-height, shadow */}
      <ul>
        <li><Link to="/dashboard" className="block py-2 px-3 rounded-md hover:bg-gray-700">Dashboard</Link></li> {/* Block link, padding, rounded, hover effect */}
        
        <li>
          <div onClick={() => toggleMenu('sale')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Sale
          </div>
          {openMenus.sale && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/sale/pos" className="block py-1 px-2 text-gray-300 hover:text-white">POS</Link></li>
              <li><Link to="/sale/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Sales</Link></li>
              <li><Link to="/sale/create" className="block py-1 px-2 text-gray-300 hover:text-white">Create Sale</Link></li>
              <li><Link to="/sale/return" className="block py-1 px-2 text-gray-300 hover:text-white">Sale Return</Link></li>
              <li><Link to="/sale/allreturns" className="block py-1 px-2 text-gray-300 hover:text-white">All Sale Returns</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('production')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Production
          </div>
          {openMenus.production && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/productions/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Production</Link></li>
              <li><Link to="/productions/new" className="block py-1 px-2 text-gray-300 hover:text-white">New Production</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('purchase')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Purchase
          </div>
          {openMenus.purchase && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/purchase/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Purchase</Link></li>
              <li><Link to="/purchase/new" className="block py-1 px-2 text-gray-300 hover:text-white">New Purchase</Link></li>
              <li><Link to="/purchase/all-supplier" className="block py-1 px-2 text-gray-300 hover:text-white">All Supplier</Link></li>
              <li><Link to="/purchase/add-supplier" className="block py-1 px-2 text-gray-300 hover:text-white">Add Supplier</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('transfer')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Transfer
          </div>
          {openMenus.transfer && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/transfer/add" className="block py-1 px-2 text-gray-300 hover:text-white">Add Transfer</Link></li>
              <li><Link to="/transfer/store-to-store" className="block py-1 px-2 text-gray-300 hover:text-white">Store to store transfer</Link></li>
              <li><Link to="/transfer/store-to-factory" className="block py-1 px-2 text-gray-300 hover:text-white">Store to factory</Link></li>
              <li><Link to="/transfer/store-to-shop" className="block py-1 px-2 text-gray-300 hover:text-white">Store to Shop</Link></li>
              <li><Link to="/transfer/factory-to-factory" className="block py-1 px-2 text-gray-300 hover:text-white">Factory to factory</Link></li>
              <li><Link to="/transfer/factory-to-store" className="block py-1 px-2 text-gray-300 hover:text-white">Factory to store</Link></li>
              <li><Link to="/transfer/factory-to-shop" className="block py-1 px-2 text-gray-300 hover:text-white">Factory to shop</Link></li>
              <li><Link to="/transfer/shop-to-shop" className="block py-1 px-2 text-gray-300 hover:text-white">Shop to shop</Link></li>
              <li><Link to="/transfer/shop-to-store" className="block py-1 px-2 text-gray-300 hover:text-white">Shop to store</Link></li>
              <li><Link to="/transfer/shop-to-factory" className="block py-1 px-2 text-gray-300 hover:text-white">Shop to factory</Link></li>
            </ul>
          )}
        </li>



        <li>
          <div onClick={() => toggleMenu('products')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2"> {/* Flex, justify, items, padding, background, cursor, rounded, hover, margin-top */}
            Products
          </div>
          {openMenus.products && (
            <ul className="pl-6 border-l border-gray-700 mt-1"> {/* Left padding, left border, margin-top */}
              <li><Link to="/products/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Products</Link></li> {/* Block link, padding, text color, hover text color */}
              <li><Link to="/products/create" className="block py-1 px-2 text-gray-300 hover:text-white">Create Product</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('materials')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Materials
          </div>
          {openMenus.materials && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/materials/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Materials</Link></li>
              <li><Link to="/materials/add" className="block py-1 px-2 text-gray-300 hover:text-white">Add Material</Link></li>
              <li><Link to="/materials/scrape" className="block py-1 px-2 text-gray-300 hover:text-white">Scrape Materials</Link></li>
              <li><Link to="/materials/recover" className="block py-1 px-2 text-gray-300 hover:text-white">Recover Materials</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('factory')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Factory
          </div>
          {openMenus.factory && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/factories/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Factory</Link></li>
              <li><Link to="/factories/add" className="block py-1 px-2 text-gray-300 hover:text-white">Add Factory</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('stores')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Stores
          </div>
          {openMenus.stores && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/stores/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Store</Link></li>
              <li><Link to="/stores/add" className="block py-1 px-2 text-gray-300 hover:text-white">Add Store</Link></li>
              <li><Link to="/transfers" className="block py-1 px-2 text-gray-300 hover:text-white">Manage Transfer</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('shop')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Shop
          </div>
          {openMenus.shop && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/shop/all" className="block py-1 px-2 text-gray-300 hover:text-white">All Shop</Link></li>
              <li><Link to="/shop/add" className="block py-1 px-2 text-gray-300 hover:text-white">Add Shop</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('report')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Report
          </div>
          {openMenus.report && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/report/sale" className="block py-1 px-2 text-gray-300 hover:text-white">Sale Report</Link></li>
              <li><Link to="/report/purchase" className="block py-1 px-2 text-gray-300 hover:text-white">Purchase Report</Link></li>
              <li><Link to="/report/production" className="block py-1 px-2 text-gray-300 hover:text-white">Production Report</Link></li>
              <li><Link to="/report/wastage" className="block py-1 px-2 text-gray-300 hover:text-white">Wastage Report</Link></li>
              <li><Link to="/report/scrape" className="block py-1 px-2 text-gray-300 hover:text-white">Scrape Report</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('users')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Users
          </div>
          {openMenus.users && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/users/all" className="block py-1 px-2 text-gray-300 hover:text-white">All User</Link></li>
              <li><Link to="/users/create" className="block py-1 px-2 text-gray-300 hover:text-white">Create User</Link></li>
            </ul>
          )}
        </li>

        <li>
          <div onClick={() => toggleMenu('settings')} className="flex justify-between items-center py-2 px-3 bg-gray-800 cursor-pointer rounded-md hover:bg-gray-700 mt-2">
            Settings
          </div>
          {openMenus.settings && (
            <ul className="pl-6 border-l border-gray-700 mt-1">
              <li><Link to="/settings" className="block py-1 px-2 text-gray-300 hover:text-white">Settings</Link></li>
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;