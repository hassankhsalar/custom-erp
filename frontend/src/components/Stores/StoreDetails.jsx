import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { ArrowLeft, Package, Box, MapPin, User, Phone, Truck } from "lucide-react";

const StoreDetails = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStoreDetails();
  }, [id]);

  const fetchStoreDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_ROUTES.STORES}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStore(response.data);
    } catch (error) {
      console.error("Error fetching store details:", error);
      setError("Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading store details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Store not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/stores/all"
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Stores
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Store Details</h1>
        </div>
        <Link
          to={`/stores/edit/${store.id}`}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Edit Store
        </Link>
        <Link
          to={`/stores/transfer/${store.id}`}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded ml-2 flex items-center"
        >
          <Truck size={16} className="mr-2" />
          Transfer to Shop
        </Link>
      </div>

      {/* Store Information Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          {store.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center">
              <MapPin size={18} className="mr-2" />
              Store Information
            </h3>

            <div className="space-y-3">
              <div className="flex items-center">
                <MapPin size={16} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">
                    {store.address || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <User size={16} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Store Keeper</p>
                  <p className="font-medium">
                    {store.store_keeper || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Phone size={16} className="text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Mobile</p>
                  <p className="font-medium">
                    {store.mobile || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Statistics</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Package size={24} className="mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-700">
                  {store.storeProducts?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Box size={24} className="mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-700">
                  {store.storeMaterials?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Total Materials</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <Package size={20} className="mr-2" />
            Products in Store
          </h3>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {store.storeProducts?.length || 0} items
          </span>
        </div>

        {store.storeProducts && store.storeProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Product Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Sale Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {store.storeProducts.map((sp) => (
                  <tr
                    key={`${sp.store_id}-${sp.product_id}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b">
                      {sp.product?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 border-b">
                      {sp.product?.barcode || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      ${sp.product?.sale_price?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sp.stock > 10
                            ? "bg-green-100 text-green-800"
                            : sp.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sp.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 border-b">
                      {sp.product?.category || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No products found in this store</p>
          </div>
        )}
      </div>

      {/* Materials Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <Box size={20} className="mr-2" />
            Materials in Store
          </h3>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
            {store.storeMaterials?.length || 0} items
          </span>
        </div>

        {store.storeMaterials && store.storeMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Material Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {store.storeMaterials.map((sm) => (
                  <tr
                    key={`${sm.store_id}-${sm.material_id}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b">
                      {sm.material?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 border-b">
                      {sm.material?.brand || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      ${sm.material?.unit_cost?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sm.stock > 50
                            ? "bg-green-100 text-green-800"
                            : sm.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sm.stock} {sm.material?.unit || ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 border-b">
                      {sm.material?.unit || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Box size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No materials found in this store</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDetails;
