import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const token = localStorage.getItem("token");

  const fetchRecords = async () => {
    const res = await fetch(`${API_ROUTES.HRM}/clock-records`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const clockIn = async () => {
    await fetch(`${API_ROUTES.HRM}/clock-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRecords();
  };

  const clockOut = async () => {
    await fetch(`${API_ROUTES.HRM}/clock-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRecords();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Attendance</h1>
      <div className="flex gap-3 mb-4">
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={clockIn}>Clock In</button>
        <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={clockOut}>Clock Out</button>
      </div>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Clock In</th>
              <th className="p-2 text-left">Clock Out</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.user?.name || r.user?.username}</td>
                <td className="p-2">{new Date(r.clockIn).toLocaleString()}</td>
                <td className="p-2">{r.clockOut ? new Date(r.clockOut).toLocaleString() : "-"}</td>
                <td className="p-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
