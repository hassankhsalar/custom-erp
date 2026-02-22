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
  Download,
  Pencil,
  Settings
} from "lucide-react";

export default function Salaries() {
  const [salaries, setSalaries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalSalaries, setTotalSalaries] = useState(0);
  const [editingSalary, setEditingSalary] = useState(null);
  const [editForm, setEditForm] = useState({ baseSalary: "", allowances: "", deductions: "" });
  const [statusSalary, setStatusSalary] = useState(null);
  const [statusDraft, setStatusDraft] = useState("generated");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");
  const STATUS_OPTIONS = ["generated", "created", "approve", "paid"];

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

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_ROUTES.ACCOUNTS}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchSalaries();
    fetchAccounts();
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
      case 'generated':
        return {
          bg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
          icon: <Clock size={14} />,
          text: 'text-white'
        };
      case 'created':
        return {
          bg: 'bg-gradient-to-r from-cyan-500 to-sky-500',
          icon: <CheckCircle size={14} />,
          text: 'text-white'
        };
      case 'approve':
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
  const pendingSalaries = salaries.filter(s => ['generated', 'created', 'approve'].includes((s.status || '').toLowerCase())).length;
  const totalNetAmount = salaries.reduce((sum, s) => sum + (parseFloat(s.net) || 0), 0);

  const openEditModal = (salary) => {
    setEditingSalary(salary);
    setEditForm({
      baseSalary: String(parseFloat(salary.baseSalary || 0)),
      allowances: String(parseFloat(salary.allowances || 0)),
      deductions: String(parseFloat(salary.deductions || 0)),
    });
  };

  const openStatusModal = (salary) => {
    setStatusSalary(salary);
    const normalized = (salary.status || "generated").toLowerCase();
    setStatusDraft(normalized === "approved" ? "approve" : normalized);
    setSelectedAccountId("");
  };

  const closeModals = () => {
    setEditingSalary(null);
    setStatusSalary(null);
    setSelectedAccountId("");
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingSalary) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_ROUTES.HRM}/payroll/${editingSalary.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allowances: parseFloat(editForm.allowances) || 0,
          deductions: parseFloat(editForm.deductions) || 0
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update salary");
      }
      await fetchSalaries();
      closeModals();
    } catch (error) {
      alert(error.message || "Failed to update salary");
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!statusSalary) return;
    if (statusDraft === "paid" && !selectedAccountId) {
      alert("Please select an account for salary payment.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_ROUTES.HRM}/payroll/${statusSalary.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: statusDraft,
          accountId: statusDraft === "paid" ? parseInt(selectedAccountId) : undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      await fetchSalaries();
      closeModals();
    } catch (error) {
      alert(error.message || "Failed to update status");
      setSaving(false);
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
                      const isPaid = (salary.status || "").toLowerCase() === "paid";
                      
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
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${statusStyle.bg}`}>
                              {statusStyle.icon}
                              <span className={statusStyle.text}>
                                {salary.status || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(salary)}
                                disabled={isPaid}
                                className={`p-2 rounded-lg transition-colors duration-300 ${
                                  isPaid
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                                title="Edit Salary"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => openStatusModal(salary)}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-300"
                                title="Change Status"
                              >
                                <Settings size={16} />
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

      {editingSalary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Salary</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary (Read only)</label>
                <input value={editForm.baseSalary} readOnly className="w-full border border-gray-300 rounded-xl p-3 bg-gray-100/70" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                <input type="number" step="0.01" value={editForm.allowances} onChange={(e) => setEditForm((p) => ({ ...p, allowances: e.target.value }))} className="w-full border border-gray-300 rounded-xl p-3 bg-white/80" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
                <input type="number" step="0.01" value={editForm.deductions} onChange={(e) => setEditForm((p) => ({ ...p, deductions: e.target.value }))} className="w-full border border-gray-300 rounded-xl p-3 bg-white/80" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-xl bg-gray-200/70 text-gray-700 hover:bg-gray-300/80">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className={`px-5 py-2.5 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {statusSalary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl w-full max-w-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Change Salary Status</h3>
            {(() => {
              const currentStatus = (statusSalary.status || "").toLowerCase();
              const canPay = ["approve", "approved", "paid"].includes(currentStatus);
              const optionsToShow = STATUS_OPTIONS.filter((s) => s !== "paid" || canPay);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {optionsToShow.map((s) => {
                    const selected = statusDraft === s;
                    const style = getStatusStyle(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusDraft(s)}
                        className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                          selected ? `${style.bg} text-white` : "bg-white/80 border border-white/60 hover:bg-white text-gray-700"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {statusDraft === "paid" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 bg-white/80"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-xl bg-gray-200/70 text-gray-700 hover:bg-gray-300/80">Cancel</button>
              <button onClick={saveStatus} disabled={saving} className={`px-5 py-2.5 rounded-xl text-white ${saving ? 'bg-gray-400' : 'bg-gradient-to-r from-emerald-500 to-green-500'}`}>{saving ? 'Saving...' : 'Update Status'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
