import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { Package, Box, Store } from 'lucide-react';

const AllShop = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedShop, setExpandedShop] = useState(null);

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

  const toggleShopDetails = (shopId) => {
    setExpandedShop(expandedShop === shopId ? null : shopId);
  };

  if (loading) return (
    <div className="container mx-auto p-6">
      <div className="flex justify-center items-center h-32">
        <div className="text-lg">Loading shops...</div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Store className="mr-2" />
          All Shops
        </h1>
        <Link to="/shops/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add New Shop
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shop Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inventory Summary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shops.map((shop) => (
              <React.Fragment key={shop.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                      <div className="text-sm text-gray-500">{shop.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{shop.shop_keeper || 'Not specified'}</div>
                    <div className="text-sm text-gray-500">{shop.mobile || 'Not specified'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-4 text-sm">
                      <div className="flex items-center text-blue-600">
                        <Package size={16} className="mr-1" />
                        Products: {shop.shopProducts?.length || 0}
                      </div>
                      <div className="flex items-center text-green-600">
                        <Box size={16} className="mr-1" />
                        Materials: {shop.shopMaterials?.length || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleShopDetails(shop.id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      {expandedShop === shop.id ? 'Hide Details' : 'Show Details'}
                    </button>
                    <Link
                      to={`/shops/edit/${shop.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
                
                {/* Expanded Details Row */}
                {expandedShop === shop.id && (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Products Table */}
                        <div>
                          <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-600">
                            <Package size={18} className="mr-2" />
                            Products ({shop.shopProducts?.length || 0})
                          </h4>
                          {shop.shopProducts && shop.shopProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-blue-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">
                                      Product
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">
                                      Stock
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-100">
                                  {shop.shopProducts.map((sp) => (
                                    <tr key={sp.product_id} className="hover:bg-blue-25">
                                      <td className="px-3 py-2">
                                        <div className="font-medium">{sp.product?.name}</div>
                                        <div className="text-xs text-gray-500">{sp.product?.barcode}</div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          sp.stock > 10 ? 'bg-green-100 text-green-800' : 
                                          sp.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {sp.stock}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-600">
                                        ${sp.product?.sale_price?.toFixed(2) || '0.00'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Package size={32} className="mx-auto mb-2 text-gray-300" />
                              No products available
                            </div>
                          )}
                        </div>

                        {/* Materials Table */}
                        <div>
                          <h4 className="text-lg font-semibold mb-3 flex items-center text-green-600">
                            <Box size={18} className="mr-2" />
                            Materials ({shop.shopMaterials?.length || 0})
                          </h4>
                          {shop.shopMaterials && shop.shopMaterials.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-green-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                      Material
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                      Stock
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-green-700 uppercase">
                                      Unit Cost
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-green-100">
                                  {shop.shopMaterials.map((sm) => (
                                    <tr key={sm.material_id} className="hover:bg-green-25">
                                      <td className="px-3 py-2">
                                        <div className="font-medium">{sm.material?.name}</div>
                                        <div className="text-xs text-gray-500">{sm.material?.brand}</div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          sm.stock > 50 ? 'bg-green-100 text-green-800' : 
                                          sm.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {sm.stock} {sm.material?.unit}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-600">
                                        ${sm.material?.unit_cost?.toFixed(2) || '0.00'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Box size={32} className="mx-auto mb-2 text-gray-300" />
                              No materials available
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {shops.length === 0 && (
          <div className="text-center py-8">
            <Store size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No shops found</p>
            <Link 
              to="/shops/add" 
              className="inline-block mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Your First Shop
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllShop;