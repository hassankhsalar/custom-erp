import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function ExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const token = localStorage.getItem("token");

  const fetchCategories = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}/categories`, {
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
    await fetch(`${API_ROUTES.EXPENSES}/categories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    setName("");
    fetchCategories();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Expense Categories</h1>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input className="border p-2 rounded flex-1" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="bg-blue-600 text-white rounded px-4">Add</button>
      </form>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
