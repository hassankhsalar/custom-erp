import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ name: "", date: "", isPaid: true, description: "" });
  const token = localStorage.getItem("token");

  const fetchHolidays = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/holidays`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setHolidays(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_ROUTES.HRM}/holidays`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ name: "", date: "", isPaid: true, description: "" });
    fetchHolidays();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Holidays</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border p-2 rounded" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <select className="border p-2 rounded" value={form.isPaid ? "paid" : "unpaid"} onChange={(e) => setForm({ ...form, isPaid: e.target.value === "paid" })}>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button className="bg-blue-600 text-white rounded p-2">Add</button>
      </form>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Paid</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id} className="border-t">
                <td className="p-2">{h.name}</td>
                <td className="p-2">{new Date(h.date).toLocaleDateString()}</td>
                <td className="p-2">{h.isPaid ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
