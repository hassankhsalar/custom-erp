import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { usePermission } from "../../hooks/usePermission";

const initialForm = {
  name: "",
  description: "",
  status: "active",
};

export default function MasterDataPage({
  title,
  endpoint,
  readPermission,
  createPermission,
  editPermission,
  deletePermission,
}) {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(createPermission);
  const canEdit = hasPermission(editPermission);
  const canDelete = hasPermission(deletePermission);
  const canRead = hasPermission(readPermission);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const token = localStorage.getItem("token");

  const fetchData = useCallback(
    async (page = 1, limit = 10, searchText = "", statusValue = "") => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (searchText) params.set("search", searchText);
        if (statusValue) params.set("status", statusValue);

        const res = await fetch(`${endpoint}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch ${title.toLowerCase()}`);
        }
        const data = await res.json();
        setRows(data.items || []);
        setPagination(data.pagination || { page: 1, limit, totalCount: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, title, token]
  );

  useEffect(() => {
    if (canRead) {
      fetchData(1, pagination.limit);
    }
  }, [canRead, fetchData, pagination.limit]);

  const resetModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      description: row.description || "",
      status: row.status || "active",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(editingId ? `${endpoint}/${editingId}` : endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      resetModal();
      fetchData(editingId ? pagination.page : 1, pagination.limit);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const nextPage =
        rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      fetchData(nextPage, pagination.limit);
    } catch (err) {
      setError(err.message || "Failed to delete");
      setLoading(false);
    }
  };

  const applyFilters = () => fetchData(1, pagination.limit, search, status);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    fetchData(1, pagination.limit, "", "");
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchData(page, pagination.limit);
  };

  const handleLimitChange = (value) => {
    fetchData(1, parseInt(value, 10));
  };

  const startRow = pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRow = Math.min(pagination.page * pagination.limit, pagination.totalCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="backdrop-blur-lg bg-white/60 border border-white/80 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Add New
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="md:col-span-3 relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description"
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
          <div className="flex gap-2">
            <button onClick={applyFilters} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Apply
            </button>
            <button onClick={clearFilters} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">
              Clear
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.description || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        row.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100"
                          title="Delete"
                        >
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

        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {startRow} to {endRow} of {pagination.totalCount}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pagination.limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="p-2 rounded-lg border border-gray-300 bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => goToPage(1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-gray-700 px-2">
              {pagination.page}/{pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => goToPage(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
              </h2>
              <button onClick={resetModal} className="p-2 rounded hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-gray-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  rows={3}
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
                <button type="button" onClick={resetModal} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
