import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const ProductionReport = () => {
  const [factories, setFactories] = useState([]);
  const [factoryId, setFactoryId] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [summary, setSummary] = useState({ count: 0, byStatus: {} });
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchFactories = async () => {
    const res = await fetch(API_ROUTES.FACTORIES, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setFactories(Array.isArray(data) ? data : []);
  };

  const fetchSummary = async () => {
    if (!factoryId) return;
    const params = new URLSearchParams();
    params.append("factoryId", factoryId);
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    const res = await fetch(`${API_ROUTES.REPORT_PRODUCTION_SUMMARY}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setSummary({ count: data.count || 0, byStatus: data.byStatus || {} });
  };

  const fetchProducts = async (page = 1, limit = 10) => {
    if (!factoryId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.append("factoryId", factoryId);
    params.append("page", page);
    params.append("limit", limit);
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    const res = await fetch(`${API_ROUTES.REPORT_PRODUCTION_PRODUCTS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProducts(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    setLoading(false);
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    if (!factoryId) return;
    fetchSummary();
    fetchProducts(1, pagination.limit);
  }, [factoryId]);

  const applyFilter = () => {
    if (!factoryId) return;
    fetchSummary();
    fetchProducts(1, pagination.limit);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Production Report</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={factoryId}
          onChange={(e) => setFactoryId(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Factory</option>
          {factories.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          className="border p-2 rounded"
        />
        <button className="bg-blue-600 text-white px-3 rounded" onClick={applyFilter}>
          Apply
        </button>
      </div>

      {!factoryId ? (
        <div className="text-gray-600">Select a factory to view production report.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            {Object.keys(summary.byStatus).length === 0 && (
              <div className="border rounded p-3 bg-white col-span-2">
                No production records found.
              </div>
            )}
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <div key={status} className="border rounded p-3 bg-white">
                <div className="text-sm text-gray-500 capitalize">{status.replace("_", " ")}</div>
                <div className="text-xl font-semibold">{count}</div>
              </div>
            ))}
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Total Productions</div>
              <div className="text-xl font-semibold">{summary.count || 0}</div>
            </div>
          </div>

          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-left">Avg Cost</th>
                  <th className="p-2 text-left">Current Stock</th>
                  <th className="p-2 text-left">Processing Stock</th>
                  <th className="p-2 text-left">Damaged (Scrap)</th>
                  <th className="p-2 text-left">Avg Time (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-2" colSpan="6">Loading...</td>
                  </tr>
                ) : products.map((p) => (
                  <tr key={p.productId} className="border-t">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{Number(p.avgCost || 0).toFixed(2)}</td>
                    <td className="p-2">{Number(p.currentStock || 0)}</td>
                    <td className="p-2">{Number(p.processingStock || 0)}</td>
                    <td className="p-2">{Number(p.currentScrap || 0)}</td>
                    <td className="p-2">{Number(p.avgHours || 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="px-3 py-1 border rounded"
              disabled={pagination.page <= 1}
              onClick={() => fetchProducts(pagination.page - 1, pagination.limit)}
            >
              Prev
            </button>
            <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
            <button
              className="px-3 py-1 border rounded"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchProducts(pagination.page + 1, pagination.limit)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductionReport;
