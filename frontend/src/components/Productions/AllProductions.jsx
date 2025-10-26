import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { FaEye, FaPen, FaTrash, FaExchangeAlt } from 'react-icons/fa';
import { BsToggles } from 'react-icons/bs';

const AllProductions = () => {
  const [productions, setProductions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stores, setStores] = useState([]);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);

  // Status change states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [editableProducts, setEditableProducts] = useState([]);
  const [editableMaterials, setEditableMaterials] = useState([]);
  const [transferData, setTransferData] = useState({});

  useEffect(() => {
    fetchProductions(currentPage);
    fetchStores();
  }, [currentPage]);

  const fetchProductions = async (page) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.PRODUCTIONS}?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductions(response.data.productions);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching productions:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.STORES}?pagination=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStores(response.data.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this production?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_ROUTES.PRODUCTIONS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage);
      } catch (error) {
        console.error('Error deleting production:', error);
      }
    }
  };

  const openDetailsModal = async (production) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ROUTES.PRODUCTIONS}/${production.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedProduction(response.data);
      setDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching production details:', error);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedProduction(null);
  };

  const openUpdateStatusModal = (production) => {
    setSelectedProduction(production);
    setSelectedStatus(production.status);
    if (production.status === 'production_done') {
        setEditableProducts(production.productionProducts.map(p => ({...p, received: p.quantity, scrap: 0})))
        setEditableMaterials(production.productionMaterials.map(m => ({...m, scrap: 0})))
    } else {
        setEditableProducts(production.productionProducts);
        setEditableMaterials(production.productionMaterials);
    }
    setUpdateStatusModalOpen(true);
  };

  const closeUpdateStatusModal = () => {
    setUpdateStatusModalOpen(false);
    setSelectedProduction(null);
    setEditableProducts([]);
    setEditableMaterials([]);
    setTransferData({});
  };

  const openTransferModal = (production) => {
    setSelectedProduction(production);
    setEditableProducts(production.productionProducts);
    const initialTransferData = {};
    production.productionProducts.forEach(p => {
        if (p.received > p.moved_to_store) {
            initialTransferData[p.id] = {
                productId: p.productId,
                productionProductId: p.id,
                quantity: p.received - p.moved_to_store,
                storeId: null
            };
        }
    });
    setTransferData(initialTransferData);
    setTransferModalOpen(true);
  };

  const closeTransferModal = () => {
    setTransferModalOpen(false);
    setSelectedProduction(null);
    setEditableProducts([]);
    setTransferData({});
  };

  const handleStatusChange = async () => {
    try {
        const token = localStorage.getItem('token');
        const payload = { 
            status: selectedStatus,
            products: selectedStatus === 'production_done' ? editableProducts : undefined,
            materials: selectedStatus === 'production_done' ? editableMaterials : undefined,
        };
        await axios.put(`${API_ROUTES.PRODUCTIONS}/${selectedProduction.id}/status`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage);
        closeUpdateStatusModal();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
  }

  const handleTransfer = async () => {
    try {
        const token = localStorage.getItem('token');
        const validTransfers = Object.values(transferData).filter(t => t.storeId && t.quantity > 0);

        if (validTransfers.length === 0) {
            alert('Please select a store and enter a valid quantity for at least one product.');
            return;
        }

        const payload = { 
            transfers: validTransfers,
        };
        await axios.post(`${API_ROUTES.PRODUCTIONS}/${selectedProduction.id}/transfer`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage);
        closeTransferModal();
    } catch (error) {
        console.error('Error transferring products:', error);
        alert('Failed to transfer products');
    }
  }

  const handleProductEdit = (index, field, value) => {
    setEditableProducts(prev => prev.map((p, i) => i === index ? {...p, [field]: value} : p));
  }

  const handleMaterialEdit = (index, field, value) => {
    setEditableMaterials(prev => prev.map((m, i) => i === index ? {...m, [field]: value} : m));
  }

  const handleTransferChange = (productId, field, value) => {
    setTransferData(prev => ({
        ...prev,
        [productId]: {
            ...prev[productId],
            productId: selectedProduction.productionProducts.find(p => p.id === productId).productId,
            productionProductId: productId,
            [field]: value,
        }
    }))
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Productions</h1>
      <Link to="/productions/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 inline-block">
        Create New Production
      </Link>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-4 py-2 border border-gray-300">Reference</th>
              <th className="px-4 py-2 border border-gray-300">Start Date</th>
              <th className="px-4 py-2 border border-gray-300">End Date</th>
              <th className="px-4 py-2 border border-gray-300">Factory</th>
              <th className="px-4 py-2 border border-gray-300">Status</th>
              <th className="px-4 py-2 border border-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {productions.map(production => (
              <tr key={production.id}>
                <td className="border border-gray-300 px-4 py-2">{production.reference}</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(production.start_date))}</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(production.estimated_end_date))}</td>
                <td className="border border-gray-300 px-4 py-2">{production.factory.name}</td>
                <td className="border border-gray-300 px-4 py-2 text-xs text-center ">
                  <span className={`px-2 py-1 rounded-full text-white ${production.status === 'pending'? 'bg-red-500' : production.status === 'running' ? 'bg-sky-500' : 'bg-green-500'}`}>
                    {production.status.replace(/-|_/g, ' ').replace(/_/g, ' ').replace(/\w\S*/g, function(txt){
                      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    })}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className='flex gap-3'>
                    <button onClick={() => openDetailsModal(production)} className="text-blue-500 hover:text-blue-700 cursor-pointer mr-2"><FaEye /></button>
                    { ['running', 'pending'].includes(production.status) && 
                      <Link to={`/productions/edit/${production.id}`} className="text-teal-500 hover:text-teal-700 cursor-pointer mr-2"><FaPen /></Link>
                    }
                    
                    <button onClick={() => handleDelete(production.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2"><FaTrash /></button>
                    { ['running', 'pending'].includes(production.status) && 
                      <button onClick={() => openUpdateStatusModal(production)} className="text-violet-500 hover:text-violet-700 cursor-pointer"><BsToggles /></button>
                    }
                    {['production_done', 'partial_transfer', 'transfer_done'].includes(production.status) && 
                      <button onClick={() => openTransferModal(production)} className="text-sky-500 hover:text-sky-700 cursor-pointer"><FaExchangeAlt /></button>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
      

      {/* Details Modal */}
      {detailsModalOpen && selectedProduction && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
            <h2 className="text-xl font-bold mb-4">Production Details: {selectedProduction.reference}</h2>
            <h3 className="text-lg font-semibold mb-2">Products</h3>
            <table className="min-w-full bg-white border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Code</th>
                  <th className="px-4 py-2 border">Quantity</th>
                  {['production_done', 'partial_transfer', 'transfer_done'].includes(selectedProduction.status) && (
                    <>
                      <th className="px-4 py-2 border">Moved</th>
                      <th className="px-4 py-2 border">Received</th>
                      <th className="px-4 py-2 border">Scrap</th>
                      <th className="px-4 py-2 border">Cost</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedProduction.productionProducts.map(p => (
                  <tr key={p.id}>
                    <td className='p-2 border border-gray-300'>{p.product.name}</td>
                    <td className='p-2 border border-gray-300'>{p.code}</td>
                    <td className='p-2 border border-gray-300'>{p.quantity}</td>
                    {['production_done', 'partial_transfer', 'transfer_done'].includes(selectedProduction.status) && (
                      <>
                        <td className='p-2 border border-gray-300'>{p.moved_to_store}</td>
                        <td className='p-2 border border-gray-300'>{p.received}</td>
                        <td className='p-2 border border-gray-300'>{p.scrap}</td>
                        <td className='p-2 border border-gray-300'>{p.unit_cost}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-lg font-semibold mb-2">Materials</h3>
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Quantity</th>
                  {['production_done', 'partial_transfer', 'transfer_done'].includes(selectedProduction.status) && (
                    <th className="px-4 py-2 border">Scrap</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedProduction.productionMaterials.map(m => (
                  <tr key={m.id}>
                    <td className='p-2 border border-gray-300'>{m.material.name}</td>
                    <td className='p-2 border border-gray-300'>{m.quantity}</td>
                    {['production_done', 'partial_transfer', 'transfer_done'].includes(selectedProduction.status) && (
                      <td className='p-2 border border-gray-300'>{m.scrap}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {['partial_transfer', 'transfer_done'].includes(selectedProduction.status) && selectedProduction.factoryToStoreTransfers?.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-2 mt-4">Transfer Details</h3>
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border">Product</th>
                      <th className="px-4 py-2 border">Store</th>
                      <th className="px-4 py-2 border">Quantity</th>
                      <th className="px-4 py-2 border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduction.factoryToStoreTransfers.map(t => (
                      <tr key={t.id}>
                        <td className='p-2 border border-gray-300'>{t.product.name}</td>
                        <td className='p-2 border border-gray-300'>{t.store.name}</td>
                        <td className='p-2 border border-gray-300'>{t.quantity}</td>
                        <td className='p-2 border border-gray-300'>{new Intl.DateTimeFormat('en-GB').format(new Date(t.createdAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <button onClick={closeDetailsModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateStatusModalOpen && selectedProduction && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full overflow-y-auto max-h-screen">
            <h2 className="text-xl font-bold mb-4">Change Status: {selectedProduction.reference}</h2>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-4">
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="production_done">Production Done</option>
            </select>

            {selectedStatus === 'production_done' && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Update Products</h3>
                <table className="min-w-full bg-white border border-gray-300 mb-4">
                    <thead><tr><th>Name</th><th>Code</th><th>Quantity</th><th>Received</th><th>Scrap</th><th>Cost</th></tr></thead>
                    <tbody>{editableProducts.map((p, i) => <tr key={p.id}><td className='p-2 border border-gray-300'>{p.product.name}</td><td className='p-2 border border-gray-300'>{p.code}</td><td className='p-2 border border-gray-300'>{p.quantity}</td><td className='p-2 border border-gray-300'><input className='border border-gray-400 p-1 max-w-24' type="number" value={p.received} onChange={e => handleProductEdit(i, 'received', e.target.value)} /></td><td className='p-2 border border-gray-300'><input className='border border-gray-400 p-1 max-w-24' type="number" value={p.scrap} onChange={e => handleProductEdit(i, 'scrap', e.target.value)} /></td><td className='p-2 border border-gray-300'><input className='border border-gray-400 p-1 max-w-24' type="number" value={p.unit_cost} onChange={e => handleProductEdit(i, 'unit_cost', e.target.value)} /></td></tr>)}</tbody>
                </table>
                <h3 className="text-lg font-semibold mb-2 mt-4">Update Materials</h3>
                <table className="min-w-full bg-white border border-gray-300">
                    <thead><tr><th>Name</th><th>Quantity</th><th>Scrap</th></tr></thead>
                    <tbody>{editableMaterials.map((m, i) => <tr key={m.id}><td className='p-2 border border-gray-300'>{m.material.name}</td><td className='p-2 border border-gray-300'>{m.quantity}</td><td className='p-2 border border-gray-300'><input className='border border-gray-400 p-1 max-w-24' type="number" value={m.scrap} onChange={e => handleMaterialEdit(i, 'scrap', e.target.value)} /></td></tr>)}</tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={closeUpdateStatusModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">Cancel</button>
              <button onClick={handleStatusChange} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalOpen && selectedProduction && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full overflow-y-auto max-h-screen">
                <h2 className="text-xl font-bold mb-4">Transfer Products: {selectedProduction.reference}</h2>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Transfer Products</h3>
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead><tr><th>Name</th><th>Received</th><th>Moved</th><th>Action</th></tr></thead>
                        <tbody>{editableProducts.map(p => <tr key={p.id}><td className='p-2 border border-gray-300'>{p.product.name}</td><td className='p-2 border border-gray-300'>{p.received}</td><td className='p-2 border border-gray-300'>{p.moved_to_store}</td><td className='p-2 border border-gray-300'>
                            {p.received > p.moved_to_store && <div>
                                <input type="number" placeholder="Quantity" value={transferData[p.id]?.quantity || ''} onChange={e => handleTransferChange(p.id, 'quantity', e.target.value)} />
                                <select value={transferData[p.id]?.storeId || ''} onChange={e => handleTransferChange(p.id, 'storeId', e.target.value)}><option value="">Select Store</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            </div>}
                        </td></tr>)}</tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={closeTransferModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">Cancel</button>
                    <button onClick={handleTransfer} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Transfer</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AllProductions;
