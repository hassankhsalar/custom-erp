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

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Warranty List</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <input className="border rounded p-2" placeholder="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} />
        <input className="border rounded p-2" placeholder="Product/Material" value={filters.item} onChange={(e) => setFilters((f) => ({ ...f, item: e.target.value }))} />
        <select className="border rounded p-2" value={filters.itemType} onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}>
          <option value="">All Types</option>
          <option value="product">Product</option>
          <option value="material">Material</option>
        </select>
        <select className="border rounded p-2" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="claimed">Claimed</option>
          <option value="expired">Expired</option>
          <option value="void">Void</option>
        </select>
        <input type="date" className="border rounded p-2" value={filters.expiryFrom} onChange={(e) => setFilters((f) => ({ ...f, expiryFrom: e.target.value }))} />
        <input type="date" className="border rounded p-2" value={filters.expiryTo} onChange={(e) => setFilters((f) => ({ ...f, expiryTo: e.target.value }))} />
      </div>

      <div className="bg-white rounded border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Expiry</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={6}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={6}>No warranties found</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.warrantyCode}</td>
                  <td className="p-3">{row.customer?.name || "Walk-in"}</td>
                  <td className="p-3">{row.product?.name || row.material?.name || "-"}</td>
                  <td className="p-3">{row.endDate ? new Date(row.endDate).toLocaleDateString() : "-"}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 space-x-2">
                    <button className="px-2 py-1 border rounded" onClick={() => handleEdit(row)}>Edit</button>
                    <button className="px-2 py-1 border rounded text-red-600" onClick={() => handleDelete(row.id)}>Delete</button>
                    <button className="px-2 py-1 border rounded text-blue-600" onClick={() => openClaimModal(row)}>Warranty Claim</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {claimModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-3">
            <h2 className="text-lg font-semibold">Warranty Claim</h2>
            <input type="date" className="border rounded p-2 w-full" value={claimForm.receivingDate} onChange={(e) => setClaimForm((f) => ({ ...f, receivingDate: e.target.value }))} />
            <input type="date" className="border rounded p-2 w-full" value={claimForm.providingDate} onChange={(e) => setClaimForm((f) => ({ ...f, providingDate: e.target.value }))} />
            <textarea className="border rounded p-2 w-full" rows={3} placeholder="Issue description" value={claimForm.issueDescription} onChange={(e) => setClaimForm((f) => ({ ...f, issueDescription: e.target.value }))} />
            <textarea className="border rounded p-2 w-full" rows={3} placeholder="Resolution / action" value={claimForm.resolution} onChange={(e) => setClaimForm((f) => ({ ...f, resolution: e.target.value }))} />
            <input className="border rounded p-2 w-full" placeholder="Note" value={claimForm.note} onChange={(e) => setClaimForm((f) => ({ ...f, note: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={() => setClaimModal({ open: false, warranty: null })}>Cancel</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={submitClaim}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

