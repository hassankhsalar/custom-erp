import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";
import { includesLooseNumber } from "../../utils/numberLooseSearch";
import { CircleDollarSign, CreditCard, Search, ShoppingCart, Store, TriangleAlert, UserRound, Image as ImageIcon, ClipboardList, X, Camera } from "lucide-react";
import { TbCurrencyTaka } from "react-icons/tb";
import { activeOnly } from "../../utils/softDelete";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function ShopPOS( props ) {
  const [shops, setShops] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [shopId, setShopId] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("flat");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerSearchResults, setShowCustomerSearchResults] = useState(false);
  const [paymentType, setPaymentType] = useState("cash");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [cashRegisters, setCashRegisters] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidAmountTouched, setPaidAmountTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  const [priceModalData, setPriceModalData] = useState({ index: null, currentPrice: 0 });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const searchInputRef = useRef(null);
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const SCANNER_ELEMENT_ID = "pos-camera-scanner";

  // Function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = MEDIA_BASE_URL;
    
    if (imagePath.startsWith('/uploads')) {
      return `${baseUrl}${imagePath}`;
    } else {
      return `${baseUrl}/uploads/${imagePath}`;
    }
  };

  const toArray = (v) => (Array.isArray(v) ? v : []);
  const parseAltUnits = (v) => {
    const arr = toArray(v);
    return arr
      .map((u) => ({
        unitname: String(u?.unitname || "").trim(),
        multiplier: Number(u?.multiplier),
      }))
      .filter((u) => u.unitname && Number.isFinite(u.multiplier) && u.multiplier > 0);
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
    } catch (_) {
      // scanner may already be stopped
    }
    try {
      await scannerRef.current.clear();
    } catch (_) {
      // ignore cleanup errors
    }
    scannerRef.current = null;
  };

  const openScanner = () => {
    if (!shopId) {
      alert("Please select a shop first.");
      return;
    }
    setScannerError("");
    setScannerOpen(true);
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setScannerError("");
  };

  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;

    const startScanner = async () => {
      try {
        
        await new Promise((resolve) => setTimeout(resolve, 200));

        const element = document.getElementById(SCANNER_ELEMENT_ID);
        if (!element) {
          throw new Error("Unable to start the camera.");
        }

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) {
          throw new Error("No cameras found.");
        }

        const backCamera =
          devices.find((d) => /back|rear|environment/i.test(String(d.label || ""))) ||
          devices[0];

        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 10,
            qrbox: { width: 340, height: 340 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (cancelled) return;
            handleSearch(String(decodedText || "").trim());
            closeScanner(); // better than just setScannerOpen(false)
          }
        );
      } catch (error) {
        console.error("Scanner error:", error);
        setScannerError(error?.message || "Failed to start camera scanner.");
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scannerOpen]);

  // Fetch all shops
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(API_ROUTES.SHOP_SALES_SHOPS, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch shops");
        return res.json();
      })
      .then((data) => setShops(activeOnly(Array.isArray(data) ? data : data?.shops || [])))
      .catch((err) => {
        console.error("Error fetching shops:", err);
        setShops([]);
      });
  }, [navigate]);

  // Fetch all customers
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ROUTES.CUSTOMERS_ALL, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch customers");
        return res.json();
      })
      .then((data) => {
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      })
      .catch((err) => {
        console.error("Error fetching customers:", err);
        setCustomers([]);
      });
  }, []); // Empty dependency array means this runs once on mount

  // Fetch bank accounts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(API_ROUTES.BANK_ACCOUNTS, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch bank accounts");
        return res.json();
      })
      .then((data) => setBankAccounts(Array.isArray(data) ? data : []))
      .catch(() => setBankAccounts([]));
  }, []);

  // Fetch items for selected shop
  useEffect(() => {
    if (!shopId) {
      setShopItems([]);
      setCashRegisters([]);
      setCashRegisterId("");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ROUTES.SHOP_SALES_ITEMS(shopId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch shop items");
        return res.json();
      })
      .then((data) => {
        setShopItems(activeOnly(Array.isArray(data) ? data : []));
        setSearchResults([]);
        setSearchQuery("");
      })
      .catch((err) => {
        console.error("Error fetching shop items:", err);
        setShopItems([]);
      });
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ROUTES.SHOP_SALES_CASH_REGISTERS(shopId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cash registers");
        return res.json();
      })
      .then((data) => {
        const registers = Array.isArray(data) ? data : [];
        setCashRegisters(registers);
        if (registers.length === 1) {
          setCashRegisterId(String(registers[0].id));
        } else {
          setCashRegisterId("");
        }
      })
      .catch(() => {
        setCashRegisters([]);
        setCashRegisterId("");
      });
  }, [shopId]);

  // Focus search input on shop selection
  useEffect(() => {
    if (shopId && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [shopId]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = shopItems.filter(item =>
      includesLooseNumber(item.name, query) ||
      toArray(item.alternative_names).some((n) => includesLooseNumber(n, query)) ||
      (item.barcode && includesLooseNumber(item.barcode, query)) ||
      (item.brand && includesLooseNumber(item.brand, query)) ||
      (item.category && includesLooseNumber(item.category, query))
    );

    setSearchResults(filtered.slice(0, 10));
    setShowSearchResults(true);
  };

  // Handle customer search
  const handleCustomerSearch = (query) => {
    setCustomerSearchQuery(query);
    if (!query.trim()) {
      setShowCustomerSearchResults(false);
      return;
    }
    setShowCustomerSearchResults(true);
  };


  // Add item to cart and update local stock
  const handleAddToCart = (item) => {
    const selectedBatch = Array.isArray(item.batches) && item.batches.length > 0 ? item.batches[0] : null;
    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex(cartItem => 
      cartItem.itemId === item.id &&
      cartItem.type === item.type &&
      String(cartItem.batchNumber || '') === String(selectedBatch?.batchNumber || '') &&
      String(cartItem.expiryDate || '') === String(selectedBatch?.expiryDate || '')
    );

    if (existingIndex !== -1) {
      // Increment quantity if already in cart
      const updatedCart = [...cartItems];
      const newQuantity = updatedCart[existingIndex].quantity + 1;
      
      // Check stock availability
      if (newQuantity > updatedCart[existingIndex].batchAvailable) {
        alert(`Insufficient stock for ${item.name}. Available: ${updatedCart[existingIndex].batchAvailable}`);
        return;
      }
      
      updatedCart[existingIndex].quantity = newQuantity;
      updatedCart[existingIndex].totalPrice = newQuantity * updatedCart[existingIndex].unitPrice;
      setCartItems(updatedCart);
    } else {
      // Add new item to cart
      const salePrice = item.sale_price || 0;
      if (salePrice <= 0) {
        alert(`${item.name} has no sale price set.`);
        // return;
      }
      
      const newItem = {
        itemId: item.id,
        name: item.name,
        selectedName: item.name,
        type: item.type,
        quantity: 1, // always actual/base quantity for stock math
        selectedQuantity: 1, // quantity in selected unit
        selectedUnit: item.unit || "unit",
        conversionMultiplier: 1,
        unitPrice: salePrice,
        baseUnitPrice: salePrice,
        totalPrice: salePrice,
        warrantyEnabled: false,
        warrantyExpiryDate: "",
        warrantyNotes: "",
        barcode: item.barcode,
        unit: item.unit,
        alternativeNames: toArray(item.alternative_names),
        alternativeUnits: parseAltUnits(item.alternative_units),
        shop_stock: item.shop_stock,
        batches: item.batches || [],
        batchNumber: selectedBatch?.batchNumber || null,
        expiryDate: selectedBatch?.expiryDate || null,
        batchAvailable: selectedBatch?.quantity || item.shop_stock,
        original_price: salePrice, // Store original price for reference
        image: item.image // Store image for display
      };
      
      setCartItems([...cartItems, newItem]);
    }

    // Clear search
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Update cart item quantity and update local stock
  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = [...cartItems];
    const item = updatedCart[index];
    const selectedQty = Number(newQuantity) || 1;
    const actualQty = selectedQty * (item.conversionMultiplier || 1);
    if (actualQty > item.batchAvailable) {
      alert(`Insufficient stock for ${item.name}. Available: ${item.batchAvailable}`);
      return;
    }
    
    updatedCart[index].selectedQuantity = selectedQty;
    updatedCart[index].quantity = actualQty;
    updatedCart[index].totalPrice = selectedQty * updatedCart[index].unitPrice;
    setCartItems(updatedCart);
  };

  const handleSelectedNameChange = (index, nameValue) => {
    const updated = [...cartItems];
    updated[index].selectedName = nameValue || updated[index].name;
    setCartItems(updated);
  };

  const handleSelectedUnitChange = (index, unitValue) => {
    const updated = [...cartItems];
    const item = updated[index];
    const baseUnit = item.unit || "unit";
    if (!unitValue || unitValue === baseUnit) {
      item.selectedUnit = baseUnit;
      item.conversionMultiplier = 1;
      item.quantity = item.selectedQuantity || 1;
      item.unitPrice = item.baseUnitPrice || item.unitPrice || 0;
    } else {
      const found = (item.alternativeUnits || []).find((u) => u.unitname === unitValue);
      const multiplier = found?.multiplier || 1;
      item.selectedUnit = unitValue;
      item.conversionMultiplier = multiplier;
      item.quantity = (item.selectedQuantity || 1) * multiplier;
      item.unitPrice = (item.baseUnitPrice || item.unitPrice || 0) * multiplier;
    }
    if (item.quantity > item.batchAvailable) {
      item.selectedQuantity = Math.max(1, Math.floor((item.batchAvailable || 1) / (item.conversionMultiplier || 1)));
      item.quantity = item.selectedQuantity * (item.conversionMultiplier || 1);
    }
    item.totalPrice = (item.selectedQuantity || 1) * (item.unitPrice || 0);
    setCartItems(updated);
  };

  // Remove item from cart and restore local stock
  const handleRemoveFromCart = (index) => {
    const updatedCart = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedCart);
  };

  // Clear cart and restore all stock
  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setSelectedCustomer(null); // Clear selected customer
    setCustomerSearchQuery(""); // Clear customer search query
    setSearchQuery("");
    setShowSearchResults(false);
    setPaidAmount(0);
    setPaidAmountTouched(false);
  };

  // Open price override modal
  const handleOpenPriceModal = (index) => {
    const item = cartItems[index];
    setPriceModalData({
      index,
      currentPrice: item.unitPrice,
      name: item.name
    });
    setTempPrice(item.unitPrice.toFixed(2));
  };

  const handlePriceChange = (index, price) => {
    const newPrice = parseFloat(price || 0) || 0;
    const updatedCart = [...cartItems];
    const itemIndex = index;
    
    updatedCart[itemIndex].unitPrice = newPrice;
    updatedCart[itemIndex].baseUnitPrice = newPrice / (updatedCart[itemIndex].conversionMultiplier || 1);
    updatedCart[itemIndex].totalPrice = newPrice * (updatedCart[itemIndex].selectedQuantity || 1);

    setCartItems(updatedCart);
  };

  const handleWarrantyToggle = (index, enabled) => {
    const updated = [...cartItems];
    updated[index].warrantyEnabled = !!enabled;
    if (!enabled) {
      updated[index].warrantyExpiryDate = "";
    }
    setCartItems(updated);
  };

  const handleWarrantyExpiryChange = (index, value) => {
    const updated = [...cartItems];
    updated[index].warrantyExpiryDate = value;
    setCartItems(updated);
  };

  const handleBatchChange = (index, value) => {
    const updated = [...cartItems];
    if (!value || value === "||") {
      updated[index].batchNumber = null;
      updated[index].expiryDate = null;
      updated[index].batchAvailable = updated[index].shop_stock;
      const maxSelectedQty = Math.max(1, Math.floor((updated[index].batchAvailable || 1) / (updated[index].conversionMultiplier || 1)));
      updated[index].selectedQuantity = Math.min(updated[index].selectedQuantity || 1, maxSelectedQty);
      updated[index].quantity = (updated[index].selectedQuantity || 1) * (updated[index].conversionMultiplier || 1);
      updated[index].totalPrice = (updated[index].selectedQuantity || 1) * (updated[index].unitPrice || 0);
      setCartItems(updated);
      return;
    }
    const [batchNumber, expiryDateRaw] = String(value || '').split("||");
    const selected = (updated[index].batches || []).find(
      (b) => b.batchNumber === batchNumber && String(b.expiryDate || '') === String(expiryDateRaw || '')
    );
    if (!selected) return;
    updated[index].batchNumber = selected.batchNumber;
    updated[index].expiryDate = selected.expiryDate || null;
    updated[index].batchAvailable = selected.quantity;
    const maxSelectedQty = Math.max(1, Math.floor((selected.quantity || 1) / (updated[index].conversionMultiplier || 1)));
    updated[index].selectedQuantity = Math.min(updated[index].selectedQuantity || 1, maxSelectedQty);
    updated[index].quantity = Math.max((updated[index].selectedQuantity || 1) * (updated[index].conversionMultiplier || 1), 1);
    updated[index].totalPrice = (updated[index].selectedQuantity || 1) * (updated[index].unitPrice || 0);
    setCartItems(updated);
  };

  // Validate form before submission
  const validateForm = () => {
    if (!shopId) {
      alert("⚠️ Please select a shop.");
      return false;
    }
    
    if (cartItems.length === 0) {
      alert("⚠️ Cart is empty. Add items to proceed.");
      return false;
    }

    if (discount < 0) {
      alert("⚠️ Discount cannot be negative.");
      return false;
    }

    if (paymentType === "card" && !bankAccountId) {
      alert("⚠️ Please select a bank account for card payments.");
      return false;
    }
    if (paymentType === "cash" && (parseFloat(paidAmount) || 0) > 0 && !cashRegisterId) {
      alert("⚠️ Please select a cash register for cash payments.");
      return false;
    }

    if (paidAmount < 0) {
      alert("⚠️ Paid amount cannot be negative.");
      return false;
    }

    if ( ( parseFloat(paidAmount).toFixed(2) - grandTotal.toFixed(2) ) > 0.01 ) {
      alert("⚠️ Paid amount cannot exceed grand total.");
      return false;
    }

    // Check stock availability for all items
    for (const cartItem of cartItems) {
      if (cartItem.quantity <= 0) {
        alert(`⚠️ Quantity must be greater than 0 for ${cartItem.name}.`);
        return false;
      }
      if ((cartItem.type === "product" || cartItem.type === "material") && cartItem.warrantyEnabled && !cartItem.warrantyExpiryDate) {
        alert(`⚠️ Select warranty expiry date for ${cartItem.name}.`);
        return false;
      }
    }

    return true;
  };

  const printInvoice = async (saleResponse) => {
    try {
      const token = localStorage.getItem("token");
      const companyRes = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      const company = companyRes && companyRes.ok ? (await companyRes.json())?.value || {} : {};

      const invoiceItems = cartItems.map((item) => `
        <tr>
          <td style="padding:4px 0;">${item.selectedName || item.name}</td>
          <td style="text-align:right;">${item.selectedQuantity || item.quantity} ${item.selectedUnit || item.unit || ""}</td>
          <td style="text-align:right;">${Number(item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align:right;">${Number(item.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `).join("");

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head><title>Invoice</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="margin:0;">${company.companyName || "Company"}</h2>
            <p style="margin:4px 0 12px;">${company.address || ""}</p>
            <h3>Invoice #${saleResponse?.sale?.reference || ""}</h3>
            <table style="width:100%; border-collapse: collapse;" border="1" cellspacing="0" cellpadding="6">
              <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Rate</th><th align="right">Amount</th></tr></thead>
              <tbody>${invoiceItems}</tbody>
            </table>
            <h3 style="text-align:right; margin-top:12px;">Total: ${Number(grandTotal || 0).toFixed(2)}</h3>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.error("Failed to print invoice", e);
    }
  };

  // Submit sale
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

  const payload = {
      shopId: parseInt(shopId),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      paymentType,
      bankAccountId: paymentType === "card" ? parseInt(bankAccountId) : null,
      cashRegisterId: paymentType === "cash" ? parseInt(cashRegisterId) : null,
      discount: Number(discountAmount.toFixed(2)),
      paidAmount: parseFloat(paidAmount) || 0,
      items: cartItems.map(item => ({
        itemId: item.itemId,
        type: item.type,
        quantity: item.quantity, // actual/base qty
        selectedName: item.selectedName || item.name,
        selectedUnit: item.selectedUnit || item.unit || "unit",
        selectedQuantity: item.selectedQuantity || item.quantity,
        unitPrice: item.baseUnitPrice || (item.unitPrice / (item.conversionMultiplier || 1)),
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        warrantyEnabled: (item.type === "product" || item.type === "material") ? !!item.warrantyEnabled : false,
        warrantyExpiryDate: (item.type === "product" || item.type === "material") && item.warrantyEnabled ? (item.warrantyExpiryDate || null) : null,
        warrantyNotes: (item.type === "product" || item.type === "material") ? (item.warrantyNotes || null) : null,
      })),
    };

    const token = localStorage.getItem("token");
    if (!token) {
      alert("❌ Authentication required. Please log in again.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_ROUTES.SHOP_SALES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Sale completed successfully!");
        await printInvoice(data);
        // Clear cart but don't restore stock since it's already sold
        setCartItems([]);
        setDiscount(0);
        setDiscountType("flat");
        setSelectedCustomer(null);
        setCustomerSearchQuery("");
        setSearchQuery("");
        setShowSearchResults(false);
        setPaidAmount(0);
        setPaidAmountTouched(false);
        
        // Refresh shop items to get updated stock from server
        if (shopId) {
          fetch(API_ROUTES.SHOP_SALES_ITEMS(shopId), {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => setShopItems(Array.isArray(data) ? data : []));
        }
      } else {
        alert("❌ Error: " + (data.error || "Something went wrong"));
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountInputValue = Math.max(0, parseFloat(discount) || 0);
  const discountAmount = Math.min(
    subtotal,
    discountType === "percent" ? (subtotal * discountInputValue) / 100 : discountInputValue
  );
  const grandTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (!paidAmountTouched) {
      setPaidAmount(grandTotal.toFixed(2));
    }
  }, [grandTotal, paidAmountTouched]);

  // Get low stock items (below 20)
  const lowStockItems = shopItems.filter(item => item.shop_stock < 20 && item.shop_stock > 0);
  const outOfStockItems = shopItems.filter(item => item.shop_stock <= 0);

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gray-50 p-2">

      {/* Main Content */}
      <div className="max-w-7xl  xl:max-w-full p-4">
        <div className="grid grid-cols-1 gap-6">
          {/* Left Column: Shop Selection & Search */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 space-y-4">
            {/* Shop Selection Card */}
            <div className="col-span-1 bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600"><Store size={42} /></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Select Shop</h3>
                  <p className="text-sm text-gray-500">Choose shop to sell from</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select a Shop</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  handleClearCart();
                }}
                required
              >
                <option value="">Select a Shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Card */}
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600"><UserRound size={42} /></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Customer</h3>
                  <p className="text-sm text-gray-500">Optional customer details</p>
                </div>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer (Optional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  placeholder="Search or select customer"
                  value={selectedCustomer ? selectedCustomer.name : customerSearchQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerSearchResults(true)}
                  // onBlur={() => setTimeout(() => setShowCustomerSearchResults(false), 200)}
                />
                {showCustomerSearchResults && customerSearchQuery.length > 0 && (
                  <div className="absolute z-10 bg-white border border-gray-200 w-full max-h-60 overflow-y-auto shadow-xl rounded-lg mt-1">
                    {customers
                      .filter(
                        (cust) =>
                          cust.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          cust.mobile.includes(customerSearchQuery)
                      )
                      .map((cust) => (
                        <div
                          key={cust.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearchQuery(cust.name);
                            setShowCustomerSearchResults(false);
                          }}
                        >
                          <p className="font-medium text-gray-800">{cust.name}</p>
                          <p className="text-sm text-gray-500">{cust.mobile}</p>
                        </div>
                      ))}
                    {customers.filter(
                      (cust) =>
                        cust.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        cust.mobile.includes(customerSearchQuery)
                    ).length === 0 && (
                      <div className="p-3 text-center text-gray-500">No customers found</div>
                    )}
                  </div>
                )}
                {selectedCustomer && (
                    <button
                        onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerSearchQuery("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 mt-3 bg-gray-100 rounded-full"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                )}
              </div>
            </div>


            {/* Payment Card */}
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <span className="text-teal-600"><TbCurrencyTaka size={42} /></span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Payment</h3>
                  <p className="text-sm text-gray-500">Payment details</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
              </div>

              {paymentType === "card" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
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

              {paymentType === "cash" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Register</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    value={cashRegisterId}
                    onChange={(e) => setCashRegisterId(e.target.value)}
                  >
                    <option value="">Select Cash Register</option>
                    {cashRegisters.map((register) => (
                      <option key={register.id} value={register.id}>
                        {register.name} (In hand: {Number(register.cash_in_hand || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>

          {/* Middle Column: Cart Items */}
          <div className="">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Cart Header */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <div className="flex justify-between items-center flex-col sm:flex-col md:flex-row">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                      <span className="text-white text-xl"><ShoppingCart /></span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">Shopping Cart</h3>
                      <p className="text-sm text-gray-500">{cartItems.length} item(s) in cart</p>
                    </div>
                  </div>

                  {/* Search Card */}
                  <div className="bg-white grow rounded-xl p-5 relative">
                    <div className="flex items-center gap-2">
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-1 outline-none focus:ring-green-500 focus:border-green-500 transition"
                        placeholder="Search products & materials..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        disabled={!shopId}
                      />
                      <button
                        type="button"
                        onClick={openScanner}
                        disabled={!shopId}
                        className="p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Scan barcode/QR with camera"
                      >
                        <Camera size={18} />
                      </button>
                    </div>

                    
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 bg-white border border-gray-200 w-full max-h-80 overflow-y-auto shadow-xl rounded-lg mt-2">
                        {searchResults.map((item) => {
                          const isLowStock = item.shop_stock < item.alert_quantity;
                          const isOutOfStock = item.shop_stock <= 0;
                          const imageUrl = getImageUrl(item.image);
                          
                          return (
                            <div
                              key={`${item.type}-${item.id}`}
                              onClick={() => !isOutOfStock && handleAddToCart(item)}
                              className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-400 transition ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            >
                              <div className="flex items-start space-x-3">
                                {/* Image Section */}
                                <div className="flex-shrink-0">
                                  {imageUrl ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                      <img 
                                        src={imageUrl} 
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const parent = e.target.parentElement;
                                          parent.innerHTML = `
                                            <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                            </div>
                                          `;
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Item Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-800 truncate">{item.name}</div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        {item.barcode && <span>{item.barcode}</span>}
                                      </div>
                                      <div className="flex items-center mt-2">
                                        <span className={`text-xs font-medium ${isLowStock ? 'text-amber-600' : 'text-gray-700'}`}>
                                          Stock: {item.shop_stock} {item.unit && `(${item.unit})`}
                                        </span>
                                        {isLowStock && !isOutOfStock && (
                                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">Low Stock</span>
                                        )}
                                        {isOutOfStock && (
                                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">Out of Stock</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right ml-2">
                                      <div className="font-semibold text-gray-900">${(item.sale_price || 0).toFixed(2)}</div>
                                      {!isOutOfStock && (
                                        <button className="mt-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition whitespace-nowrap">
                                          Add to Cart
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {showSearchResults && searchResults.length === 0 && searchQuery && (
                      <div className="absolute z-10 bg-white border w-full shadow-lg rounded-lg mt-2 p-4 text-center text-gray-500">
                        <div className="text-2xl mb-2">😕</div>
                        <p>No items found</p>
                        <p className="text-sm">Try a different search term</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleClearCart}
                    className="px-4 py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-medium rounded-lg hover:from-gray-300 hover:to-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={cartItems.length === 0 || loading}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              {cartItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4 text-gray-300 flex justify-center"><ShoppingCart size={72} /></div>
                  <h4 className="text-xl font-semibold text-gray-500 mb-2">Your cart is empty</h4>
                  <p className="text-gray-400">Search and add items to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Item</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Batch</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Price</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Quantity</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Total</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, index) => {
                        const imageUrl = getImageUrl(item.image);
                        
                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="p-4">
                              <div className="flex items-start space-x-3">
                                {/* Cart Item Image */}
                                <div className="flex-shrink-0">
                                  {imageUrl ? (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                      <img 
                                        src={imageUrl} 
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const parent = e.target.parentElement;
                                          parent.innerHTML = `
                                            <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                            </div>
                                          `;
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                      <ImageIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Cart Item Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  {item.alternativeNames && item.alternativeNames.length > 0 && (
                                    <div className="mt-1">
                                      <select
                                        value={item.selectedName || item.name}
                                        onChange={(e) => handleSelectedNameChange(index, e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                        title="Selected name"
                                      >
                                        <option value={item.name}>{item.name}</option>
                                        {item.alternativeNames.map((n, ni) => (
                                          <option key={`${item.itemId}-altname-${ni}`} value={n}>{n}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600 mt-1">
                                    {item.barcode && <span>{item.barcode}</span>}
                                    {item.unit && <span className="ml-2">| Base Unit: {item.unit}</span>}
                                  </div>
                                  {(item.type === "product" || item.type === "material") && (
                                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={!!item.warrantyEnabled}
                                          onChange={(e) => handleWarrantyToggle(index, e.target.checked)}
                                        />
                                        Warranty
                                      </label>
                                      {item.warrantyEnabled && (
                                        <input
                                          type="date"
                                          value={item.warrantyExpiryDate || ""}
                                          onChange={(e) => handleWarrantyExpiryChange(index, e.target.value)}
                                          className="w-40 border border-gray-300 rounded px-2 py-1 text-xs"
                                          title="Warranty expiry date"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <select
                                value={`${item.batchNumber || ''}||${item.expiryDate || ''}`}
                                onChange={(e) => handleBatchChange(index, e.target.value)}
                                className="min-w-48 border border-gray-300 rounded-lg p-2"
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
                              <div className="flex items-center gap-2">
                                <div>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => handlePriceChange(index, e.target.value)}
                                    className="w-full min-w-24 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                                    placeholder="Enter new price"
                                    autoFocus
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleUpdateQuantity(index, (item.selectedQuantity || 1) - 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={(item.selectedQuantity || 1) <= 1}
                                >
                                  <span className="text-gray-700">-</span>
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.selectedQuantity || 1}
                                  onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                  className="w-16 border border-gray-300 p-2 text-center rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  onClick={() => handleUpdateQuantity(index, (item.selectedQuantity || 1) + 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={item.quantity >= (item.batchAvailable || 1)}
                                >
                                  <span className="text-gray-700">+</span>
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Available in batch (base): {item.batchAvailable || 0}
                              </div>
                              <div className="mt-1">
                                <select
                                  value={item.selectedUnit || item.unit || "unit"}
                                  onChange={(e) => handleSelectedUnitChange(index, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  title="Selected unit"
                                >
                                  <option value={item.unit || "unit"}>{item.unit || "unit"}</option>
                                  {(item.alternativeUnits || []).map((u, ui) => (
                                    <option key={`${item.itemId}-altunit-${ui}`} value={u.unitname}>
                                      {u.unitname}
                                    </option>
                                  ))}
                                </select>
                                {item.selectedUnit !== item.unit && (
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    Actual qty: {Number(item.quantity || 0).toFixed(4)} {item.unit}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">${item.totalPrice.toFixed(2)}</div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleRemoveFromCart(index)}
                                className="bg-red-100 text-red-600 hover:text-red-800 font-medium text-sm p-2 rounded-md"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cart Footer with Totals */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-white">
                  <div className="space-y-4 max-w-md ml-auto">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Discount:</span>
                      <div className="flex items-center space-x-3">
                        <select
                          value={discountType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setDiscountType(nextType);
                            if (nextType === "percent") {
                              setDiscount((prev) => Math.min(100, Math.max(0, parseFloat(prev) || 0)));
                            }
                          }}
                          className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        >
                          <option value="flat">Flat</option>
                          <option value="percent">Percent</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          max={discountType === "percent" ? 100 : undefined}
                          step="0.01"
                          value={discount}
                          onChange={(e) => {
                            const value = Math.max(0, parseFloat(e.target.value) || 0);
                            setDiscount(discountType === "percent" ? Math.min(100, value) : value);
                          }}
                          className="w-32 border border-gray-300 p-2 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        <span className="font-medium text-red-600">-${discountAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Paid Amount:</span>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paidAmount}
                          onChange={(e) => {
                            setPaidAmountTouched(true);
                            setPaidAmount(parseFloat(e.target.value) || 0);
                          }}
                          className="w-32 border border-gray-300 p-2 rounded-lg text-right focus:ring-1 outline-none focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm ">
                      <span>Change:</span>
                      <span className="font-medium">${ ((parseFloat(paidAmount) || 0) - grandTotal ).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Due:</span>
                      <span className="font-medium">${Math.max(0, grandTotal - (parseFloat(paidAmount) || 0)).toFixed(2)}</span>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={handleSubmit}
                        disabled={cartItems.length === 0 || !shopId || loading}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processing Sale...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <span className="mr-2"><CreditCard size={27} /></span>
                            Complete Sale (${grandTotal.toFixed(2)})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-[120] bg-black">
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-black/55">
            <div className="text-white">
              <p className="font-semibold">Scan Barcode / QR</p>
              <p className="text-xs text-gray-200">Align code within the frame</p>
            </div>
            <button
              onClick={closeScanner}
              className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25"
            >
              <X size={20} />
            </button>
          </div>

          <div className="w-full h-full pt-16 flex items-center justify-center px-4">
            <div className="w-[min(88vw,560px)] h-[min(88vw,560px)] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black">
              <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
            </div>
          </div>

          {scannerError && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm">
              {scannerError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



