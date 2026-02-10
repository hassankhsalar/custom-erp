import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  Clock,
  Calendar,
  User,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  PlayCircle,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Zap,
  Users
} from "lucide-react";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const token = localStorage.getItem("token");

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROUTES.HRM}/clock-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const clockIn = async () => {
    try {
      await fetch(`${API_ROUTES.HRM}/clock-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords();
    } catch (error) {
      console.error("Error clocking in:", error);
    }
  };

  const clockOut = async () => {
    try {
      await fetch(`${API_ROUTES.HRM}/clock-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords();
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  // Calculate statistics
  const activeSessions = records.filter(r => !r.clockOut).length;
  const todayRecords = records.filter(r => {
    const today = new Date().toDateString();
    const recordDate = new Date(r.clockIn).toDateString();
    return recordDate === today;
  }).length;
  const uniqueUsers = [...new Set(records.map(r => r.user?.id || r.user?.username))].length;

  // Get latest status
  const latestRecord = records.length > 0 ? records[0] : null;
  const isClockedIn = latestRecord && !latestRecord.clockOut;

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = records.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getStatusBadge = (record) => {
    if (!record.clockOut) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-full">
          <PlayCircle size={14} className="text-emerald-600 animate-pulse" />
          <span className="text-emerald-700 font-medium">Active</span>
        </div>
      );
    }
    
    if (record.status?.toLowerCase() === "completed") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full">
          <CheckCircle size={14} className="text-blue-600" />
          <span className="text-blue-700 font-medium">Completed</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-500/10 to-gray-400/10 rounded-full">
        <StopCircle size={14} className="text-gray-600" />
        <span className="text-gray-700 font-medium">{record.status || "Closed"}</span>
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
                <Clock className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Attendance Tracker
                </h1>
                <p className="text-gray-600 mt-2">Manage and track employee clock-in/out records</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-xl border border-white/60">
                <div className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {isClockedIn ? 'Currently Clocked In' : 'Ready to Clock In'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{records.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-emerald-600">{activeSessions}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Zap size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-purple-600">{uniqueUsers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Clock In/Out Controls */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Quick Actions
              </h2>
              <p className="text-gray-600">Click below to record your attendance</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={clockIn}
                disabled={isClockedIn}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-emerald-300 disabled:to-green-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <LogIn size={20} />
                Clock In
              </button>
              
              <button
                onClick={clockOut}
                disabled={!isClockedIn}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 disabled:from-red-300 disabled:to-rose-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <LogOut size={20} />
                Clock Out
              </button>
            </div>
          </div>
          
          {/* Current status indicator */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-white/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isClockedIn ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {isClockedIn ? (
                    <PlayCircle size={20} className="text-emerald-600" />
                  ) : (
                    <StopCircle size={20} className="text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {isClockedIn ? 'You are currently clocked in' : 'You are not clocked in'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {latestRecord ? (
                      isClockedIn ? (
                        `Clocked in at ${new Date(latestRecord.clockIn).toLocaleTimeString()}`
                      ) : (
                        `Last session ended at ${new Date(latestRecord.clockOut).toLocaleTimeString()}`
                      )
                    ) : 'No attendance records yet'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Today's Records</p>
                <p className="text-2xl font-bold text-blue-600">{todayRecords}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                Attendance History
              </h2>
              <p className="text-gray-600 mt-1">All clock-in and clock-out records</p>
            </div>
          </div>

          {loading && records.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading attendance records...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Employee</th>
                      <th className="p-4 text-left font-medium text-gray-700">Clock In Time</th>
                      <th className="p-4 text-left font-medium text-gray-700">Clock Out Time</th>
                      <th className="p-4 text-left font-medium text-gray-700">Duration</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record, index) => {
                      const duration = record.clockOut 
                        ? Math.round((new Date(record.clockOut) - new Date(record.clockIn)) / (1000 * 60 * 60) * 10) / 10
                        : null;
                      
                      return (
                        <tr 
                          key={record.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                                <User size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {record.user?.name || record.user?.username || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  ID: {record.user?.id || record.user?.username || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <LogIn size={14} className="text-emerald-500" />
                              {formatDateTime(record.clockIn)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <LogOut size={14} className="text-red-500" />
                              {formatDateTime(record.clockOut)}
                            </div>
                          </td>
                          <td className="p-4">
                            {duration !== null ? (
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-blue-500" />
                                <span className="font-bold text-blue-700">{duration}h</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-amber-500 animate-pulse" />
                                <span className="font-medium text-amber-700">In progress</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(record)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {records.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Clock size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Attendance Records</h3>
                    <p className="text-gray-600 mb-6">Start by clocking in to create your first record</p>
                    <button
                      onClick={clockIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <LogIn size={20} />
                      Clock In Now
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {records.length > 0 && (
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
                        <span className="font-semibold">{Math.min(endIndex, records.length)}</span>{" "}
                        of <span className="font-semibold">{records.length}</span> records
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