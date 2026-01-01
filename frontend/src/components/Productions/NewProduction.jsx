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
    //attachments: '',
  });
  const [factories, setFactories] = useState([]);
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const factoryResponse = await axios.get(API_ROUTES.FACTORIES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFactories(factoryResponse.data);

        const storeResponse = await axios.get(API_ROUTES.STORES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStores(storeResponse.data.stores);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const materialsMap = new Map();
    selectedProducts.forEach(p => {
      const productQuantity = p.quantity;
      if (p.materials) {
        p.materials.forEach(materialItem => {
          const { material, material_quantity } = materialItem;
          if (materialsMap.has(material.id)) {
            const existing = materialsMap.get(material.id);
            existing.quantity += material_quantity * productQuantity;
          } else {
            materialsMap.set(material.id, {
              materialId: material.id,
              name: material.name,
              quantity: material_quantity * productQuantity,
              price: material.unit_cost,
            });
          }
        });
      }
    });

    const newMaterials = Array.from(materialsMap.values());

    setSelectedMaterials(prevMaterials => {
      return newMaterials.map(newMat => {
        const existingMat = prevMaterials.find(prevMat => prevMat.materialId === newMat.materialId);
        if (existingMat) {
          return {
            ...newMat,
            price: existingMat.price,
          };
        }
        return newMat;
      });
    });
  }, [selectedProducts, stores]);

  const handleSearch = async (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) {
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
      if (prev.find(p => p.id === product.id)) {
        return prev;
      }
      return [...prev, { ...product, quantity: 1, unit_cost: product.cost, moved_to_store: 0 }];
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = selectedProducts.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setSelectedProducts(updatedProducts);
  };

  const removeProductFromProduction = (index) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index, field, value) => {
    setSelectedMaterials(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeMaterialFromProduction = (index) => {
    setSelectedMaterials(prev => prev.filter((_, i) => i !== index));
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
        products: selectedProducts.map(p => ({
          productId: p.id,
          code: p.barcode || '',
          quantity: p.quantity,
          unit_cost: p.unit_cost,
          moved_to_store: p.moved_to_store,
        })),
        materials: selectedMaterials.map(({ storeId, ...material }) => material),
      };
      await axios.post(API_ROUTES.PRODUCTIONS, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/productions/all');
    } catch (error) {
      alert('Error creating production: ' + error.response.data.error);
      console.error('Error creating production:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Production</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        {/* Form fields */}
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
            </select>
          </div>
          {/* <div>
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
          </div> */}

        </div>

        {/* Product Search */}
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

        {/* Selected Products */}
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
                  <tr key={product.id}>
                    <td className="border border-gray-300 px-4 py-2">{product.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{product.barcode}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="1"
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

        {/* Selected Materials */}
        <h2 className="text-xl font-bold mb-2">Selected Materials</h2>
        {selectedMaterials.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="px-4 py-2 border border-gray-300">Material Name</th>
                  <th className="px-4 py-2 border border-gray-300">Quantity</th>
                  <th className="px-4 py-2 border border-gray-300">Price</th>
                  <th className="px-4 py-2 border border-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedMaterials.map((material, index) => (
                  <tr key={material.materialId}>
                    <td className="border border-gray-300 px-4 py-2">{material.name}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={material.price}
                        onChange={(e) => handleMaterialChange(index, 'price', e.target.value)}
                        className="w-24 shadow appearance-none border border-gray-300 rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        step="0.01"
                      />
                    </td>

                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeMaterialFromProduction(index)}
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
          <p>No materials required for the selected products.</p>
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
