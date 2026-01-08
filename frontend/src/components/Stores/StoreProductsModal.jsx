import React from 'react';
import { X, Package, TrendingUp, AlertCircle, Star, ShoppingBag } from 'lucide-react';

const StoreProductsModal = ({ products, onClose }) => {
  if (!products || products.length === 0) {
    return null;
  }

  // Calculate total stock and stats
  const totalStock = products.reduce((sum, sp) => sum + (parseInt(sp.stock) || 0), 0);
  const lowStockItems = products.filter(sp => (parseInt(sp.stock) || 0) <= 5).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl glass-card rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <ShoppingBag className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Store Products</h2>
                <p className="text-gray-200">Detailed inventory of products in store</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110"
            >
              <X size={24} className="text-gray-600 hover:text-gray-800" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="glass-card rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Package className="text-purple-500" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-xl font-bold text-gray-800">{products.length}</p>
                </div>
              </div>
            </div>
            
            <div className="glass-card rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="text-xl font-bold text-gray-800">{totalStock}</p>
                </div>
              </div>
            </div>
            
            {lowStockItems > 0 && (
              <div className="glass-card rounded-xl p-4 border border-red-200/50 bg-red-50/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-red-600">Low Stock Alert</p>
                    <p className="text-xl font-bold text-red-700">{lowStockItems}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="glass-card rounded-xl border border-white/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Product Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {products.map((sp, index) => {
                    const stock = parseInt(sp.stock) || 0;
                    const isLowStock = stock <= 5;
                    const isCritical = stock <= 2;
                    const stockPercentage = Math.min(100, (stock / 50) * 100);
                    
                    return (
                      <tr 
                        key={sp.productId}
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
                              } size={20} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{sp.product.name}</div>
                              <div className="text-sm text-gray-500">ID: {sp.productId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span className="text-2xl font-bold text-gray-800">{stock}</span>
                              <div className="absolute -top-2 -right-2">
                                {stock >= 20 && (
                                  <Star className="text-yellow-500 fill-yellow-500" size={12} />
                                )}
                              </div>
                            </div>
                            {isLowStock && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isCritical 
                                  ? 'bg-red-500/10 text-red-600' 
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {isCritical ? 'Critical' : 'Low'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isCritical ? 'bg-red-500' : 
                                  isLowStock ? 'bg-amber-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${stockPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {stockPercentage < 30 ? `${stockPercentage}%` : 'Good'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            stock >= 20 
                              ? 'bg-green-500/10 text-green-600' 
                              : stock >= 10 
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}>
                            {stock >= 20 ? 'High' : stock >= 10 ? 'Medium' : 'Low'}
                            {stock >= 20 && <Star size={14} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty state */}
          {products.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-6 bg-gray-100/50 rounded-2xl">
                <ShoppingBag className="mx-auto text-gray-400" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-600">No products found</h3>
                <p className="mt-2 text-gray-500">This store doesn't have any products yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/30 bg-gradient-to-r from-gray-50/50 to-white/30">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{products.length}</span> products • 
              Total stock: <span className="font-semibold">{totalStock}</span> units
            </div>
            <button
              onClick={onClose}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Close
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Add these styles to your global CSS or style tag */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
};

export default StoreProductsModal;