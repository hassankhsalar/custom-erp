import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AddMaterial = () => {
  const navigate = useNavigate();
  const [material, setMaterial] = useState({
    name: '',
    description: '',
    brand: '',
    barcode: '',
    unit: '',
    unit_cost: '',
    sale_price: '',
    alert_quantity: '', // NEW FIELD
  });

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
      await axios.post(API_ROUTES.MATERIALS, {
        ...material,
        unit_cost: parseFloat(material.unit_cost),
        sale_price: material.sale_price ? parseFloat(material.sale_price) : null,
        alert_quantity: material.alert_quantity ? parseFloat(material.alert_quantity) : 0, // NEW FIELD
      });
      navigate('/materials/all');
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Add Material</h2>
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
              Unit Type
            </label>
            <input
              type="text"
              name="unit"
              value={material.unit}
              onChange={handleChange}
              placeholder="Kg/piece/litre"
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
              min="0"
              step="0.01"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sale_price">
              Sale Price
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="sale_price"
              value={material.sale_price}
              onChange={handleChange}
              placeholder="Sale Price"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <small className="text-gray-500 text-xs mt-1">
              Optional. Leave empty if material is not for direct sale.
            </small>
          </div>
          <div className="flex flex-col">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="alert_quantity">
              Alert Quantity
            </label>
            <input
              type="number"
              name="alert_quantity"
              value={material.alert_quantity}
              onChange={handleChange}
              placeholder="Alert Quantity"
              min="0"
              step="0.01"
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <small className="text-gray-500 text-xs mt-1">
              Low stock alert threshold. Leave empty to disable alerts.
            </small>
          </div>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add Material
        </button>
      </form>
    </div>
  );
};

export default AddMaterial;