import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { 
  ArrowLeft, 
  Package, 
  Box, 
  MapPin, 
  User, 
  Phone, 
  Truck, 
  Edit, 
  Store,
  BarChart3,
  AlertCircle,
  TrendingUp,
  Hash,
  DollarSign,
  Tag,
  Factory,
  Ruler,
  Activity,
  Plus
} from "lucide-react";

const StoreDetails = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStoreDetails();
  }, [id]);

  const fetchStoreDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_ROUTES.STORES}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStore(response.data);
    } catch (error) {
      console.error("Error fetching store details:", error);
      setError("Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalProducts = store?.storeProducts?.length || 0;
  const totalMaterials = store?.storeMaterials?.length || 0;
  const totalProductStock = store?.storeProducts?.reduce((sum, sp) => sum + (parseInt(sp.stock) || 0), 0) || 0;
  const totalMaterialStock = store?.storeMaterials?.reduce((sum, sm) => sum + (parseInt(sm.stock) || 0), 0) || 0;
  const lowStockProducts = store?.storeProducts?.filter(sp => (parseInt(sp.stock) || 0) <= 10).length || 0;
  const lowStockMaterials = store?.storeMaterials?.filter(sm => (parseInt(sm.stock) || 0) <= 20).length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 border border-white/30 shadow-xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading store details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-6 border border-red-200/50 shadow-xl backdrop-blur-sm max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <h3 className="text-xl font-bold text-red-600">Error Loading Store</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/stores/all"
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={18} />
            Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-6 border border-amber-200/50 shadow-xl backdrop-blur-sm max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="text-amber-500" size={24} />
            </div>
            <h3 className="text-xl font-bold text-amber-600">Store Not Found</h3>
          </div>
          <p className="text-gray-600 mb-6">The requested store could not be found.</p>
          <Link
            to="/stores/all"
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={18} />
            Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/stores/all"
              className="group p-2 glass-card rounded-xl border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="text-gray-600 group-hover:text-gray-800" size={24} />
            </Link>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Store className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">{store.name}</h1>
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <MapPin size={16} />
                  {store.address || "No address specified"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/stores/transfer/${store.id}`}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Truck size={18} />
              Transfer to Shop
            </Link>
            <Link
              to={`/stores/edit/${store.id}`}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Edit size={18} />
              Edit Store
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">{totalProductStock} units total</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Package className="text-blue-500" size={24} />
            </div>
          </div>
          {lowStockProducts > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={12} />
              <span>{lowStockProducts} low stock items</span>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Materials</p>
              <p className="text-2xl font-bold text-gray-800">{totalMaterials}</p>
              <p className="text-xs text-gray-500 mt-1">{totalMaterialStock} units total</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Box className="text-green-500" size={24} />
            </div>
          </div>
          {lowStockMaterials > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={12} />
              <span>{lowStockMaterials} low stock items</span>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Store Keeper</p>
              <p className="text-xl font-bold text-gray-800">{store.store_keeper || "Not assigned"}</p>
              <p className="text-xs text-gray-500 mt-1">Responsible person</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <User className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Contact</p>
              <p className="text-xl font-bold text-gray-800">{store.mobile || "Not provided"}</p>
              <p className="text-xs text-gray-500 mt-1">Mobile number</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Phone className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Store Information Card */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden mb-8">
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
              <BarChart3 className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Store Overview</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="text-blue-500" size={20} />
                Location Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-800">
                      {store.address || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Store Keeper</p>
                    <p className="font-medium text-gray-800">
                      {store.store_keeper || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Contact Number</p>
                    <p className="font-medium text-gray-800">
                      {store.mobile || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="text-green-500" size={20} />
                Inventory Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-white/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Package className="text-blue-500" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Products</p>
                      <p className="text-lg font-bold text-gray-800">{totalProducts}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Stock</p>
                    <p className="text-lg font-bold text-gray-800">{totalProductStock}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-white/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Box className="text-green-500" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Materials</p>
                      <p className="text-lg font-bold text-gray-800">{totalMaterials}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Stock</p>
                    <p className="text-lg font-bold text-gray-800">{totalMaterialStock}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="text-purple-500" size={20} />
                Stock Alerts
              </h3>
              <div className="space-y-4">
                {lowStockProducts > 0 && (
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-200/50">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-500" size={18} />
                      <div>
                        <p className="text-sm font-medium text-red-600">Low Product Stock</p>
                        <p className="text-xs text-red-500">{lowStockProducts} products need attention</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {lowStockMaterials > 0 && (
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-200/50">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-amber-500" size={18} />
                      <div>
                        <p className="text-sm font-medium text-amber-600">Low Material Stock</p>
                        <p className="text-xs text-amber-500">{lowStockMaterials} materials need attention</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {lowStockProducts === 0 && lowStockMaterials === 0 && (
                  <div className="p-3 bg-green-500/10 rounded-xl border border-green-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Check className="text-green-500" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600">All Stock Levels Good</p>
                        <p className="text-xs text-green-500">No immediate restocking needed</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden mb-8">
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Products Inventory</h2>
                <p className="text-gray-600">All products available in this store</p>
              </div>
            </div>
            <div className="px-4 py-2 glass-card rounded-full border border-white/30">
              <span className="font-medium text-gray-700">{totalProducts} products • {totalProductStock} units</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {store.storeProducts && store.storeProducts.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200/50">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Barcode
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Stock Level
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {store.storeProducts.map((sp, index) => {
                      const stock = parseInt(sp.stock) || 0;
                      const isLowStock = stock <= 10;
                      const isCritical = stock <= 5;
                      
                      return (
                        <tr 
                          key={`${sp.store_id}-${sp.product_id}`}
                          className="hover:bg-white/30 transition-colors duration-200"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: 'fadeInUp 0.3s ease forwards'
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                isCritical ? 'bg-red-500/10' : 
                                isLowStock ? 'bg-amber-500/10' : 
                                'bg-green-500/10'
                              }`}>
                                <Package className={
                                  isCritical ? 'text-red-500' : 
                                  isLowStock ? 'text-amber-500' : 
                                  'text-green-500'
                                } size={18} />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{sp.product?.name || "N/A"}</div>
                                <div className="text-sm text-gray-500">ID: {sp.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Hash className="text-gray-400" size={16} />
                              <span className="text-gray-700 font-mono">{sp.product?.barcode || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="text-gray-400" size={16} />
                              <span className="font-medium text-gray-900">
                                ${sp.product?.sale_price?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    isCritical ? 'bg-red-500' : 
                                    isLowStock ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (stock / 50) * 100)}%` }}
                                />
                              </div>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                isCritical ? 'bg-red-500/10 text-red-600' : 
                                isLowStock ? 'bg-amber-500/10 text-amber-600' : 
                                'bg-green-500/10 text-green-600'
                              }`}>
                                {stock} units
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Tag className="text-gray-400" size={16} />
                              <span className="text-gray-700">{sp.product?.category || "N/A"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-block p-6 glass-card rounded-2xl border border-gray-200/50">
                <Package className="mx-auto text-gray-300" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-600">No Products Available</h3>
                <p className="mt-2 text-gray-500">This store doesn't have any products yet.</p>
                <Link
                  to={`/stores/edit/${store.id}`}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Add Products
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materials Section */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
                <Box className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Materials Inventory</h2>
                <p className="text-gray-600">All materials available in this store</p>
              </div>
            </div>
            <div className="px-4 py-2 glass-card rounded-full border border-white/30">
              <span className="font-medium text-gray-700">{totalMaterials} materials • {totalMaterialStock} units</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {store.storeMaterials && store.storeMaterials.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200/50">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-orange-500/10 to-amber-500/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Material Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Stock Level
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {store.storeMaterials.map((sm, index) => {
                      const stock = parseInt(sm.stock) || 0;
                      const isLowStock = stock <= 20;
                      const isCritical = stock <= 10;
                      
                      return (
                        <tr 
                          key={`${sm.store_id}-${sm.material_id}`}
                          className="hover:bg-white/30 transition-colors duration-200"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: 'fadeInUp 0.3s ease forwards'
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                isCritical ? 'bg-red-500/10' : 
                                isLowStock ? 'bg-amber-500/10' : 
                                'bg-green-500/10'
                              }`}>
                                <Box className={
                                  isCritical ? 'text-red-500' : 
                                  isLowStock ? 'text-amber-500' : 
                                  'text-green-500'
                                } size={18} />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{sm.material?.name || "N/A"}</div>
                                <div className="text-sm text-gray-500">ID: {sm.material_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Factory className="text-gray-400" size={16} />
                              <span className="text-gray-700">{sm.material?.brand || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="text-gray-400" size={16} />
                              <span className="font-medium text-gray-900">
                                ${sm.material?.unit_cost?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    isCritical ? 'bg-red-500' : 
                                    isLowStock ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (stock / 100) * 100)}%` }}
                                />
                              </div>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                isCritical ? 'bg-red-500/10 text-red-600' : 
                                isLowStock ? 'bg-amber-500/10 text-amber-600' : 
                                'bg-green-500/10 text-green-600'
                              }`}>
                                {stock} {sm.material?.unit || ""}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Ruler className="text-gray-400" size={16} />
                              <span className="text-gray-700">{sm.material?.unit || "N/A"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-block p-6 glass-card rounded-2xl border border-gray-200/50">
                <Box className="mx-auto text-gray-300" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-600">No Materials Available</h3>
                <p className="mt-2 text-gray-500">This store doesn't have any materials yet.</p>
                <Link
                  to={`/stores/edit/${store.id}`}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Add Materials
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
};

export default StoreDetails;