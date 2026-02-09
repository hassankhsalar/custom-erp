import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Payroll() {
  const [salaries, setSalaries] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const token = localStorage.getItem("token");

  const fetchSalaries = async () => {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);
    const res = await fetch(`${API_ROUTES.HRM}/payroll?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSalaries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchSalaries();
  }, [month, year]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payroll</h1>
      <div className="flex gap-3 mb-4">
        <input className="border p-2 rounded" placeholder="Month (1-12)" value={month} onChange={(e) => setMonth(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-left">Base</th>
              <th className="p-2 text-left">Allow</th>
              <th className="p-2 text-left">Deduct</th>
              <th className="p-2 text-left">Net</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.user?.name || s.user?.username}</td>
                <td className="p-2">{s.month}/{s.year}</td>
                <td className="p-2">{s.baseSalary}</td>
                <td className="p-2">{s.allowances}</td>
                <td className="p-2">{s.deductions}</td>
                <td className="p-2">{s.net}</td>
                <td className="p-2">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
