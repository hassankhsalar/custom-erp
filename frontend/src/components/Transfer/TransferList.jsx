import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TransferList = ({ fromType, toType, title }) => {
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const fetchTransfers = async () => {
      const res = await axios.get('/api/transfers', {
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
            <th className="text-left">Reference</th>
            <th className="text-left">From</th>
            <th className="text-left">To</th>
            <th className="text-left">Shipping Cost</th>
            <th className="text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id}>
              <td>{transfer.reference}</td>
              <td>{transfer.from}</td>
              <td>{transfer.to}</td>
              <td>{transfer.shipping_cost}</td>
              <td>{transfer.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add pagination buttons here */}
    </div>
  );
};

export default TransferList;
