import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';


const AllProductions = () => {
  const [productions, setProductions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedProductionId, setExpandedProductionId] = useState(null);

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
        fetchProductions(currentPage); // Refresh the list
      } catch (error) {
        console.error('Error deleting production:', error);
      }
    }
  };

  const toggleProductsVisibility = (productionId) => {
    setExpandedProductionId(prevId => (prevId === productionId ? null : productionId));
  };

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
              <React.Fragment key={production.id}>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">{production.reference}</td>
                  <td className="border border-gray-300 px-4 py-2">{new Date(production.start_date).toLocaleDateString()}</td>
                  <td className="border border-gray-300 px-4 py-2">{new Date(production.estimated_end_date).toLocaleDateString()}</td>
                  <td className="border border-gray-300 px-4 py-2">{production.factory.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{production.status}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <Link
                      to={`/productions/edit/${production.id}`}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(production.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => toggleProductsVisibility(production.id)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded ml-2"
                    >
                      {expandedProductionId === production.id ? 'Hide Products' : 'Show Products'}
                    </button>
                  </td>
                </tr>
                {expandedProductionId === production.id && production.productionProducts.length > 0 && (
                  <tr>
                    <td colSpan="6" className="p-4 bg-gray-100">
                      <h3 className="text-lg font-semibold mb-2">Products for {production.reference}</h3>
                      <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 border border-gray-300">Product Name</th>
                            <th className="px-4 py-2 border border-gray-300">Code</th>
                            <th className="px-4 py-2 border border-gray-300">Quantity</th>
                            <th className="px-4 py-2 border border-gray-300">Unit Cost</th>
                            <th className="px-4 py-2 border border-gray-300">Moved to Store</th>
                          </tr>
                        </thead>
                        <tbody>
                          {production.productionProducts.map(pp => (
                            <tr key={pp.id}>
                              <td className="border border-gray-300 px-4 py-2">{pp.product.name}</td>
                              <td className="border border-gray-300 px-4 py-2">{pp.code}</td>
                              <td className="border border-gray-300 px-4 py-2">{pp.quantity}</td>
                              <td className="border border-gray-300 px-4 py-2">{pp.unit_cost}</td>
                              <td className="border border-gray-300 px-4 py-2">{pp.moved_to_store}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
      
    </div>
  );
};

export default AllProductions;