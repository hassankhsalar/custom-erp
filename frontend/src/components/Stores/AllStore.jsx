import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import StoreProductsModal from './StoreProductsModal';
import StoreMaterialsModal from './StoreMaterialsModal';
import { FilePenLine, Trash, Eye, Plus, ChevronLeft, ChevronRight, Store, MapPin, User, Phone, Package, Box } from 'lucide-react';

const AllStore = () => {
  const [stores, setStores] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [currentStoreProducts, setCurrentStoreProducts] = useState([]);
  const [currentStoreMaterials, setCurrentStoreMaterials] = useState([]);

  useEffect(() => {
    fetchStores(currentPage);
  }, [currentPage]);

  const fetchStores = async (page) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.STORES}?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStores(response.data.stores);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ROUTES.STORES}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchStores(currentPage); // Refresh the list
      } catch (error) {
        console.error('Error deleting store:', error);
      }
    }
  };

  const openProductsModal = (products) => {
    setCurrentStoreProducts(products);
    setShowProductsModal(true);
  };

  const closeProductsModal = () => {
    setShowProductsModal(false);
    setCurrentStoreProducts([]);
  };

  const openMaterialsModal = (materials) => {
    setCurrentStoreMaterials(materials);
    setShowMaterialsModal(true);
  };

  const closeMaterialsModal = () => {
    setShowMaterialsModal(false);
    setCurrentStoreMaterials([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Header with glass effect */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              All Stores
            </h1>
            <p className="text-gray-600 mt-2">Manage your store inventory and details</p>
          </div>
          <Link 
            to="/stores/add" 
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <Plus size={20} />
            Add New Store
          </Link>
        </div>
      </div>

      {/* Stats Cards with glass effect */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Stores</p>
              <p className="text-2xl font-bold text-gray-800">Active</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Store className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Store Keepers</p>
              <p className="text-2xl font-bold text-gray-800">{stores.length}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <User className="text-green-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-gray-800">
                {stores.reduce((sum, store) => sum + (store.storeProducts?.length || 0), 0)}
              </p>
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
              <p className="text-2xl font-bold text-gray-800">
                {stores.reduce((sum, store) => sum + (store.storeMaterials?.length || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Box className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container with glass effect */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-2xl backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Store size={16} />
                    Store Name
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    Address
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    Store Keeper
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    Mobile
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Materials
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {stores.map((store, index) => (
                <tr 
                  key={store.id} 
                  className="hover:bg-white/30 transition-colors duration-200"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.5s ease forwards'
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{store.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">{store.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{store.store_keeper}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{store.mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openProductsModal(store.storeProducts)}
                      className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-600 hover:text-blue-700 font-medium rounded-lg transition-all duration-300 border border-blue-200 hover:border-blue-300"
                    >
                      <Package size={16} />
                      View ({store.storeProducts?.length || 0})
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openMaterialsModal(store.storeMaterials)}
                      className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 text-orange-600 hover:text-orange-700 font-medium rounded-lg transition-all duration-300 border border-orange-200 hover:border-orange-300"
                    >
                      <Box size={16} />
                      View ({store.storeMaterials?.length || 0})
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/stores/edit/${store.id}`}
                        className="group p-2 bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 text-green-600 hover:text-green-700 rounded-lg transition-all duration-300 border border-green-200 hover:border-green-300 hover:scale-105"
                        title="Edit"
                      >
                        <FilePenLine size={18} />
                      </Link>
                      <Link
                        to={`/stores/details/${store.id}`}
                        className="group p-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-300 border border-blue-200 hover:border-blue-300 hover:scale-105"
                        title="Details"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="group p-2 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-600 hover:text-red-700 rounded-lg transition-all duration-300 border border-red-200 hover:border-red-300 hover:scale-105"
                        title="Delete"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination with glass effect */}
        <div className="glass-card border-t border-white/30 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{stores.length}</span> stores
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white/30 hover:bg-white/50 border border-white/30 hover:border-white/50"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <div className="flex items-center gap-2 mx-4">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg transition-all duration-300 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'bg-white/30 hover:bg-white/50 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white/30 hover:bg-white/50 border border-white/30 hover:border-white/50"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProductsModal && (
        <StoreProductsModal products={currentStoreProducts} onClose={closeProductsModal} />
      )}
      {showMaterialsModal && (
        <StoreMaterialsModal materials={currentStoreMaterials} onClose={closeMaterialsModal} />
      )}

      {/* Add these styles to your global CSS or style tag */}
      <style jsx>{`
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
        
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AllStore;