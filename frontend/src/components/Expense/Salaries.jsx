import { useEffect, useRef, useState } from "react";
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
  Settings,
  Search,
  Filter,
  Trash2
} from "lucide-react";

export default function Salaries() {
  const [salaries, setSalaries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [companyProfile, setCompanyProfile] = useState({
    companyName: "Company",
    address: "",
    phone: "",
    email: "",
    footerNote: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState("filter");
  const [totalSalaries, setTotalSalaries] = useState(0);
  const [overview, setOverview] = useState({ totalCount: 0, totalPayroll: 0, byStatus: {} });
  const [filters, setFilters] = useState({
    search: "",
    month: "",
    year: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "year",
    sortDir: "desc",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    month: "",
    year: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "year",
    sortDir: "desc",
  });
  const [editingSalary, setEditingSalary] = useState(null);
  const [editForm, setEditForm] = useState({ baseSalary: "", allowances: "", deductions: "" });
  const [statusSalary, setStatusSalary] = useState(null);
  const [statusDraft, setStatusDraft] = useState("generated");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);
  const token = localStorage.getItem("token");
  const STATUS_OPTIONS = ["generated", "created", "approve", "paid"];

  const fetchSalaries = async (page = 1, mode = "table") => {
    try {
      setLoading(true);
      setLoadMode(mode);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
        sortBy: appliedFilters.sortBy,
        sortDir: appliedFilters.sortDir,
      });
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.month) params.set("month", appliedFilters.month);
      if (appliedFilters.year) params.set("year", appliedFilters.year);
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
      const res = await fetch(`${API_ROUTES.HRM}/payroll?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const salariesArray = Array.isArray(data?.items) ? data.items : [];
      setSalaries(salariesArray);
      setCurrentPage(Number(data?.pagination?.page || page));
      setTotalSalaries(Number(data?.pagination?.totalCount || salariesArray.length));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
    } catch (error) {
      console.error('Error fetching salaries:', error);
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
      if (appliedFilters.month) params.set("month", appliedFilters.month);
      if (appliedFilters.year) params.set("year", appliedFilters.year);
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
      const res = await fetch(`${API_ROUTES.HRM_PAYROLL_OVERVIEW}${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOverview({
        totalCount: Number(data?.totalCount || 0),
        totalPayroll: Number(data?.totalPayroll || 0),
        byStatus: data?.byStatus || {},
      });
    } catch {
      setOverview({ totalCount: 0, totalPayroll: 0, byStatus: {} });
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

  const fetchCompanyProfile = async () => {
    try {
      const res = await fetch(API_ROUTES.BUSINESS_SETTINGS_BY_KEY("company_profile"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const row = await res.json();
      if (row?.value) {
        setCompanyProfile((prev) => ({
          ...prev,
          ...row.value
        }));
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchCompanyProfile();
  }, []);
  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchSalaries(1, "filter");
    fetchOverview();
  }, [appliedFilters, itemsPerPage]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchSalaries(currentPage, "table");
  }, [currentPage]);

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

  const getPaginationItems = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
          <div className="text-sm text-gray-700">
            Showing <span className="font-semibold">{totalSalaries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalSalaries)}</span> of{" "}
            <span className="font-semibold">{totalSalaries}</span> salaries
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30" title="First page">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={prevPage} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30" title="Previous page">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            {getPaginationItems().map((item, idx) =>
              item === "..." ? (
                <span key={`ellipsis-${idx}`} className="mx-1 text-gray-400">...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === item ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "hover:bg-white/50 text-gray-700"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30" title="Next page">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30" title="Last page">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

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
  const paidSalaries = Number(overview.byStatus?.paid || 0);
  const pendingSalaries =
    Number(overview.byStatus?.generated || 0) +
    Number(overview.byStatus?.created || 0) +
    Number(overview.byStatus?.approve || 0) +
    Number(overview.byStatus?.approved || 0);
  const totalNetAmount = Number(overview.totalPayroll || 0);

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
      await fetchSalaries(currentPage, "table");
      await fetchOverview();
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
      await fetchSalaries(currentPage, "table");
      await fetchOverview();
      closeModals();
    } catch (error) {
      alert(error.message || "Failed to update status");
      setSaving(false);
    }
  };

  const handleDeleteSalary = async (salaryId) => {
    if (!window.confirm("Delete this salary record?")) return;
    try {
      setDeletingId(salaryId);
      const res = await fetch(`${API_ROUTES.HRM}/payroll/${salaryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete salary");
      await fetchSalaries(currentPage, "table");
      await fetchOverview();
    } catch (error) {
      alert(error.message || "Failed to delete salary");
    } finally {
      setDeletingId(null);
    }
  };

  const canDownloadPayslip = (status) => {
    const s = (status || "").toLowerCase();
    return s === "approve" || s === "approved" || s === "paid";
  };

  const formatMonthName = (monthNumber) => {
    const month = parseInt(monthNumber) || 1;
    const date = new Date(2000, Math.max(0, month - 1), 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  const handleDownloadPayslip = (salary) => {
    if (!canDownloadPayslip(salary.status)) {
      alert("Pay slip can be downloaded only after salary is approved.");
      return;
    }

    const employeeName = salary.user?.name || salary.user?.username || "Employee";
    const baseSalary = parseFloat(salary.baseSalary || 0);
    const allowances = parseFloat(salary.allowances || 0);
    const deductions = parseFloat(salary.deductions || 0);
    const gross = parseFloat(salary.gross || (baseSalary + allowances));
    const net = parseFloat(salary.net || (gross - deductions));
    const period = `${formatMonthName(salary.month)} ${salary.year}`;
    const generatedOn = new Date().toLocaleString();

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pay Slip - ${employeeName}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
      .card { max-width: 820px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
      .header { background: #f3f4f6; padding: 18px 22px; border-bottom: 1px solid #e5e7eb; }
      .title { margin: 0; font-size: 24px; }
      .sub { margin: 4px 0 0; color: #4b5563; font-size: 13px; }
      .content { padding: 22px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
      .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
      .label { color: #6b7280; font-size: 12px; }
      .value { margin-top: 4px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #e5e7eb; padding: 10px; font-size: 14px; text-align: left; }
      th { background: #f9fafb; }
      .right { text-align: right; }
      .total { font-size: 18px; font-weight: 700; }
      .footer { margin-top: 18px; color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1 class="title">${companyProfile.companyName || "Company"}</h1>
        <p class="sub">${companyProfile.address || ""}</p>
        <p class="sub">${companyProfile.phone || ""} ${companyProfile.email ? " | " + companyProfile.email : ""}</p>
      </div>
      <div class="content">
        <h2 style="margin: 0 0 12px;">Pay Slip</h2>
        <div class="grid">
          <div class="box">
            <div class="label">Employee</div>
            <div class="value">${employeeName}</div>
          </div>
          <div class="box">
            <div class="label">Salary Period</div>
            <div class="value">${period}</div>
          </div>
          <div class="box">
            <div class="label">Current Status</div>
            <div class="value">${salary.status || "N/A"}</div>
          </div>
          <div class="box">
            <div class="label">Generated On</div>
            <div class="value">${generatedOn}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td>
              <td class="right">${formatCurrency(baseSalary)}</td>
            </tr>
            <tr>
              <td>Allowances</td>
              <td class="right">${formatCurrency(allowances)}</td>
            </tr>
            <tr>
              <td>Deductions</td>
              <td class="right">${formatCurrency(deductions)}</td>
            </tr>
            <tr>
              <td><strong>Gross</strong></td>
              <td class="right"><strong>${formatCurrency(gross)}</strong></td>
            </tr>
            <tr>
              <td class="total">Net Pay</td>
              <td class="right total">${formatCurrency(net)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          ${companyProfile.footerNote || "This is a system-generated pay slip."}
        </div>
      </div>
    </div>
  </body>
</html>`;

    const file = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const safeEmployee = employeeName.replace(/[^a-z0-9]/gi, "_");
    link.href = url;
    link.download = `PaySlip_${safeEmployee}_${salary.month}_${salary.year}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

        {/* Filters */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search employee..."
                className="w-full pl-9 pr-3 py-3 border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <select value={filters.month} onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <input type="number" min="2000" max="2100" placeholder="Year" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">All status</option>
              <option value="generated">Generated</option>
              <option value="created">Created</option>
              <option value="approve">Approved</option>
              <option value="paid">Paid</option>
            </select>
            <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="year">Sort: Year</option>
              <option value="month">Sort: Month</option>
              <option value="net">Sort: Net</option>
              <option value="gross">Sort: Gross</option>
              <option value="status">Sort: Status</option>
            </select>
            <select value={filters.sortDir} onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <div className="md:col-span-5 flex justify-end gap-2">
              <button onClick={() => { setAppliedFilters({ ...filters }); setCurrentPage(1); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium">
                <Filter size={16} />
                Apply
              </button>
              <button onClick={() => { const cleared = { search: "", month: "", year: "", status: "", dateFrom: "", dateTo: "", sortBy: "year", sortDir: "desc" }; setFilters(cleared); setAppliedFilters(cleared); setCurrentPage(1); }} className="px-4 py-2.5 border border-white/60 bg-white/80 rounded-xl text-gray-700 font-medium">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {loading && loadMode === "filter" ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading salaries...</p>
              </div>
            </div>
          ) : (
            <>
              {salaries.length > 0 && renderPagination()}
              <div className="overflow-x-auto rounded-xl border border-white/60">
                {loading && loadMode === "table" ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
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
                    {salaries.map((salary, index) => {
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
                              <button
                                onClick={() => handleDownloadPayslip(salary)}
                                disabled={!canDownloadPayslip(salary.status)}
                                className={`p-2 rounded-lg transition-colors duration-300 ${
                                  canDownloadPayslip(salary.status)
                                    ? "bg-purple-50 text-purple-600 hover:bg-purple-100"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                                title={canDownloadPayslip(salary.status) ? "Download Pay Slip" : "Available after approval"}
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteSalary(salary.id)}
                                disabled={deletingId === salary.id}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300 disabled:opacity-60"
                                title="Delete Salary"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
                
                {salaries.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <CreditCard size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Salary Records Found</h3>
                    <p className="text-gray-600 mb-6">No salary data available at the moment</p>
                    <button 
                      onClick={() => fetchSalaries(currentPage, "table")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <Plus size={20} />
                      Refresh Data
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {salaries.length > 0 && renderPagination()}
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
