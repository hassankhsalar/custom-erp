import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AllFactory = () => {
  const [factories, setFactories] = useState([]);
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const response = await axios.get(API_ROUTES.FACTORIES);
        setFactories(response.data);
      } catch (error) {
        console.error('Error fetching factories:', error);
      }
    };
    fetchFactories();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_ROUTES.FACTORIES}/${id}`);
      setFactories(factories.filter((factory) => factory.id !== id));
    } catch (error) {
      console.error('Error deleting factory:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">All Factories</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Name</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Phone</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Manager</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Email</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Address</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {factories.map((factory, index) => (
              <tr key={factory.id} className={`${index % 2 === 0 ? 'bg-gray-200' : ''}`}>
                <td className="w-1/6 py-3 px-4">{factory.name}</td>
                <td className="w-1/6 py-3 px-4">{factory.phone}</td>
                <td className="w-1/6 py-3 px-4">{factory.manager}</td>
                <td className="w-1/6 py-3 px-4">{factory.email}</td>
                <td className="w-1/6 py-3 px-4">{factory.address}</td>
                <td className="py-3 px-4">
                  <div className="relative inline-block text-left">
                    <div>
                      <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-gray-300 border-gray-300-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                        onClick={() => setShowDropdown(showDropdown === factory.id ? null : factory.id)}
                      >
                        Actions
                      </button>
                    </div>
                    {showDropdown === factory.id && (
                      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <Link
                            to={`/factories/edit/${factory.id}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(factory.id)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllFactory;
