import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Banknote,
  Receipt,
  Settings
} from "lucide-react";

export default function Payroll() {
  const [salaries, setSalaries] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const token = localStorage.getItem("token");

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (year) params.append("year", year);
      
      const res = await fetch(`${API_ROUTES.HRM}/payroll?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSalaries(Array.isArray(data) ? data : []);
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [month, year]);

  // Calculate statistics
  const totalPayroll = salaries.reduce((sum, s) => sum + (parseFloat(s.net) || 0), 0);
  const paidSalaries = salaries.filter(s => s.status?.toLowerCase() === 'paid').length;
  const pendingSalaries = salaries.filter(s => ['generated', 'created', 'approve'].includes((s.status || '').toLowerCase())).length;
  const averageSalary = salaries.length > 0 ? totalPayroll / salaries.length : 0;

  // Get current month/year for suggestions
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSalaries = salaries.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower === 'paid') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-full">
          <CheckCircle size={14} className="text-emerald-600" />
          <span className="text-emerald-700 font-medium">Paid</span>
        </div>
      );
    } else if (statusLower === 'generated') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-full">
          <Clock size={14} className="text-indigo-600" />
          <span className="text-indigo-700 font-medium">Generated</span>
        </div>
      );
    } else if (statusLower === 'created') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-sky-500/10 rounded-full">
          <CheckCircle size={14} className="text-cyan-600" />
          <span className="text-cyan-700 font-medium">Created</span>
        </div>
      );
    } else if (statusLower === 'approve' || statusLower === 'approved') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-full">
          <Clock size={14} className="text-amber-600" />
          <span className="text-amber-700 font-medium">Approve</span>
        </div>
      );
    } else if (statusLower === 'cancelled') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-full">
          <XCircle size={14} className="text-red-600" />
          <span className="text-red-700 font-medium">Cancelled</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-500/10 to-gray-400/10 rounded-full">
        <Clock size={14} className="text-gray-600" />
        <span className="text-gray-700 font-medium">{status || 'Unknown'}</span>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExport = () => {
    // Export functionality placeholder
    alert("Export functionality would be implemented here");
  };

  const handleCalculateSalary = async () => {
    try {
      setCalculating(true);
      const targetMonth = month ? parseInt(month) : currentMonth;
      const targetYear = year ? parseInt(year) : currentYear;
      const res = await fetch(`${API_ROUTES.HRM}/payroll/calculate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ month: targetMonth, year: targetYear })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to calculate salary");
      await fetchSalaries();
      alert(data.message || "Salary calculation completed");
    } catch (error) {
      alert(error.message || "Failed to calculate salary");
    } finally {
      setCalculating(false);
    }
  };

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
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                <CreditCard className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Payroll Management
                </h1>
                <p className="text-gray-600 mt-2">View and manage employee salaries and payments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCalculateSalary}
                disabled={calculating}
                className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                  calculating
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                }`}
              >
                <Settings size={20} />
                {calculating ? "Calculating..." : "Calculate Salary"}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download size={20} />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPayroll)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(averageSalary)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{paidSalaries}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pendingSalaries}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                Filter Payroll
              </h2>
              <p className="text-gray-600">Filter by month and year to view specific payroll periods</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMonth(currentMonth.toString());
                  setYear(currentYear.toString());
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 font-medium rounded-xl hover:from-blue-500/20 hover:to-cyan-500/20 transition-all duration-300 border border-blue-200"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  setMonth("");
                  setYear("");
                }}
                className="px-4 py-2 bg-gradient-to-r from-gray-500/10 to-gray-400/10 text-gray-600 font-medium rounded-xl hover:from-gray-500/20 hover:to-gray-400/20 transition-all duration-300 border border-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Month (1-12)</label>
              <div className="relative">
                <input 
                  className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
                  placeholder={`e.g., ${currentMonth} for current month`}
                  type="number"
                  min="1"
                  max="12"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
                <Calendar size={16} className="absolute right-3 top-3.5 text-gray-400" />
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <div className="relative">
                <input 
                  className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
                  placeholder={`e.g., ${currentYear}`}
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
                <Calendar size={16} className="absolute right-3 top-3.5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchSalaries}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Filter size={18} />
                Apply Filters
              </button>
            </div>
          </div>
          
          {month || year ? (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-white/40">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-blue-500" />
                <span className="text-sm text-gray-700">
                  Showing results for: 
                  {month && <span className="font-medium ml-1">Month {month}</span>}
                  {year && <span className="font-medium ml-1">Year {year}</span>}
                  {!month && !year && <span className="font-medium ml-1">All records</span>}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Receipt size={20} className="text-emerald-600" />
                Payroll Records
              </h2>
              <p className="text-gray-600 mt-1">{salaries.length} salary records found</p>
            </div>
          </div>

          {loading && salaries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading payroll data...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                      <th className="p-4 text-left font-medium text-gray-700">Period</th>
                      <th className="p-4 text-left font-medium text-gray-700">Base Salary</th>
                      <th className="p-4 text-left font-medium text-gray-700">Allowances</th>
                      <th className="p-4 text-left font-medium text-gray-700">Deductions</th>
                      <th className="p-4 text-left font-medium text-gray-700">Net Salary</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSalaries.map((salary, index) => {
                      const netSalary = parseFloat(salary.net) || 0;
                      const baseSalary = parseFloat(salary.baseSalary) || 0;
                      const allowances = parseFloat(salary.allowances) || 0;
                      const deductions = parseFloat(salary.deductions) || 0;
                      
                      return (
                        <tr 
                          key={salary.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                                <Users size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {salary.user?.name || salary.user?.username || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  ID: {salary.user?.id || salary.user?.username || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-blue-500" />
                              <span className="font-medium">
                                {salary.month}/{salary.year}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(baseSalary)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp size={14} className="text-emerald-500" />
                              <span className="font-medium text-emerald-600">
                                {formatCurrency(allowances)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <TrendingDown size={14} className="text-red-500" />
                              <span className="font-medium text-red-600">
                                {formatCurrency(deductions)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-emerald-500" />
                              <span className="font-bold text-lg text-emerald-700">
                                {formatCurrency(netSalary)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(salary.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {salaries.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <CreditCard size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payroll Records</h3>
                    <p className="text-gray-600 mb-6">
                      {month || year 
                        ? "No records found for the selected filters" 
                        : "No payroll data available"}
                    </p>
                    {month || year ? (
                      <button
                        onClick={() => {
                          setMonth("");
                          setYear("");
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                      >
                        <Filter size={20} />
                        Clear Filters
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {salaries.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
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
                          className="text-sm border border-white/60 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                        <span className="font-semibold">{Math.min(endIndex, salaries.length)}</span>{" "}
                        of <span className="font-semibold">{salaries.length}</span> records
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
