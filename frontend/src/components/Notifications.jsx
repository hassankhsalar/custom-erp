import { useEffect, useState } from "react";
import { API_ROUTES } from "../config";
import { useAuth } from "../App";

const Notifications = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const token = localStorage.getItem("token");
  const { socket } = useAuth();

  const fetchRows = async (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.NOTIFICATIONS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="p-2">{n.title}</td>
                <td className="p-2">{n.description || "-"}</td>
                <td className="p-2">{n.isRead ? "Read" : "Unread"}</td>
                <td className="p-2">{new Date(n.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2 text-gray-500" colSpan="4">No notifications</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1 border rounded" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1, pagination.limit)}>Prev</button>
        <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
        <button className="px-3 py-1 border rounded" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1, pagination.limit)}>Next</button>
      </div>
    </div>
  );
};

export default Notifications;
