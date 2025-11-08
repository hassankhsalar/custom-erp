import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';

const AllShop = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.SHOPS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShops(response.data);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading shops...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">All Shops</h1>
        <Link to="/shops/add" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add New Shop
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shops.map((shop) => (
          <div key={shop.id} className="bg-white p-4 rounded shadow-md">
            <h3 className="text-lg font-semibold">{shop.name}</h3>
            <p className="text-gray-600">{shop.address}</p>
            <p className="text-sm text-gray-500">Keeper: {shop.shop_keeper}</p>
            <p className="text-sm text-gray-500">Mobile: {shop.mobile}</p>
            <div className="mt-2 text-sm">
              <span className="text-blue-600">Products: {shop.shopProducts?.length || 0}</span>
              <span className="ml-2 text-green-600">Materials: {shop.shopMaterials?.length || 0}</span>
            </div>
            <Link 
              to={`/shops/${shop.id}`} 
              className="mt-2 inline-block text-blue-500 hover:text-blue-700"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllShop;