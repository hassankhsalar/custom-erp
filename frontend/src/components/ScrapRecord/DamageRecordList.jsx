import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, DollarSign, Eye, RefreshCw, Trash2 } from "lucide-react";
import { API_ROUTES } from "../../config";
import { useAuth } from "../../App";

const pageSize = 20;

export default function DamageRecordList() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadRecords = async (nextPage = page) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_ROUTES.DAMAGE_RECORDS}?page=${nextPage}&limit=${pageSize}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load damage records");
      setRecords(Array.isArray(data?.records) ? data.records : []);
      setPage(Number(data?.currentPage || nextPage));
      setTotalPages(Math.max(1, Number(data?.totalPages || 1)));
    } catch (error) {
      setMessage(error.message || "Failed to load damage records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRecords(1);
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this damage record?")) return;
    setMessage("");
    try {
      const res = await fetch(API_ROUTES.DAMAGE_RECORD_BY_ID(id), {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete damage record");
      await loadRecords(page);
    } catch (error) {
      setMessage(error.message || "Failed to delete damage record");
    }
  };

  return (
    <div className="relative w-full mx-auto">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Damage Records
              </h2>
              <p className="text-gray-600">Track and manage combined product/material damage records.</p>
            </div>
          </div>
          <button onClick={() => loadRecords(page)} className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2 bg-white/80 hover:bg-white">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No damage records found.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/60">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Loss</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-t border-white/50 hover:bg-white/30">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600" />
                        <span className="font-medium">{row.reason}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(row.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.fromType} #{row.fromId}</td>
                    <td className="px-4 py-3">{Array.isArray(row.items) ? row.items.length : 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                        <DollarSign size={14} />
                        {Number(row.totalLoss || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelected(row)} className="p-2 rounded-lg border hover:bg-gray-50" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-2 rounded-lg border text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 mt-4 border-t border-white/60">
          <button
            onClick={() => loadRecords(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
          <button
            onClick={() => loadRecords(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Damage Record #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="px-2 py-1 rounded border text-sm">Close</button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Source:</span> {selected.fromType} #{selected.fromId}</div>
              <div><span className="text-gray-500">Date:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500">Reason:</span> {selected.reason}</div>
              <div><span className="text-gray-500">Total Loss:</span> {Number(selected.totalLoss || 0).toFixed(2)}</div>
            </div>
            <div className="mt-4 border rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Loss/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 capitalize">{item.itemType}</td>
                      <td className="px-3 py-2">{item.product?.name || item.material?.name || "-"}</td>
                      <td className="px-3 py-2 text-right">{Number(item.quantity || 0)}</td>
                      <td className="px-3 py-2 text-right">{Number(item.lossPerUnit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected.note ? <p className="mt-3 text-sm text-gray-700"><span className="text-gray-500">Note:</span> {selected.note}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
