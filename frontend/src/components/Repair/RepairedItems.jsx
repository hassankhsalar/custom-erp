import { useEffect, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Eye, Loader2, MoreVertical, RefreshCw, XCircle } from "lucide-react";
import { API_ROUTES } from "../../config";

export default function RepairedItems() {
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [viewModal, setViewModal] = useState({ open: false, row: null });
  const [statusModal, setStatusModal] = useState({ open: false, row: null, lines: [], saving: false, error: "" });

  const fetchRepairs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(itemsPerPage) });
      const res = await fetch(`${API_ROUTES.REPAIRS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch repairs");
      setRows(data.repairs || []);
      setTotalItems(data.pagination?.totalItems || data.repairs?.length || 0);
    } catch (err) {
      setError(err.message || "Failed to fetch repairs");
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest(".dropdown-container")) setActiveDropdown(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const openStatusModal = (row) => {
    setStatusModal({
      open: true,
      row,
      lines: (row.items || []).map((item) => ({
        repairItemId: item.id,
        name: item.product?.name || item.material?.name || "-",
        itemType: item.itemType,
        quantity: Number(item.quantity || 0),
        successQuantity: Number(item.success || 0),
        failQuantity: Number(item.fail || 0),
      })),
      saving: false,
      error: "",
    });
    setActiveDropdown(null);
  };

  const submitStatus = async () => {
    const invalid = statusModal.lines.find(
      (line) => Number(line.successQuantity || 0) + Number(line.failQuantity || 0) > Number(line.quantity || 0)
    );
    if (invalid) return setStatusModal((prev) => ({ ...prev, error: `Invalid quantities for ${invalid.name}` }));

    try {
      setStatusModal((prev) => ({ ...prev, saving: true, error: "" }));
      const payload = {
        status: "completed",
        returnedItems: statusModal.lines.map((line) => ({
          repairItemId: line.repairItemId,
          successQuantity: Number(line.successQuantity || 0),
          failQuantity: Number(line.failQuantity || 0),
        })),
      };
      const res = await fetch(API_ROUTES.REPAIR_STATUS(statusModal.row.id), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setStatusModal({ open: false, row: null, lines: [], saving: false, error: "" });
      fetchRepairs();
    } catch (err) {
      setStatusModal((prev) => ({ ...prev, saving: false, error: err.message || "Failed to update status" }));
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl mb-6 p-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Repaired Item</h1>
        <p className="text-gray-600">Track mixed repair requests and complete success/fail processing.</p>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <div className="text-sm text-gray-600">Total: {totalItems}</div>
        </div>
        {error && <div className="text-rose-600 mb-3">{error}</div>}

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/60">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Destination</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Shipping</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/50">
                    <td className="p-3 font-semibold">{row.reference}</td>
                    <td className="p-3">{row.from} #{row.fromId}</td>
                    <td className="p-3">{row.destination}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">{row.items?.length || 0}</td>
                    <td className="p-3">${Number(row.shippingCost || 0).toFixed(2)}</td>
                    <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="relative dropdown-container">
                        <button onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                        {activeDropdown === row.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-xl z-20 py-1">
                            <button onClick={() => { setViewModal({ open: true, row }); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"><Eye size={14} /> View</button>
                            <button onClick={() => openStatusModal(row)} className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2"><RefreshCw size={14} /> Update Status</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td className="p-8 text-center text-gray-500" colSpan={8}>No repair requests found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"><ChevronLeft size={16} /></button>
            <span className="text-sm">Page {currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {viewModal.open && viewModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Repair Details - {viewModal.row.reference}</h3>
              <button onClick={() => setViewModal({ open: false, row: null })}><XCircle /></button>
            </div>
            <div className="p-5 space-y-2">
              {(viewModal.row.items || []).map((item) => (
                <div key={item.id} className="grid grid-cols-5 gap-2 text-sm border-b pb-2">
                  <div>{item.product?.name || item.material?.name || "-"}</div>
                  <div>{item.itemType}</div>
                  <div>Sent: {Number(item.quantity || 0)}</div>
                  <div>Success: {Number(item.success || 0)}</div>
                  <div>Fail: {Number(item.fail || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {statusModal.open && statusModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-lg">Update Repair Status - {statusModal.row.reference}</h3>
            </div>
            <div className="p-5 space-y-2">
              {statusModal.lines.map((line, idx) => (
                <div key={line.repairItemId} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-sm">
                  <div className="md:col-span-5">{line.name} <span className="text-xs text-gray-500">({line.itemType})</span></div>
                  <div className="md:col-span-2">Sent: {line.quantity}</div>
                  <input type="number" min="0" step="0.01" value={line.successQuantity} onChange={(e) => setStatusModal((prev) => ({ ...prev, lines: prev.lines.map((x, i) => i === idx ? { ...x, successQuantity: e.target.value } : x) }))} className="md:col-span-2 rounded-lg border border-gray-200 px-2 py-2" placeholder="Success" />
                  <input type="number" min="0" step="0.01" value={line.failQuantity} onChange={(e) => setStatusModal((prev) => ({ ...prev, lines: prev.lines.map((x, i) => i === idx ? { ...x, failQuantity: e.target.value } : x) }))} className="md:col-span-2 rounded-lg border border-gray-200 px-2 py-2" placeholder="Fail" />
                  <div className="md:col-span-1 text-green-600"><CheckCircle size={14} /></div>
                </div>
              ))}
              {statusModal.error && <div className="text-rose-600 text-sm">{statusModal.error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setStatusModal({ open: false, row: null, lines: [], saving: false, error: "" })} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
                <button onClick={submitStatus} disabled={statusModal.saving} className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60">{statusModal.saving ? "Saving..." : "Mark Completed"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
