import React from 'react';
import { X, Box, Package, TrendingUp, AlertCircle } from 'lucide-react';

const StoreMaterialsModal = ({ materials, onClose }) => {
  if (!materials || materials.length === 0) {
    return null;
  }

  // Calculate total stock
  const totalStock = materials.reduce((sum, sm) => sum + (parseInt(sm.stock) || 0), 0);
  const lowStockItems = materials.filter(sm => (parseInt(sm.stock) || 0) <= 10).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
        <div className="relative p-6 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-b border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                <Box className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-100">Store Materials</h2>
                <p className="text-gray-200">Detailed inventory of materials in store</p>
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
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="text-blue-500" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-xl font-bold text-gray-800">{materials.length}</p>
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
                    <p className="text-sm text-red-600">Low Stock Items</p>
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
                  <tr className="bg-gradient-to-r from-orange-500/10 to-amber-500/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Material Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {materials.map((sm, index) => {
                    const stock = parseInt(sm.stock) || 0;
                    const isLowStock = stock <= 10;
                    const isCritical = stock <= 5;
                    
                    return (
                      <tr 
                        key={sm.materialId}
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
                              'bg-blue-500/10'
                            }`}>
                              <Box className={
                                isCritical ? 'text-red-500' : 
                                isLowStock ? 'text-amber-500' : 
                                'text-blue-500'
                              } size={20} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{sm.material.name}</div>
                              <div className="text-sm text-gray-500">ID: {sm.materialId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-gray-800">{stock}</span>
                            {isLowStock && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isCritical ? 'bg-red-500' : 
                                  isLowStock ? 'bg-amber-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ 
                                  width: `${Math.min(100, (stock / 100) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="ml-3 text-sm text-gray-600">
                              {stock < 20 ? `${stock} units` : 'Good'}
                            </span>
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
          {materials.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-6 bg-gray-100/50 rounded-2xl">
                <Box className="mx-auto text-gray-400" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-600">No materials found</h3>
                <p className="mt-2 text-gray-500">This store doesn't have any materials yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/30 bg-gradient-to-r from-gray-50/50 to-white/30">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{materials.length}</span> materials
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

export default StoreMaterialsModal;