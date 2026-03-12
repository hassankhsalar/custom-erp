import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CheckCheck,
  Calendar,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ExternalLink,
} from "lucide-react";
import { API_ROUTES } from "../config";
import { useAuth } from "../context/AuthContext";

const Notifications = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const { socket } = useAuth();

  const fetchRows = async (page = 1, limit = 10) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.NOTIFICATIONS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    setLoading(false);
  };

  const markAllRead = async () => {
    await fetch(API_ROUTES.NOTIFICATIONS_MARK_ALL_READ, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  useEffect(() => {
    const init = async () => {
      await markAllRead();
      await fetchRows(1, pagination.limit);
    };
    init();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      setRows((prev) => [notification, ...prev].slice(0, pagination.limit));
    };
    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, pagination.limit]);

  const currentPage = Number(pagination.page || 1);
  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const totalCount = Number(pagination.totalCount || 0);

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    fetchRows(pageNum, pagination.limit);
  };

  const renderPaginationControls = () => (
    <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{totalCount === 0 ? 0 : (currentPage - 1) * pagination.limit + 1}</span> to{" "}
          <span className="font-semibold">{Math.min(currentPage * pagination.limit, totalCount)}</span> of{" "}
          <span className="font-semibold">{totalCount}</span> notifications
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronsLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-40 border border-white/30">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum ? "bg-gradient-to-r from-emerald-500 to-lime-500 text-white" : "hover:bg-white/50 text-gray-700"}`}
                >
                  {pageNum}
                </button>
              );
            })}
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

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 p-4 md:p-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-12 h-12 border-4 border-lime-100 border-t-lime-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-lime-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-emerald-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-lime-500 rounded-2xl shadow-lg">
                <BellRing className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text text-transparent">
                  Notifications
                </h1>
                <p className="text-gray-600 mt-2">Track all system updates and alerts</p>
              </div>
            </div>
            <div className="hidden md:block px-6 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm font-medium text-gray-700">Total Notifications</p>
              <p className="text-2xl font-bold text-lime-700">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700">Title</th>
                  <th className="p-3 text-left font-medium text-gray-700">Description</th>
                  <th className="p-3 text-left font-medium text-gray-700">Status</th>
                  <th className="p-3 text-left font-medium text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n, idx) => (
                  <tr key={n.id} className={`border-t border-white/50 hover:bg-white/30 ${idx % 2 === 0 ? "bg-white/10" : ""}`}>
                    <td className="p-3">
                      <div className="font-medium text-gray-800">{n.title || "-"}</div>
                    </td>
                    <td className="p-3">
                    {n.link ? (
                        <Link to={n.link} className="inline-flex items-center gap-1 text-lime-700 hover:text-emerald-700 hover:underline">
                          {n.description || "-"}
                          <ExternalLink size={12} />
                        </Link>
                      ) : (
                        <span className="text-gray-700">{n.description || "-"}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          n.isRead ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <CheckCheck size={12} />
                        {n.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="text-gray-500" />
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="p-8 text-gray-500 text-center" colSpan="4">
                      No notifications
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalCount > 0 && renderPaginationControls()}
      </div>
    </div>
  );
};

export default Notifications;
