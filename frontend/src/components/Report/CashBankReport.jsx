import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  DollarSign, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Building,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

const CashBankReport = () => {
  const [tab, setTab] = useState("cash");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [cash, setCash] = useState({ 
    saleCount: 0, 
    saleAmount: 0, 
    cashRegisters: [] 
  });
  const [bank, setBank] = useState({ 
    saleCount: 0, 
    saleAmount: 0, 
    purchaseCount: 0, 
    purchaseAmount: 0, 
    rows: [], 
    pagination: { page: 1, limit: 10, totalPages: 1 } 
  });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchReport = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      
      const res = await fetch(`${API_ROUTES.REPORT_CASH_BANK_DETAILS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      setCash(data.cash || { saleCount: 0, saleAmount: 0, cashRegisters: [] });
      setBank(data.bank || { 
        saleCount: 0, 
        saleAmount: 0, 
        purchaseCount: 0, 
        purchaseAmount: 0, 
        rows: [], 
        pagination: { page, limit, totalPages: 1 } 
      });
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(bank.pagination.page, bank.pagination.limit);
  }, []);

  const applyFilter = () => {
    fetchReport(1, bank.pagination.limit);
  };

  const resetFilter = () => {
    setDateRange({ startDate: "", endDate: "" });
    fetchReport(1, bank.pagination.limit);
  };

  const getCashRegisterStatus = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return { 
          text: 'active', 
          color: 'bg-gradient-to-r from-emerald-500 to-green-500',
          icon: <CheckCircle size={14} />
        };
      case 'closed':
        return { 
          text: 'Closed', 
          color: 'bg-gradient-to-r from-red-500 to-rose-500',
          icon: <AlertCircle size={14} />
        };
      default:
        return { 
          text: 'Unknown', 
          color: 'bg-gradient-to-r from-gray-500 to-gray-600',
          icon: <AlertCircle size={14} />
        };
    }
  };

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl shadow-lg">
                <CreditCard className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                  Cash & Bank Report
                </h1>
                <p className="text-gray-600 mt-2">Monitor your cash flow and bank transactions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={resetFilter}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow transition-all duration-300"
              >
                <RefreshCw size={16} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex gap-2 mb-6">
            <button
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                tab === "cash"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg"
                  : "bg-white/60 text-gray-700 hover:bg-white/80"
              }`}
              onClick={() => setTab("cash")}
            >
              <Wallet size={20} />
              Cash Report
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                tab === "bank"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg"
                  : "bg-white/60 text-gray-700 hover:bg-white/80"
              }`}
              onClick={() => setTab("bank")}
            >
              <Building size={20} />
              Bank Report
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                  <Filter size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Filter by Date Range</h3>
                  <p className="text-sm text-gray-600">Select start and end dates</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-4 py-2.5 border border-gray-300/60 bg-white/80 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <span className="text-gray-400">to</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-4 py-2.5 border border-gray-300/60 bg-white/80 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <button
                  onClick={applyFilter}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading report data...</p>
              </div>
            </div>
          ) : (
            <>
              {tab === "cash" && (
                <>
                  {/* Cash Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Sales Count</p>
                          <p className="text-2xl font-bold text-blue-600">{cash.saleCount || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <TrendingUp size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Sale Amount</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            ${Number(cash.saleAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-xl">
                          <DollarSign size={24} className="text-emerald-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cash Registers Table */}
                  <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/60 bg-gradient-to-r from-gray-50/80 to-gray-100/60">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Wallet size={20} className="text-emerald-600" />
                        Cash Registers ({cash.cashRegisters.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-4 text-left font-medium text-gray-700">Cash Register</th>
                            <th className="p-4 text-left font-medium text-gray-700">Status</th>
                            <th className="p-4 text-left font-medium text-gray-700">Current Cash</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cash.cashRegisters.map((register, index) => {
                            const status = getCashRegisterStatus(register.status);
                            return (
                              <tr 
                                key={register.id} 
                                className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                                  index % 2 === 0 ? 'bg-white/10' : ''
                                }`}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-lg">
                                      <Wallet size={16} className="text-emerald-600" />
                                    </div>
                                    <span className="font-medium text-gray-800">{register.name}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${status.color}`}>
                                    {status.icon}
                                    {status.text}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={14} className="text-emerald-500" />
                                    <span className="font-bold text-lg text-gray-900">
                                      ${Number(register.cash_in_hand || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {cash.cashRegisters.length === 0 && (
                            <tr>
                              <td colSpan="3" className="p-8 text-center">
                                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                                  <Wallet size={48} className="text-gray-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Cash Registers Found</h3>
                                <p className="text-gray-600">No cash register data available for the selected period</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {tab === "bank" && (
                <>
                  {/* Bank Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Sale Count</p>
                          <p className="text-2xl font-bold text-blue-600">{bank.saleCount || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <TrendingUp size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Sale Amount</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            ${Number(bank.saleAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-xl">
                          <DollarSign size={24} className="text-emerald-600" />
                        </div>
                      </div>
                    </div>

                    <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Purchase Count</p>
                          <p className="text-2xl font-bold text-amber-600">{bank.purchaseCount || 0}</p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-xl">
                          <TrendingDown size={24} className="text-amber-600" />
                        </div>
                      </div>
                    </div>

                    <div className="backdrop-blur-lg bg-gradient-to-br from-red-50/60 to-rose-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Purchase Amount</p>
                          <p className="text-2xl font-bold text-red-600">
                            ${Number(bank.purchaseAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-xl">
                          <DollarSign size={24} className="text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Accounts Table */}
                  <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl overflow-hidden mb-6">
                    <div className="p-4 border-b border-white/60 bg-gradient-to-r from-gray-50/80 to-gray-100/60">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Building size={20} className="text-emerald-600" />
                        Bank Accounts ({bank.rows.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100/80">
                          <tr>
                            <th className="p-4 text-left font-medium text-gray-700">Bank</th>
                            <th className="p-4 text-left font-medium text-gray-700">Account Number</th>
                            <th className="p-4 text-left font-medium text-gray-700">Transaction Count</th>
                            <th className="p-4 text-left font-medium text-gray-700">Total Receive</th>
                            <th className="p-4 text-left font-medium text-gray-700">Total Withdrawable</th>
                            <th className="p-4 text-left font-medium text-gray-700">Total Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bank.rows.map((row, index) => (
                            <tr 
                              key={row.id} 
                              className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                                index % 2 === 0 ? 'bg-white/10' : ''
                              }`}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-lg">
                                    <Building size={16} className="text-emerald-600" />
                                  </div>
                                  <span className="font-medium text-gray-800">{row.name}</span>
                                </div>
                              </td>
                              <td className="p-4 font-medium text-gray-700">
                                {row.account_number || 'N/A'}
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center justify-center min-w-[40px] bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                                  {(row.receiveCount || 0) + (row.paidCount || 0)}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  <DollarSign size={12} className="text-emerald-500" />
                                  <span className="font-bold text-gray-900">
                                    ${Number(row.totalReceive || 0).toFixed(2)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  <DollarSign size={12} className="text-blue-500" />
                                  <span className="font-bold text-gray-900">
                                    ${Number(row.totalWithdrawable || 0).toFixed(2)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  <DollarSign size={12} className="text-red-500" />
                                  <span className="font-bold text-gray-900">
                                    ${Number(row.totalPaid || 0).toFixed(2)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {bank.rows.length === 0 && (
                            <tr>
                              <td colSpan="6" className="p-8 text-center">
                                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                                  <Building size={48} className="text-gray-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bank Accounts Found</h3>
                                <p className="text-gray-600">No bank account data available for the selected period</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {bank.rows.length > 0 && (
                    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-700">
                          Page <span className="font-semibold">{bank.pagination.page}</span> of{" "}
                          <span className="font-semibold">{bank.pagination.totalPages || 1}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchReport(1, bank.pagination.limit)}
                            disabled={bank.pagination.page === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="First page"
                          >
                            <ChevronsLeft size={16} className="text-gray-600" />
                          </button>

                          <button
                            onClick={() => fetchReport(bank.pagination.page - 1, bank.pagination.limit)}
                            disabled={bank.pagination.page <= 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Previous page"
                          >
                            <ChevronLeft size={16} className="text-gray-600" />
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, bank.pagination.totalPages) }, (_, i) => {
                              let pageNum;
                              if (bank.pagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (bank.pagination.page <= 3) {
                                pageNum = i + 1;
                              } else if (bank.pagination.page >= bank.pagination.totalPages - 2) {
                                pageNum = bank.pagination.totalPages - 4 + i;
                              } else {
                                pageNum = bank.pagination.page - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => fetchReport(pageNum, bank.pagination.limit)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    bank.pagination.page === pageNum
                                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                                      : "hover:bg-white/50 text-gray-700"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            {bank.pagination.totalPages > 5 && bank.pagination.page < bank.pagination.totalPages - 2 && (
                              <>
                                <span className="mx-1 text-gray-400">...</span>
                                <button
                                  onClick={() => fetchReport(bank.pagination.totalPages, bank.pagination.limit)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                    bank.pagination.page === bank.pagination.totalPages
                                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                                      : "hover:bg-white/50 text-gray-700"
                                  }`}
                                >
                                  {bank.pagination.totalPages}
                                </button>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => fetchReport(bank.pagination.page + 1, bank.pagination.limit)}
                            disabled={bank.pagination.page >= bank.pagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Next page"
                          >
                            <ChevronRight size={16} className="text-gray-600" />
                          </button>

                          <button
                            onClick={() => fetchReport(bank.pagination.totalPages, bank.pagination.limit)}
                            disabled={bank.pagination.page === bank.pagination.totalPages}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                            title="Last page"
                          >
                            <ChevronsRight size={16} className="text-gray-600" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Show:</span>
                          <select
                            value={bank.pagination.limit}
                            onChange={(e) => fetchReport(1, Number(e.target.value))}
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
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashBankReport;