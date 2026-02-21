import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES, MEDIA_BASE_URL } from '../../config';
import { useLocation } from 'react-router-dom';
import { 
  Truck, 
  Package, 
  Building, 
  Store, 
  Factory, 
  Search, 
  Plus, 
  FileText, 
  DollarSign,
  ClipboardList,
  ArrowLeftRight,
  Filter,
  Trash2
} from "lucide-react";

const AddTransfer = () => {
  const location = useLocation();
  const requisitionOrder = location.state?.requisitionOrder || null;
  const [fromType, setFromType] = useState('store');
  const [toType, setToType] = useState('store');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [items, setItems] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('processing');
  const [document, setDocument] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requisitionLink, setRequisitionLink] = useState({
    requisitionId: null,
    requisitionSectionId: null,
  });
  const toAltUnits = (arr) => (Array.isArray(arr) ? arr : [])
    .map((u) => ({ unitname: String(u?.unitname || "").trim(), multiplier: Number(u?.multiplier) }))
    .filter((u) => u.unitname && Number.isFinite(u.multiplier) && u.multiplier > 0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [storesRes, shopsRes, factoriesRes] = await Promise.all([
          axios.get(API_ROUTES.STORES, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(API_ROUTES.SHOPS, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(API_ROUTES.FACTORIES, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(API_ROUTES.FACTORIES, {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ]);
        setStores(storesRes.data.stores);
        setShops(shopsRes.data);
        setFactories(factoriesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!requisitionOrder) return;
    const requesterType = requisitionOrder?.requisition?.requesterType;
    const requesterId = requisitionOrder?.requisition?.requesterId;
    const sourceType = requisitionOrder?.destinationType;
    const sourceId = requisitionOrder?.destinationId;

    if (sourceType && sourceId) {
      setFromType(sourceType);
      setFromId(String(sourceId));
    }
    if (requesterType && requesterId) {
      setToType(requesterType);
      setToId(String(requesterId));
    }

    const mappedItems = (requisitionOrder.items || []).map((it) => ({
      id: it.itemType === "product" ? it.productId : it.materialId,
      name: it.itemType === "product" ? it.product?.name : it.material?.name,
      itemType: it.itemType,
      quantity: it.quantity || 1,
      selectedQuantity: it.quantity || 1,
      selectedName: it.itemType === "product" ? it.product?.name : it.material?.name,
      defaultUnit: it.itemType === "product" ? (it.product?.unit || "unit") : (it.material?.unit || "unit"),
      selectedUnit: it.itemType === "product" ? (it.product?.unit || "unit") : (it.material?.unit || "unit"),
      conversionMultiplier: 1,
      alternativeNames: it.itemType === "product" ? (it.product?.alternative_names || []) : (it.material?.alternative_names || []),
      alternativeUnits: toAltUnits(it.itemType === "product" ? it.product?.alternative_units : it.material?.alternative_units),
      stock: it.quantity || 0,
      batches: [],
      batchNumber: null,
      expiryDate: null,
      batchAvailable: it.quantity || 1,
    }));
    setItems(mappedItems);
    setRequisitionLink({
      requisitionId: requisitionOrder.requisitionId,
      requisitionSectionId: requisitionOrder.id,
    });
  }, [requisitionOrder]);

  useEffect(() => {
    const dataMap = {
      store: stores,
      shop: shops,
      factory: factories,
    };
    const data = dataMap[fromType];
    if (data && data.length > 0 && !data.some((row) => String(row.id) === String(fromId))) {
      setFromId(data[0].id);
    } else if (!data || data.length === 0) {
      setFromId('');
    }
  }, [fromType, stores, shops, factories, fromId]);

  useEffect(() => {
    const dataMap = {
      store: stores,
      shop: shops,
      factory: factories,
    };
    const data = dataMap[toType];
    if (data && data.length > 0 && !data.some((row) => String(row.id) === String(toId))) {
      setToId(data[0].id);
    } else if (!data || data.length === 0) {
      setToId('');
    }
  }, [toType, stores, shops, factories, toId]);

  const handleSearch = async (e) => {
    setSearch(e.target.value);
    if (e.target.value.length > 1 && fromId) {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          console.error('No authentication token found');
          setSearchResults([]);
          return;
        }
        const res = await axios.get(`${API_ROUTES.TRANSFERS}/available-items`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            from: fromType,
            fromId,
            search: e.target.value
          },
        });
        setSearchResults(Array.isArray(res.data) ? res.data : []);
      
    } catch (error) {
      console.error('Error searching items:', error);
      setSearchResults([]);
    }
  } else {
    setSearchResults([]);
  }
};

  const handleAddItem = (item) => {
    const firstBatch = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches[0] : null;
    setItems([
      ...items,
      {
        ...item,
        quantity: 1,
        selectedQuantity: 1,
        selectedName: item.name,
        defaultUnit: item.defaultUnit || "unit",
        selectedUnit: item.defaultUnit || "unit",
        conversionMultiplier: 1,
        alternativeNames: Array.isArray(item.alternativeNames) ? item.alternativeNames : [],
        alternativeUnits: toAltUnits(item.alternativeUnits),
        batchNumber: firstBatch?.batchNumber || null,
        expiryDate: firstBatch?.expiryDate || null,
        batchAvailable: firstBatch?.quantity || item.stock || 0,
      },
    ]);
    setSearch('');
    setSearchResults([]);
  };

  const handleQuantityChange = (index, quantity) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextSelected = parseFloat(quantity) || 1;
        const nextActual = nextSelected * (item.conversionMultiplier || 1);
        const clampedActual = Math.max(1, Math.min(nextActual, item.batchAvailable || nextActual));
        return {
          ...item,
          selectedQuantity: nextSelected,
          quantity: clampedActual,
        };
      })
    );
  };

  const handleSelectedNameChange = (index, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selectedName: value || item.name } : item))
    );
  };

  const handleSelectedUnitChange = (index, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const base = item.defaultUnit || "unit";
        if (!value || value === base) {
          const qty = item.selectedQuantity || 1;
          return { ...item, selectedUnit: base, conversionMultiplier: 1, quantity: qty };
        }
        const found = (item.alternativeUnits || []).find((u) => u.unitname === value);
        const multiplier = found?.multiplier || 1;
        return {
          ...item,
          selectedUnit: value,
          conversionMultiplier: multiplier,
          quantity: (item.selectedQuantity || 1) * multiplier,
        };
      })
    );
  };

  const handleBatchChange = (index, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (!value || value === '||') {
          const fallbackAvailable = item.stock || item.batchAvailable || 1;
          return {
            ...item,
            batchNumber: null,
            expiryDate: null,
            batchAvailable: fallbackAvailable,
            quantity: Math.max(1, Math.min(item.quantity || 1, fallbackAvailable)),
          };
        }
        const [batchNumber, expiryDateRaw] = String(value || '').split('||');
        const selectedBatch = (item.batches || []).find(
          (b) => b.batchNumber === batchNumber && String(b.expiryDate || '') === String(expiryDateRaw || '')
        );
        const available = selectedBatch?.quantity || 0;
        return {
          ...item,
          batchNumber: selectedBatch?.batchNumber || '',
          expiryDate: selectedBatch?.expiryDate || null,
          batchAvailable: available,
          quantity: Math.max(1, Math.min(item.quantity || 1, available || 1)),
        };
      })
    );
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalidItem = items.find((item) => !item.quantity || parseFloat(item.quantity) <= 0);
    if (invalidItem) {
      alert(`Select a valid quantity for ${invalidItem.name}`);
      return;
    }
    const formData = new FormData();
    formData.append('from', fromType);
    formData.append('to', toType);
    formData.append('fromId', fromId);
    formData.append('toId', toId);
    formData.append('shipping_cost', shippingCost);
    formData.append('note', note);
    formData.append('status', status);
    if (requisitionLink.requisitionId) formData.append('requisitionId', requisitionLink.requisitionId);
    if (requisitionLink.requisitionSectionId) formData.append('requisitionSectionId', requisitionLink.requisitionSectionId);
    if (document) {
      formData.append('document', document);
    }
    formData.append('items', JSON.stringify(items));
    
    try {
      await axios.post(API_ROUTES.TRANSFERS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      if (requisitionLink.requisitionSectionId) {
        try {
          await axios.post(
            API_ROUTES.REQUISITION_SECTION_COMPLETE(requisitionLink.requisitionSectionId),
            { status: 'done', note: 'Completed by transfer creation' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch {
          // Non-blocking: transfer already created
        }
      }
      alert('Transfer created successfully');
      window.location.reload();
    } catch (error) {
      alert('Failed to create transfer');
      console.error('Submission error:', error);
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

  const getTypeIcon = (type) => {
    switch(type) {
      case 'store': return <Store size={16} className="mr-2" />;
      case 'shop': return <Building size={16} className="mr-2" />;
      case 'factory': return <Factory size={16} className="mr-2" />;
      default: return <Store size={16} className="mr-2" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading transfer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-indigo-500/10 to-blue-500/10">
              <Truck className="text-indigo-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Create Transfer
              </h1>
              <p className="text-gray-600 mt-1">Transfer items between locations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Filter size={16} className="text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Left Column - Transfer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Locations Card */}
          <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowLeftRight className="mr-2 text-indigo-600" size={20} />
              Transfer Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(fromType)}
                    <select
                      value={fromType}
                      onChange={(e) => setFromType(e.target.value)}
                      className="flex-1 w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                    >
                      <option value="store">Store</option>
                      <option value="shop">Shop</option>
                      <option value="factory">Factory</option>
                    </select>
                  </div>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                  >
                    {renderLocationOptions(fromType)}
                  </select>
                </div>
              </div>

              {/* To Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(toType)}
                    <select
                      value={toType}
                      onChange={(e) => setToType(e.target.value)}
                      className="flex-1 w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                    >
                      <option value="store">Store</option>
                      <option value="shop">Shop</option>
                      <option value="factory">Factory</option>
                    </select>
                  </div>
                  <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                  >
                    {renderLocationOptions(toType)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Document</label>
              <div className="glass-input rounded-lg border border-white/30 bg-white/30 backdrop-blur-sm">
                <input
                  type="file"
                  onChange={(e) => setDocument(e.target.files[0])}
                  className="w-full p-2 rounded-lg border border-gray-300 outline-0"
                />
              </div>
            </div>
          </div>

          {/* Additional Details Card */}
          <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="mr-2 text-indigo-600" size={20} />
              Additional Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                >
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="being_shipped">Being Shipped</option>
                </select>
              </div>
            </div>

              <div className="mt-4 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"></textarea>
              </div>
          </div>
        </div>

        {/* Right Column - Items */}
        <div className="space-y-6">
          {requisitionOrder && (
            <div className="glass-card p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl">
              <p className="text-sm text-indigo-700 font-semibold">
                Requisition Order: {requisitionOrder?.requisition?.reference} / Section {requisitionOrder?.sectionNo}
              </p>
            </div>
          )}
          {/* Search Card */}
          <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Search className="mr-2 text-indigo-600" size={20} />
              Add Items
            </h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                className="w-full glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                placeholder="Search products or materials..."
              />
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 glass-card border border-white/20 backdrop-blur-sm max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className="p-3 hover:bg-white/20 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div>
                        {
                          item.image ? item.image.startsWith('/uploads') ? (
                            <img src={ MEDIA_BASE_URL + item.image } alt={item.name} className="w-8 h-8 rounded-lg object-cover mr-3" />
                          ) : (
                            <img src={ item.image } alt={item.name} className="w-8 h-8 rounded-lg object-cover mr-3" />
                          ) : (
                            <Package size={16} className="mr-3 text-gray-400" />
                          )
                        }
                      </div>
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-600">
                        {item.itemType}
                      </span>
                    </div>
                    <Plus size={16} className="text-indigo-600" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items List Card */}
          <div className="glass-card border border-white/20 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <ClipboardList className="mr-2 text-indigo-600" size={20} />
                Transfer Items ({items.length})
              </h2>
            </div>

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                      <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">Item Name</th>
                      <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">Batch</th>
                      <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">Quantity</th>
                      <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-t border-white/10 hover:bg-white/10 transition-all duration-200"
                      >
                        <td className="p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex">
                              <div>
                                {
                                  item.image ? item.image.startsWith('/uploads') ? (
                                    <img src={ MEDIA_BASE_URL + item.image } alt={item.name} className="w-8 h-8 rounded-lg object-cover mr-3" />
                                  ) : (
                                    <img src={ item.image } alt={item.name} className="w-8 h-8 rounded-lg object-cover mr-3" />
                                  ) : (
                                    <Package size={16} className="mr-3 text-gray-400" />
                                  )
                                }
                              </div>
                              <span className="text-gray-800 block">{item.name}</span>
                            </div>
                            <div>
                              {item.alternativeNames?.length > 0 && (
                                <select
                                  value={item.selectedName || item.name}
                                  onChange={(e) => handleSelectedNameChange(index, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value={item.name}>{item.name}</option>
                                  {item.alternativeNames.map((n, ni) => (
                                    <option key={`${item.id}-name-${ni}`} value={n}>{n}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={`${item.batchNumber || ''}||${item.expiryDate || ''}`}
                            onChange={(e) => handleBatchChange(index, e.target.value)}
                            className="w-52 glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                          >
                            <option value="||">No batch</option>
                            {(item.batches || []).map((batch) => (
                              <option key={`${batch.batchNumber}-${batch.expiryDate || 'none'}`} value={`${batch.batchNumber}||${batch.expiryDate || ''}`}>
                                {`${batch.batchNumber} | Exp: ${batch.expiryDate || 'N/A'}`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={item.selectedQuantity || item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="w-32 glass-input p-2 rounded-lg border border-gray-300 outline-0 bg-white/30 backdrop-blur-sm"
                            min="1"
                            max={item.batchAvailable || 1}
                          />
                          <div className="mt-1">
                            <select
                              value={item.selectedUnit || item.defaultUnit || "unit"}
                              onChange={(e) => handleSelectedUnitChange(index, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value={item.defaultUnit || "unit"}>{item.defaultUnit || "unit"}</option>
                              {(item.alternativeUnits || []).map((u, ui) => (
                                <option key={`${item.id}-unit-${ui}`} value={u.unitname}>{u.unitname}</option>
                              ))}
                            </select>
                            {item.selectedUnit !== item.defaultUnit && (
                              <div className="text-[11px] text-gray-500 mt-1">
                                Actual qty: {Number(item.quantity || 0).toFixed(4)} {item.defaultUnit}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-700 transition-colors text-sm font-medium"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                  <Package className="text-gray-400" size={32} />
                </div>
                <p className="text-gray-500 text-lg font-medium">No items added</p>
                <p className="text-gray-400 text-sm mt-1">Search and add items to transfer</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={items.length === 0}
              className={`w-full p-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                items.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90'
              }`}
            >
              Create Transfer
            </button>
            <p className="text-center text-sm text-gray-500 mt-3">
              {items.length === 0 ? 'Add at least one item to create transfer' : `Ready to transfer ${items.length} items`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTransfer;
