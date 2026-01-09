import { useEffect, useState } from "react";
import { ArrowUpDown, Package, Truck, Building2, Calendar, FileText, Store, ShoppingBag, Factory, Layers } from "lucide-react";

export default function AllPurchase() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [activeView, setActiveView] = useState("detailed");

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/purchases");
        if (!res.ok) throw new Error("Failed to fetch purchases");
        const data = await res.json();
        setPurchases(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, []);

  console.log(purchases);

  // get destination display name
  const getDestinationDisplay = (purchase) => {
    if (purchase.destination) {
      const dest = purchase.destination;
      return `${dest.type.charAt(0).toUpperCase() + dest.type.slice(1)}: ${dest.name}`;
    }
    
    if (purchase.store) {
      return `Store: ${purchase.store.name}`;
    }
    
    return "-";
  };

  //get destination for the detailed table
  const getDestinationForTable = (purchase) => {
    if (purchase.destination) {
      const dest = purchase.destination;
      return `${dest.type}: ${dest.name}`;
    }
    
    if (purchase.store) {
      return `store: ${purchase.store.name}`;
    }
    
    return "-";
  };

  // handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Format purchase items data for table display
  const formatPurchaseItemsData = (purchases) => {
    return purchases.flatMap((purchase, purchaseIndex) =>
      purchase.purchaseItems?.map((item, itemIndex) => ({
        id: `${purchase.id}-${item.id}`,
        "#": purchaseIndex * 10 + itemIndex + 1,
        "purchase ref": purchase.reference,
        material: item.material?.name || "-",
        supplier: purchase.supplier?.name || "-",
        quantity: `${item.quantity} ${item.material?.unit || ""}`,
        "unit price": `$${item.unitPrice?.toFixed(2) || "0.00"}`,
        "total price": `$${item.totalPrice?.toFixed(2) || "0.00"}`,
        date: new Date(purchase.createdAt).toLocaleDateString(),
        destination: getDestinationForTable(purchase),
        rawDate: purchase.createdAt,
        rawUnitPrice: item.unitPrice,
        rawTotalPrice: item.totalPrice
      })) || []
    );
  };

  const sortedData = sortConfig.key ? 
    [...formatPurchaseItemsData(purchases)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      // Special handling for currency values
      if (sortConfig.key === 'unit price' || sortConfig.key === 'total price') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', ''));
        const valueB = parseFloat(b[sortConfig.key].replace('$', ''));
        if (sortConfig.direction === 'ascending') {
          return valueA - valueB;
        }
        return valueB - valueA;
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
    formatPurchaseItemsData(purchases);

  const tableHeaders = purchases.length > 0 && formatPurchaseItemsData(purchases).length > 0 ? 
    Object.keys(formatPurchaseItemsData(purchases)[0]).filter(key => 
      key !== 'id' && key !== 'rawDate' && key !== 'rawUnitPrice' && key !== 'rawTotalPrice'
    ) : 
    ['#', 'purchase ref', 'material', 'supplier', 'quantity', 'unit price', 'total price', 'date', 'destination'];

  if (loading)
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Package className="text-white" size={32} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Purchase Orders
            </h1>
          </div>
        </div>
        <div className="text-center py-12 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Package className="text-white" size={32} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Purchase Orders
            </h1>
          </div>
        </div>
        <div className="backdrop-blur-lg bg-red-50/50 border border-red-200/50 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <p className="text-red-700 font-medium text-lg">❌ {error}</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl xl:max-w-full p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Package className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Purchase Orders
                </h1>
                <p className="text-gray-600 mt-1">View all purchase orders and their items</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Purchases</p>
                <p className="text-xl font-bold text-blue-600">{purchases.length}</p>
              </div>
              
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
                <p className="text-sm font-medium text-gray-700">Total Items</p>
                <p className="text-xl font-bold text-purple-600">
                  {purchases.reduce((sum, purchase) => sum + (purchase.purchaseItems?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Layers size={24} />
              Purchase Data View
            </h2>
            <div className="flex bg-white/60 rounded-lg p-1">
              <button
                onClick={() => setActiveView("summary")}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${activeView === "summary" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md" : "text-gray-600 hover:bg-white/80"}`}
              >
                Summary View
              </button>
              <button
                onClick={() => setActiveView("detailed")}
                className={`px-4 py-2 rounded-md transition-all duration-300 ${activeView === "detailed" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md" : "text-gray-600 hover:bg-white/80"}`}
              >
                Detailed Items
              </button>
            </div>
          </div>
        </div>

        {/* Summary View */}
        {activeView === "summary" && purchases.length > 0 && (
          <div className="space-y-6 mb-8">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
                {/* Purchase Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {purchase.reference}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-gray-500" />
                            <span className="text-gray-700">Supplier: </span>
                            <span className="font-medium">{purchase.supplier?.name || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck size={16} className="text-gray-500" />
                            <span className="text-gray-700">Destination: </span>
                            <span className="font-medium">{getDestinationDisplay(purchase)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-500" />
                            <span className="text-gray-700">Date: </span>
                            <span className="font-medium">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg">
                    <p className="text-sm opacity-90">Grand Total</p>
                    <p className="text-2xl font-bold">${purchase.grandTotal?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>

                {/* Purchase Items Table */}
                <div className="overflow-hidden rounded-xl border border-white/60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-700">#</th>
                        <th className="p-3 text-left font-medium text-gray-700">Material</th>
                        <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                        <th className="p-3 text-left font-medium text-gray-700">Unit Price</th>
                        <th className="p-3 text-left font-medium text-gray-700">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.purchaseItems?.map((item, index) => (
                        <tr key={item.id} className="border-t border-white/50 hover:bg-white/30">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-medium">{item.material?.name || "-"}</td>
                          <td className="p-3">
                            {item.quantity} {item.material?.unit || ""}
                          </td>
                          <td className="p-3 font-medium text-blue-600">
                            ${item.unitPrice?.toFixed(2) || "0.00"}
                          </td>
                          <td className="p-3 font-bold text-green-600">
                            ${item.totalPrice?.toFixed(2) || "0.00"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/50">
                  <div className="text-gray-600">
                    <span className="font-medium">Total Items:</span> {purchase.purchaseItems?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">
                    Purchase ID: {purchase.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Items Table */}
        {activeView === "detailed" && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-white/50">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Package size={24} />
                All Purchase Items
              </h2>
              <p className="text-gray-600 mt-1">Detailed view of all individual purchase items</p>
            </div>

            <div className="customTable w-full">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    {tableHeaders.map((key) => (
                      <th
                        key={key}
                        className="p-3 text-left font-medium text-gray-700 cursor-pointer"
                      >
                        <div className="flex items-center gap-[5px]">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          <ArrowUpDown
                            onClick={() => handleSort(key)}
                            className="hover:bg-gray-200 p-[5px] rounded-md text-[1.6rem]"
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/50 hover:bg-white/30"
                    >
                      {tableHeaders.map((key) => (
                        <td key={key} className="p-3">
                          {key === 'unit price' || key === 'total price' ? (
                            <span className={`font-medium ${
                              key === 'total price' ? 'text-green-600 font-bold' : 'text-blue-600'
                            }`}>
                              {item[key]}
                            </span>
                          ) : key === 'purchase ref' ? (
                            <span className="font-medium text-blue-600">{item[key]}</span>
                          ) : key === 'destination' ? (
                            <div className="flex items-center gap-2">
                              {item[key].includes('store') ? (
                                <Store size={14} className="text-blue-500" />
                              ) : item[key].includes('shop') ? (
                                <ShoppingBag size={14} className="text-purple-500" />
                              ) : item[key].includes('factory') ? (
                                <Factory size={14} className="text-amber-500" />
                              ) : null}
                              <span>{item[key]}</span>
                            </div>
                          ) : (
                            item[key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedData.length === 0 && (
                <div className="p-8 text-center">
                  <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                    <Package size={48} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600">No purchase items found!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {purchases.length === 0 && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-12 text-center">
            <div className="p-6 bg-white/50 rounded-full inline-block mb-6">
              <Package size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchases Found</h3>
            <p className="text-gray-600">There are no purchase orders in the system yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}