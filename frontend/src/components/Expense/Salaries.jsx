import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  Users,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  AlertCircle,
  Plus,
  Download
} from "lucide-react";

export default function Salaries() {
  const [salaries, setSalaries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalSalaries, setTotalSalaries] = useState(0);
  const token = localStorage.getItem("token");

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROUTES.EXPENSES}/salaries/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const salariesArray = Array.isArray(data) ? data : [];
      setSalaries(salariesArray);
      setTotalSalaries(salariesArray.length);
      setTotalPages(Math.ceil(salariesArray.length / itemsPerPage));
    } catch (error) {
      console.error('Error fetching salaries:', error);
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  // Get paginated salaries
  const getPaginatedSalaries = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return salaries.slice(startIndex, endIndex);
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Get status styling
  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          icon: <CheckCircle size={14} />,
          text: 'text-white'
        };
      case 'pending':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          icon: <Clock size={14} />,
          text: 'text-white'
        };
      case 'failed':
      case 'cancelled':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          icon: <XCircle size={14} />,
          text: 'text-white'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          icon: <AlertCircle size={14} />,
          text: 'text-white'
        };
    }
  };

  // Calculate statistics
  const paidSalaries = salaries.filter(s => s.status?.toLowerCase() === 'paid').length;
  const pendingSalaries = salaries.filter(s => s.status?.toLowerCase() === 'pending').length;
  const totalNetAmount = salaries.reduce((sum, s) => sum + (parseFloat(s.net) || 0), 0);

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
                <CreditCard className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Salary Management
                </h1>
                <p className="text-gray-600 mt-2">View and manage employee salaries and payments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => alert('Export feature coming soon!')}
              >
                <Download size={20} />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Salaries</p>
                <p className="text-2xl font-bold text-blue-600">{totalSalaries}</p>
                <p className="text-xs text-gray-500 mt-1">All time records</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Salaries</p>
                <p className="text-2xl font-bold text-emerald-600">{paidSalaries}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully processed</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-amber-600">{pendingSalaries}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Net Amount Card */}
        <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Net Amount</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalNetAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">Sum of all net salaries</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <DollarSign size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading salaries...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                      <th className="p-4 text-left font-medium text-gray-700">Period</th>
                      <th className="p-4 text-left font-medium text-gray-700">Net Salary</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedSalaries().map((salary, index) => {
                      const statusStyle = getStatusStyle(salary.status);
                      const monthYear = `${salary.month}/${salary.year}`;
                      const employeeName = salary.user?.name || salary.user?.username || 'Unknown Employee';
                      
                      return (
                        <tr 
                          key={salary.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                                {employeeName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{employeeName}</p>
                                {salary.user?.email && (
                                  <p className="text-xs text-gray-500 mt-1">{salary.user.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-700">{monthYear}</p>
                                <p className="text-xs text-gray-500">Payment period</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-gray-400" />
                              <div>
                                <p className="font-bold text-lg text-gray-900">{formatCurrency(salary.net)}</p>
                                {salary.gross && (
                                  <p className="text-xs text-gray-500">
                                    Gross: {formatCurrency(salary.gross)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold">
                              {statusStyle.icon}
                              <span className={statusStyle.text}>
                                {salary.status || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => alert(`Salary details for ${employeeName} (${monthYear})`)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                title="View Details"
                              >
                                <FileText size={16} />
                              </button>
                              <button
                                onClick={() => alert(`Download payslip for ${employeeName}`)}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-300"
                                title="Download Payslip"
                              >
                                <Download size={16} />
                              </button>
                            </div>
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
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Salary Records Found</h3>
                    <p className="text-gray-600 mb-6">No salary data available at the moment</p>
                    <button 
                      onClick={fetchSalaries}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Plus size={20} />
                      Refresh Data
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {salaries.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
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
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * itemsPerPage, salaries.length)}
                        </span>{" "}
                        of <span className="font-semibold">{totalSalaries}</span> salaries
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