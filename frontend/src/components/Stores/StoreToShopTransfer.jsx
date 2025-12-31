import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { API_ROUTES } from "../../config";
import { Truck, Plus, Minus, Package, Box, MapPin } from "lucide-react";

const StoreToShopTransfer = () => {
  const { id: storeId } = useParams();
  const [store, setStore] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [transferItems, setTransferItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStoreDetails();
    fetchShops();
  }, [storeId]);

  const fetchStoreDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_ROUTES.STORES}/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStore(response.data);
    } catch (error) {
      console.error("Error fetching store details:", error);
    }
  };

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        API_ROUTES.STORE_TO_SHOP_TRANSFERS_SHOPS,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShops(response.data);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const addProductItem = () => {
    setTransferItems((prev) => [
      ...prev,
      {
        type: "product",
        productId: "",
        quantity: 1,
        availableStock: 0,
      },
    ]);
  };

  const addMaterialItem = () => {
    setTransferItems((prev) => [
      ...prev,
      {
        type: "material",
        materialId: "",
        quantity: 1,
        availableStock: 0,
      },
    ]);
  };

  const removeItem = (index) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...transferItems];

    if (field === "productId" || field === "materialId") {
      updated[index][field] = value;

      // Update available stock when product/material is selected
      if (field === "productId" && value) {
        const product = store.storeProducts?.find(
          (sp) => sp.product_id === parseInt(value)
        );
        updated[index].availableStock = product?.stock || 0;
      } else if (field === "materialId" && value) {
        const material = store.storeMaterials?.find(
          (sm) => sm.material_id === parseInt(value)
        );
        updated[index].availableStock = material?.stock || 0;
      }
    } else if (field === "quantity") {
      updated[index][field] = Math.max(0, parseFloat(value) || 0);
    }

    setTransferItems(updated);
  };

  const validateTransfer = () => {
    if (!selectedShopId) {
      setMessage("Please select a shop");
      return false;
    }

    if (transferItems.length === 0) {
      setMessage("Please add at least one item to transfer");
      return false;
    }

    for (const item of transferItems) {
      if (
        (item.type === "product" && !item.productId) ||
        (item.type === "material" && !item.materialId)
      ) {
        setMessage("Please select product/material for all items");
        return false;
      }

      if (item.quantity <= 0) {
        setMessage("Quantity must be greater than 0");
        return false;
      }

      if (item.quantity > item.availableStock) {
        setMessage(
          `Insufficient stock for item. Available: ${item.availableStock}`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateTransfer()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        storeId: parseInt(storeId),
        shopId: parseInt(selectedShopId),
        items: transferItems.map((item) => ({
          type: item.type,
          productId:
            item.type === "product" ? parseInt(item.productId) : undefined,
          materialId:
            item.type === "material" ? parseInt(item.materialId) : undefined,
          quantity: item.quantity,
        })),
      };

      const response = await axios.post(
        API_ROUTES.STORE_TO_SHOP_TRANSFERS,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage("Transfer created successfully! Status: Pending");
      setTransferItems([]);
      setSelectedShopId("");
      fetchStoreDetails(); // Refresh store data
    } catch (error) {
      console.error("Error creating transfer:", error);
      setMessage(error.response?.data?.error || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  if (!store) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Truck className="mr-2" />
          Transfer from {store.name} to Shop
        </h1>
      </div>

      {message && (
        <div>
          <div
            className={`p-4 mb-4 rounded ${
              message.includes("successfully")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
          <Link to='/transfers' className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition">
            <MapPin size={16} /> Track here
          </Link>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6"
      >
        {/* Shop Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Transfer to Shop *
          </label>
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          >
            <option value="">Select Shop</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} - {shop.address}
              </option>
            ))}
          </select>
        </div>

        {/* Transfer Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Transfer Items</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={addProductItem}
                className="bg-blue-500 text-white px-3 py-2 rounded flex items-center"
              >
                <Package size={16} className="mr-1" />
                Add Product
              </button>
              <button
                type="button"
                onClick={addMaterialItem}
                className="bg-green-500 text-white px-3 py-2 rounded flex items-center"
              >
                <Box size={16} className="mr-1" />
                Add Material
              </button>
            </div>
          </div>

          {transferItems.map((item, index) => (
            <div key={index} className="border rounded p-4 mb-3 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Type Indicator */}
                <div className="flex items-center">
                  {item.type === "product" ? (
                    <Package className="text-blue-500 mr-2" />
                  ) : (
                    <Box className="text-green-500 mr-2" />
                  )}
                  <span className="font-medium capitalize">{item.type}</span>
                </div>

                {/* Product/Material Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {item.type === "product" ? "Product" : "Material"} *
                  </label>
                  <select
                    value={
                      item.type === "product" ? item.productId : item.materialId
                    }
                    onChange={(e) =>
                      updateItem(
                        index,
                        item.type === "product" ? "productId" : "materialId",
                        e.target.value
                      )
                    }
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  >
                    <option value="">Select {item.type}</option>
                    {item.type === "product"
                      ? store.storeProducts?.map((sp) => (
                          <option key={sp.product_id} value={sp.product_id}>
                            {sp.product?.name} (Stock: {sp.stock})
                          </option>
                        ))
                      : store.storeMaterials?.map((sm) => (
                          <option key={sm.material_id} value={sm.material_id}>
                            {sm.material?.name} (Stock: {sm.stock}{" "}
                            {sm.material?.unit})
                          </option>
                        ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={item.availableStock}
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      / {item.availableStock}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || transferItems.length === 0 || !selectedShopId}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            <Truck size={16} className="mr-2" />
            {loading ? "Creating Transfer..." : "Create Transfer"}
          </button>
        </div>
      </form>

      {/* Status Explanation */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">
          Transfer Status Flow:
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>
            • <strong>Pending:</strong> Transfer created, waiting for approval
          </li>
          <li>
            • <strong>Being Shipped:</strong> Approved - Stock deducted from
            store, items in transit
          </li>
          <li>
            • <strong>Transferred:</strong> Completed - Stock added to shop,
            transfer finalized
          </li>
        </ul>
      </div>

      {/* Store Stock Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="mr-2 text-blue-500" />
            Store Products Stock
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {store.storeProducts?.map((sp) => (
              <div
                key={sp.product_id}
                className="flex justify-between items-center border-b pb-2"
              >
                <span className="text-sm">{sp.product?.name}</span>
                <span className="font-medium">{sp.stock}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Box className="mr-2 text-green-500" />
            Store Materials Stock
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {store.storeMaterials?.map((sm) => (
              <div
                key={sm.material_id}
                className="flex justify-between items-center border-b pb-2"
              >
                <span className="text-sm">{sm.material?.name}</span>
                <span className="font-medium">
                  {sm.stock} {sm.material?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreToShopTransfer;
