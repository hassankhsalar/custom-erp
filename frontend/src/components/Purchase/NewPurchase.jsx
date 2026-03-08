import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Package, Tag, Truck, Building2, Store, Factory, ShoppingBag, Check, Image as ImageIcon, CreditCard, DollarSign, Percent, Truck as ShippingIcon, Camera, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useLocation } from "react-router-dom";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { includesLooseNumber } from "../../utils/numberLooseSearch";
import { activeOnly } from "../../utils/softDelete";

const getNowDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
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
    createdAt: getNowDateTimeLocal(),
    reference: `PUR-${Date.now()}`
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState("percent");
  const toAltUnits = (arr) => (Array.isArray(arr) ? arr : [])
    .map((u) => ({ unitname: String(u?.unitname || "").trim(), multiplier: Number(u?.multiplier) }))
    .filter((u) => u.unitname && Number.isFinite(u.multiplier) && u.multiplier > 0);
  
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
    if (!scannerOpen) return undefined;

    const scannerId = "purchase-create-scanner";
    let scanner = null;
    let isActive = true;
    let hasScanned = false;

    const start = async () => {
      try {
        setScannerError("");
        scanner = new Html5Qrcode(scannerId);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (hasScanned || !isActive) return;
            hasScanned = true;
            handleSearchInputChange(String(decodedText || "").trim());
            setScannerOpen(false);
          },
          () => {}
        );
      } catch (error) {
        if (!isActive) return;
        setScannerError(error?.message || "Unable to start camera scanner.");
      }
    };

    start();

    return () => {
      isActive = false;
      if (!scanner) return;
      Promise.resolve()
        .then(async () => {
          if (scanner.isScanning) await scanner.stop();
        })
        .catch(() => {})
        .finally(async () => {
          try {
            await scanner.clear();
          } catch {
            // ignore scanner cleanup errors
          }
        });
    };
  }, [scannerOpen]);

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
        selectedName: itemEntity?.name || "",
        image: itemEntity?.image || null,
        unit: isProduct ? (itemEntity?.unit || "unit") : (itemEntity?.unit || "unit"),
        defaultUnit: isProduct ? (itemEntity?.unit || "unit") : (itemEntity?.unit || "unit"),
        selectedUnit: isProduct ? (itemEntity?.unit || "unit") : (itemEntity?.unit || "unit"),
        conversionMultiplier: 1,
        alternativeNames: itemEntity?.alternative_names || [],
        alternativeUnits: toAltUnits(itemEntity?.alternative_units),
        quantity: String(qty),
        selectedQuantity: String(qty),
        actualQuantity: qty,
        unitPrice: String(defaultPrice),
        baseUnitPrice: defaultPrice,
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
    
    const res = await fetch(API_ROUTES.MATERIALS_ALL, { headers });
    const data = await res.json();
    setMaterials(activeOnly(data.materials || data || []));
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
    
    const res = await fetch(API_ROUTES.PRODUCTS_ALL, { headers });
    const data = await res.json();
    setProducts(activeOnly(data.products || data || []));
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
    
    const res = await fetch(API_ROUTES.SUPPLIERS, { headers });
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
    const res = await fetch(API_ROUTES.BANK_ACCOUNTS, { headers });
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
          endpoint = API_ROUTES.STORES;
          break;
        case "shop":
          endpoint = API_ROUTES.SHOPS;
          break;
        case "factory":
          endpoint = API_ROUTES.FACTORIES;
          break;
        default:
          endpoint = API_ROUTES.STORES;
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
        setDestinations(activeOnly(data));
      } else if (data.stores) {
        setDestinations(activeOnly(data.stores));
      } else if (data.shops) {
        setDestinations(activeOnly(data.shops || data));
      } else if (data.factories) {
        setDestinations(activeOnly(data.factories));
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
    const rawDiscountValue = parseFloat(form.discount) || 0;
    const discountValue = discountType === "percent"
      ? Math.min(100, Math.max(0, rawDiscountValue))
      : Math.max(0, rawDiscountValue);
    const taxPercent = parseFloat(form.tax) || 0;
    const shippingCost = parseFloat(form.shippingCost) || 0;
    
    // Calculate discount amount
    const discountAmount = discountType === "percent"
      ? (discountValue / 100) * subtotal
      : Math.min(subtotal, discountValue);
    
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
  }, [purchaseItems, form.discount, form.tax, form.shippingCost, form.paidAmount, discountType]);

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
            includesLooseNumber(m.name, lowerCaseValue) ||
            (Array.isArray(m.alternative_names) && m.alternative_names.some((n) => includesLooseNumber(n, lowerCaseValue))) ||
            (m.barcode && includesLooseNumber(m.barcode, lowerCaseValue))
          )
          .map(m => ({
            type: "material",
            id: m.id,
            barcode: m.barcode,
            name: m.name,
            selectedName: m.name,
            unit: m.unit || "unit",
            defaultUnit: m.unit || "unit",
            alternativeNames: m.alternative_names || [],
            alternativeUnits: toAltUnits(m.alternative_units),
            standardPrice: Number(m.unit_cost) || 0,
            image: m.image || m.photo,
          })).slice(0, 5);

        // Filter products
        const filteredProducts = products
          .filter(p =>
            includesLooseNumber(p.name, lowerCaseValue) ||
            (Array.isArray(p.alternative_names) && p.alternative_names.some((n) => includesLooseNumber(n, lowerCaseValue))) ||
            (p.barcode && includesLooseNumber(p.barcode, lowerCaseValue))
          )
          .map(p => ({
            type: "product",
            id: p.id,
            barcode: p.barcode,
            name: p.name,
            selectedName: p.name,
            unit: p.unit || "unit",
            defaultUnit: p.unit || "unit",
            alternativeNames: p.alternative_names || [],
            alternativeUnits: toAltUnits(p.alternative_units),
            standardPrice: Number(p.cost) || 0,
            image: p.image || p.photo || p.thumbnail,
          })).slice(0, 5);

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

    if (name === "discount") {
      if (value && (isNaN(value) || parseFloat(value) < 0)) {
        return;
      }
      const numericValue = parseFloat(value);
      if (!Number.isFinite(numericValue)) {
        setForm(prev => ({ ...prev, [name]: value }));
        return;
      }
      const normalizedDiscount = discountType === "percent"
        ? Math.min(100, Math.max(0, numericValue))
        : Math.max(0, numericValue);
      setForm(prev => ({ ...prev, [name]: String(normalizedDiscount) }));
      return;
    }
    
    // Validate numeric inputs
    if (["shippingCost", "tax", "paidAmount"].includes(name)) {
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
          ? (() => {
              const next = { ...item, [field]: value };
              const multiplier = item.conversionMultiplier || 1;
              const selectedQty = parseFloat(field === 'quantity' ? value || 0 : (item.selectedQuantity || item.quantity || 0)) || 0;
              const displayUnitPrice = parseFloat(field === 'unitPrice' ? value || 0 : item.unitPrice || 0) || 0;

              if (field === 'quantity') {
                next.selectedQuantity = String(value);
                next.actualQuantity = selectedQty * multiplier;
              }

              if (field === 'unitPrice') {
                next.baseUnitPrice = displayUnitPrice / multiplier;
              }

              next.total = selectedQty * displayUnitPrice;
              return next;
            })()
          : item
      )
    );
  };

  const handleItemSelectedNameChange = (uniqueId, selectedName) => {
    setPurchaseItems((prev) =>
      prev.map((item) => (item.uniqueId === uniqueId ? { ...item, selectedName: selectedName || item.name } : item))
    );
  };

  const handleItemSelectedUnitChange = (uniqueId, unitValue) => {
    setPurchaseItems((prev) =>
      prev.map((item) => {
        if (item.uniqueId !== uniqueId) return item;
        const base = item.defaultUnit || item.unit || "unit";
        const selectedQty = parseFloat(item.selectedQuantity || item.quantity || 0) || 0;
        const baseUnitPrice = parseFloat(item.baseUnitPrice ?? item.originalStandardPrice ?? item.unitPrice ?? 0) || 0;
        if (!unitValue || unitValue === base) {
          return {
            ...item,
            selectedUnit: base,
            conversionMultiplier: 1,
            actualQuantity: selectedQty,
            unitPrice: String(baseUnitPrice),
            total: selectedQty * baseUnitPrice,
          };
        }
        const found = (item.alternativeUnits || []).find((u) => u.unitname === unitValue);
        const multiplier = found?.multiplier || 1;
        const displayUnitPrice = baseUnitPrice * multiplier;
        return {
          ...item,
          selectedUnit: unitValue,
          conversionMultiplier: multiplier,
          actualQuantity: selectedQty * multiplier,
          unitPrice: String(displayUnitPrice),
          total: selectedQty * displayUnitPrice,
        };
      })
    );
  };

  const removePurchaseItem = (uniqueIdToRemove) => {
    setPurchaseItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueIdToRemove));
  };

  const handleItemSelect = (selectedItem) => {
    const { type, id, name, selectedName, unit, defaultUnit, alternativeNames, alternativeUnits, standardPrice, image } = selectedItem;
    const normalizedStandardPrice = Number(standardPrice) || 0;

    // Create a new purchase item
    const newItem = {
      uniqueId: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Unique ID for key prop
      itemType: type,
      materialId: type === "material" ? id.toString() : "",
      productId: type === "product" ? id.toString() : "",
      name: name,
      selectedName: selectedName || name,
      image: image,
      unit: unit,
      defaultUnit: defaultUnit || unit || "unit",
      selectedUnit: defaultUnit || unit || "unit",
      conversionMultiplier: 1,
      alternativeNames: alternativeNames || [],
      alternativeUnits: alternativeUnits || [],
      quantity: "1", // Default quantity (selected)
      selectedQuantity: "1",
      actualQuantity: 1,
      unitPrice: normalizedStandardPrice.toString(), // Default unit price
      baseUnitPrice: normalizedStandardPrice,
      total: normalizedStandardPrice, // Default total
      receivedQuantity: "1",
      batchNumber: "",
      expiryDate: "",
      manufactureDate: "",
      batchNotes: "",
      originalStandardPrice: normalizedStandardPrice, // Store original standard price for comparison if needed
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
    if (form.createdAt) {
      const parsedPurchaseDateTime = new Date(form.createdAt);
      if (Number.isNaN(parsedPurchaseDateTime.getTime())) {
        setMessage("Please select a valid purchase date and time");
        setLoading(false);
        return;
      }
    }
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

      const discountPercentForApi = financialBreakdown.subtotal > 0
        ? (financialBreakdown.discountAmount / financialBreakdown.subtotal) * 100
        : 0;

      const payload = {
        supplierId: parseInt(form.supplierId),
        destinationType: form.destinationType,
        destinationId: parseInt(form.destinationId),
        shippingCost: parseFloat(form.shippingCost) || 0,
        discount: Number(Math.max(0, discountPercentForApi).toFixed(4)),
        tax: parseFloat(form.tax) || 0,
        paidAmount: paidAmount,
        paymentMethod: form.paymentMethod,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : null,
        grandTotal: financialBreakdown.grandTotal,
        shippingStatus: form.shippingStatus,
        createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : null,
        reference: form.reference,
        items: validItems.map(item => ({
          itemType: item.itemType,
          materialId: item.itemType === "material" ? parseInt(item.materialId) : undefined,
          productId: item.itemType === "product" ? parseInt(item.productId) : undefined,
          selectedName: item.selectedName || item.name,
          selectedUnit: item.selectedUnit || item.defaultUnit || item.unit || "unit",
          selectedQuantity: parseFloat(item.selectedQuantity || item.quantity),
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate || null,
          manufactureDate: item.manufactureDate || null,
          batchNotes: item.batchNotes || null,
          quantity: parseFloat(item.actualQuantity ?? item.quantity),
          unitPrice: parseFloat(item.baseUnitPrice ?? (parseFloat(item.unitPrice) / (item.conversionMultiplier || 1))),
          receivedQuantity: item.receivedQuantity !== undefined && item.receivedQuantity !== null
            ? (parseFloat(item.receivedQuantity) * (item.conversionMultiplier || 1))
            : parseFloat(item.actualQuantity ?? item.quantity)
        }))
      };

      const res = await fetch(API_ROUTES.PURCHASES, {
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
          createdAt: getNowDateTimeLocal(),
          reference: `PUR-${Date.now()}`
        });
        setDestinationType("store");
        setDiscountType("percent");
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
    if (imagePath.startsWith('/uploads/')) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 space-y-6 lg:space-y-0">
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
                      className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
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
                    className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
                  >
                    <option value="">-- Choose Status --</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="received">Received</option>
                  </select>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-2">Purchase Date & Time</label>
                  <input
                    type="datetime-local"
                    name="createdAt"
                    value={form.createdAt}
                    onChange={handleFormChange}
                    className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300"
                  />
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
                      className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300 appearance-none"
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
              <div className="relative mb-6" ref={searchInputRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Material or Product
                </label>
                <div className="flex justify-between items-center gap-2">
                  <div className="grow">
                    <input
                      type="text"
                      placeholder="Search materials or products by name/barcode..."
                      value={searchState.searchTerm}
                      onFocus={() => {
                        if (searchState.searchTerm.length > 0) {
                          setSearchState(prevState => ({ ...prevState, showSearchResults: true }));
                        } else {
                          // If no search term, show all items when focused
                          const allItems = [
                            ...materials.slice(0, 10).map(m => ({
                              type: "material",
                              id: m.id,
                              barcode: m.barcode || 'N/A',
                              name: m.name,
                              unit: m.unit,
                              standardPrice: Number(m.unit_cost) || 0,
                              image: m.image || m.photo,
                            })),
                            ...products.slice(0, 10).map(p => ({
                              type: "product",
                              id: p.id,
                              barcode: p.barcode || 'N/A',
                              name: p.name,
                              unit: p.unit || "unit",
                              standardPrice: Number(p.cost) || 0,
                              image: p.image || p.photo || p.thumbnail,
                            }))
                          ];
                          setSearchState(prevState => ({ ...prevState, showSearchResults: true, filteredResults: allItems }));
                        }
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSearchInputChange(e.target.value)}
                      }
                      className="w-full p-2 pr-12 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="p-3 rounded-lg text-blue-600 hover:bg-blue-200 cursor-pointer transition-colors"
                    title="Scan barcode/QR"
                  >
                    <Camera size={18} />
                  </button>
                </div>

                {/* Search Results Dropdown */}
                {searchState.showSearchResults && searchState.filteredResults.length > 0 && (
                  <div className="relative z-50 w-full mt-2 bg-white border border-gray-200/80 rounded-lg shadow-2xl shadow-blue-100/50 backdrop-blur-xl max-h-64 overflow-y-auto">
                    {searchState.filteredResults.map((resultItem) => {
                      const itemImage = getImageUrl(resultItem.image);
                      return (
                        <div
                          key={resultItem.type + resultItem.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleItemSelect(resultItem);
                          }}
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
                              <p className="text-sm text-gray-600 truncate">Code: {resultItem.barcode}</p>
                              <p className="text-sm text-gray-600 truncate">
                                Cost: ${Number(resultItem.standardPrice || 0).toFixed(2)} / {resultItem.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {searchState.showSearchResults && searchState.filteredResults.length === 0 && searchState.searchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200/80 rounded-lg shadow-2xl shadow-blue-100/50 backdrop-blur-xl">
                    <div className="p-4 text-center text-gray-500">
                      No matching materials or products
                    </div>
                  </div>
                )}
              </div>

              {/* List of Selected Purchase Items */}
              <div className="space-y-4">
                {purchaseItems.length === 0 ? (
                  <div className="p-5 text-center text-gray-500 border border-gray-200/50 rounded-lg bg-white/50">
                    No items added to the purchase order yet. Search above to add items.
                  </div>
                ) : (
                  purchaseItems.map((item) => {
                    const itemImage = getImageUrl(item.image);
                    const standardPrice = (item.originalStandardPrice || 0) * (item.conversionMultiplier || 1);
                    const currentPrice = parseFloat(item.unitPrice) || 0;

                    return (
                      <div key={item.uniqueId} className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-lg p-5 shadow-lg">
                        <div className="flex items-center justify-around">
                          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">

                            <div className="md:col-span-2 flex gap-2">
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
                                <p className="font-medium text-sm text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500">Unit: {item.defaultUnit || item.unit}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.alternativeNames?.length > 0 && (
                                    <select
                                      value={item.selectedName || item.name}
                                      onChange={(e) => handleItemSelectedNameChange(item.uniqueId, e.target.value)}
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                      <option value={item.name}>{item.name}</option>
                                      {item.alternativeNames.map((n, ni) => (
                                        <option key={`${item.uniqueId}-an-${ni}`} value={n}>{n}</option>
                                      ))}
                                    </select>
                                  )}
                                  <select
                                    value={item.selectedUnit || item.defaultUnit || item.unit}
                                    onChange={(e) => handleItemSelectedUnitChange(item.uniqueId, e.target.value)}
                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value={item.defaultUnit || item.unit}>{item.defaultUnit || item.unit}</option>
                                    {(item.alternativeUnits || []).map((u, ui) => (
                                      <option key={`${item.uniqueId}-au-${ui}`} value={u.unitname}>{u.unitname}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div>
                              {/* Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Quantity *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={item.selectedQuantity || item.quantity}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'quantity', e.target.value)}
                                  required
                                  className="w-full px-2 py-1 mb-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                                />
                                {item.selectedUnit !== item.defaultUnit && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Actual: {Number(item.actualQuantity || 0).toFixed(4)} {item.defaultUnit}
                                  </p>
                                )}
                              </div>

                              {/* Recieved Quantity */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Received
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={item.quantity}
                                  value={item.receivedQuantity ?? ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'receivedQuantity', e.target.value)}
                                  className="w-full px-2 py-1 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min={ item.avg_cost ? (item.avg_cost * (item.conversionMultiplier || 1)) : 0.001 }
                                value={item.unitPrice}
                                onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'unitPrice', e.target.value)}
                                required
                                className={`w-full p-2 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400 ${
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

                            <div>
                              {/* Batch Number */}
                              <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Batch Number
                                </label>
                                <input
                                  type="text"
                                  value={item.batchNumber || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'batchNumber', e.target.value)}
                                  className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg"
                                  placeholder="BTCH-1234"
                                />
                              </div> 

                            </div>

                            <div>
                              {/* Expiry Date */}
                              <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Expiry Date
                                </label>
                                <input
                                  type="date"
                                  value={item.expiryDate || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'expiryDate', e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg"
                                />
                              </div>

                              {/* Mfg Date */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Mfg Date
                                </label>
                                <input
                                  type="date"
                                  value={item.manufactureDate || ""}
                                  onChange={(e) => handlePurchaseItemChange(item.uniqueId, 'manufactureDate', e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex flex-col items-end gap-2">
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => removePurchaseItem(item.uniqueId)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                                <div className="col-span-full md:col-span-1">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sub Total
                                  </label>
                                  <input
                                    type="text"
                                    value={`$${parseFloat(item.total).toFixed(2)}`}
                                    readOnly
                                    className="w-full p-2 bg-gradient-to-r from-blue-50/60 to-purple-50/60 border border-gray-300/50 rounded-lg text-regular font-bold text-blue-700"
                                  />
                                </div>
                              </div>
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
                      {discountType === "percent" ? (
                        <Percent size={14} className="text-gray-500" />
                      ) : (
                        <DollarSign size={14} className="text-gray-500" />
                      )}
                      <span className="text-gray-600">Discount ({discountType === "percent" ? "Percent" : "Flat"})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={discountType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setDiscountType(nextType);
                          if (nextType === "percent") {
                            setForm((prev) => ({
                              ...prev,
                              discount: String(Math.min(100, Math.max(0, parseFloat(prev.discount) || 0))),
                            }));
                          }
                        }}
                        className="p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                      >
                        <option value="percent">Percent</option>
                        <option value="flat">Flat</option>
                      </select>
                      <span className="text-red-600">-$</span>
                      <input
                        type="number"
                        name="discount"
                        min="0"
                        max={discountType === "percent" ? "100" : undefined}
                        step="0.01"
                        value={form.discount}
                        onChange={handleFormChange}
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
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
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
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
                        className="w-32 p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
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
                            className="w-full p-2 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                        className="p-2 w-32 bg-white/60 backdrop-blur-sm border border-gray-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:focus:border-blue-400 transition-all duration-300"
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
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
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
                <div className={`mt-6 p-4 rounded-lg backdrop-blur-sm ${
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

      {scannerOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 p-4 md:p-6">
          <div className="h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Scan Barcode / QR</h3>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Close scanner"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-black p-3">
              <div id="purchase-create-scanner" className="w-full h-full min-h-[320px]" />
            </div>
            {scannerError && <p className="px-4 py-3 text-sm text-red-600">{scannerError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}




