import { useEffect, useState } from "react";
import { Plus, Trash2, Package, Tag, Truck, Building2, Store, Factory, ShoppingBag, Check } from "lucide-react";

export default function NewPurchase() {
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [destinationType, setDestinationType] = useState("store");
  const [destinationId, setDestinationId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([
    { 
      itemType: "material", // "material" or "product"
      materialId: "", 
      productId: "", 
      quantity: "", 
      unitPrice: "", 
      total: 0, 
      materialUnitPrice: 0,
      productCost: 0
    }
  ]);
  const [form, setForm] = useState({
    supplierId: "",
    destinationType: "store",
    destinationId: "",
    grandTotal: 0,
    reference: `PUR-${Date.now()}`
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchProducts();
    fetchSuppliers();
    fetchDestinations();
  }, [destinationType]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/materials");
      const data = await res.json();
      setMaterials(data.materials || data || []);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setMaterials([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/products");
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/suppliers");
      const data = await res.json();
      setSuppliers(data || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      setSuppliers([]);
    }
  };

  const fetchDestinations = async () => {
    try {
      let endpoint = "";
      switch (destinationType) {
        case "store":
          endpoint = "http://localhost:3001/api/stores";
          break;
        case "shop":
          endpoint = "http://localhost:3001/api/shops";
          break;
        case "factory":
          endpoint = "http://localhost:3001/api/factories";
          break;
        default:
          endpoint = "http://localhost:3001/api/stores";
      }

      const token = localStorage.getItem("token");
      const headers = {};
      
      // Add token for protected routes (stores require auth)
      if (destinationType === "store") {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error("Failed to fetch destinations");
      const data = await res.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setDestinations(data);
      } else if (data.stores) {
        setDestinations(data.stores);
      } else if (data.shops) {
        setDestinations(data.shops || data);
      } else {
        setDestinations([]);
      }
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
      setDestinations([]);
    }
  };

  // Update grand total whenever purchase items change
  useEffect(() => {
    const grandTotal = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    setForm(prev => ({ ...prev, grandTotal }));
  }, [purchaseItems]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDestinationTypeChange = (e) => {
    const newType = e.target.value;
    setDestinationType(newType);
    setDestinationId("");
    setForm(prev => ({ 
      ...prev, 
      destinationType: newType,
      destinationId: ""
    }));
  };

  const handleDestinationChange = (e) => {
    const newId = e.target.value;
    setDestinationId(newId);
    setForm(prev => ({ ...prev, destinationId: newId }));
  };

  const handleItemTypeChange = (index, newType) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index].itemType = newType;
    
    // Clear the other ID when switching types
    if (newType === "material") {
      updatedItems[index].productId = "";
      updatedItems[index].productCost = 0;
    } else {
      updatedItems[index].materialId = "";
      updatedItems[index].materialUnitPrice = 0;
    }
    
    // Clear unit price when switching types
    updatedItems[index].unitPrice = "";
    updatedItems[index].total = 0;
    
    setPurchaseItems(updatedItems);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...purchaseItems];
    
    if (field === 'materialId') {
      const selectedMaterial = materials.find(m => m.id === parseInt(value));
      
      if (selectedMaterial) {
        updatedItems[index].materialId = value;
        updatedItems[index].materialUnitPrice = selectedMaterial.unit_cost || 0;
        
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = selectedMaterial.unit_cost.toString();
        }
      } else {
        updatedItems[index].materialId = value;
        updatedItems[index].materialUnitPrice = 0;
      }
    } 
    else if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      
      if (selectedProduct) {
        updatedItems[index].productId = value;
        updatedItems[index].productCost = selectedProduct.cost || 0;
        
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = selectedProduct.cost.toString();
        }
      } else {
        updatedItems[index].productId = value;
        updatedItems[index].productCost = 0;
      }
    }
    else {
      updatedItems[index][field] = value;
    }
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'materialId' || field === 'productId') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].total = quantity * unitPrice;
    }
    
    setPurchaseItems(updatedItems);
  };

  const addItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { 
        itemType: "material",
        materialId: "", 
        productId: "", 
        quantity: "", 
        unitPrice: "", 
        total: 0, 
        materialUnitPrice: 0,
        productCost: 0
      }
    ]);
  };

  const removeItem = (index) => {
    if (purchaseItems.length > 1) {
      const updatedItems = purchaseItems.filter((_, i) => i !== index);
      setPurchaseItems(updatedItems);
    }
  };

  // Helper function to get item details
  const getItemDetails = (item) => {
    if (item.itemType === "material" && item.materialId) {
      const material = materials.find(m => m.id === parseInt(item.materialId));
      return {
        name: material?.name || "",
        unit: material?.unit || "",
        standardPrice: material?.unit_cost || 0
      };
    } else if (item.itemType === "product" && item.productId) {
      const product = products.find(p => p.id === parseInt(item.productId));
      return {
        name: product?.name || "",
        unit: "unit",
        standardPrice: product?.cost || 0
      };
    }
    return { name: "", unit: "", standardPrice: 0 };
  };

  const handleItemSelect = (index, itemType, itemId) => {
    if (!itemId) return;
    
    const updatedItems = [...purchaseItems];
    
    if (itemType === "material") {
      const material = materials.find(m => m.id === parseInt(itemId));
      if (material) {
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = material.unit_cost.toString();
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          updatedItems[index].total = quantity * material.unit_cost;
        }
        updatedItems[index].materialUnitPrice = material.unit_cost;
      }
    } else {
      const product = products.find(p => p.id === parseInt(itemId));
      if (product) {
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = product.cost.toString();
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          updatedItems[index].total = quantity * product.cost;
        }
        updatedItems[index].productCost = product.cost;
      }
    }
    
    setPurchaseItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    // Validate form
    if (!form.supplierId || !form.destinationId) {
      setMessage("❌ Please select supplier and destination");
      setLoading(false);
      return;
    }

    // Validate items
    const validItems = purchaseItems.filter(item => {
      if (!item.itemType || !item.quantity || !item.unitPrice) return false;
      if (parseFloat(item.quantity) <= 0 || parseFloat(item.unitPrice) <= 0) return false;
      
      if (item.itemType === "material" && !item.materialId) return false;
      if (item.itemType === "product" && !item.productId) return false;
      
      return true;
    });

    if (validItems.length === 0) {
      setMessage("❌ Please add at least one valid item with quantity and unit price");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        supplierId: parseInt(form.supplierId),
        destinationType: form.destinationType,
        destinationId: parseInt(form.destinationId),
        grandTotal: form.grandTotal,
        reference: form.reference,
        items: validItems.map(item => ({
          itemType: item.itemType,
          materialId: item.itemType === "material" ? parseInt(item.materialId) : undefined,
          productId: item.itemType === "product" ? parseInt(item.productId) : undefined,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        }))
      };

      const res = await fetch("http://localhost:3001/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
        
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Purchase added successfully!");
        // Reset form
        setForm({
          supplierId: "",
          destinationType: "store",
          destinationId: "",
          grandTotal: 0,
          reference: `PUR-${Date.now()}`
        });
        setDestinationType("store");
        setDestinationId("");
        setPurchaseItems([{ 
          itemType: "material",
          materialId: "", 
          productId: "", 
          quantity: "", 
          unitPrice: "", 
          total: 0, 
          materialUnitPrice: 0,
          productCost: 0
        }]);
      } else {
        setMessage(`❌ ${data.error || data.message || "Failed to add purchase"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to add purchase: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get destination icon
  const getDestinationIcon = (type) => {
    switch (type) {
      case "store": return <Store size={18} />;
      case "shop": return <ShoppingBag size={18} />;
      case "factory": return <Factory size={18} />;
      default: return <Building2 size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl xl:max-w-full">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Truck className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  New Purchase Order
                </h1>
                <p className="text-gray-600 mt-1">Create a new purchase order for materials or products</p>
              </div>
            </div>
            <div className="hidden md:block px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
              <p className="text-sm font-medium text-gray-700">Reference</p>
              <p className="text-lg font-bold text-blue-600">{form.reference}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Supplier & Destination */}
          <div className="lg:col-span-1 space-y-6">
            {/* Supplier Selection Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="text-blue-600" size={20} />
                </div>
                Supplier Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Supplier *
                  </label>
                  <div className="relative">
                    <select
                      name="supplierId"
                      value={form.supplierId}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 appearance-none"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Selection Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="text-green-600" size={20} />
                </div>
                Delivery Destination
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["store", "shop", "factory"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDestinationType(type);
                          setForm(prev => ({ 
                            ...prev, 
                            destinationType: type,
                            destinationId: ""
                          }));
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 ${
                          destinationType === type
                            ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white border-transparent shadow-lg"
                            : "bg-white/60 border-gray-200/50 hover:bg-white/80"
                        }`}
                      >
                        {getDestinationIcon(type)}
                        <span className="text-xs mt-1 capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deliver to *
                  </label>
                  <div className="relative">
                    <select
                      name="destinationId"
                      value={form.destinationId}
                      onChange={handleDestinationChange}
                      required
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 appearance-none"
                    >
                      <option value="">-- Select {destinationType.charAt(0).toUpperCase() + destinationType.slice(1)} --</option>
                      {destinations.map((dest) => (
                        <option key={dest.id} value={dest.id}>
                          {dest.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="text-purple-600" size={20} />
                  </div>
                  Purchase Items
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {purchaseItems.map((item, index) => {
                  const itemDetails = getItemDetails(item);
                  const standardPrice = itemDetails.standardPrice;
                  const currentPrice = parseFloat(item.unitPrice) || 0;
                  
                  return (
                    <div key={index} className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl p-5 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.itemType === "material" ? "bg-blue-100" : "bg-green-100"}`}>
                            {item.itemType === "material" ? 
                              <Package className="text-blue-600" size={18} /> : 
                              <Tag className="text-green-600" size={18} />
                            }
                          </div>
                          <h3 className="font-medium text-gray-800">
                            Item #{index + 1}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleItemTypeChange(index, "material")}
                              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${
                                item.itemType === "material"
                                  ? "bg-blue-500 text-white shadow-md"
                                  : "bg-white/60 text-gray-600 hover:bg-white/80"
                              }`}
                            >
                              <Package size={14} />
                              Material
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemTypeChange(index, "product")}
                              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-300 ${
                                item.itemType === "product"
                                  ? "bg-green-500 text-white shadow-md"
                                  : "bg-white/60 text-gray-600 hover:bg-white/80"
                              }`}
                            >
                              <Tag size={14} />
                              Product
                            </button>
                          </div>
                          
                          {purchaseItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Item Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {item.itemType === "material" ? "Material" : "Product"} *
                          </label>
                          <div className="relative">
                            <select
                              value={item.itemType === "material" ? item.materialId : item.productId}
                              onChange={(e) => {
                                if (item.itemType === "material") {
                                  handleItemChange(index, 'materialId', e.target.value);
                                } else {
                                  handleItemChange(index, 'productId', e.target.value);
                                }
                              }}
                              onBlur={() => {
                                if (item.itemType === "material") {
                                  handleItemSelect(index, "material", item.materialId);
                                } else {
                                  handleItemSelect(index, "product", item.productId);
                                }
                              }}
                              required
                              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 appearance-none"
                            >
                              <option value="">
                                -- Select {item.itemType === "material" ? "Material" : "Product"} --
                              </option>
                              {item.itemType === "material" ? (
                                materials.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.unit}) - ${m.unit_cost}/unit
                                  </option>
                                ))
                              ) : (
                                products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} - Cost: ${p.cost}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                          {itemDetails.name && (
                            <p className="mt-2 text-xs text-gray-600">
                              Selected: <span className="font-medium">{itemDetails.name}</span>
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1.00"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                          />
                          {itemDetails.unit && (
                            <p className="mt-1 text-xs text-gray-500">Unit: {itemDetails.unit}</p>
                          )}
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Price *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder={`e.g., ${standardPrice.toFixed(2)}`}
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            required
                            className={`w-full px-4 py-3 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400 ${
                              standardPrice > 0 && currentPrice === standardPrice 
                                ? "bg-green-50/60 border-green-200/50" 
                                : standardPrice > 0 && currentPrice !== standardPrice
                                ? "bg-yellow-50/60 border-yellow-200/50"
                                : "bg-white/60 border-gray-200/50"
                            }`}
                          />
                          {standardPrice > 0 && (
                            <p className={`mt-1 text-xs ${
                              currentPrice === standardPrice 
                                ? "text-green-600" 
                                : "text-yellow-600"
                            }`}>
                              Standard: ${standardPrice.toFixed(2)}
                              {currentPrice !== standardPrice && " (modified)"}
                            </p>
                          )}
                        </div>

                        {/* Total */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total
                          </label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={`$${item.total.toFixed(2)}`} 
                              readOnly 
                              className="w-full px-4 py-3 bg-gradient-to-r from-blue-50/60 to-purple-50/60 border border-gray-300/50 rounded-xl text-lg font-bold text-blue-700 placeholder:text-gray-400"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="p-1 bg-white/80 rounded-md shadow-sm">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total */}
              <div className="mt-8 pt-6 border-t border-white/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Items: {purchaseItems.length}</p>
                    <p className="text-lg font-semibold text-gray-800">Grand Total</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ${form.grandTotal.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Including all items and taxes</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8">
                <button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing Purchase...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Create Purchase Order
                    </>
                  )}
                </button>
              </div>

              {/* Message */}
              {message && (
                <div className={`mt-6 p-4 rounded-xl backdrop-blur-sm ${
                  message.includes("✅") 
                    ? "bg-green-50/50 border border-green-200/50" 
                    : "bg-red-50/50 border border-red-200/50"
                }`}>
                  <p className={`font-medium flex items-center gap-2 ${
                    message.includes("✅") ? "text-green-700" : "text-red-700"
                  }`}>
                    {message.includes("✅") ? (
                      <Check className="text-green-600" size={18} />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    {message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}