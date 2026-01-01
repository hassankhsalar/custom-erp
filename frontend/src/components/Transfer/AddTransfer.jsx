import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AddTransfer = () => {
  const [fromType, setFromType] = useState('store');
  const [toType, setToType] = useState('store');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [items, setItems] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [note, setNote] = useState('');
  const [document, setDocument] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      const [storesRes, shopsRes, factoriesRes] = await Promise.all([
        axios.get(API_ROUTES.STORES, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(API_ROUTES.SHOPS, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        await axios.get(API_ROUTES.FACTORIES),
      ]);
      setStores(storesRes.data.stores);
      setShops(shopsRes.data);
      setFactories(factoriesRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const dataMap = {
      store: stores,
      shop: shops,
      factory: factories,
    };
    const data = dataMap[fromType];
    if (data && data.length > 0) {
      setFromId(data[0].id);
    } else {
      setFromId('');
    }
  }, [fromType, stores, shops, factories]);

  useEffect(() => {
    const dataMap = {
      store: stores,
      shop: shops,
      factory: factories,
    };
    const data = dataMap[toType];
    if (data && data.length > 0) {
      setToId(data[0].id);
    } else {
      setToId('');
    }
  }, [toType, stores, shops, factories]);

  const handleSearch = async (e) => {
    setSearch(e.target.value);
    if (e.target.value.length > 2) {
      const res = await axios.get(API_ROUTES.PRODUCTS, {
        params: { search: e.target.value },
      });
      const res2 = await axios.get(API_ROUTES.MATERIALS, {
        params: { search: e.target.value },
      })
      setSearchResults([...res.data.products, ...res2.data.materials]);
    }

  };

  const handleAddItem = (item) => {
    setItems([...items, { ...item, quantity: 1 }]);
    setSearch('');
    setSearchResults([]);
  };

  const handleQuantityChange = (index, quantity) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('from', fromType);
    formData.append('to', toType);
    formData.append('fromId', fromId);
    formData.append('toId', toId);
    formData.append('shipping_cost', shippingCost);
    formData.append('note', note);
    if (document) {
      formData.append('document', document);
    }
    formData.append('items', JSON.stringify(items));
    console.log("Form data:", Object.fromEntries(formData));
    
    try {
      await axios.post(API_ROUTES.TRANSFERS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Transfer created successfully');
      location.reload();

    } catch (error) {
      alert('Failed to create transfer');
    }
  };

  const renderLocationOptions = (type) => {

    if (type === 'store') {
      return stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ));
    }
    if (type === 'shop') {
      return shops.map((shop) => (
        <option key={shop.id} value={shop.id}>
          {shop.name}
        </option>
      ));
    }
    if (type === 'factory') {
      return factories.map((factory) => (
        <option key={factory.id} value={factory.id}>
          {factory.name}
        </option>
      ));
    }
    return null;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add Transfer</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-bold block mb-2">From</label>
            <select
              value={fromType}
              onChange={(e) => setFromType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="store">Store</option>
              <option value="shop">Shop</option>
              <option value="factory">Factory</option>
            </select>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full p-2 border rounded mt-2"
            >
              {renderLocationOptions(fromType)}
            </select>
          </div>
          <div>
            <label className="font-bold block mb-2">To</label>
            <select
              value={toType}
              onChange={(e) => setToType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="store">Store</option>
              <option value="shop">Shop</option>
              <option value="factory">Factory</option>
            </select>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full p-2 border rounded mt-2"
            >
              {renderLocationOptions(toType)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="font-bold block mb-2">Add Items</label>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            className="w-full p-2 border rounded"
            placeholder="Search for products or materials"
          />
          {searchResults.length > 0 && (
            <ul className="border rounded mt-2">
              {searchResults.map((item) => (
                <li
                  key={item.id + Math.random().toString()}
                  onClick={() => handleAddItem(item)}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                >
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-md border border-gray-300 p-2">Item Name</th>
                <th className="text-left text-md border border-gray-300 p-2">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className='border border-gray-300 p-2'>{item.name}</td>
                  <td className='border border-gray-300 p-2'>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(index, e.target.value)
                      }
                      className="w-20 p-1 border border-gray-500 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">Shipping Cost</label>
            <input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block mb-2">Document</label>
          <input
            type="file"
            onChange={(e) => setDocument(e.target.files[0])}
            className="w-full"
          />
        </div>

        <div className="mt-6">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Transfer
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransfer;