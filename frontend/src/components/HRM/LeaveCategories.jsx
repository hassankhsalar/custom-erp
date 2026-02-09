import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function LeaveCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", isPaid: true, maxDays: "" });
  const token = localStorage.getItem("token");

  const fetchCategories = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/leave-categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_ROUTES.HRM}/leave-categories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ name: "", isPaid: true, maxDays: "" });
    fetchCategories();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Leave Categories</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="border p-2 rounded" value={form.isPaid ? "paid" : "unpaid"} onChange={(e) => setForm({ ...form, isPaid: e.target.value === "paid" })}>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <input className="border p-2 rounded" placeholder="Max days" type="number" value={form.maxDays} onChange={(e) => setForm({ ...form, maxDays: e.target.value })} />
        <button className="bg-blue-600 text-white rounded p-2">Add</button>
      </form>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Paid</th>
              <th className="p-2 text-left">Max Days</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.isPaid ? "Yes" : "No"}</td>
                <td className="p-2">{c.maxDays || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
