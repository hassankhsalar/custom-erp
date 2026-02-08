import { ArrowUpDown, ClipboardList, TrendingUp, DollarSign, Calendar, Store, User, Tag, CreditCard, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ROUTES } from '../../config';

export default function AllSales() {
  const [sales, setSales] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoading(true);
    fetch(`${API_ROUTES.SHOP_SALES}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setSales(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const formatSalesData = (sales) => {
    return sales.map(sale => ({
      id: sale.id,
      reference: sale.reference,
      shop: sale.shop?.name || "-",
      customer: sale.customer || "-",
      total: `$${sale.totalAmount?.toFixed(2) || "0.00"}`,
      discount: `$${sale.discount?.toFixed(2) || "0.00"}`,
      "grand total": `$${sale.grandTotal?.toFixed(2) || "0.00"}`,
      payment: sale.paymentType,
      date: new Date(sale.createdAt).toLocaleDateString(),
      rawDate: sale.createdAt
    }));
  };

  // Calculate pagination
  const sortedData = sortConfig.key ? 
    [...formatSalesData(sales)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      if (sortConfig.key === 'total' || sortConfig.key === 'discount' || sortConfig.key === 'grand total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', '')) || 0;
        const valueB = parseFloat(b[sortConfig.key].replace('$', '')) || 0;
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
    formatSalesData(sales);

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const tableHeaders = sales.length > 0 ? 
    Object.keys(formatSalesData(sales)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['reference', 'shop', 'customer', 'total', 'discount', 'grand total', 'payment', 'date'];

  // Calculate summary statistics
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
  const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0;

  const getColumnIcon = (key) => {
    switch(key) {
      case 'reference': return <Tag size={14} className="mr-2" />;
      case 'shop': return <Store size={14} className="mr-2" />;
      case 'customer': return <User size={14} className="mr-2" />;
      case 'total': return <DollarSign size={14} className="mr-2" />;
      case 'discount': return <Tag size={14} className="mr-2" />;
      case 'grand total': return <TrendingUp size={14} className="mr-2" />;
      case 'payment': return <CreditCard size={14} className="mr-2" />;
      case 'date': return <Calendar size={14} className="mr-2" />;
      default: return <Tag size={14} className="mr-2" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
              <ClipboardList className="text-emerald-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                All Sales
              </h1>
              <p className="text-gray-600 mt-1">Overview of all sales transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Filter size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">
              {sales.length} {sales.length === 1 ? 'Sale' : 'Sales'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Discounts</p>
              <h3 className="text-2xl font-bold text-gray-900">${totalDiscount.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10">
              <Tag className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average Sale</p>
              <h3 className="text-2xl font-bold text-gray-900">${averageSale.toFixed(2)}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-card overflow-hidden border border-white/20 backdrop-blur-xl">
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
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-t border-white/10 hover:bg-white/10 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-white/5' : ''
                  }`}
                >
                  {tableHeaders.map((key) => (
                    <td key={key} className="p-4">
                      <div className={`flex items-center ${
                        key === 'total' || key === 'grand total' ? 'font-semibold text-gray-900' :
                        key === 'discount' ? 'text-amber-600' :
                        key === 'payment' ? 'font-medium text-blue-600' :
                        'text-gray-700'
                      }`}>
                        {key === 'payment' && (
                          <CreditCard size={12} className="mr-2 text-gray-400" />
                        )}
                        {key === 'date' && (
                          <Calendar size={12} className="mr-2 text-gray-400" />
                        )}
                        {item[key]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {!sales?.length && (
            <div className="text-center py-12">
              <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <ClipboardList className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 text-lg font-medium">No sales data found</p>
              <p className="text-gray-400 text-sm mt-1">Start making sales to see them here</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {sales.length > 0 && (
        <div className="glass-card p-4 mt-4 border border-white/20 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-semibold">
                  {Math.min(indexOfLastItem, sortedData.length)}
                </span>{" "}
                of <span className="font-semibold">{sortedData.length}</span> sales
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-2">
              {/* First page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="First page"
              >
                <ChevronsLeft size={16} className="text-gray-600" />
              </button>

              {/* Previous page */}
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Previous page"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                          : "hover:bg-white/50 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="mx-1 text-gray-400">...</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                          : "hover:bg-white/50 text-gray-700"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next page */}
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Next page"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>

              {/* Last page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                title="Last page"
              >
                <ChevronsRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      {sales.length > 0 && (
        <div className="glass-card p-4 mt-4 border border-white/20 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                <span className="text-sm font-medium text-gray-700">
                  Showing <span className="text-emerald-600 font-bold">{currentItems.length}</span> of{" "}
                  <span className="text-emerald-600 font-bold">{sortedData.length}</span> sales
                </span>
              </div>
              <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                <span className="text-sm font-medium text-gray-700">
                  Sorted by: <span className="text-blue-600 font-medium">
                    {sortConfig.key ? sortConfig.key.replace(/([A-Z])/g, ' $1') : 'Date'} 
                    <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Page <span className="font-semibold">{currentPage}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}