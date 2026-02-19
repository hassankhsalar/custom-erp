import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MasterDataPage from "./MasterDataPage";
import { API_ROUTES } from "../../config";
import { usePermission } from "../../hooks/usePermission";

const relationInitial = {
  primaryUnit: "",
  relatedUnit: "",
  multiplier: "",
  note: "",
  status: "active",
};

const UnitRelationsTab = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("unit_create");
  const canEdit = hasPermission("unit_edit");
  const canDelete = hasPermission("unit_delete");

  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(relationInitial);
  const [editingId, setEditingId] = useState(null);
  const token = localStorage.getItem("token");

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch(`${API_ROUTES.MASTER_DATA_UNITS}?page=1&limit=200&status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnits(data.items || []);
    } catch (_) {
      // Non-blocking
    }
  }, [token]);

  const fetchRelations = useCallback(async (page = 1, limit = 10, searchText = "", statusValue = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchText) params.set("search", searchText);
      if (statusValue) params.set("status", statusValue);

      const res = await fetch(`${API_ROUTES.MASTER_DATA_UNIT_RELATIONS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch unit relations");
      }
      const data = await res.json();
      setRows(data.items || []);
      setPagination(data.pagination || { page: 1, limit, totalCount: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || "Failed to load unit relations");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUnits();
    fetchRelations(1, pagination.limit);
  }, [fetchRelations, fetchUnits, pagination.limit]);

  const openCreate = () => {
    setEditingId(null);
    setForm(relationInitial);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      primaryUnit: row.primaryUnit,
      relatedUnit: row.relatedUnit,
      multiplier: String(row.multiplier),
      note: row.note || "",
      status: row.status || "active",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm(relationInitial);
    setModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        multiplier: parseFloat(form.multiplier),
      };
      const res = await fetch(
        editingId ? `${API_ROUTES.MASTER_DATA_UNIT_RELATIONS}/${editingId}` : API_ROUTES.MASTER_DATA_UNIT_RELATIONS,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      closeModal();
      fetchRelations(editingId ? pagination.page : 1, pagination.limit, search, status);
    } catch (err) {
      setError(err.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this unit relation?")) return;
    try {
      const res = await fetch(`${API_ROUTES.MASTER_DATA_UNIT_RELATIONS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const nextPage = rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      fetchRelations(nextPage, pagination.limit, search, status);
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  const applyFilters = () => fetchRelations(1, pagination.limit, search, status);

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchRelations(page, pagination.limit, search, status);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-auto md:flex-1">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search primary or related unit"
              className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={applyFilters} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            Apply
          </button>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Relation
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Primary Unit</th>
              <th className="px-4 py-3 text-left">Related Unit</th>
              <th className="px-4 py-3 text-left">Multiplier</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No relations found</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{row.primaryUnit}</td>
                <td className="px-4 py-3">{row.relatedUnit}</td>
                <td className="px-4 py-3">{row.multiplier}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button onClick={() => openEdit(row)} className="p-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(row.id)} className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 border rounded disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 border rounded disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{editingId ? "Edit Unit Relation" : "Add Unit Relation"}</h3>
              <button onClick={closeModal} className="p-2 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-gray-700">Primary Unit</label>
                <input
                  list="unit-list-primary"
                  value={form.primaryUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryUnit: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Related Unit</label>
                <input
                  list="unit-list-related"
                  value={form.relatedUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, relatedUnit: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Multiplier</label>
                <input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={form.multiplier}
                  onChange={(e) => setForm((prev) => ({ ...prev, multiplier: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">1 related unit = multiplier x primary unit</p>
              </div>
              <div>
                <label className="text-sm text-gray-700">Note</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">{editingId ? "Update" : "Create"}</button>
              </div>
            </form>
            <datalist id="unit-list-primary">
              {units.map((unit) => (
                <option key={`primary-${unit.id}`} value={unit.name} />
              ))}
            </datalist>
            <datalist id="unit-list-related">
              {units.map((unit) => (
                <option key={`related-${unit.id}`} value={unit.name} />
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Units() {
  const [tab, setTab] = useState("units");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("units")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "units" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border"}`}
          >
            Units
          </button>
          <button
            onClick={() => setTab("relations")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "relations" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border"}`}
          >
            Unit Relation
          </button>
        </div>
      </div>

      {tab === "units" ? (
        <MasterDataPage
          title="Units"
          endpoint={API_ROUTES.MASTER_DATA_UNITS}
          readPermission="unit_read"
          createPermission="unit_create"
          editPermission="unit_edit"
          deletePermission="unit_delete"
        />
      ) : (
        <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Unit Relation</h1>
          <UnitRelationsTab />
        </div>
      )}
    </div>
  );
}
