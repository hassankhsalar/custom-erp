import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { 
  Package, 
  Box, 
  Store, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Eye, 
  Trash2, 
  User, 
  MapPin, 
  Phone, 
  ShoppingBag,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Hash,
  Factory,
  MoreVertical
} from 'lucide-react';

const AllShop = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShop, setExpandedShop] = useState(null);
  const [stats, setStats] = useState({
    totalShops: 0,
    totalProducts: 0,
    totalMaterials: 0,
    totalProductStock: 0,
    totalMaterialStock: 0
  });

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    // Calculate statistics
    const calculateStats = () => {
      const totalShops = shops.length;
      const totalProducts = shops.reduce((sum, shop) => sum + (shop.shopProducts?.length || 0), 0);
      const totalMaterials = shops.reduce((sum, shop) => sum + (shop.shopMaterials?.length || 0), 0);
      const totalProductStock = shops.reduce((sum, shop) => 
        sum + (shop.shopProducts?.reduce((pSum, p) => pSum + (parseFloat(p.stock) || 0), 0) || 0), 0);
      const totalMaterialStock = shops.reduce((sum, shop) => 
        sum + (shop.shopMaterials?.reduce((mSum, m) => mSum + (parseFloat(m.stock) || 0), 0) || 0), 0);

      setStats({
        totalShops,
        totalProducts,
        totalMaterials,
        totalProductStock,
        totalMaterialStock
      });
    };

    calculateStats();
  }, [shops]);

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.SHOPS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShops(response.data);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShopDetails = (shopId) => {
    setExpandedShop(expandedShop === shopId ? null : shopId);
  };

  const handleDeleteShop = async (shopId, shopName) => {
    if (window.confirm(`Are you sure you want to delete "${shopName}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ROUTES.SHOPS}/${shopId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchShops(); // Refresh the list
      } catch (error) {
        console.error('Error deleting shop:', error);
        alert('Failed to delete shop. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 border border-white/30 shadow-xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading shops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
              <ShoppingBag className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                All Shops
              </h1>
              <p className="text-gray-600 mt-2">Manage your retail shop inventory and details</p>
            </div>
          </div>
          <Link 
            to="/shop/add" 
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <Plus size={20} />
            Add New Shop
          </Link>
        </div>
      </div>

      {/* Stats Cards with glass effect */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Shops</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalShops}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Store className="text-green-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Shop Keepers</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalShops}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <User className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalProductStock} units</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Package className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Materials</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalMaterials}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalMaterialStock} units</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Box className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Inventory</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalShops > 0 ? Math.round((stats.totalProducts + stats.totalMaterials) / stats.totalShops) : 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">items per shop</p>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-lg">
              <TrendingUp className="text-teal-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container with glass effect */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-2xl backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Store size={16} />
                    Shop Details
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    Contact Info
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} />
                    Inventory Summary
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {shops.map((shop, index) => {
                const shopProducts = shop.shopProducts || [];
                const shopMaterials = shop.shopMaterials || [];
                const totalProductStock = shopProducts.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0);
                const totalMaterialStock = shopMaterials.reduce((sum, m) => sum + (parseFloat(m.stock) || 0), 0);
                const lowStockProducts = shopProducts.filter(p => (parseFloat(p.stock) || 0) <= 5).length;
                const lowStockMaterials = shopMaterials.filter(m => (parseFloat(m.stock) || 0) <= 10).length;

                return (
                  <React.Fragment key={shop.id}>
                    <tr className="hover:bg-white/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                            <Store className="text-white" size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{shop.name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin size={14} />
                              {shop.address || 'No address specified'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="text-gray-400" size={16} />
                            <span className="text-sm text-gray-900">{shop.shop_keeper || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="text-gray-400" size={16} />
                            <span className="text-sm text-gray-600">{shop.mobile || 'Not specified'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <Package className="text-blue-500" size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  {shopProducts.length} products
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                  <Box className="text-orange-500" size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  {shopMaterials.length} materials
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {totalProductStock + totalMaterialStock} total units
                            </div>
                          </div>
                          
                          {(lowStockProducts > 0 || lowStockMaterials > 0) && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="text-red-500" size={14} />
                              <span className="text-xs text-red-600">
                                {lowStockProducts > 0 && `${lowStockProducts} low product stock`}
                                {lowStockProducts > 0 && lowStockMaterials > 0 && ', '}
                                {lowStockMaterials > 0 && `${lowStockMaterials} low material stock`}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleShopDetails(shop.id)}
                            className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-600 hover:text-blue-700 font-medium rounded-lg transition-all duration-300 border border-blue-200 hover:border-blue-300"
                          >
                            {expandedShop === shop.id ? (
                              <>
                                <ChevronUp size={16} />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                Show Details
                              </>
                            )}
                          </button>
                          
                          <div className="relative group">
                            <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-500/10 rounded-lg transition-all duration-300">
                              <MoreVertical size={18} />
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-white/30 shadow-xl invisible group-hover:visible transition-all duration-300 z-10">
                              <div className="p-2 space-y-1">
                                <button
                                  onClick={() => handleDeleteShop(shop.id, shop.name)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-left"
                                >
                                  <Trash2 size={16} />
                                  Delete Shop
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedShop === shop.id && (
                      <tr className="bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                        <td colSpan="4" className="px-6 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Products Section */}
                            <div className="glass-card rounded-xl border border-white/30 p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                                    <Package className="text-white" size={20} />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-800">Products Inventory</h3>
                                    <p className="text-sm text-gray-600">{shopProducts.length} products • {totalProductStock} units</p>
                                  </div>
                                </div>
                                {lowStockProducts > 0 && (
                                  <div className="px-3 py-1 bg-red-500/10 rounded-full">
                                    <span className="text-xs font-medium text-red-600">
                                      {lowStockProducts} low stock
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {shopProducts.length > 0 ? (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                  {shopProducts.map((sp) => {
                                    const stock = parseFloat(sp.stock) || 0;
                                    const isLowStock = stock <= 5;
                                    const isCritical = stock <= 2;
                                    
                                    return (
                                      <div 
                                        key={sp.product_id}
                                        className="glass-card rounded-lg p-3 border border-gray-200/50 hover:border-blue-200/50 transition-all duration-300"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                              isCritical ? 'bg-red-500/10' : 
                                              isLowStock ? 'bg-amber-500/10' : 
                                              'bg-green-500/10'
                                            }`}>
                                              <Package className={
                                                isCritical ? 'text-red-500' : 
                                                isLowStock ? 'text-amber-500' : 
                                                'text-green-500'
                                              } size={16} />
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">{sp.product?.name}</div>
                                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <Hash size={12} />
                                                {sp.product?.barcode || 'No barcode'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <div className="text-right">
                                              <div className="text-sm font-medium text-gray-900">${sp.product?.sale_price?.toFixed(2) || '0.00'}</div>
                                              <div className="text-xs text-gray-500">price</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                              isCritical ? 'bg-red-500/10 text-red-600' : 
                                              isLowStock ? 'bg-amber-500/10 text-amber-600' : 
                                              'bg-green-500/10 text-green-600'
                                            }`}>
                                              {stock} units
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <Package className="mx-auto text-gray-300" size={32} />
                                  <p className="mt-2 text-gray-500">No products available</p>
                                </div>
                              )}
                            </div>

                            {/* Materials Section */}
                            <div className="glass-card rounded-xl border border-white/30 p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                                    <Box className="text-white" size={20} />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-800">Materials Inventory</h3>
                                    <p className="text-sm text-gray-600">{shopMaterials.length} materials • {totalMaterialStock} units</p>
                                  </div>
                                </div>
                                {lowStockMaterials > 0 && (
                                  <div className="px-3 py-1 bg-red-500/10 rounded-full">
                                    <span className="text-xs font-medium text-red-600">
                                      {lowStockMaterials} low stock
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {shopMaterials.length > 0 ? (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                  {shopMaterials.map((sm) => {
                                    const stock = parseFloat(sm.stock) || 0;
                                    const isLowStock = stock <= 10;
                                    const isCritical = stock <= 5;
                                    
                                    return (
                                      <div 
                                        key={sm.material_id}
                                        className="glass-card rounded-lg p-3 border border-gray-200/50 hover:border-orange-200/50 transition-all duration-300"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                              isCritical ? 'bg-red-500/10' : 
                                              isLowStock ? 'bg-amber-500/10' : 
                                              'bg-green-500/10'
                                            }`}>
                                              <Box className={
                                                isCritical ? 'text-red-500' : 
                                                isLowStock ? 'text-amber-500' : 
                                                'text-green-500'
                                              } size={16} />
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">{sm.material?.name}</div>
                                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <Factory size={12} />
                                                {sm.material?.brand || 'No brand'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <div className="text-right">
                                              <div className="text-sm font-medium text-gray-900">
                                                ${sm.material?.unit_cost?.toFixed(2) || '0.00'}
                                              </div>
                                              <div className="text-xs text-gray-500">unit cost</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                              isCritical ? 'bg-red-500/10 text-red-600' : 
                                              isLowStock ? 'bg-amber-500/10 text-amber-600' : 
                                              'bg-green-500/10 text-green-600'
                                            }`}>
                                              {stock} {sm.material?.unit || ''}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <Box className="mx-auto text-gray-300" size={32} />
                                  <p className="mt-2 text-gray-500">No materials available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {shops.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-8 glass-card rounded-2xl border border-white/30">
              <ShoppingBag className="mx-auto text-gray-300" size={48} />
              <h3 className="mt-4 text-lg font-medium text-gray-600">No Shops Found</h3>
              <p className="mt-2 text-gray-500">Get started by creating your first shop</p>
              <Link 
                to="/shop/add" 
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Plus size={18} />
                Add Your First Shop
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllShop;