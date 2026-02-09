import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function BestSellingReport() {
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState("best");
  const token = localStorage.getItem("token");

  const fetchRows = async (value) => {
    const res = await fetch(`${API_ROUTES.REPORT_BEST_SELLING}?sort=${value}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
  };

  useEffect(() => {
    fetchRows(sort);
  }, [sort]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Best/Worst Selling</h1>
      <div className="mb-4">
        <select className="border p-2 rounded" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="best">Best Selling</option>
          <option value="worst">Worst Selling</option>
        </select>
      </div>
      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left">Quantity</th>
              <th className="p-2 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.quantity}</td>
                <td className="p-2">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="p-4 text-gray-500">No data</div>}
      </div>
    </div>
  );
}
