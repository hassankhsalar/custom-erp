import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const TransferList = ({ fromType, toType, title }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const fetchTransfers = async () => {
      const res = await axios.get(API_ROUTES.TRANSFERS, {
        params: {
          from: fromType,
          to: toType,
          page,
          ...filters,
        },
      });
      setTransfers(res.data);
    };
    fetchTransfers();
  }, [fromType, toType, page, filters]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      {/* Add filter inputs here */}
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-2 border border-gray-200">Reference</th>
            <th className="text-left p-2 border border-gray-200">From</th>
            <th className="text-left p-2 border border-gray-200">To</th>
            <th className="text-left p-2 border border-gray-200">Shipping Cost</th>
            <th className="text-left p-2 border border-gray-200">Total Products</th>
            <th className="text-left p-2 border border-gray-200">Note</th>
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
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add pagination buttons here */}
    </div>
  );
};

export default TransferList;
