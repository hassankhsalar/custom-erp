import { useEffect, useRef, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  Clock,
  Calendar,
  User,
  LogIn,
  LogOut,
  CheckCircle,
  PlayCircle,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Users,
  Search,
  Filter,
} from "lucide-react";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [overview, setOverview] = useState({ totalCount: 0, activeCount: 0, uniqueUsers: 0, todayCount: 0 });
  const [loading, setLoading] = useState(false);
  const [loadMode, setLoadMode] = useState("filter");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const token = localStorage.getItem("token");
  const initializedRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);

  const getQueryParams = (pageValue) => {
    const params = new URLSearchParams({
      page: String(pageValue),
      limit: String(itemsPerPage),
      sortBy: "clockIn",
      sortDir: "desc",
    });
    if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);
    return params.toString();
  };

  const getOverviewParams = () => {
    const params = new URLSearchParams();
    if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);
    return params.toString();
  };

  const fetchRecords = async (pageValue, mode = "table") => {
    try {
      setLoading(true);
      setLoadMode(mode);
      const res = await fetch(`${API_ROUTES.HRM}/clock-records?${getQueryParams(pageValue)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecords(Array.isArray(data?.items) ? data.items : []);
      setCurrentPage(Number(data?.pagination?.page || pageValue));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
      setTotalCount(Number(data?.pagination?.totalCount || 0));
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setRecords([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const query = getOverviewParams();
      const url = query ? `${API_ROUTES.HRM_CLOCK_RECORDS_OVERVIEW}?${query}` : API_ROUTES.HRM_CLOCK_RECORDS_OVERVIEW;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOverview({
        totalCount: Number(data?.totalCount || 0),
        activeCount: Number(data?.activeCount || 0),
        uniqueUsers: Number(data?.uniqueUsers || 0),
        todayCount: Number(data?.todayCount || 0),
      });
    } catch {
      setOverview({ totalCount: 0, activeCount: 0, uniqueUsers: 0, todayCount: 0 });
    }
  };

  useEffect(() => {
    initializedRef.current = true;
    skipNextPageFetchRef.current = currentPage !== 1;
    setCurrentPage(1);
    fetchRecords(1, "filter");
    fetchOverview();
  }, [appliedFilters, itemsPerPage]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    fetchRecords(currentPage, "table");
  }, [currentPage]);

  const clockIn = async () => {
    try {
      await fetch(`${API_ROUTES.HRM}/clock-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords(currentPage, "table");
      fetchOverview();
    } catch (error) {
      console.error("Error clocking in:", error);
    }
  };

  const clockOut = async () => {
    try {
      await fetch(`${API_ROUTES.HRM}/clock-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecords(currentPage, "table");
      fetchOverview();
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    const cleared = { search: "", status: "", startDate: "", endDate: "" };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentPage(1);
  };

  const latestRecord = records.length > 0 ? records[0] : null;
  const isClockedIn = latestRecord && !latestRecord.clockOut;

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
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
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
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronsRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (record) => {
    if (!record.clockOut) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-full">
          <PlayCircle size={14} className="text-emerald-600 animate-pulse" />
          <span className="text-emerald-700 font-medium">Active</span>
        </div>
      );
    }
    if ((record.status || "").toLowerCase() === "closed") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full">
          <CheckCircle size={14} className="text-blue-600" />
          <span className="text-blue-700 font-medium">Closed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-500/10 to-gray-400/10 rounded-full">
        <StopCircle size={14} className="text-gray-600" />
        <span className="text-gray-700 font-medium">{record.status || "Unknown"}</span>
      </div>
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return (
      <div className="flex flex-col">
        <span className="font-medium">{date.toLocaleDateString()}</span>
        <span className="text-sm text-gray-500">{date.toLocaleTimeString()}</span>
      </div>
    );
  };

  if (loading && loadMode === "filter") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

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
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Clock className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Attendance Tracker</h1>
                <p className="text-gray-600 mt-2">Manage and track employee clock-in/out records</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-xl border border-white/60">
              <div className={`w-3 h-3 rounded-full ${isClockedIn ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className="text-sm font-medium text-gray-700">{isClockedIn ? "Currently Clocked In" : "Ready to Clock In"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Total Records</p><p className="text-2xl font-bold text-blue-600">{overview.totalCount}</p></div>
              <div className="p-3 bg-blue-100 rounded-xl"><Calendar size={24} className="text-blue-600" /></div>
            </div>
          </div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Active Sessions</p><p className="text-2xl font-bold text-emerald-600">{overview.activeCount}</p></div>
              <div className="p-3 bg-emerald-100 rounded-xl"><Zap size={24} className="text-emerald-600" /></div>
            </div>
          </div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Unique Users</p><p className="text-2xl font-bold text-purple-600">{overview.uniqueUsers}</p></div>
              <div className="p-3 bg-purple-100 rounded-xl"><Users size={24} className="text-purple-600" /></div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2"><Clock size={20} className="text-blue-600" />Quick Actions</h2>
              <p className="text-gray-600">Use quick actions and filters below.</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={clockIn} disabled={isClockedIn} className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 disabled:from-emerald-300 disabled:to-green-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl">
                <LogIn size={20} />Clock In
              </button>
              <button onClick={clockOut} disabled={!isClockedIn} className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 disabled:from-red-300 disabled:to-rose-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl">
                <LogOut size={20} />Clock Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-6">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="text" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search user..." className="w-full border border-white/60 bg-white/80 rounded-xl p-3 pl-9" />
            </div>
            <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </select>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3" />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} className="w-full border border-white/60 bg-white/80 rounded-xl p-3" />
            <div className="flex gap-2">
              <button onClick={handleApplyFilters} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl"><Filter size={16} />Apply</button>
              <button onClick={handleClearFilters} className="px-4 py-3 bg-white/80 border border-white/60 rounded-xl text-gray-700">Clear</button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">Today's records: <span className="font-semibold">{overview.todayCount}</span></div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-blue-600" />Attendance History</h2>
              <p className="text-gray-600 mt-1">{totalCount} records found</p>
            </div>
          </div>

          {records.length > 0 && renderPagination()}
          <div className="overflow-x-auto rounded-xl border border-white/60 my-4">
            {loading && loadMode === "table" ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                    <th className="p-4 text-left font-medium text-gray-700">Clock In</th>
                    <th className="p-4 text-left font-medium text-gray-700">Clock Out</th>
                    <th className="p-4 text-left font-medium text-gray-700">Duration</th>
                    <th className="p-4 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    const duration = record.clockOut ? Math.round(((new Date(record.clockOut) - new Date(record.clockIn)) / (1000 * 60 * 60)) * 10) / 10 : null;
                    return (
                      <tr key={record.id} className={`border-t border-white/50 hover:bg-white/30 ${index % 2 === 0 ? "bg-white/10" : ""}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg"><User size={16} className="text-blue-600" /></div>
                            <div>
                              <p className="font-semibold text-gray-800">{record.user?.name || record.user?.username || "Unknown User"}</p>
                              <p className="text-xs text-gray-500 mt-1">ID: {record.user?.id || record.user?.username || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><div className="flex items-center gap-2"><LogIn size={14} className="text-emerald-500" />{formatDateTime(record.clockIn)}</div></td>
                        <td className="p-4"><div className="flex items-center gap-2"><LogOut size={14} className="text-red-500" />{formatDateTime(record.clockOut)}</div></td>
                        <td className="p-4">
                          {duration !== null ? (
                            <div className="flex items-center gap-2"><Clock size={14} className="text-blue-500" /><span className="font-bold text-blue-700">{duration}h</span></div>
                          ) : (
                            <div className="flex items-center gap-2"><Clock size={14} className="text-amber-500 animate-pulse" /><span className="font-medium text-amber-700">In progress</span></div>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(record)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!loading && records.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-white/50 rounded-xl inline-block mb-4"><Clock size={48} className="text-gray-300" /></div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Attendance Records</h3>
                <p className="text-gray-600 mb-6">Try changing filters or clock in to create a record.</p>
                <button onClick={clockIn} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl">
                  <LogIn size={20} />Clock In Now
                </button>
              </div>
            )}
          </div>
          {records.length > 0 && renderPagination()}
        </div>
      </div>
    </div>
  );
}
