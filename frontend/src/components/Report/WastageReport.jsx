import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const WastageReport = () => {
  const [tab, setTab] = useState("materials");
  const [factories, setFactories] = useState([]);
  const [factoryId, setFactoryId] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [rows, setRows] = useState([]);
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

  const fetchRows = async (page = 1, limit = 10) => {
    if (!factoryId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.append("factoryId", factoryId);
    params.append("page", page);
    params.append("limit", limit);
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    const endpoint = tab === "materials"
      ? API_ROUTES.REPORT_WASTAGE_MATERIALS
      : API_ROUTES.REPORT_WASTAGE_PRODUCTS;
    const res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    setLoading(false);
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    if (!factoryId) return;
    fetchRows(1, pagination.limit);
  }, [factoryId, tab]);

  const applyFilter = () => {
    if (!factoryId) return;
    fetchRows(1, pagination.limit);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Wastage Report</h1>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab === "materials" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("materials")}>Material</button>
        <button className={`px-3 py-2 rounded ${tab === "products" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("products")}>Product</button>
      </div>

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
        <div className="text-gray-600">Select a factory to view wastage report.</div>
      ) : (
        <>
          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                {tab === "materials" ? (
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-left">Brand</th>
                    <th className="p-2 text-left">Total Used</th>
                    <th className="p-2 text-left">Total Scrap</th>
                    <th className="p-2 text-left">Wastage %</th>
                    <th className="p-2 text-left">Current Scrap</th>
                  </tr>
                ) : (
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Total Produced</th>
                    <th className="p-2 text-left">Total Scrap</th>
                    <th className="p-2 text-left">Wastage %</th>
                    <th className="p-2 text-left">Current Scrap</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-2" colSpan="6">Loading...</td>
                  </tr>
                ) : rows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    {tab === "materials" ? (
                      <>
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.brand || "-"}</td>
                        <td className="p-2">{Number(r.totalUsed || 0)}</td>
                        <td className="p-2">{Number(r.totalScrap || 0)}</td>
                        <td className="p-2">{Number(r.scrapPercent || 0).toFixed(2)}%</td>
                        <td className="p-2">{Number(r.currentScrap || 0)}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.category || "-"}</td>
                        <td className="p-2">{Number(r.totalProduced || 0)}</td>
                        <td className="p-2">{Number(r.totalScrap || 0)}</td>
                        <td className="p-2">{Number(r.scrapPercent || 0).toFixed(2)}%</td>
                        <td className="p-2">{Number(r.currentScrap || 0)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="px-3 py-1 border rounded"
              disabled={pagination.page <= 1}
              onClick={() => fetchRows(pagination.page - 1, pagination.limit)}
            >
              Prev
            </button>
            <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
            <button
              className="px-3 py-1 border rounded"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRows(pagination.page + 1, pagination.limit)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WastageReport;
