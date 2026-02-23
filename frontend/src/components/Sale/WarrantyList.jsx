import { useEffect, useMemo, useState } from "react";
import { API_ROUTES } from "../../config";

export default function WarrantyList() {
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    customer: "",
    item: "",
    itemType: "",
    status: "",
    expiryFrom: "",
    expiryTo: "",
  });
  const [claimModal, setClaimModal] = useState({ open: false, warranty: null });
  const [viewModal, setViewModal] = useState({ open: false, loading: false, data: null });
  const [claimForm, setClaimForm] = useState({
    receivingDate: "",
    providingDate: "",
    issueDescription: "",
    resolution: "",
    note: "",
  });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  }, [filters]);

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.SHOP_WARRANTIES}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Warranty fetch error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [qs]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this warranty?")) return;
    try {
      const res = await fetch(API_ROUTES.SHOP_WARRANTY_BY_ID(id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchWarranties();
    } catch (error) {
      alert(error.message || "Failed to delete warranty");
    }
  };

  const handleEdit = async (row) => {
    const notes = prompt("Update warranty notes", row.notes || "");
    if (notes === null) return;
    try {
      const res = await fetch(API_ROUTES.SHOP_WARRANTY_BY_ID(row.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Update failed");
      fetchWarranties();
    } catch (error) {
      alert(error.message || "Failed to update warranty");
    }
  };

  const openClaimModal = (warranty) => {
    setClaimModal({ open: true, warranty });
    setClaimForm({
      receivingDate: "",
      providingDate: "",
      issueDescription: "",
      resolution: "",
      note: "",
    });
  };

  const openViewModal = async (id) => {
    setViewModal({ open: true, loading: true, data: null });
    try {
      const res = await fetch(API_ROUTES.SHOP_WARRANTY_BY_ID(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load warranty details");
      setViewModal({ open: true, loading: false, data });
    } catch (error) {
      alert(error.message || "Failed to load warranty details");
      setViewModal({ open: false, loading: false, data: null });
    }
  };

  const submitClaim = async () => {
    if (!claimModal.warranty) return;
    if (!claimForm.receivingDate) {
      alert("Receiving date is required");
      return;
    }
    try {
      const res = await fetch(API_ROUTES.SHOP_WARRANTY_CLAIMS(claimModal.warranty.id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(claimForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClaimModal({ open: false, warranty: null });
      fetchWarranties();
    } catch (error) {
      alert(error.message || "Failed to submit claim");
    }
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active") return "bg-gradient-to-r from-emerald-500 to-green-500 text-white";
    if (s === "claimed") return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
    if (s === "expired") return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
    if (s === "void") return "bg-gradient-to-r from-red-500 to-rose-500 text-white";
    return "bg-gray-200 text-gray-700";
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full  mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Warranty List
              </h1>
              <p className="text-gray-600 mt-2">Track warranties and claim history</p>
            </div>
            <div className="px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
              <p className="text-sm text-gray-600">Total Warranties</p>
              <p className="text-2xl font-bold text-indigo-600">{rows.length}</p>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} />
        <input className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Product/Material" value={filters.item} onChange={(e) => setFilters((f) => ({ ...f, item: e.target.value }))} />
        <select className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" value={filters.itemType} onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}>
          <option value="">All Types</option>
          <option value="product">Product</option>
          <option value="material">Material</option>
        </select>
        <select className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="claimed">Claimed</option>
          <option value="expired">Expired</option>
          <option value="void">Void</option>
        </select>
        <input type="date" className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" value={filters.expiryFrom} onChange={(e) => setFilters((f) => ({ ...f, expiryFrom: e.target.value }))} />
        <input type="date" className="px-3 py-2.5 bg-white/70 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" value={filters.expiryTo} onChange={(e) => setFilters((f) => ({ ...f, expiryTo: e.target.value }))} />
          </div>
        </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
      <div className="overflow-x-auto rounded-xl border border-white/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-100/80">
            <tr>
              <th className="p-4 text-left font-medium text-gray-700">Code</th>
              <th className="p-4 text-left font-medium text-gray-700">Customer</th>
              <th className="p-4 text-left font-medium text-gray-700">Item</th>
              <th className="p-4 text-left font-medium text-gray-700">Expiry</th>
              <th className="p-4 text-left font-medium text-gray-700">Status</th>
              <th className="p-4 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-6 text-center text-gray-600" colSpan={6}>Loading warranties...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-6 text-center text-gray-600" colSpan={6}>No warranties found</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-white/50 hover:bg-white/30 transition-colors duration-200">
                  <td className="p-4">
                    <div className="font-semibold text-gray-800">{row.warrantyCode}</div>
                    <div className="text-xs text-gray-500">Claims: {row.claimCount || 0}</div>
                  </td>
                  <td className="p-4">{row.customer?.name || "Walk-in"}</td>
                  <td className="p-4">{row.product?.name || row.material?.name || "-"}</td>
                  <td className="p-4">{row.endDate ? new Date(row.endDate).toLocaleDateString() : "-"}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                    <button className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" onClick={() => openViewModal(row.id)} title="View">View</button>
                    <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" onClick={() => handleEdit(row)} title="Edit">Edit</button>
                    <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" onClick={() => handleDelete(row.id)} title="Delete">Delete</button>
                    <button className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-xs font-medium" onClick={() => openClaimModal(row)}>Warranty Claim</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
      </div>

      {claimModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 border border-white/60">
            <h2 className="text-lg font-semibold">Warranty Claim</h2>
            <input type="date" className="border border-gray-300 rounded-lg p-2.5 w-full" value={claimForm.receivingDate} onChange={(e) => setClaimForm((f) => ({ ...f, receivingDate: e.target.value }))} />
            <input type="date" className="border border-gray-300 rounded-lg p-2.5 w-full" value={claimForm.providingDate} onChange={(e) => setClaimForm((f) => ({ ...f, providingDate: e.target.value }))} />
            <textarea className="border border-gray-300 rounded-lg p-2.5 w-full" rows={3} placeholder="Issue description" value={claimForm.issueDescription} onChange={(e) => setClaimForm((f) => ({ ...f, issueDescription: e.target.value }))} />
            <textarea className="border border-gray-300 rounded-lg p-2.5 w-full" rows={3} placeholder="Resolution / action" value={claimForm.resolution} onChange={(e) => setClaimForm((f) => ({ ...f, resolution: e.target.value }))} />
            <input className="border border-gray-300 rounded-lg p-2.5 w-full" placeholder="Note" value={claimForm.note} onChange={(e) => setClaimForm((f) => ({ ...f, note: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg" onClick={() => setClaimModal({ open: false, warranty: null })}>Cancel</button>
              <button className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg" onClick={submitClaim}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}

      {viewModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-4 space-y-4 max-h-[90vh] overflow-y-auto border border-white/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Warranty Details</h2>
              <button className="px-3 py-1 border rounded" onClick={() => setViewModal({ open: false, loading: false, data: null })}>Close</button>
            </div>

            {viewModal.loading ? (
              <div className="py-6">Loading...</div>
            ) : viewModal.data ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="border rounded p-3">
                    <div><b>Warranty Code:</b> {viewModal.data.warrantyCode || "-"}</div>
                    <div><b>Status:</b> {viewModal.data.status || "-"}</div>
                    <div><b>Serial:</b> {viewModal.data.serialNumber || "-"}</div>
                    <div><b>Start Date:</b> {viewModal.data.startDate ? new Date(viewModal.data.startDate).toLocaleDateString() : "-"}</div>
                    <div><b>End Date:</b> {viewModal.data.endDate ? new Date(viewModal.data.endDate).toLocaleDateString() : "-"}</div>
                    <div><b>Claim Count:</b> {viewModal.data.claimCount ?? 0}</div>
                    <div><b>Notes:</b> {viewModal.data.notes || "-"}</div>
                  </div>
                  <div className="border rounded p-3">
                    <div><b>Customer:</b> {viewModal.data.customer?.name || "Walk-in"}</div>
                    <div><b>Mobile:</b> {viewModal.data.customer?.mobile || "-"}</div>
                    <div><b>Email:</b> {viewModal.data.customer?.email || "-"}</div>
                    <div><b>Address:</b> {viewModal.data.customer?.address || "-"}</div>
                    <div><b>Sale Ref:</b> {viewModal.data.sale?.reference || "-"}</div>
                    <div><b>Sale Date:</b> {viewModal.data.sale?.createdAt ? new Date(viewModal.data.sale.createdAt).toLocaleString() : "-"}</div>
                  </div>
                  <div className="border rounded p-3 md:col-span-2">
                    <div><b>Item:</b> {viewModal.data.product?.name || viewModal.data.material?.name || "-"}</div>
                    <div><b>Type:</b> {viewModal.data.productId ? "Product" : viewModal.data.materialId ? "Material" : "-"}</div>
                    <div><b>Barcode:</b> {viewModal.data.product?.barcode || viewModal.data.material?.barcode || "-"}</div>
                    <div><b>Quantity:</b> {viewModal.data.saleItem?.quantity ?? "-"}</div>
                    <div><b>Unit Price:</b> {viewModal.data.saleItem?.unitPrice ?? "-"}</div>
                    <div><b>Total Price:</b> {viewModal.data.saleItem?.totalPrice ?? "-"}</div>
                    <div><b>Batch:</b> {viewModal.data.saleItem?.batchNumber || "-"}</div>
                    <div><b>Batch Expiry:</b> {viewModal.data.saleItem?.expiryDate ? new Date(viewModal.data.saleItem.expiryDate).toLocaleDateString() : "-"}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Claims</h3>
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Receiving Date</th>
                          <th className="p-2 text-left">Providing Date</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Issue</th>
                          <th className="p-2 text-left">Resolution</th>
                          <th className="p-2 text-left">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!viewModal.data.claims || viewModal.data.claims.length === 0 ? (
                          <tr><td className="p-2" colSpan={6}>No claims found</td></tr>
                        ) : (
                          viewModal.data.claims.map((claim) => (
                            <tr key={claim.id} className="border-t">
                              <td className="p-2">{claim.receivingDate ? new Date(claim.receivingDate).toLocaleDateString() : "-"}</td>
                              <td className="p-2">{claim.providingDate ? new Date(claim.providingDate).toLocaleDateString() : "-"}</td>
                              <td className="p-2">{claim.status || "-"}</td>
                              <td className="p-2">{claim.issueDescription || "-"}</td>
                              <td className="p-2">{claim.resolution || "-"}</td>
                              <td className="p-2">{claim.note || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6">No data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
