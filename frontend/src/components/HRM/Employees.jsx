import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Employees() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ userId: "", designation: "", baseSalary: "", salaryType: "monthly", joiningDate: "", status: "active" });
  const [managerForm, setManagerForm] = useState({ userId: "", managerId: "" });
  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_ROUTES.HRM}/employees`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({ userId: "", designation: "", baseSalary: "", salaryType: "monthly", joiningDate: "", status: "active" });
      fetchUsers();
    }
  };

  const handleManagerAssign = async (e) => {
    e.preventDefault();
    await fetch(`${API_ROUTES.HRM}/employees/${managerForm.userId}/manager`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: managerForm.managerId, isPrimary: true })
    });
    setManagerForm({ userId: "", managerId: "" });
    fetchUsers();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Employees</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <select className="border p-2 rounded" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
          <option value="">Select User</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
        </select>
        <input className="border p-2 rounded" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Base Salary" type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
        <select className="border p-2 rounded" value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}>
          <option value="monthly">Monthly</option>
          <option value="hourly">Hourly</option>
        </select>
        <button className="bg-blue-600 text-white rounded p-2">Save</button>
      </form>
      <form onSubmit={handleManagerAssign} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <select className="border p-2 rounded" value={managerForm.userId} onChange={(e) => setManagerForm({ ...managerForm, userId: e.target.value })} required>
          <option value="">Select Employee</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
        </select>
        <select className="border p-2 rounded" value={managerForm.managerId} onChange={(e) => setManagerForm({ ...managerForm, managerId: e.target.value })} required>
          <option value="">Select Manager</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
        </select>
        <button className="bg-emerald-600 text-white rounded p-2">Assign Manager</button>
      </form>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Designation</th>
              <th className="p-2 text-left">Salary</th>
              <th className="p-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.name || u.username}</td>
                <td className="p-2">{u.employeeProfile?.designation || "-"}</td>
                <td className="p-2">{u.employeeProfile?.baseSalary || 0}</td>
                <td className="p-2">{u.employeeProfile?.salaryType || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
