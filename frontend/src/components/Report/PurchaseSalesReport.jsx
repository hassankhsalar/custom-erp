import { useEffect, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";

const PurchaseSalesReport = () => {
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const token = localStorage.getItem("token");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchRows = async (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.REPORT_PURCHASE_SALES_DETAILS}?${params.toString()}`, {
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
      <h1 className="text-2xl font-bold mb-4">Purchase vs Sales</h1>
      <div className="flex gap-3 mb-4">
        <input type="date" value={range.startDate} onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))} className="border p-2 rounded" />
        <input type="date" value={range.endDate} onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))} className="border p-2 rounded" />
        <button className="bg-blue-600 text-white px-3 rounded" onClick={() => fetchRows(1, pagination.limit)}>Apply</button>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Purchase Qty</th>
              <th className="p-2 text-left">Purchase Amount</th>
              <th className="p-2 text-left">Sold Qty</th>
              <th className="p-2 text-left">Sold Amount</th>
              <th className="p-2 text-left">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const imageUrl = getImageUrl(r.image);
              return (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    {imageUrl ? (
                      <img src={imageUrl} alt={r.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded" />
                    )}
                  </td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.category || "-"}</td>
                  <td className="p-2">{Number(r.purchaseQty || 0)}</td>
                  <td className="p-2">{Number(r.purchaseAmount || 0).toFixed(2)}</td>
                  <td className="p-2">{Number(r.saleQty || 0)}</td>
                  <td className="p-2">{Number(r.saleAmount || 0).toFixed(2)}</td>
                  <td className="p-2">{Number(r.profit || 0).toFixed(2)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="p-2 text-gray-500" colSpan="8">No data</td>
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

export default PurchaseSalesReport;
