import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import StoreProductsModal from './StoreProductsModal';
import StoreMaterialsModal from './StoreMaterialsModal';
import { FilePenLine, Trash } from 'lucide-react';

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Stores</h1>
      <Link to="/stores/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 inline-block">
        Add New Store
      </Link>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2 border border-gray-300">Name</th>
              <th className="px-4 py-2 border border-gray-300">Address</th>
              <th className="px-4 py-2 border border-gray-300">Store Keeper</th>
              <th className="px-4 py-2 border border-gray-300">Mobile</th>
              <th className="px-4 py-2 border border-gray-300">Products</th>
              <th className="px-4 py-2 border border-gray-300">Materials</th>
              <th className="px-4 py-2 border border-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => (
              <tr key={store.id}>
                <td className="border border-gray-300 px-4 py-2">{store.name}</td>
                <td className="border border-gray-300 px-4 py-2">{store.address}</td>
                <td className="border border-gray-300 px-4 py-2">{store.store_keeper}</td>
                <td className="border border-gray-300 px-4 py-2">{store.mobile}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    onClick={() => openProductsModal(store.storeProducts)}
                    className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs cursor-pointer"
                  >
                    View ({store.storeProducts?.length})
                  </button>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    onClick={() => openMaterialsModal(store.storeMaterials)}
                    className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs cursor-pointer"
                  >
                    View ({store.storeMaterials?.length})
                  </button>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-xs flex">
                  <Link
                    to={`/stores/edit/${store.id}`}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2"
                  >
                    <FilePenLine size={14} />
                  </Link>
                  <Link
                    to={`/stores/details/${store.id}`}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                  >
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
        >
          Previous
        </button>
        <span className="bg-gray-200 text-gray-800 font-bold py-2 px-4">Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r"
        >
          Next
        </button>
      </div>

      {showProductsModal && (
        <StoreProductsModal products={currentStoreProducts} onClose={closeProductsModal} />
      )}
      {showMaterialsModal && (
        <StoreMaterialsModal materials={currentStoreMaterials} onClose={closeMaterialsModal} />
      )}
    </div>
  );
};

export default AllStore;