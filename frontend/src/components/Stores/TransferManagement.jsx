import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';
import { Truck, Check, X, Clock, Package, Box } from 'lucide-react';

const TransferManagement = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.STORE_TO_SHOP_TRANSFERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const updateTransferStatus = async (transferId, status, notes = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const payload = { status };
      if (notes) {
        payload.notes = notes;
      }

      await axios.patch(`${API_ROUTES.STORE_TO_SHOP_TRANSFERS}/${transferId}/status`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage(`Transfer status updated to ${status}`);
      fetchTransfers(); // Refresh the list
    } catch (error) {
      console.error('Error updating transfer status:', error);
      setMessage(error.response?.data?.error || 'Failed to update transfer status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'being_shipped': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'being_shipped': return <Truck size={16} />;
      case 'transferred': return <Check size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Truck className="mr-2" />
        Transfer Management
      </h1>

      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {transfers.map(transfer => (
          <div key={transfer.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{transfer.reference}</h3>
                <p className="text-sm text-gray-600">
                  From: {transfer.store.name} → To: {transfer.shop.name}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(transfer.createdAt).toLocaleDateString()}
                </p>
                {transfer.notes && (
                  <p className="text-sm text-gray-600 mt-1">Notes: {transfer.notes}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transfer.status)}`}>
                  {getStatusIcon(transfer.status)}
                  <span className="ml-1 capitalize">{transfer.status.replace('_', ' ')}</span>
                </span>
                
                {transfer.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateTransferStatus(transfer.id, 'being_shipped', 'Items being shipped to shop')}
                      disabled={loading}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <Truck size={14} className="mr-1" />
                      Ship
                    </button>
                    <button
                      onClick={() => updateTransferStatus(transfer.id, 'transferred', 'Transfer rejected')}
                      disabled={loading}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <X size={14} className="mr-1" />
                      Reject
                    </button>
                  </div>
                )}
                
                {transfer.status === 'being_shipped' && (
                  <button
                    onClick={() => updateTransferStatus(transfer.id, 'transferred', 'Items received at shop')}
                    disabled={loading}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <Check size={14} className="mr-1" />
                    Complete
                  </button>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Transfer Items ({transfer.totalItems}):</h4>
              <div className="space-y-2">
                {transfer.transferItems.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      {item.type === 'product' ? (
                        <Package size={14} className="mr-2 text-blue-500" />
                      ) : (
                        <Box size={14} className="mr-2 text-green-500" />
                      )}
                      <span>
                        {item.type === 'product' ? item.product?.name : item.material?.name}
                      </span>
                    </div>
                    <span className="font-medium">
                      {item.quantity} {item.type === 'material' ? item.material?.unit : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {transfers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Truck size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No transfers found</p>
        </div>
      )}
    </div>
  );
};

export default TransferManagement;