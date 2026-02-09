import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Salaries() {
  const [salaries, setSalaries] = useState([]);
  const token = localStorage.getItem("token");

  const fetchSalaries = async () => {
    const res = await fetch(`${API_ROUTES.EXPENSES}/salaries/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSalaries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Salaries</h1>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-left">Net</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.user?.name || s.user?.username}</td>
                <td className="p-2">{s.month}/{s.year}</td>
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
