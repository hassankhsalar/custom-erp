import { useEffect, useMemo, useState } from "react";
import { API_ROUTES } from "../../config";

const PurchaseReport = () => {
  const [tab, setTab] = useState("perDate");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [perDateRows, setPerDateRows] = useState([]);
  const [perMonthRows, setPerMonthRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const token = localStorage.getItem("token");

  const fetchPerDate = async () => {
    const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_PER_DATE}?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPerDateRows(data.rows || []);
  };

  const fetchPerMonth = async () => {
    const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_PER_MONTH}?year=${year}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPerMonthRows(data.rows || []);
  };

  const fetchAll = async (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.REPORT_PURCHASES_ALL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAllRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
  };

  useEffect(() => {
    if (tab === "perDate") fetchPerDate();
  }, [tab, month]);

  useEffect(() => {
    if (tab === "perMonth") fetchPerMonth();
  }, [tab, year]);

  useEffect(() => {
    if (tab === "all") fetchAll(pagination.page, pagination.limit);
  }, [tab]);

  const daysOfMonth = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(y, m - 1, i + 1);
      return {
        key: date.toISOString().slice(0, 10),
        day: String(i + 1).padStart(2, "0"),
        weekday: date.toLocaleDateString("en-US", { weekday: "short" })
      };
    });
  }, [month]);

  const perDateMap = useMemo(() => {
    const map = {};
    perDateRows.forEach(r => {
      map[r.date] = {
        purchaseCount: Number(r.purchaseCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        shippingCost: Number(r.shippingCost || 0)
      };
    });
    return map;
  }, [perDateRows]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Purchase Report</h1>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab === "perDate" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("perDate")}>Per Date</button>
        <button className={`px-3 py-2 rounded ${tab === "perMonth" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("perMonth")}>Per Month</button>
        <button className={`px-3 py-2 rounded ${tab === "all" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("all")}>All</button>
      </div>

      {tab === "perDate" && (
        <>
          <div className="mb-4">
            <label className="text-sm text-gray-600 mr-2">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border p-2 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {daysOfMonth.map(d => {
              const stats = perDateMap[d.key] || { purchaseCount: 0, totalAmount: 0, shippingCost: 0 };
              return (
                <div key={d.key} className="border rounded p-3 bg-white">
                  <div className="text-sm text-gray-500">{d.day} {d.weekday}</div>
                  <div className="text-sm">Purchases: {stats.purchaseCount}</div>
                  <div className="text-sm">Amount: {stats.totalAmount.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "perMonth" && (
        <>
          <div className="mb-4">
            <label className="text-sm text-gray-600 mr-2">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="border p-2 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => {
              const row = perMonthRows.find(r => Number(r.month) === i + 1) || { purchaseCount: 0, totalAmount: 0, shippingCost: 0 };
              return (
                <div key={i} className="border rounded p-3 bg-white">
                  <div className="text-sm text-gray-500">{new Date(0, i).toLocaleString("en-US", { month: "long" })}</div>
                  <div className="text-sm">Purchases: {row.purchaseCount || 0}</div>
                  <div className="text-sm">Amount: {Number(row.totalAmount || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "all" && (
        <>
          <div className="flex gap-3 mb-4">
            <input type="date" value={range.startDate} onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))} className="border p-2 rounded" />
            <input type="date" value={range.endDate} onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))} className="border p-2 rounded" />
            <button className="bg-blue-600 text-white px-3 rounded" onClick={() => fetchAll(1, pagination.limit)}>Apply</button>
          </div>
          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Total Purchase</th>
                  <th className="p-2 text-left">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.purchaseCount}</td>
                    <td className="p-2">{Number(r.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1 border rounded" disabled={pagination.page <= 1} onClick={() => fetchAll(pagination.page - 1, pagination.limit)}>Prev</button>
            <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
            <button className="px-3 py-1 border rounded" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchAll(pagination.page + 1, pagination.limit)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseReport;
