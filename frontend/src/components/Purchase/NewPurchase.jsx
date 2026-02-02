import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Package, Tag, Truck, Building2, Store, Factory, ShoppingBag, Check, Image as ImageIcon, ChevronDown, CreditCard, DollarSign, Percent, Truck as ShippingIcon } from "lucide-react";

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
    shippingCost: "0",
    discount: "0",
    tax: "0",
    paidAmount: "0",
    paymentMethod: "cash",
    grandTotal: 0,
    reference: `PUR-${Date.now()}`
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  
  // Financial breakdown state
  const [financialBreakdown, setFinancialBreakdown] = useState({
    subtotal: 0,
    discountAmount: 0,
    amountAfterDiscount: 0,
    taxAmount: 0,
    shippingCost: 0,
    grandTotal: 0,
    balance: 0
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownIndex !== null) {
        const dropdown = document.getElementById(`item-dropdown-${openDropdownIndex}`);
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenDropdownIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownIndex]);

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

  // Calculate subtotal from purchase items
  useEffect(() => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = parseFloat(form.discount) || 0;
    const taxPercent = parseFloat(form.tax) || 0;
    const shippingCost = parseFloat(form.shippingCost) || 0;
    
    // Calculate discount amount
    const discountAmount = (discountPercent / 100) * subtotal;
    
    // Calculate amount after discount
    const amountAfterDiscount = subtotal - discountAmount;
    
    // Calculate tax amount
    const taxAmount = (taxPercent / 100) * amountAfterDiscount;
    
    // Calculate grand total
    const grandTotal = amountAfterDiscount + taxAmount + shippingCost;
    
    // Calculate balance
    const paidAmount = parseFloat(form.paidAmount) || 0;
    const balance = grandTotal - paidAmount;
    
    setFinancialBreakdown({
      subtotal,
      discountAmount,
      amountAfterDiscount,
      taxAmount,
      shippingCost,
      grandTotal,
      balance
    });
    
    setForm(prev => ({ ...prev, grandTotal }));
  }, [purchaseItems, form.discount, form.tax, form.shippingCost, form.paidAmount]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Validate numeric inputs
    if (["shippingCost", "discount", "tax", "paidAmount"].includes(name)) {
      if (value && (isNaN(value) || parseFloat(value) < 0)) {
        return;
      }
    }
    
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
    setOpenDropdownIndex(null);
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
      setOpenDropdownIndex(null);
    }
  };

  // Helper function to get item details
  const getItemDetails = (item) => {
    if (item.itemType === "material" && item.materialId) {
      const material = materials.find(m => m.id === parseInt(item.materialId));
      return {
        name: material?.name || "",
        unit: material?.unit || "",
        standardPrice: material?.unit_cost || 0,
        image: material?.image || material?.photo || null
      };
    } else if (item.itemType === "product" && item.productId) {
      const product = products.find(p => p.id === parseInt(item.productId));
      return {
        name: product?.name || "",
        unit: "unit",
        standardPrice: product?.cost || 0,
        image: product?.image || product?.photo || product?.thumbnail || null
      };
    }
    return { name: "", unit: "", standardPrice: 0, image: null };
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
    setOpenDropdownIndex(null);
  };

  const toggleDropdown = (index) => {
    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
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

    // Validate paid amount
    const paidAmount = parseFloat(form.paidAmount) || 0;
    if (paidAmount > financialBreakdown.grandTotal) {
      setMessage("❌ Paid amount cannot exceed grand total");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      };

      const payload = {
        supplierId: parseInt(form.supplierId),
        destinationType: form.destinationType,
        destinationId: parseInt(form.destinationId),
        shippingCost: parseFloat(form.shippingCost) || 0,
        discount: parseFloat(form.discount) || 0,
        tax: parseFloat(form.tax) || 0,
        paidAmount: paidAmount,
        paymentMethod: form.paymentMethod,
        grandTotal: financialBreakdown.grandTotal,
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
        headers,
        body: JSON.stringify(payload),
      });
        
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Purchase created successfully with transaction!");
        // Reset form
        setForm({
          supplierId: "",
          destinationType: "store",
          destinationId: "",
          shippingCost: "0",
          discount: "0",
          tax: "0",
          paidAmount: "0",
          paymentMethod: "cash",
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
        setFinancialBreakdown({
          subtotal: 0,
          discountAmount: 0,
          amountAfterDiscount: 0,
          taxAmount: 0,
          shippingCost: 0,
          grandTotal: 0,
          balance: 0
        });
      } else {
        setMessage(`❌ ${data.error || data.message || "Failed to create purchase"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to create purchase: " + error.message);
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

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `http://localhost:3001${imagePath}`;
    return `http://localhost:3001/uploads/${imagePath}`;
  };

  // Get filtered items for dropdown
  const getDropdownItems = (index) => {
    const item = purchaseItems[index];
    if (item.itemType === "material") {
      return materials;
    } else {
      return products;
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

            {/* Financial Details Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="text-purple-600" size={20} />
                </div>
                Financial Details
              </h2>
              <div className="space-y-4">
                {/* Shipping Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <ShippingIcon size={16} className="text-gray-500" />
                    Shipping Cost ($)
                  </label>
                  <input
                    type="number"
                    name="shippingCost"
                    min="0"
                    step="0.01"
                    value={form.shippingCost}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Percent size={16} className="text-gray-500" />
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    name="discount"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.discount}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                  />
                </div>

                {/* Tax */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Percent size={16} className="text-gray-500" />
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    name="tax"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                  />
                </div>

                {/* Payment Details */}
                <div className="pt-4 border-t border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment</h3>
                  
                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CreditCard size={16} className="text-gray-500" />
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["cash", "card", "bank_transfer", "check"].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, paymentMethod: method }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
                            form.paymentMethod === method
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                              : "bg-white/60 text-gray-600 hover:bg-white/80"
                          }`}
                        >
                          {method.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paid Amount ($)
                    </label>
                    <input
                      type="number"
                      name="paidAmount"
                      min="0"
                      step="0.01"
                      max={financialBreakdown.grandTotal}
                      value={form.paidAmount}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Max: ${financialBreakdown.grandTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Balance Display */}
                  {financialBreakdown.balance > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50/50 border border-yellow-200/50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">
                        Balance Due: <span className="font-bold">${financialBreakdown.balance.toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        This amount will be recorded as payable
                      </p>
                    </div>
                  )}

                  {financialBreakdown.balance === 0 && parseFloat(form.paidAmount) > 0 && (
                    <div className="mt-4 p-3 bg-green-50/50 border border-green-200/50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        ✅ Fully Paid
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items & Summary */}
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
                  const dropdownItems = getDropdownItems(index);
                  
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
                        {/* Item Selection with Card Style Dropdown */}
                        <div className="relative" id={`item-dropdown-${index}`}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {item.itemType === "material" ? "Material" : "Product"} *
                          </label>
                          
                          {/* Custom dropdown trigger */}
                          <button
                            type="button"
                            onClick={() => toggleDropdown(index)}
                            className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 flex items-center justify-between text-left"
                          >
                            {itemDetails.name ? (
                              <div className="flex items-center gap-2">
                                {itemDetails.image ? (
                                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                    <img 
                                      src={getImageUrl(itemDetails.image)} 
                                      alt={itemDetails.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={14} class="text-gray-400" /></div>';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                                    <ImageIcon size={14} className="text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-800 truncate max-w-[120px]">{itemDetails.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.itemType === "material" 
                                      ? `$${standardPrice.toFixed(2)}/${itemDetails.unit}`
                                      : `Cost: $${standardPrice.toFixed(2)}`
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500">
                                -- Select {item.itemType === "material" ? "Material" : "Product"} --
                              </span>
                            )}
                            <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${openDropdownIndex === index ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Card Style Dropdown */}
                          {openDropdownIndex === index && (
                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200/80 rounded-xl shadow-2xl shadow-blue-100/50 backdrop-blur-xl">
                              <div className="p-3 border-b border-gray-100">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder={`Search ${item.itemType === "material" ? "materials" : "products"}...`}
                                    className="w-full px-4 py-2 bg-gray-50/80 border border-gray-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="max-h-64 overflow-y-auto">
                                {dropdownItems.length === 0 ? (
                                  <div className="p-4 text-center text-gray-500">
                                    No {item.itemType === "material" ? "materials" : "products"} available
                                  </div>
                                ) : (
                                  dropdownItems.map((dropdownItem) => {
                                    const itemImage = getImageUrl(
                                      item.itemType === "material" 
                                        ? dropdownItem.image || dropdownItem.photo
                                        : dropdownItem.image || dropdownItem.photo || dropdownItem.thumbnail
                                    );
                                    const isSelected = item.itemType === "material" 
                                      ? item.materialId === dropdownItem.id.toString()
                                      : item.productId === dropdownItem.id.toString();
                                    
                                    return (
                                      <div
                                        key={dropdownItem.id}
                                        onClick={() => {
                                          if (item.itemType === "material") {
                                            handleItemChange(index, 'materialId', dropdownItem.id.toString());
                                            handleItemSelect(index, "material", dropdownItem.id.toString());
                                          } else {
                                            handleItemChange(index, 'productId', dropdownItem.id.toString());
                                            handleItemSelect(index, "product", dropdownItem.id.toString());
                                          }
                                        }}
                                        className={`p-3 border-b border-gray-100/50 last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* Item Image */}
                                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                                            {itemImage ? (
                                              <img 
                                                src={itemImage} 
                                                alt={dropdownItem.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  e.target.style.display = 'none';
                                                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={18} class="text-gray-400" /></div>';
                                                }}
                                              />
                                            ) : (
                                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <ImageIcon size={18} className="text-gray-400" />
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Item Details */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                              <h4 className="font-medium text-gray-800 truncate">
                                                {dropdownItem.name}
                                              </h4>
                                              <span className={`text-sm font-medium px-2 py-0.5 rounded ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.itemType === "material" ? dropdownItem.unit : "unit"}
                                              </span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-1">
                                              <p className="text-sm text-gray-600 truncate">
                                                {item.itemType === "material" 
                                                  ? `Unit Cost: $${(dropdownItem.unit_cost || 0).toFixed(2)}`
                                                  : `Cost: $${(dropdownItem.cost || 0).toFixed(2)}`
                                                }
                                              </p>
                                              
                                              {item.itemType === "material" && dropdownItem.stock_quantity !== undefined && (
                                                <p className="text-xs text-gray-500">
                                                  Stock: {dropdownItem.stock_quantity}
                                                </p>
                                              )}
                                            </div>
                                            
                                            if (dropdownItem.code) {
                                              <p className="text-xs text-gray-500 mt-1">
                                                Code: {dropdownItem.code}
                                              </p>
                                            }
                                          </div>
                                          
                                          {/* Selection Indicator */}
                                          {isSelected && (
                                            <div className="flex-shrink-0">
                                              <Check size={16} className="text-blue-500" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                              
                              <div className="p-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                                <p className="text-xs text-gray-500 text-center">
                                  Showing {dropdownItems.length} {item.itemType === "material" ? "materials" : "products"}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {itemDetails.name && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600">
                                Selected: <span className="font-medium">{itemDetails.name}</span>
                                {itemDetails.unit && ` (${itemDetails.unit})`}
                              </p>
                            </div>
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

              {/* Financial Summary */}
              <div className="mt-8 pt-6 border-t border-white/50">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="text-blue-600" size={20} />
                  </div>
                  Financial Summary
                </h3>
                
                <div className="space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${financialBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Discount */}
                  {financialBreakdown.discountAmount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Percent size={14} className="text-gray-500" />
                        <span className="text-gray-600">Discount ({form.discount}%)</span>
                      </div>
                      <span className="font-medium text-red-600">-${financialBreakdown.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Amount After Discount */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Amount After Discount</span>
                    <span className="font-medium">${financialBreakdown.amountAfterDiscount.toFixed(2)}</span>
                  </div>
                  
                  {/* Tax */}
                  {financialBreakdown.taxAmount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Percent size={14} className="text-gray-500" />
                        <span className="text-gray-600">Tax ({form.tax}%)</span>
                      </div>
                      <span className="font-medium text-yellow-600">+${financialBreakdown.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Shipping */}
                  {financialBreakdown.shippingCost > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <ShippingIcon size={14} className="text-gray-500" />
                        <span className="text-gray-600">Shipping Cost</span>
                      </div>
                      <span className="font-medium text-blue-600">+${financialBreakdown.shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Grand Total */}
                  <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                    <span className="text-lg font-semibold text-gray-800">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-700">${financialBreakdown.grandTotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Paid Amount */}
                  {parseFloat(form.paidAmount) > 0 && (
                    <div className="flex justify-between items-center py-2 bg-green-50/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-green-600" />
                        <span className="text-gray-600">Paid Amount</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {form.paymentMethod}
                        </span>
                      </div>
                      <span className="font-bold text-green-700">${parseFloat(form.paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Balance */}
                  {financialBreakdown.balance > 0 && (
                    <div className="flex justify-between items-center py-2 bg-yellow-50/50 rounded-lg p-3">
                      <span className="text-gray-600">Balance Due</span>
                      <span className="font-bold text-yellow-700">${financialBreakdown.balance.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Payment Status */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        financialBreakdown.balance === 0 
                          ? "bg-green-100 text-green-800" 
                          : financialBreakdown.balance === financialBreakdown.grandTotal
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {financialBreakdown.balance === 0 
                          ? "Fully Paid" 
                          : financialBreakdown.balance === financialBreakdown.grandTotal
                          ? "Unpaid"
                          : "Partial Payment"
                        }
                      </span>
                    </div>
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