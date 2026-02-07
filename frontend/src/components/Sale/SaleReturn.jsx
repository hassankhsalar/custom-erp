import { Mailbox, ShoppingCart, Store, Undo2, ArrowUpDown, Search, X, DollarSign, Package, RefreshCw, AlertCircle, CheckCircle, TrendingDown, Filter, ArrowLeftRight, User, Calendar, CreditCard, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from '../../config';

export default function SaleReturn() {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${API_ROUTES.SHOPS}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching shops:", err));
  }, [navigate]);

  useEffect(() => {
    if (!selectedShop) {
      setSales([]);
      setFilteredSales([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    fetch(`${API_ROUTES.SHOP_SALES}/return-eligible?shopId=${selectedShop}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setSales(data);
        setFilteredSales(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sales:", err);
        setError("Failed to load sales: " + err.message);
        setLoading(false);
      });
  }, [selectedShop]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSales(sales);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = sales.filter(sale => 
      sale.reference?.toLowerCase().includes(query) ||
      sale.shop?.name?.toLowerCase().includes(query) ||
      sale.customer?.toLowerCase().includes(query) ||
      sale.paymentType?.toLowerCase().includes(query) ||
      sale.grandTotal?.toString().includes(query) ||
      new Date(sale.createdAt).toLocaleDateString().toLowerCase().includes(query)
    );
    setFilteredSales(filtered);
  }, [searchQuery, sales]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatSalesData = (sales) => {
    return sales.map(sale => ({
      id: sale.id,
      reference: sale.reference,
      shop: sale.shop?.name || "-",
      customer: sale.customer || "-",
      total: `$${sale.grandTotal?.toFixed(2)}`,
      date: new Date(sale.createdAt).toLocaleDateString(),
      items: sale.saleItems?.length || 0,
      status: "Available for Return",
      rawDate: sale.createdAt,
      originalSale: sale
    }));
  };

  const sortedData = sortConfig.key ? 
    [...formatSalesData(filteredSales)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      if (sortConfig.key === 'total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', ''));
        const valueB = parseFloat(b[sortConfig.key].replace('$', ''));
        if (sortConfig.direction === 'ascending') {
          return valueA - valueB;
        }
        return valueB - valueA;
      }

      if (sortConfig.key === 'items') {
        if (sortConfig.direction === 'ascending') {
          return a.items - b.items;
        }
        return b.items - a.items;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    }) : 
    formatSalesData(filteredSales);

  const tableHeaders = sales.length > 0 ? 
    ['reference', 'customer', 'total', 'date', 'items', 'status'] : 
    ['reference', 'customer', 'total', 'date', 'items', 'status'];

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleSelectSale = (sale) => {
    setSelectedSale(sale.originalSale);
    setError("");
    
    const returnItems = sale.originalSale.saleItems.map(item => ({
      saleItemId: item.id,
      productId: item.productId || item.materialId,
      name: item.product?.name || item.material?.name || `Item ${item.id}`,
      type: item.productId ? "product" : "material",
      barcode: item.product?.barcode || item.material?.barcode || "",
      unit: item.material?.unit || null,
      originalQuantity: item.quantity,
      originalUnitPrice: item.unitPrice,
      returnedQuantity: 0,
      unitPrice: item.unitPrice,
      totalPrice: 0,
      maxReturnable: item.quantity
    }));
    
    setItems(returnItems);
  };

  const handleChangeQty = (idx, qty) => {
    const updated = [...items];
    const inputQty = parseFloat(qty) || 0;
    
    const maxQty = updated[idx].maxReturnable;
    const validQty = Math.min(Math.max(0, inputQty), maxQty);
    
    updated[idx].returnedQuantity = validQty;
    updated[idx].totalPrice = validQty * updated[idx].unitPrice;
    
    setItems(updated);
  };

  const handleChangePrice = (idx, price) => {
    const updated = [...items];
    const newPrice = parseFloat(price) || 0;
    
    updated[idx].unitPrice = Math.max(0, newPrice);
    updated[idx].totalPrice = updated[idx].returnedQuantity * updated[idx].unitPrice;
    
    setItems(updated);
  };

  const handleReturnAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: item.maxReturnable,
      totalPrice: item.maxReturnable * item.unitPrice
    }));
    setItems(updated);
  };

  const handleClearAll = () => {
    const updated = items.map(item => ({
      ...item,
      returnedQuantity: 0,
      totalPrice: 0
    }));
    setItems(updated);
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.filter(item => item.returnedQuantity > 0).length;
    
    return { totalItems, totalAmount, itemCount };
  };

  const handleSubmit = async () => {
    if (!selectedShop) {
      setError("Please select a shop first.");
      return;
    }

    if (!selectedSale) {
      setError("Please select a sale first.");
      return;
    }

    const returnItems = items.filter(item => item.returnedQuantity > 0);
    
    if (returnItems.length === 0) {
      setError("Please specify quantities for items to return.");
      return;
    }

    const payload = {
      saleId: selectedSale.id,
      items: returnItems.map(item => ({
        itemId: item.productId,
        type: item.type,
        quantity: item.returnedQuantity,
        unitPrice: item.unitPrice
      }))
    };

    setIsSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_ROUTES.SHOP_SALES}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process return");
      }

      const totalAmount = calculateTotals().totalAmount;
      alert(`✅ ${data.message || "Return processed successfully!"}\nReference: ${data.return?.reference || "N/A"}\nAmount: $${(data.return?.totalAmount || totalAmount).toFixed(2)}\nShop: ${data.return?.shop?.name || selectedSale.shop?.name}`);
      
      const updatedSales = sales.filter(sale => sale.id !== selectedSale.id);
      setSales(updatedSales);
      setFilteredSales(updatedSales);
      
      setSelectedSale(null);
      setItems([]);
      setSearchQuery("");
      
    } catch (err) {
      console.error("Return error:", err);
      setError("❌ " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { totalItems, totalAmount, itemCount } = calculateTotals();

  const getColumnIcon = (key) => {
    switch(key) {
      case 'reference': return <Hash size={14} className="mr-2" />;
      case 'customer': return <User size={14} className="mr-2" />;
      case 'total': return <DollarSign size={14} className="mr-2" />;
      case 'date': return <Calendar size={14} className="mr-2" />;
      case 'items': return <Package size={14} className="mr-2" />;
      case 'status': return <CheckCircle size={14} className="mr-2" />;
      default: return <Hash size={14} className="mr-2" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <Undo2 className="text-red-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Shop Sale Return
              </h1>
              <p className="text-gray-600 mt-1">Process returns for previous shop sales</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <RefreshCw size={16} className="text-red-600" />
            <span className="text-sm font-medium text-gray-700">
              {sales.length} {sales.length === 1 ? 'Sale Available' : 'Sales Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Shop Selection Card */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
          <Store size={20} className="mr-2 text-blue-600" />
          Select Shop
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <select
            className="glass-input w-full md:w-80 border border-white/30 bg-white/50 backdrop-blur-sm p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
            value={selectedShop}
            onChange={(e) => {
              setSelectedShop(e.target.value);
              setSelectedSale(null);
              setItems([]);
              setSearchQuery("");
            }}
          >
            <option value="">Select a Shop</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          
          {selectedShop && (
            <div className="glass-tag px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-200/30">
              <span className="text-sm font-medium text-blue-700">
                Ready to process returns
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`glass-card mb-6 p-4 border ${
          error.includes("❌") 
            ? "border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50" 
            : "border-yellow-200/50 bg-gradient-to-r from-yellow-50/50 to-yellow-100/50"
        } backdrop-blur-sm`}>
          <div className="flex items-center">
            <AlertCircle size={20} className={`mr-3 ${error.includes("❌") ? "text-red-600" : "text-yellow-600"}`} />
            <div>
              <p className={`font-medium ${error.includes("❌") ? "text-red-700" : "text-yellow-700"}`}>
                {error.replace("❌ ", "")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sales Section - Only show when shop is selected */}
      {selectedShop && (
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center text-gray-800 mb-2">
                <ShoppingCart size={20} className="mr-2 text-green-600" />
                Available Sales for Return
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Showing {filteredSales.length} non-returned sale(s)
                </span>
                {loading && (
                  <div className="flex items-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by reference, customer, amount..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="glass-input w-full pl-10 pr-10 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center glass-icon-button p-1 rounded"
                >
                  <X size={18} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg mb-4 bg-white/50 backdrop-blur-sm border border-white/30">
              <Search size={14} className="mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">
                Found {filteredSales.length} sale(s) matching "
                <span className="font-semibold">{searchQuery}</span>"
              </span>
              <button
                onClick={clearSearch}
                className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {/* Sales Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                  {tableHeaders.map((key) => (
                    <th
                      key={key}
                      className="p-4 text-left font-medium text-gray-700 cursor-pointer border-b border-white/20"
                    >
                      <div className="flex items-center gap-2">
                        {getColumnIcon(key)}
                        <span className="font-semibold">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </span>
                        <ArrowUpDown
                          onClick={() => handleSort(key)}
                          className="glass-icon-button p-1.5 rounded-md hover:bg-gray-200/50 transition-colors cursor-pointer"
                          size={16}
                        />
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight size={14} className="mr-2" />
                      Actions
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-t border-white/10 hover:bg-white/10 transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-white/5' : ''
                    } ${selectedSale?.id === item.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    {tableHeaders.map((key) => (
                      <td key={key} className="p-4">
                        <div className={`flex items-center ${
                          key === 'total' ? 'font-semibold text-gray-900' :
                          key === 'status' ? 'text-green-600' :
                          key === 'items' ? 'text-blue-600' :
                          'text-gray-700'
                        }`}>
                          {key === 'status' ? (
                            <div className="flex items-center">
                              <CheckCircle size={14} className="mr-2 text-green-500" />
                              <span className="font-medium">Available for Return</span>
                            </div>
                          ) : key === 'items' ? (
                            <div className="glass-tag px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200/50">
                              {item.items} items
                            </div>
                          ) : (
                            <>
                              {item[key]}
                            </>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="p-4">
                      <button
                        onClick={() => handleSelectSale(item)}
                        className={`glass-button px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                          selectedSale?.id === item.id
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 text-blue-700'
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-lg'
                        }`}
                      >
                        {selectedSale?.id === item.id ? '✓ Selected' : 'Select Sale'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty States */}
            {sales.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                  <Mailbox className="text-gray-400" size={32} />
                </div>
                <p className="text-gray-500 text-lg font-medium">No sales available for return</p>
                <p className="text-gray-400 text-sm mt-1">
                  All sales for this shop have been returned or no sales exist yet
                </p>
              </div>
            )}
            
            {sales.length > 0 && filteredSales.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                  <Search className="text-gray-400" size={32} />
                </div>
                <p className="text-gray-500 text-lg font-medium">No sales found matching "{searchQuery}"</p>
                <button
                  onClick={clearSearch}
                  className="mt-3 glass-button px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Clear search and show all sales
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Sale Details */}
      {selectedSale && (
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/20">
            <div className="flex items-center">
              <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Selected Sale: {selectedSale.reference}
                </h3>
                <p className="text-gray-600 text-sm mt-1">Review sale details and select items to return</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSale(null)}
              className="glass-icon-button p-2 rounded-lg hover:bg-gray-500/10 text-gray-600 hover:text-gray-700 transition-colors"
              title="Change Sale"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Shop</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <Store size={16} className="mr-2 text-blue-600" />
                {selectedSale.shop?.name}
              </p>
            </div>
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Customer</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <User size={16} className="mr-2 text-green-600" />
                {selectedSale.customer || "Walk-in Customer"}
              </p>
            </div>
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Original Total</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <DollarSign size={16} className="mr-2 text-emerald-600" />
                ${selectedSale.grandTotal?.toFixed(2)}
              </p>
            </div>
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <Calendar size={16} className="mr-2 text-purple-600" />
                {new Date(selectedSale.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Payment Type</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <CreditCard size={16} className="mr-2 text-amber-600" />
                {selectedSale.paymentType}
              </p>
            </div>
            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30">
              <p className="text-sm text-gray-600 mb-1">Items</p>
              <p className="font-semibold text-gray-800 flex items-center">
                <Package size={16} className="mr-2 text-red-600" />
                {selectedSale.saleItems?.length || 0} items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Return Items Section */}
      {selectedSale && items.length > 0 && (
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold flex items-center text-gray-800 mb-2">
                <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-red-500/10 to-orange-500/10">
                  <RefreshCw className="text-red-600" size={24} />
                </div>
                Return Items
              </h3>
              <p className="text-gray-600 text-sm">Specify quantities and prices for items to return</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={handleReturnAll}
                className="glass-button px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center"
              >
                <CheckCircle size={18} className="mr-2" />
                Return All
              </button>
              <button
                onClick={handleClearAll}
                className="glass-button px-4 py-2.5 border border-gray-300/50 text-gray-700 rounded-lg hover:bg-gray-50/50 transition-all duration-300 flex items-center"
              >
                <X size={18} className="mr-2" />
                Clear All
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm border-b border-white/20">
                  <th className="text-left p-4 font-medium text-gray-700">Product</th>
                  <th className="text-left p-4 font-medium text-gray-700">Type</th>
                  <th className="text-left p-4 font-medium text-gray-700">Sold Qty</th>
                  <th className="text-left p-4 font-medium text-gray-700">Return Qty</th>
                  <th className="text-left p-4 font-medium text-gray-700">Unit Price</th>
                  <th className="text-left p-4 font-medium text-gray-700">Return Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="glass-tag px-2 py-0.5 rounded bg-gray-100/50">ID: {item.productId}</span>
                          {item.barcode && (
                            <span className="glass-tag px-2 py-0.5 rounded bg-gray-100/50">Barcode: {item.barcode}</span>
                          )}
                          {item.unit && (
                            <span className="glass-tag px-2 py-0.5 rounded bg-gray-100/50">Unit: {item.unit}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`glass-tag inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                        item.type === 'product' 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200/50' 
                          : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200/50'
                      }`}>
                        {item.type === 'product' ? '📦 Product' : '🔧 Material'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="glass-tag px-3 py-1.5 rounded bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200/50">
                        <span className="font-medium">{item.originalQuantity}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={item.maxReturnable}
                          step="1"
                          className="glass-input w-24 border border-white/30 bg-white/50 backdrop-blur-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          value={item.returnedQuantity}
                          onChange={(e) => handleChangeQty(idx, e.target.value)}
                        />
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <span className="mr-2">Max: {item.maxReturnable}</span>
                          {item.returnedQuantity === item.maxReturnable && (
                            <CheckCircle size={12} className="text-green-500" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <span className="mr-2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="glass-input w-24 border border-white/30 bg-white/50 backdrop-blur-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          value={item.unitPrice}
                          onChange={(e) => handleChangePrice(idx, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-green-600 flex items-center">
                        <DollarSign size={16} className="mr-1" />
                        {item.totalPrice.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="glass-card-inner mt-6 p-6 rounded-xl border border-white/30 bg-gradient-to-br from-blue-50/50 to-blue-100/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="glass-icon p-4 rounded-full inline-flex mb-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                  <Package className="text-blue-600" size={24} />
                </div>
                <p className="text-sm text-gray-600">Items to Return</p>
                <p className="text-3xl font-bold text-blue-700">{itemCount}</p>
                <p className="text-sm text-gray-600">Total Quantity: {totalItems}</p>
              </div>
              <div className="text-center">
                <div className="glass-icon p-4 rounded-full inline-flex mb-3 bg-gradient-to-r from-green-500/10 to-green-600/10">
                  <TrendingDown className="text-green-600" size={24} />
                </div>
                <p className="text-sm text-gray-600">Return Amount</p>
                <p className="text-3xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex flex-col justify-center items-center">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || itemCount === 0}
                  className={`glass-button w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center ${
                    isSubmitting || itemCount === 0
                      ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-red-400 hover:shadow-xl hover:shadow-red-500/25"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Undo2 size={20} className="mr-2" />
                      Process Return (${totalAmount.toFixed(2)})
                    </>
                  )}
                </button>
                {itemCount === 0 && !isSubmitting && (
                  <p className="text-sm text-gray-500 mt-2 text-center">Add items to return first</p>
                )}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {itemCount > 0 && (
            <div className="glass-card-inner mt-4 p-4 rounded-lg border border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-amber-100/50 backdrop-blur-sm">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-amber-600 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">
                    ⚠️ Return Confirmation Required
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This action will return {totalItems} item(s) and refund ${totalAmount.toFixed(2)}. 
                    Stock will be automatically restored to {selectedSale.shop?.name}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Shop not selected */}
      {!selectedShop && (
        <div className="glass-card text-center py-16 border border-white/20 backdrop-blur-xl">
          <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <Store className="text-blue-600" size={48} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Shop</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Choose a shop from the dropdown above to view available sales and process returns
          </p>
          <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-white/30">
            <AlertCircle size={16} className="mr-2 text-gray-500" />
            <span className="text-sm text-gray-700">Shop selection required to proceed</span>
          </div>
        </div>
      )}

      {/* Empty State - Sale not selected */}
      {selectedShop && !selectedSale && sales.length > 0 && !loading && (
        <div className="glass-card text-center py-16 border border-white/20 backdrop-blur-xl">
          <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <ShoppingCart className="text-green-600" size={48} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Sale</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Choose a sale from the table above to begin processing a return
          </p>
          <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/30">
            <CheckCircle size={16} className="mr-2 text-green-600" />
            <span className="text-sm text-green-700">{sales.length} sales available for return</span>
          </div>
        </div>
      )}
    </div>
  );
}