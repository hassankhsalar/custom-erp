import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const TransferList = ({ fromType, toType, title }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Change Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(API_ROUTES.TRANSFERS, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            from: fromType,
            to: toType,
            page,
          },
        });
        console.log(response.data);
        setTransfers(response.data.transfers);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalItems);
      } catch (error) {
        console.error('Error fetching transfers:', error);
        setError('Failed to fetch transfers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, [fromType, toType, page]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const openStatusModal = (transfer) => {
    setSelectedTransfer(transfer);
    setNewStatus(transfer.status);
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
    setSelectedTransfer(null);
    setNewStatus('');
  };

  const handleStatusUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ROUTES.TRANSFERS}/${selectedTransfer.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeStatusModal();
      location.reload();
    } catch (error) {
      alert('Failed to update transfer status');
      console.error('Error updating transfer status:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title} ({totalItems} records)</h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading transfers...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-2 border border-gray-200">Reference</th>
              <th className="text-left p-2 border border-gray-200">From</th>
              <th className="text-left p-2 border border-gray-200">To</th>
              <th className="text-left p-2 border border-gray-200">Shipping Cost</th>
              <th className="text-left p-2 border border-gray-200">Total Products</th>
              <th className="text-left p-2 border border-gray-200">Note</th>
              <th className="text-left p-2 border border-gray-200">Status</th>
              <th className="text-left p-2 border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id}>
                <td className='p-2 border border-gray-200'>{transfer.reference}</td>
                <td className='p-2 border border-gray-200'>
                  {transfer.fromName}
                  <br />
                  <span className="text-gray-500 text-xs">({transfer.from})</span>
                </td>
                <td className='p-2 border border-gray-200'>
                  {transfer.toName}
                  <br />
                  <span className="text-gray-500 text-xs">({transfer.to})</span>
                </td>
                <td className='p-2 border border-gray-200'>{transfer.shipping_cost}</td>
                <td className='p-2 border border-gray-200'>{transfer.totalProducts}</td>
                <td className='p-2 border border-gray-200'>{transfer.note}</td>
                <td className='p-2 border border-gray-200'>
                  <span className={`px-2 py-1 rounded-full text-white text-xs ${transfer.status === 'processing'? 'bg-yellow-500' : transfer.status === 'on_the_way' ? 'bg-blue-500' : 'bg-green-500'}`}>
                    {transfer.status.replace(/_/g, ' ').replace(/\w\S*/g, function(txt){
                      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    })}
                  </span>
                </td>
                <td className='p-2 border border-gray-200'>
                  <button 
                    className="text-blue-500 hover:text-blue-700 mr-2" 
                    disabled={transfer.status === 'transfer_done'}
                  >
                    Edit
                  </button>
                  <button 
                    className="text-green-500 hover:text-green-700" 
                    onClick={() => openStatusModal(transfer)}
                    disabled={transfer.status === 'transfer_done'}
                  >
                    Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Pagination buttons */}
      {totalPages > 1 && (
      <div className="flex justify-center mt-4 text-xs">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l"
        >
          Previous
        </button>
        <span className="bg-gray-200 text-gray-800 font-bold py-2 px-4">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r"
        >
          Next
        </button>
      </div>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4"> <span className='text-sm font-normal'>Change Transfer Status for</span> <br /> {selectedTransfer.reference}</h2>
            <div className="mb-4">
              <label htmlFor="statusSelect" className="block text-gray-700 text-sm font-bold mb-2">New Status</label>
              <select
                id="statusSelect"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="processing">Processing</option>
                <option value="on_the_way">On the Way</option>
                <option value="transfer_done">Transfer Done</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={closeStatusModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
                Cancel
              </button>
              <button onClick={handleStatusUpdate} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferList;
