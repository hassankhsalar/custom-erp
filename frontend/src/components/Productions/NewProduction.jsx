import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';

const NewProduction = () => {
  const [formData, setFormData] = useState({
    start_date: '',
    estimated_end_date: '',
    factoryId: '',
    status: 'pending',
    attachments: '',
    shipping_cost: '',
    products: [],
  });
  const [factories, setFactores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(API_ROUTES.FACTORIES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFactores(response.data);
      } catch (error) {
        console.error('Error fetching factories:', error);
      }
    };
    fetchFactories();
  }, []);

  const handleSearch = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) { // Search only if more than 2 characters
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_ROUTES.PRODUCTS}?search=${e.target.value}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(response.data.products);
      } catch (error) {
        console.error('Error searching products:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const addProductToProduction = (product) => {
    setSelectedProducts(prev => {
      // Check if product already exists in selectedProducts
      if (prev.find(p => p.productId === product.id)) {
        return prev;
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        code: product.barcode || '',
        quantity: 1,
        unit_cost: product.cost,
        moved_to_store: 0,
      }];
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleProductChange = (index, field, value) => {
    setSelectedProducts(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeProductFromProduction = (index) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        products: selectedProducts,
      };
      await axios.post(API_ROUTES.PRODUCTIONS, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/productions/all');
    } catch (error) {
      alert('Error creating production');
      console.error('Error creating production:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Production</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="start_date">Start Date</label>
            <input
              type="date"
              name="start_date"
              id="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="estimated_end_date">Estimated End Date</label>
            <input
              type="date"
              name="estimated_end_date"
              id="estimated_end_date"
              value={formData.estimated_end_date}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="factoryId">Factory</label>
            <select
              name="factoryId"
              id="factoryId"
              value={formData.factoryId}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Factory</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">Status</label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="attachments">Attachments (comma separated URLs)</label>
            <input
              type="text"
              name="attachments"
              id="attachments"
              value={formData.attachments}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="e.g., url1,url2,url3"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="shipping_cost">Shipping Cost</label>
            <input
              type="number"
              name="shipping_cost"
              id="shipping_cost"
              value={formData.shipping_cost}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              step="0.01"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="product_search">Search Products</label>
          <input
            type="text"
            id="product_search"
            value={searchTerm}
            onChange={handleSearch}
            className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Search products by name or barcode"
          />
          {searchResults.length > 0 && (
            <ul className="border border-gray-300 rounded mt-2 max-h-48 overflow-y-auto bg-white">
              {searchResults.map(product => (
                <li
                  key={product.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => addProductToProduction(product)}
                >
                  {product.name} ({product.barcode})
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2 className="text-xl font-bold mb-2">Selected Products</h2>
        {selectedProducts.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="px-4 py-2 border border-gray-300">Product Name</th>
                  <th className="px-4 py-2 border border-gray-300">Code</th>
                  <th className="px-4 py-2 border border-gray-300">Quantity</th>
                  <th className="px-4 py-2 border border-gray-300">Unit Cost</th>
                  <th className="px-4 py-2 border border-gray-300">Moved to Store</th>
                  <th className="px-4 py-2 border border-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product, index) => (
                  <tr key={product.productId}>
                    <td className="border border-gray-300 px-4 py-2">{product.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{product.code}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.unit_cost}
                        onChange={(e) => handleProductChange(index, 'unit_cost', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.moved_to_store}
                        onChange={(e) => handleProductChange(index, 'moved_to_store', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeProductFromProduction(index)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No products added to this production yet.</p>
        )}

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Create Production
        </button>
      </form>
    </div>
  );
};

export default NewProduction;