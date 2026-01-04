import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const EditMaterial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState({
    name: '',
    description: '',
    brand: '',
    barcode: '',
    image: '',
    unit: '',
    unit_cost: '',
    sale_price: '',
    current_stock: '',
  });

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const response = await axios.get(`${API_ROUTES.MATERIALS}/${id}`);
        setMaterial(response.data);
      } catch (error) {
        console.error('Error fetching material:', error);
      }
    };
    fetchMaterial();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMaterial((prevMaterial) => ({
      ...prevMaterial,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_ROUTES.MATERIALS}/${id}`, {
        ...material,
        unit_cost: parseFloat(material.unit_cost),
        current_stock: parseFloat(material.current_stock),
      });
      navigate('/materials/all');
    } catch (error) {
      console.error('Error updating material:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Edit Material</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={material.name}
              onChange={handleChange}
              placeholder="Name"
              required
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={material.description}
              onChange={handleChange}
              placeholder="Description"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="brand">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={material.brand}
              onChange={handleChange}
              placeholder="Brand"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="barcode">
              Barcode
            </label>
            <input
              type="text"
              name="barcode"
              value={material.barcode}
              onChange={handleChange}
              placeholder="Barcode"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={material.unit}
              onChange={handleChange}
              placeholder="Unit"
              required
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit_cost">
              Unit Cost
            </label>
            <input
              type="number"
              name="unit_cost"
              value={material.unit_cost}
              onChange={handleChange}
              placeholder="Unit Cost"
              required
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit_cost">
              Sale Price
            </label>
            <input
              type="number"
              name="sale_price"
              value={material.sale_price || ''}
              onChange={handleChange}
              placeholder="sale price"
              required
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current_stock">
              Current Stock
            </label>
            <input
              type="number"
              name="current_stock"
              value={material.current_stock}
              onChange={handleChange}
              placeholder="Current Stock"
              required
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>
        <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Update Material</button>
      </form>
    </div>
  );
};

export default EditMaterial;


