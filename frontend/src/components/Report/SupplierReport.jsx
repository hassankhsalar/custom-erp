import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const SupplierReport = () => {
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const token = localStorage.getItem("token");

  const fetchRows = async (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.REPORT_SUPPLIER_DETAILS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
  };

  useEffect(() => {
    fetchRows(pagination.page, pagination.limit);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Supplier Report</h1>
      <div className="flex gap-3 mb-4">
        <input type="date" value={range.startDate} onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))} className="border p-2 rounded" />
        <input type="date" value={range.endDate} onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))} className="border p-2 rounded" />
        <button className="bg-blue-600 text-white px-3 rounded" onClick={() => fetchRows(1, pagination.limit)}>Apply</button>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Supplier</th>
              <th className="p-2 text-left">Mobile</th>
              <th className="p-2 text-left">Items (Qty)</th>
              <th className="p-2 text-left">Item Types</th>
              <th className="p-2 text-left">Total Paid</th>
              <th className="p-2 text-left">Total Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.mobile || "-"}</td>
                <td className="p-2">{Number(r.totalItemQty || 0)}</td>
                <td className="p-2">{Number(r.itemTypeCount || 0)}</td>
                <td className="p-2">{Number(r.totalPaid || 0).toFixed(2)}</td>
                <td className="p-2">{Number(r.totalDue || 0).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2 text-gray-500" colSpan="6">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1 border rounded" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1, pagination.limit)}>Prev</button>
        <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
        <button className="px-3 py-1 border rounded" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1, pagination.limit)}>Next</button>
      </div>
    </div>
  );
};

export default SupplierReport;
