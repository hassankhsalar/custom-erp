import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  BookOpen, 
  Filter, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
  AlertCircle,
  Banknote,
  CreditCard,
  Building,
  Wallet
} from "lucide-react";

export default function GeneralLedger() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({ 
    startDate: "", 
    endDate: "", 
    accountId: "" 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const fetchAccounts = async () => {
    try {
      const res = await fetch(API_ROUTES.ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.accountId) params.append("accountId", filters.accountId);
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      
      const res = await fetch(`${API_ROUTES.GENERAL_LEDGER}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to fetch ledger");
      
      const data = await res.json();
      setTransactions(data.transactions || []);
      
      // Use pagination data from backend response
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalTransactions(data.pagination.totalCount);
      } else {
        // Fallback for old backend
        setTotalPages(Math.ceil((data.transactions?.length || 0) / itemsPerPage));
        setTotalTransactions(data.transactions?.length || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchLedger();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [currentPage, itemsPerPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying new filters
    fetchLedger();
  };

  const resetFilters = () => {
    setFilters({ startDate: "", endDate: "", accountId: "" });
    setCurrentPage(1);
    // Don't fetch here, wait for useEffect
  };

  const totals = transactions.reduce((acc, t) => {
    const amt = parseFloat(t.amount) || 0;
    if (t.added_to_account === true) acc.credit += amt;
    if (t.added_to_account === false) acc.debit += amt;
    return acc;
  }, { debit: 0, credit: 0, net: 0 });

  totals.net = totals.credit - totals.debit;

  const getPaymentMethodIcon = (method) => {
    if (!method) return <Wallet size={14} className="text-gray-400" />;
    
    const methodLower = method.toLowerCase();
    if (methodLower.includes('cash')) return <Banknote size={14} className="text-green-600" />;
    if (methodLower.includes('card')) return <CreditCard size={14} className="text-blue-600" />;
    if (methodLower.includes('bank')) return <Building size={14} className="text-purple-600" />;
    return <Wallet size={14} className="text-gray-600" />;
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";
    return method.replaceAll("_", " ").replaceAll("-", " ").split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

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

  // Call fetchLedger when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.startDate || filters.endDate || filters.accountId) {
        setCurrentPage(1);
        fetchLedger();
      }
    }, 300); // Debounce filter changes
    
    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <BookOpen className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  General Ledger
                </h1>
                <p className="text-gray-600 mt-2">Comprehensive financial transactions overview</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <RefreshCw size={16} />
                Reset
              </button>
              <button
                onClick={() => {/* Export functionality */}}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-green-50/60 to-emerald-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">${totals.credit.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">${totals.debit.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                  ${Math.abs(totals.net).toFixed(2)} {totals.net >= 0 ? '' : '('}
                  {totals.net >= 0 ? 'Positive' : 'Negative'}
                  {totals.net >= 0 ? '' : ')'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg">
              <Filter size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Filter Transactions</h2>
              <p className="text-gray-600 text-sm">Refine your ledger view by date range and accounts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-600" />
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-600" />
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Account Selection
              </label>
              <select
                name="accountId"
                value={filters.accountId}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
              >
                <option value="">All Accounts</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 flex items-center gap-2">
            <AlertCircle size={14} />
            Showing transactions matching your criteria
          </div>
        </div>

        {/* Transactions Table Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50/50 border border-red-200/50 rounded-xl">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={16} />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Transaction Ledger</h3>
                  <p className="text-gray-600 text-sm">Detailed view of all financial entries</p>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{totalTransactions}</span> transactions found
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">Reference</th>
                      <th className="p-4 text-left font-medium text-gray-700">Purpose</th>
                      <th className="p-4 text-left font-medium text-gray-700">Account</th>
                      <th className="p-4 text-left font-medium text-gray-700">Method</th>
                      <th className="p-4 text-left font-medium text-gray-700">Credit</th>
                      <th className="p-4 text-left font-medium text-gray-700">Debit</th>
                      {filters.accountId && <th className="p-4 text-left font-medium text-gray-700">Balance</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, index) => (
                      <tr 
                        key={t.id} 
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-800">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-gray-800">{t.reference}</span>
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <span className="text-gray-800">{t.purpose || "-"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="font-medium text-gray-800">{t.account?.name || "-"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(t.payment_method)}
                              <span className="font-medium text-gray-800">
                                {formatPaymentMethod(t.payment_method)}
                              </span>
                            </div>
                            {t.bankAccount?.name && (
                              <div className="text-xs text-gray-500">
                                {t.bankAccount.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {t.added_to_account === true ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <TrendingUp size={14} />
                              <span className="font-bold">${parseFloat(t.amount || 0).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        <td className="p-4">
                          {(!t.added_to_account) || (t.added_to_account && t.added_to_account !== true) ? (
                            <div className="flex items-center gap-2 text-red-600">
                              <TrendingDown size={14} />
                              <span className="font-bold">${parseFloat(t.amount || 0).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">$0.00</span>
                          )}
                        </td>
                        {filters.accountId && (
                          <td className="p-4">
                            {t.current_account_balance !== null && t.current_account_balance !== undefined ? (
                              <div className={`font-bold ${parseFloat(t.current_account_balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                ${parseFloat(t.current_account_balance).toFixed(2)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    
                    {transactions.length === 0 && !loading && (
                      <tr>
                        <td colSpan={filters.accountId ? 8 : 7} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-white/50 rounded-xl">
                              <BookOpen size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700">No Transactions Found</h3>
                            <p className="text-gray-600 max-w-md">
                              No transactions match your current filters. Try adjusting your date range or account selection.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {transactions.length > 0 && totalPages > 1 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-6">
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
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * itemsPerPage, totalTransactions)}
                        </span>{" "}
                        of <span className="font-semibold">{totalTransactions}</span> transactions
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}