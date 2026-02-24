import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Scale,
  Link2,
  CheckCircle,
  AlertCircle,
  FileText,
  Info,
  RefreshCw,
  Filter
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
  const [showFilters, setShowFilters] = useState(false);
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

  const getStatusBadge = (status) => {
    if (status === "active") {
      return {
        color: "bg-gradient-to-r from-emerald-500 to-green-500",
        icon: <CheckCircle size={14} className="text-white" />,
        text: "Active"
      };
    }
    return {
      color: "bg-gradient-to-r from-gray-500 to-slate-500",
      icon: <AlertCircle size={14} className="text-white" />,
      text: "Inactive"
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-white/80 text-gray-700 font-medium rounded-xl transition-all duration-300 border border-white/60"
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={() => fetchRelations(pagination.page, pagination.limit, search, status)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/60 hover:bg-white/80 text-gray-700 font-medium rounded-xl transition-all duration-300 border border-white/60"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
        
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus size={18} />
            Add Relation
          </button>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 animate-fadeIn">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Filter size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Filter Unit Relations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search primary or related unit..."
                className="w-full p-2.5 pl-9 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-2.5 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setTimeout(() => fetchRelations(1, pagination.limit, "", ""), 0);
                }}
                className="p-2.5 bg-white/60 hover:bg-white/80 text-gray-700 rounded-xl transition-all duration-300 border border-white/60"
                title="Clear filters"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="backdrop-blur-sm bg-red-50/80 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

      {/* Table Section */}
      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading unit relations...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-4 text-left font-medium text-gray-700">Primary Unit</th>
                    <th className="p-4 text-left font-medium text-gray-700">Related Unit</th>
                    <th className="p-4 text-left font-medium text-gray-700">Multiplier</th>
                    <th className="p-4 text-left font-medium text-gray-700">Status</th>
                    <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                            <Link2 size={48} className="text-gray-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Relations Found</h3>
                          <p className="text-gray-600 mb-6">Start by creating your first unit relation</p>
                          {canCreate && (
                            <button
                              onClick={openCreate}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                            >
                              <Plus size={20} />
                              Create First Relation
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {rows.map((row, index) => {
                    const status = getStatusBadge(row.status);
                    
                    return (
                      <tr 
                        key={row.id} 
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <Scale size={14} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-800">{row.primaryUnit}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Scale size={14} className="text-white" />
                            </div>
                            <span className="font-medium text-gray-800">{row.relatedUnit}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900">{row.multiplier}</span>
                            <span className="text-xs text-gray-500">x</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold ${status.color}`}>
                            {status.icon}
                            {status.text}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => openEdit(row)}
                                className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {rows.length > 0 && (
              <div className="backdrop-blur-lg bg-white/30 border-t border-white/40 rounded-b-2xl p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) => {
                          const newLimit = Number(e.target.value);
                          setPagination(prev => ({ ...prev, limit: newLimit }));
                          fetchRelations(1, newLimit, search, status);
                        }}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>

                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                      <span className="font-semibold">
                        {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                      </span>{" "}
                      of <span className="font-semibold">{pagination.totalCount}</span> relations
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>

                    <button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pagination.page === pageNum
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                        <>
                          <span className="mx-1 text-gray-400">...</span>
                          <button
                            onClick={() => goToPage(pagination.totalPages)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              pagination.page === pagination.totalPages
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {pagination.totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>

                    <button
                      onClick={() => goToPage(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Link2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {editingId ? "Edit Unit Relation" : "Add Unit Relation"}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {editingId ? "Update the unit relation details" : "Create a new unit relation"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Primary Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Scale size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      list="unit-list-primary"
                      value={form.primaryUnit}
                      onChange={(e) => setForm((prev) => ({ ...prev, primaryUnit: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Select or type primary unit"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Related Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Scale size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      list="unit-list-related"
                      value={form.relatedUnit}
                      onChange={(e) => setForm((prev) => ({ ...prev, relatedUnit: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Select or type related unit"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Multiplier <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">×</span>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={form.multiplier}
                      onChange={(e) => setForm((prev) => ({ ...prev, multiplier: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Enter multiplier value"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Info size={12} />
                    1 related unit = multiplier × primary unit
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Note
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Add any notes (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
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
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default function Units() {
  const [tab, setTab] = useState("units");

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <Package className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Units Management
              </h1>
              <p className="text-gray-600 mt-2">Manage units and their relationships</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-2 mb-6 inline-flex">
          <button
            onClick={() => setTab("units")}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === "units" 
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg" 
                : "text-gray-700 hover:bg-white/50"
            }`}
          >
            Units
          </button>
          <button
            onClick={() => setTab("relations")}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === "relations" 
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg" 
                : "text-gray-700 hover:bg-white/50"
            }`}
          >
            Unit Relations
          </button>
        </div>

        {/* Content */}
        {tab === "units" ? (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <MasterDataPage
              title="Units"
              endpoint={API_ROUTES.MASTER_DATA_UNITS}
              readPermission="unit_read"
              createPermission="unit_create"
              editPermission="unit_edit"
              deletePermission="unit_delete"
            />
          </div>
        ) : (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <UnitRelationsTab />
          </div>
        )}
      </div>
    </div>
  );
}