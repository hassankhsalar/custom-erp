import { useEffect, useRef, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Receipt,
  Settings,
  Search,
} from "lucide-react";

export default function Payroll() {
  const [salaries, setSalaries] = useState([]);
  const [overview, setOverview] = useState({ totalCount: 0, totalPayroll: 0, averageSalary: 0, byStatus: {} });
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState("filter");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    month: "",
    year: "",
    status: "",
    sortBy: "year",
    sortDir: "desc",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    month: "",
    year: "",
    status: "",
    sortBy: "year",
    sortDir: "desc",
  });
  const token = localStorage.getItem("token");
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const getQueryParams = (pageValue) => {
    const params = new URLSearchParams({
      page: String(pageValue),
      limit: String(itemsPerPage),
      sortBy: appliedFilters.sortBy,
      sortDir: appliedFilters.sortDir,
    });
    if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
    if (appliedFilters.month) params.set("month", appliedFilters.month);
    if (appliedFilters.year) params.set("year", appliedFilters.year);
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    return params.toString();
  };

  const getOverviewParams = () => {
    const params = new URLSearchParams();
    if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
    if (appliedFilters.month) params.set("month", appliedFilters.month);
    if (appliedFilters.year) params.set("year", appliedFilters.year);
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    return params.toString();
  };

  const fetchSalaries = async (pageValue, mode = "table") => {
    try {
      setLoading(true);
      setLoadMode(mode);
      const res = await fetch(`${API_ROUTES.HRM}/payroll?${getQueryParams(pageValue)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSalaries(Array.isArray(data?.items) ? data.items : []);
      setCurrentPage(Number(data?.pagination?.page || pageValue));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
      setTotalCount(Number(data?.pagination?.totalCount || 0));
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      setSalaries([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const query = getOverviewParams();
      const url = query ? `${API_ROUTES.HRM_PAYROLL_OVERVIEW}?${query}` : API_ROUTES.HRM_PAYROLL_OVERVIEW;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOverview({
        totalCount: Number(data?.totalCount || 0),
        totalPayroll: Number(data?.totalPayroll || 0),
        averageSalary: Number(data?.averageSalary || 0),
        byStatus: data?.byStatus || {},
      });
    } catch {
      setOverview({ totalCount: 0, totalPayroll: 0, averageSalary: 0, byStatus: {} });
    }
  };

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const handleExport = () => {
    alert("Export functionality would be implemented here");
  };

  const handleCalculateSalary = async () => {
    try {
      setCalculating(true);
      const targetMonth = filters.month ? parseInt(filters.month, 10) : currentMonth;
      const targetYear = filters.year ? parseInt(filters.year, 10) : currentYear;
      const res = await fetch(`${API_ROUTES.HRM}/payroll/calculate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ month: targetMonth, year: targetYear }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to calculate salary");
      await fetchSalaries(currentPage, "table");
      await fetchOverview();
      alert(data.message || "Salary calculation completed");
    } catch (error) {
      alert(error.message || "Failed to calculate salary");
    } finally {
      setCalculating(false);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const cleared = { search: "", month: "", year: "", status: "", sortBy: "year", sortDir: "desc" };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationItems = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const renderPagination = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{" "}
          <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
          <span className="font-semibold">{totalCount}</span> records
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30"><ChevronsLeft size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30"><ChevronLeft size={16} className="text-gray-600" /></button>
          <div className="flex items-center gap-1">
            {getPaginationItems().map((item, idx) =>
              item === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
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
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30"><ChevronRight size={16} className="text-gray-600" /></button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30"><ChevronsRight size={16} className="text-gray-600" /></button>
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return <span className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-100">Paid</span>;
    if (s === "approve" || s === "approved") return <span className="px-3 py-1.5 rounded-full text-xs font-medium text-blue-700 bg-blue-100">Approved</span>;
    if (s === "created") return <span className="px-3 py-1.5 rounded-full text-xs font-medium text-cyan-700 bg-cyan-100">Created</span>;
    return <span className="px-3 py-1.5 rounded-full text-xs font-medium text-amber-700 bg-amber-100">{status || "Generated"}</span>;
  };

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  const paidSalaries = Number(overview.byStatus?.paid || 0);
  const pendingSalaries = Number(overview.byStatus?.generated || 0) + Number(overview.byStatus?.created || 0) + Number(overview.byStatus?.approve || 0) + Number(overview.byStatus?.approved || 0);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg"><CreditCard className="text-white" size={36} /></div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Payroll Management</h1>
                <p className="text-gray-600 mt-2">View and manage employee salaries and payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleCalculateSalary} disabled={calculating} className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-xl ${calculating ? "bg-gray-300 text-gray-500" : "bg-gradient-to-r from-emerald-500 to-green-500 text-white"}`}>
                <Settings size={20} />{calculating ? "Calculating..." : "Calculate Salary"}
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl">
                <Download size={20} />Export Report
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Payroll</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(overview.totalPayroll)}</p></div><div className="p-3 bg-emerald-100 rounded-xl"><DollarSign size={24} className="text-emerald-600" /></div></div></div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Average Salary</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(overview.averageSalary)}</p></div><div className="p-3 bg-blue-100 rounded-xl"><TrendingUp size={24} className="text-blue-600" /></div></div></div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Paid</p><p className="text-2xl font-bold text-emerald-600">{paidSalaries}</p></div><div className="p-3 bg-emerald-100 rounded-xl"><CheckCircle size={24} className="text-emerald-600" /></div></div></div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Pending</p><p className="text-2xl font-bold text-amber-600">{pendingSalaries}</p></div><div className="p-3 bg-amber-100 rounded-xl"><Clock size={24} className="text-amber-600" /></div></div></div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="text" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search user..." className="w-full border border-white/60 bg-white/80 rounded-xl p-3 pl-9" />
            </div>
            <input type="number" min="1" max="12" value={filters.month} onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))} placeholder={`Month (${currentMonth})`} className="w-full border border-white/60 bg-white/80 rounded-xl p-3" />
            <input type="number" min="2000" max="2100" value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))} placeholder={`Year (${currentYear})`} className="w-full border border-white/60 bg-white/80 rounded-xl p-3" />
            <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3">
              <option value="">All status</option><option value="generated">Generated</option><option value="created">Created</option><option value="approve">Approved</option><option value="paid">Paid</option>
            </select>
            <select value={filters.sortBy} onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3">
              <option value="year">Sort by Year</option><option value="month">Sort by Month</option><option value="net">Sort by Net</option><option value="gross">Sort by Gross</option><option value="status">Sort by Status</option>
            </select>
            <select value={filters.sortDir} onChange={(e) => setFilters((p) => ({ ...p, sortDir: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3">
              <option value="desc">Desc</option><option value="asc">Asc</option>
            </select>
            <div className="md:col-span-7 flex justify-end gap-2">
              <button onClick={handleApplyFilters} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center gap-2"><Filter size={16} />Apply</button>
              <button onClick={handleClearFilters} className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-gray-700">Clear</button>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Receipt size={20} className="text-emerald-600" />Payroll Records</h2>
              <p className="text-gray-600 mt-1">{totalCount} salary records found</p>
            </div>
          </div>

          {salaries.length > 0 && renderPagination()}
          <div className="overflow-x-auto rounded-xl border border-white/60 my-4">
            {loading && loadMode === "table" ? (
              <div className="flex items-center justify-center py-12"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div></div>
            ) : (
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
                  {salaries.map((salary, index) => (
                    <tr key={salary.id} className={`border-t border-white/50 hover:bg-white/30 ${index % 2 === 0 ? "bg-white/10" : ""}`}>
                      <td className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg"><Users size={16} className="text-blue-600" /></div><div><p className="font-semibold text-gray-800">{salary.user?.name || salary.user?.username || "Unknown User"}</p><p className="text-xs text-gray-500 mt-1">ID: {salary.user?.id || salary.user?.username || "N/A"}</p></div></div></td>
                      <td className="p-4"><div className="flex items-center gap-2"><Calendar size={14} className="text-blue-500" /><span className="font-medium">{salary.month}/{salary.year}</span></div></td>
                      <td className="p-4 font-medium text-gray-900">{formatCurrency(parseFloat(salary.baseSalary) || 0)}</td>
                      <td className="p-4 font-medium text-emerald-600">{formatCurrency(parseFloat(salary.allowances) || 0)}</td>
                      <td className="p-4 font-medium text-red-600">{formatCurrency(parseFloat(salary.deductions) || 0)}</td>
                      <td className="p-4 font-bold text-lg text-emerald-700">{formatCurrency(parseFloat(salary.net) || 0)}</td>
                      <td className="p-4">{getStatusBadge(salary.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && salaries.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4"><CreditCard size={48} className="text-gray-300" /></div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payroll Records</h3>
                <p className="text-gray-600 mb-6">No records found for the selected filters.</p>
                <button onClick={handleClearFilters} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl">
                  <Filter size={20} />Clear Filters
                </button>
              </div>
            )}
          </div>
          {salaries.length > 0 && renderPagination()}
        </div>
      </div>
    </div>
  );
}
