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

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });

  // Status change states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [editableProducts, setEditableProducts] = useState([]);
  const [editableMaterials, setEditableMaterials] = useState([]);

  useEffect(() => {
    fetchProductions(currentPage);
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

  const openModal = async (type, production) => {
    let productionData = production;
    if (type === 'details') {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_ROUTES.PRODUCTIONS}/${production.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        productionData = response.data;
      } catch (error) {
        console.error('Error fetching production details:', error);
        return;
      }
    }
    
    setModal({ isOpen: true, type, data: productionData });

    if (type === 'updateStatus') {
      setSelectedStatus(production.status);
      if (production.status === 'production_done') {
          setEditableProducts(production.productionProducts.map(p => ({...p, received: p.quantity, scrap: 0})))
          setEditableMaterials(production.productionMaterials.map(m => ({...m, scrap: 0})))
      } else {
          setEditableProducts(production.productionProducts);
          setEditableMaterials(production.productionMaterials);
      }
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
    setEditableProducts([]);
    setEditableMaterials([]);
  };

  const handleStatusChange = async () => {
    try {
        const token = localStorage.getItem('token');
        const payload = { 
            status: selectedStatus,
            products: selectedStatus === 'production_done' ? editableProducts : undefined,
            materials: selectedStatus === 'production_done' ? editableMaterials : undefined,
        };
        await axios.put(`${API_ROUTES.PRODUCTIONS}/${modal.data.id}/status`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchProductions(currentPage);
        closeModal();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
  }

  const handleProductEdit = (index, field, value) => {
    setEditableProducts(prev => prev.map((p, i) => i === index ? {...p, [field]: value} : p));
  }

  const handleMaterialEdit = (index, field, value) => {
    setEditableMaterials(prev => prev.map((m, i) => i === index ? {...m, [field]: value} : m));
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
                    <button onClick={() => openModal('details', production)} className="text-blue-500 hover:text-blue-700 cursor-pointer mr-2"><FaEye /></button>
                    { ['running', 'pending'].includes(production.status) && 
                      <Link to={`/productions/edit/${production.id}`} className="text-teal-500 hover:text-teal-700 cursor-pointer mr-2"><FaPen /></Link>
                    }
                    
                    <button onClick={() => handleDelete(production.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer mr-2"><FaTrash /></button>
                    { ['running', 'pending'].includes(production.status) && 
                      <button onClick={() => openModal('updateStatus', production)} className="text-violet-500 hover:text-violet-700 cursor-pointer"><BsToggles /></button>
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
      {modal.isOpen && modal.type === 'details' && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
            <h2 className="text-xl font-bold mb-4">Production Details: {modal.data.reference}</h2>
            <h3 className="text-lg font-semibold mb-2">Products</h3>
            <table className="min-w-full bg-white border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Code</th>
                  <th className="px-4 py-2 border">Quantity</th>
                  {['production_done'].includes(modal.data.status) && (
                    <>
                      <th className="px-4 py-2 border">Received</th>
                      <th className="px-4 py-2 border">Scrap</th>
                      <th className="px-4 py-2 border">Cost</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {modal.data.productionProducts.map(p => (
                  <tr key={p.id}>
                    <td className='p-2 border border-gray-300'>{p.product.name}</td>
                    <td className='p-2 border border-gray-300'>{p.code}</td>
                    <td className='p-2 border border-gray-300'>{p.quantity}</td>
                    {['production_done'].includes(modal.data.status) && (
                      <>
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
                  {['production_done'].includes(modal.data.status) && (
                    <th className="px-4 py-2 border">Scrap</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {modal.data.productionMaterials.map(m => (
                  <tr key={m.id}>
                    <td className='p-2 border border-gray-300'>{m.material.name}</td>
                    <td className='p-2 border border-gray-300'>{m.quantity}</td>
                    {['production_done'].includes(modal.data.status) && (
                      <td className='p-2 border border-gray-300'>{m.scrap}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>



            <button onClick={closeModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {modal.isOpen && modal.type === 'updateStatus' && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full overflow-y-auto max-h-screen">
            <h2 className="text-xl font-bold mb-4">Change Status: {modal.data.reference}</h2>
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
              <button onClick={closeModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">Cancel</button>
              <button onClick={handleStatusChange} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AllProductions;
