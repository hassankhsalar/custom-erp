import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Package, Tag, Truck, Building2, Store, Factory, ShoppingBag, Check, Image as ImageIcon, CreditCard, DollarSign, Percent, Truck as ShippingIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function NewPurchase() {
  const location = useLocation();
  const requisitionOrder = location.state?.requisitionOrder || null;
  const [requisitionLink, setRequisitionLink] = useState({
    requisitionId: null,
    requisitionSectionId: null,
  });
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [destinationType, setDestinationType] = useState("store");
  const [searchState, setSearchState] = useState({
    searchTerm: "",
    showSearchResults: false,
    filteredResults: [], // Combined materials and products
  });
  const [purchaseItems, setPurchaseItems] = useState([]); // This will hold the actual items for the purchase order
  const [form, setForm] = useState({
    supplierId: "",
    destinationType: "store",
    destinationId: "",
    shippingCost: "0",
    discount: "0",
    tax: "0",
    paidAmount: "0",
    paymentMethod: "cash",
    bankAccountId: "",
    grandTotal: 0,
    shippingStatus: "pending",
    reference: `PUR-${Date.now()}`
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
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

  // Close search results when clicking outside
  const searchInputRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setSearchState(prevState => ({ ...prevState, showSearchResults: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchMaterials();
    fetchProducts();
    fetchSuppliers();
    fetchDestinations();
    fetchBankAccounts();
  }, [destinationType]);

  useEffect(() => {
    if (!requisitionOrder) return;
    const destinationTypeFromOrder = requisitionOrder.destinationType || requisitionOrder.destination?.type;
    const destinationIdFromOrder = requisitionOrder.destinationId || requisitionOrder.destination?.id;
    if (destinationTypeFromOrder && destinationIdFromOrder) {
      setDestinationType(destinationTypeFromOrder);
      setForm((prev) => ({
        ...prev,
        destinationType: destinationTypeFromOrder,
        destinationId: String(destinationIdFromOrder),
      }));
    }

    const mapped = (requisitionOrder.items || []).map((it) => {
      const isProduct = it.itemType === "product";
      const itemEntity = isProduct ? it.product : it.material;
      const defaultPrice = isProduct ? (itemEntity?.cost || 0) : (itemEntity?.unit_cost || 0);
      const qty = parseFloat(it.quantity || 1);
      return {
        uniqueId: `${it.itemType}-${isProduct ? it.productId : it.materialId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        itemType: it.itemType,
        materialId: isProduct ? "" : String(it.materialId || ""),
        productId: isProduct ? String(it.productId || "") : "",
        name: itemEntity?.name || "",
        image: itemEntity?.image || null,
        unit: isProduct ? "unit" : (itemEntity?.unit || ""),
        quantity: String(qty),
        unitPrice: String(defaultPrice),
        total: qty * defaultPrice,
        receivedQuantity: String(qty),
        batchNumber: "",
        expiryDate: "",
        manufactureDate: "",
        batchNotes: "",
        originalStandardPrice: defaultPrice,
      };
    });
    if (mapped.length > 0) {
      setPurchaseItems(mapped);
    }

    setRequisitionLink({
      requisitionId: requisitionOrder.requisitionId,
      requisitionSectionId: requisitionOrder.id,
    });
  }, [requisitionOrder]);

 const fetchMaterials = async () => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch("http://localhost:3001/api/materials", { headers });
    const data = await res.json();
    setMaterials(data.materials || data || []);
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    setMaterials([]);
  }
};

const fetchProducts = async () => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch("http://localhost:3001/api/products", { headers });
    const data = await res.json();
    setProducts(data.products || data || []);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    setProducts([]);
  }
};

const fetchSuppliers = async () => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch("http://localhost:3001/api/suppliers", { headers });
    const data = await res.json();
    setSuppliers(data || []);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    setSuppliers([]);
  }
};

const fetchBankAccounts = async () => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch("http://localhost:3001/api/bank-accounts", { headers });
    const data = await res.json();
    setBankAccounts(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
    setBankAccounts([]);
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
      headers.Authorization = `Bearer ${token}`;

      if (destinationType === "shop") {
        headers.Authorization = `Bearer ${token}`;
      }

      if (destinationType === "factory") {
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

  useEffect(() => {
    const computeShippingStatus = () => {
      if (purchaseItems.length === 0) return "pending";
      let allZero = true;
      let allComplete = true;
      purchaseItems.forEach((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const received = parseFloat(item.receivedQuantity || 0) || 0;
        if (received > 0) allZero = false;
        if (received < qty) allComplete = false;
      });
      if (allComplete) return "received";
      if (allZero) return "pending";
      return "partial";
    };

    setForm(prev => ({ ...prev, shippingStatus: computeShippingStatus() }));
  }, [purchaseItems]);

  const handleSearchInputChange = (value) => {
    setSearchState(prevState => {
      const lowerCaseValue = value.toLowerCase();
      let results = [];
      let showResults = false;

      if (value.length > 0) {
        // Filter materials
        const filteredMaterials = materials
          .filter(m =>
            m.name.toLowerCase().includes(lowerCaseValue) ||
            (m.barcode && m.barcode.toLowerCase().includes(lowerCaseValue))
          )
          .map(m => ({
            type: "material",
            id: m.id,
            name: m.name,
            unit: m.unit,
            standardPrice: m.unit_cost,
            image: m.image || m.photo,
          }));

        // Filter products
        const filteredProducts = products
          .filter(p =>
            p.name.toLowerCase().includes(lowerCaseValue) ||
            (p.barcode && p.barcode.toLowerCase().includes(lowerCaseValue))
          )
          .map(p => ({
            type: "product",
            id: p.id,
            name: p.name,
            unit: "unit",
            standardPrice: p.cost,
            image: p.image || p.photo || p.thumbnail,
          }));

        results = [...filteredMaterials, ...filteredProducts];
        showResults = true;
      }

      return {
        ...prevState,
        searchTerm: value,
        showSearchResults: showResults,
        filteredResults: results,
      };
    });
  };

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

  const handleDestinationChange = (e) => {
    const newId = e.target.value;
    setForm(prev => ({ ...prev, destinationId: newId }));
  };

  const handlePurchaseItemChange = (uniqueId, field, value) => {
    setPurchaseItems(prevItems =>
      prevItems.map(item =>
        item.uniqueId === uniqueId
          ? {
              ...item,
              [field]: value,
              total: field === 'quantity' || field === 'unitPrice'
                ? parseFloat(field === 'quantity' ? value || 0 : item.quantity || 0) * parseFloat(field === 'unitPrice' ? value || 0 : item.unitPrice || 0)
                : item.total
            }
          : item
      )
    );
  };

  const removePurchaseItem = (uniqueIdToRemove) => {
    setPurchaseItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueIdToRemove));
  };

  const handleItemSelect = (selectedItem) => {
    const { type, id, name, unit, standardPrice, image } = selectedItem;

    // Create a new purchase item
    const newItem = {
      uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Unique ID for key prop
      itemType: type,
      materialId: type === "material" ? id.toString() : "",
      productId: type === "product" ? id.toString() : "",
      name: name,
      image: image,
      unit: unit,
      quantity: "1", // Default quantity
      unitPrice: standardPrice.toString(), // Default unit price
      total: standardPrice, // Default total
      receivedQuantity: "1",
      batchNumber: "",
      expiryDate: "",
      manufactureDate: "",
      batchNotes: "",
      originalStandardPrice: standardPrice, // Store original standard price for comparison if needed
    };

    // Add the new item to purchaseItems
    setPurchaseItems(prevItems => [...prevItems, newItem]);

    // Clear the search input fields after selection
    setSearchState({
      searchTerm: "",
      showSearchResults: false,
      filteredResults: [],
    });
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
      if (item.receivedQuantity !== undefined && item.receivedQuantity !== null) {
        const received = parseFloat(item.receivedQuantity);
        if (isNaN(received) || received < 0) return false;
        if (received > parseFloat(item.quantity)) return false;
      }
      
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
    if ((paidAmount.toFixed(2) - financialBreakdown.grandTotal.toFixed(2)) > 0 && paidAmount > 0) {
      setMessage(`❌ Paid amount cannot exceed grand total` );
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      };

      if ((form.paymentMethod === "card" || form.paymentMethod === "bank_transfer") && !form.bankAccountId) {
        setMessage("⚠️ Please select a bank account for card/bank transfers.");
        setLoading(false);
        return;
      }

      const payload = {
        supplierId: parseInt(form.supplierId),
        destinationType: form.destinationType,
        destinationId: parseInt(form.destinationId),
        shippingCost: parseFloat(form.shippingCost) || 0,
        discount: parseFloat(form.discount) || 0,
        tax: parseFloat(form.tax) || 0,
        paidAmount: paidAmount,
        paymentMethod: form.paymentMethod,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : null,
        grandTotal: financialBreakdown.grandTotal,
        shippingStatus: form.shippingStatus,
        reference: form.reference,
        items: validItems.map(item => ({
          itemType: item.itemType,
          materialId: item.itemType === "material" ? parseInt(item.materialId) : undefined,
          productId: item.itemType === "product" ? parseInt(item.productId) : undefined,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate || null,
          manufactureDate: item.manufactureDate || null,
          batchNotes: item.batchNotes || null,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          receivedQuantity: item.receivedQuantity !== undefined && item.receivedQuantity !== null
            ? parseFloat(item.receivedQuantity)
            : parseFloat(item.quantity)
        }))
      };

      const res = await fetch("http://localhost:3001/api/purchases", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
        
      const data = await res.json();
      if (res.ok) {
        if (requisitionLink.requisitionSectionId) {
          try {
            await fetch(API_ROUTES.REQUISITION_SECTION_COMPLETE(requisitionLink.requisitionSectionId), {
              method: "POST",
              headers,
              body: JSON.stringify({ status: "done", note: "Completed by purchase creation" }),
            });
          } catch {
            // Non-blocking: purchase already created
          }
        }
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
          bankAccountId: "",
          grandTotal: 0,
          shippingStatus: "pending",
          reference: `PUR-${Date.now()}`
        });
        setDestinationType("store");
        setPurchaseItems([]);
        setSearchState({
          searchTerm: "",
          showSearchResults: false,
          filteredResults: [],
        });
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
                {requisitionOrder?.requisition?.reference && (
                  <p className="text-sm text-indigo-700 mt-1">
                    Requisition Order: {requisitionOrder.requisition.reference} / Section {requisitionOrder.sectionNo}
                  </p>
                )}
              </div>
            </div>
            <div className="hidden md:block px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
              <p className="text-sm font-medium text-gray-700">Reference</p>
              <p className="text-lg font-bold text-blue-600">{form.reference}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Left Column - Supplier & Destination */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 space-y-6">
            {/* Supplier Selection Card */}
            <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="text-blue-600" size={20} />
                </div>
                Supplier And Shipping
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
                      className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
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
                {/* Shipping Status */}
                <div className="mt-4 relative">
                  <label className="block text-sm text-gray-600 mb-2">Shipping Status</label>
                  <select
                    name="shippingStatus"
                    value={form.shippingStatus}
                    onChange={handleFormChange}
                    className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
                  >
                    <option value="">-- Choose Status --</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="received">Received</option>
                  </select>
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
                            : "bg-white/60 text-gray-600 hover:bg-white/80"
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
                      className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
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
              </div>

              {/* Single Search Input for Items */}
              <div className="relative mb-6" ref={searchInputRef} tabIndex={0} onFocus={() => {
                if (searchState.searchTerm.length > 0) {
                  setSearchState(prevState => ({ ...prevState, showSearchResults: true }));
                } else {
                  // If no search term, show all items when focused
                  const allItems = [
                    ...materials.map(m => ({
                      type: "material", id: m.id, name: m.name, unit: m.unit, standardPrice: m.unit_cost, image: m.image || m.photo,
                    })),
                    ...products.map(p => ({
                      type: "product", id: p.id, name: p.name, unit: "unit", standardPrice: p.cost, image: p.image || p.photo || p.thumbnail,
                    }))
                  ];
                  setSearchState(prevState => ({ ...prevState, showSearchResults: true, filteredResults: allItems }));
                }
              }} onBlur={() => {
                // Hide results when focus is lost, with a small delay to allow click on result
                setTimeout(() => {
                  setSearchState(prevState => ({ ...prevState, showSearchResults: false }));
                }, 100);
              }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Material or Product
                </label>
                <input
                  type="text"
                  placeholder="Search materials or products by name/barcode..."
                  value={searchState.searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                />

                {/* Search Results Dropdown */}
                {searchState.showSearchResults && searchState.filteredResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200/80 rounded-xl shadow-2xl shadow-blue-100/50 backdrop-blur-xl max-h-64 overflow-y-auto">
                    {searchState.filteredResults.map((resultItem) => {
                      const itemImage = getImageUrl(resultItem.image);
                      return (
                        <div
                          key={resultItem.type + resultItem.id}
                          onClick={() => handleItemSelect(resultItem)}
                          className="p-3 border-b border-gray-100/50 last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-blue-50/50"
                        >
                          <div className="flex items-center gap-3">
                            {/* Item Image */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={resultItem.name}
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
                              <h4 className="font-medium text-gray-800 truncate">
                                {resultItem.name} ({resultItem.type})
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                Unit Cost: ${resultItem.standardPrice.toFixed(2)} / {resultItem.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {searchState.showSearchResults && searchState.filteredResults.length === 0 && searchState.searchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200/80 rounded-xl shadow-2xl shadow-blue-100/50 backdrop-blur-xl">
                    <div className="p-4 text-center text-gray-500">
                      No matching materials or products
                    </div>
                  </div>
                )}
              </div>

              {/* List of Selected Purchase Items */}
              <div className="space-y-4">
                {purchaseItems.length === 0 ? (
                  <div className="p-5 text-center text-gray-500 border border-gray-200/50 rounded-xl bg-white/50">
                    No items added to the purchase order yet. Search above to add items.
                  </div>
                ) : (
                  purchaseItems.map((item) => {
                    const itemImage = getImageUrl(item.image);
                    const standardPrice = item.originalStandardPrice || 0; 
                    const currentPrice = parseFloat(item.unitPrice) || 0;

                    return (
                      <div key={item.uniqueId} className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                          {/* Item Image and Details */}
                          <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={24} class="text-gray-400" /></div>';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <ImageIcon size={24} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{item.name}</p>
                              <p className="text-sm text-gray-500">Unit: {item.unit}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removePurchaseItem(item.uniqueId)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Quantity *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={item.quantity}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'quantity', e.target.value)}
                                  required
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                                />
                              </div>

                              {/* Recieved Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Received Quantity
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={item.quantity}
                                  value={item.receivedQuantity ?? ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'receivedQuantity', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Unit Price *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min={ item.avg_cost ? item.avg_cost : 0.001 }
                                  value={item.unitPrice}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'unitPrice', e.target.value)}
                                  required
                                  className={`w-full p-2 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400 ${
                                    standardPrice > 0 && currentPrice === standardPrice
                                      ? "bg-green-50/60 border-green-200/50"
                                      : standardPrice > 0 && currentPrice !== standardPrice
                                      ? "bg-yellow-50/60 border-yellow-200/50"
                                      : "bg-white/60 border-gray-200/50"
                                  }`}
                                />
                                {standardPrice > 0 && (
                                  <p className={`mt-1 text-xs ${
                                    currentPrice <= standardPrice
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }`}>
                                    Standard: ${standardPrice.toFixed(2)}
                                    {currentPrice !== standardPrice && " (modified)"}
                                  </p>
                                )}
                              </div>
                              
                              {/* Batch Number */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Batch Number
                                </label>
                                <input
                                  type="text"
                                  value={item.batchNumber || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'batchNumber', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl"
                                  placeholder="e.g. BATCH-001"
                                />
                              </div>

                              {/* Expiry Date */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Expiry Date
                                </label>
                                <input
                                  type="date"
                                  value={item.expiryDate || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'expiryDate', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl"
                                />
                              </div>

                              {/* Mfg Date */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Mfg Date
                                </label>
                                <input
                                  type="date"
                                  value={item.manufactureDate || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'manufactureDate', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl"
                                />
                              </div>

                              {/* Batch Notes */}
                              <div className="col-span-full md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Batch Notes
                                </label>
                                <input
                                  type="text"
                                  value={item.batchNotes || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'batchNotes', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl"
                                  placeholder="Optional notes for this batch"
                                />
                              </div>                        
                            </div>
                          </div>
                          <div>
                            {/* Total */}
                            <div className="col-span-full md:col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total
                              </label>
                              <input
                                type="text"
                                value={`$${parseFloat(item.total).toFixed(2)}`}
                                readOnly
                                className="w-full p-2 bg-gradient-to-r from-blue-50/60 to-purple-50/60 border border-gray-300/50 rounded-xl text-lg font-bold text-blue-700"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Financial Summary */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="text-blue-600" size={20} />
                  </div>
                  Summary
                </h3>
                
                <div className="space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center border-b border-gray-100">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${financialBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Discount */}
                  <div className="flex justify-between items-center border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-gray-500" />
                      <span className="text-gray-600">Discount ({form.discount}%)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-red-600">-$</span>
                      <input
                        type="number"
                        name="discount"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.discount}
                        onChange={handleFormChange}
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  {/* Tax */}
                  <div className="flex justify-between items-center border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-gray-500" />
                      <span className="text-gray-600">Tax ({form.tax}%)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium text-yellow-600">+$</span>
                      <input
                        type="number"
                        name="tax"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.tax}
                        onChange={handleFormChange}
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  {/* Shipping */}
                  <div className="flex justify-between items-center border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <ShippingIcon size={14} className="text-gray-500" />
                      <span className="text-gray-600">Shipping Cost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">+$</span>
                      <input
                        type="number"
                        name="shippingCost"
                        min="0"
                        step="0.01"
                        value={form.shippingCost}
                        onChange={handleFormChange}
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  {/* Grand Total */}
                  <div className="flex justify-between items-center border-t border-gray-200 mt-2">
                    <span className="text-lg font-semibold text-gray-800">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-700">${financialBreakdown.grandTotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Paid Amount */}
                  <div className="flex justify-between items-center bg-green-50/50 rounded-lg p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-green-600" />
                        <span className="text-gray-600">Paid Amount</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          { form.paymentMethod ? form.paymentMethod.replaceAll('_', ' ').replaceAll('-', ' ') : "Cash" }
                        </span>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {["cash", "card", "bank_transfer", "check"].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, paymentMethod: method }))}
                            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-300 ${
                              form.paymentMethod === method
                                ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md"
                                : "bg-white/60 text-gray-600 hover:bg-white/80"
                            }`}
                          >
                            {method.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      {(form.paymentMethod === "card" || form.paymentMethod === "bank_transfer") && (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-600 mb-1">Bank Account</label>
                          <select
                            name="bankAccountId"
                            value={form.bankAccountId}
                            onChange={handleFormChange}
                            className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          >
                            <option value="">Select Bank</option>
                            {bankAccounts.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                    </div>
                    <div>
                      <input
                        type="number"
                        name="paidAmount"
                        min="0"
                        step="0.01"
                        max={financialBreakdown.grandTotal}
                        value={form.paidAmount}
                        onChange={handleFormChange}
                        className="p-2 w-32 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max: ${financialBreakdown.grandTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
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
                        financialBreakdown.balance <= 0 && financialBreakdown.grandTotal > 0
                          ? "bg-green-100 text-green-800" 
                          : financialBreakdown.balance === financialBreakdown.grandTotal
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {financialBreakdown.balance <= 0 && financialBreakdown.grandTotal > 0
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
