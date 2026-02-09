import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [form, setForm] = useState({ categoryId: "", accountId: "", amount: "", date: "", description: "", salaryId: "" });
  const token = localStorage.getItem("token");

  const fetchExpenses = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setExpenses(Array.isArray(data) ? data : []);
  };

  const fetchCategories = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  const fetchAccounts = async () => {
    const res = await fetch(`${API_ROUTES.ACCOUNTS}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  };

  const fetchSalaries = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}/salaries/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSalaries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchAccounts();
    fetchSalaries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_ROUTES.EXPENSES}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ categoryId: "", accountId: "", amount: "", date: "", description: "", salaryId: "" });
    fetchExpenses();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Expenses</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <select className="border p-2 rounded" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
          <option value="">Select Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border p-2 rounded" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required>
          <option value="">Select Account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="border p-2 rounded" value={form.salaryId} onChange={(e) => setForm({ ...form, salaryId: e.target.value })}>
          <option value="">Salary (optional)</option>
          {salaries.map(s => (
            <option key={s.id} value={s.id}>
              {s.user?.name || s.user?.username} - {s.month}/{s.year}
            </option>
          ))}
        </select>
        <input className="border p-2 rounded" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input className="border p-2 rounded" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <button className="bg-blue-600 text-white rounded p-2">Add</button>
      </form>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Account</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.category?.name}</td>
                <td className="p-2">{e.account?.name}</td>
                <td className="p-2">{e.amount}</td>
                <td className="p-2">{new Date(e.date).toLocaleDateString()}</td>
                <td className="p-2">{e.description || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
