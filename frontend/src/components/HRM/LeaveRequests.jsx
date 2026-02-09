import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ categoryId: "", startDate: "", endDate: "", reason: "" });
  const token = localStorage.getItem("token");

  const fetchRequests = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/leave-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRequests(Array.isArray(data) ? data : []);
  };

  const fetchCategories = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/leave-categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_ROUTES.HRM}/leave-requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ categoryId: "", startDate: "", endDate: "", reason: "" });
    fetchRequests();
  };

  const handleApprove = async (id, action) => {
    await fetch(`${API_ROUTES.HRM}/leave-requests/${id}/${action}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "" })
    });
    fetchRequests();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Leave Requests</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <select className="border p-2 rounded" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
          <option value="">Select Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="border p-2 rounded" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        <input className="border p-2 rounded" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
        <button className="bg-blue-600 text-white rounded p-2">Request</button>
      </form>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Dates</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.user?.name || r.user?.username}</td>
                <td className="p-2">{r.category?.name}</td>
                <td className="p-2">{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => handleApprove(r.id, "approve")}>Approve</button>
                      <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => handleApprove(r.id, "reject")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
