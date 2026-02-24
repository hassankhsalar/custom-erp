import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function CashRegisterRecords() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(API_ROUTES.CASHREGISTER_RECORDS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch records");
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRows();
  }, []);

  if (loading) {
    return <div className="p-6">Loading records...</div>;
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Cash Register Records
        </h1>
        <p className="text-gray-600 mt-1">Open-close records of cash registers</p>
      </div>

      {error && (
        <div className="glass-card p-4 mb-4 border border-red-200/40 bg-red-50/40 text-red-700">{error}</div>
      )}

      <div className="glass-card border border-white/20 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50">
              <th className="p-4 text-left">Register</th>
              <th className="p-4 text-left">Opened At</th>
              <th className="p-4 text-left">Closed At</th>
              <th className="p-4 text-left">Start Cash</th>
              <th className="p-4 text-left">End Cash</th>
              <th className="p-4 text-left">Opened By</th>
              <th className="p-4 text-left">Closed By</th>
              <th className="p-4 text-left">Shop</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="p-4">{row.cashRegister?.name || `#${row.cashRegisterId}`}</td>
                <td className="p-4">{row.opening_at ? new Date(row.opening_at).toLocaleString() : "-"}</td>
                <td className="p-4">{row.closing_at ? new Date(row.closing_at).toLocaleString() : "-"}</td>
                <td className="p-4">{Number(row.starting_cash || 0).toFixed(2)}</td>
                <td className="p-4">{row.ending_cash == null ? "-" : Number(row.ending_cash).toFixed(2)}</td>
                <td className="p-4">{row.user?.name || row.user?.username || "-"}</td>
                <td className="p-4">{row.closedBy?.name || row.closedBy?.username || "-"}</td>
                <td className="p-4">{row.shop?.name || "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={8}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
