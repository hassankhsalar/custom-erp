
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AllMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(API_ROUTES.MATERIALS);
        setMaterials(response.data);
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_ROUTES.MATERIALS}/${id}`);
      setMaterials(materials.filter((material) => material.id !== id));
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">All Materials</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Name</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Description</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Brand</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Unit</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Unit Cost</th>
              <th className="w-1/6 py-3 px-4 uppercase font-semibold text-sm">Current Stock</th>
              <th className="py-3 px-4 uppercase font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {materials.map((material, index) => (
              <tr key={material.id} className={`${index % 2 === 0 ? 'bg-gray-200' : ''}`}>
                <td className="w-1/6 py-3 px-4">{material.name}</td>
                <td className="w-1/6 py-3 px-4">{material.description}</td>
                <td className="w-1/6 py-3 px-4">{material.brand}</td>
                <td className="w-1/6 py-3 px-4">{material.unit}</td>
                <td className="w-1/6 py-3 px-4">{material.unit_cost}</td>
                <td className="w-1/6 py-3 px-4">{material.current_stock}</td>
                <td className="py-3 px-4">
                  <div className="relative inline-block text-left">
                    <div>
                      <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                        onClick={() => setShowDropdown(showDropdown === material.id ? null : material.id)}
                      >
                        Actions
                      </button>
                    </div>
                    {showDropdown === material.id && (
                      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <Link
                            to={`/materials/edit/${material.id}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            role="menuitem"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(material.id)}
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

export default AllMaterials;