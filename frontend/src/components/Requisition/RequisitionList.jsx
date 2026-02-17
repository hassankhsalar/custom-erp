import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ClipboardList, Eye, Edit, Check, X, Truck, Factory, Plus, GitBranchPlus } from "lucide-react";
import { useAuth } from "../../App";

const RequisitionList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { currentUser } = useAuth();
  const isAdmin = ["admin", "superadmin"].includes(currentUser?.permission?.name || "");

  const [tab, setTab] = useState("requisitions");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [places, setPlaces] = useState({ shops: [], stores: [], factories: [] });
  const [segmentModal, setSegmentModal] = useState({ open: false, requisition: null });
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const res = await axios.get(API_ROUTES.REQUISITION_PLACES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlaces(res.data || { shops: [], stores: [], factories: [] });
      } catch (error) {
        console.error(error);
      }
    };
    fetchPlaces();
  }, [token]);

  const placeOptions = useMemo(() => ({
    shop: places.shops || [],
    store: places.stores || [],
    factory: places.factories || [],
  }), [places]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "requisitions") {
        const res = await axios.get(API_ROUTES.REQUISITIONS, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit: 10, search, status, sortBy, sortDirection },
        });
        setRows(res.data?.data || []);
        setMeta({
          totalPages: res.data?.pagination?.totalPages || 1,
          total: res.data?.pagination?.total || 0,
        });
      } else if (tab === "transfer_orders") {
        const res = await axios.get(API_ROUTES.REQUISITION_TRANSFER_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      } else if (tab === "production_orders") {
        const res = await axios.get(API_ROUTES.REQUISITION_PRODUCTION_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      } else {
        const res = await axios.get(API_ROUTES.REQUISITION_PURCHASE_ORDERS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(res.data || []);
      }
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDirection, status, tab, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openSegment = (requisition) => {
    const baseItems = (requisition.items || []).map((it) => ({
      requisitionItemId: it.id,
      itemType: it.itemType,
      itemId: it.itemType === "product" ? it.productId : it.materialId,
      name: it.itemType === "product" ? it.product?.name : it.material?.name,
      quantity: it.requestedQty,
    }));
    setSections([
      {
        title: "Section 1",
        note: "",
        actionType: requisition.requestType === "money" ? "approval" : "transfer_order",
        destinationType: "",
        destinationId: "",
        items: baseItems,
      },
    ]);
    setSegmentModal({ open: true, requisition });
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${prev.length + 1}`,
        note: "",
        actionType: segmentModal.requisition?.requestType === "money" ? "approval" : "transfer_order",
        destinationType: "",
        destinationId: "",
        items: [],
      },
    ]);
  };

  const updateSection = (idx, key, value) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  const toggleItemInSection = (sectionIndex, item) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section;
        const exists = section.items.find((it) => it.requisitionItemId === item.requisitionItemId);
        if (exists) {
          return {
            ...section,
            items: section.items.filter((it) => it.requisitionItemId !== item.requisitionItemId),
          };
        }
        return { ...section, items: [...section.items, { ...item }] };
      })
    );
  };

  const updateSectionItemQty = (sectionIndex, requisitionItemId, quantity) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section;
        return {
          ...section,
          items: section.items.map((it) =>
            it.requisitionItemId === requisitionItemId ? { ...it, quantity } : it
          ),
        };
      })
    );
  };

  const submitSegmentation = async () => {
    if (!segmentModal.requisition) return;
    try {
      const payload = {
        sections: sections.map((section) => ({
          title: section.title,
          note: section.note,
          actionType: section.actionType,
          destinationType: section.destinationType || null,
          destinationId: section.destinationId ? parseInt(section.destinationId, 10) : null,
          items: section.items.map((it) => ({
            requisitionItemId: it.requisitionItemId,
            itemType: it.itemType,
            itemId: parseInt(it.itemId, 10),
            quantity: parseFloat(it.quantity || 0),
          })),
        })),
      };
      await axios.post(API_ROUTES.REQUISITION_SECTIONS(segmentModal.requisition.id), payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSegmentModal({ open: false, requisition: null });
      setSections([]);
      fetchData();
    } catch (error) {
      alert(error?.response?.data?.error || "Failed to segment requisition");
    }
  };

  const approve = async (id) => {
    await axios.post(API_ROUTES.REQUISITION_APPROVE(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const reject = async (id) => {
    await axios.post(API_ROUTES.REQUISITION_REJECT(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const acceptOrder = (order, type) => {
    if (type === "transfer") {
      navigate("/transfer/add", { state: { requisitionOrder: order, orderType: "transfer" } });
    } else if (type === "production") {
      navigate("/productions/new", { state: { requisitionOrder: order, orderType: "production" } });
    } else {
      navigate("/purchase/new", { state: { requisitionOrder: order, orderType: "purchase" } });
    }
  };

  const addChildRequisition = (order) => {
    navigate("/requisition/create", {
      state: {
        parentRequisitionId: order.requisitionId,
        requisitionOrder: order,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-indigo-600" size={30} />
            <div>
              <h1 className="text-3xl font-bold text-indigo-700">Requisition List</h1>
              <p className="text-gray-600">Track requisitions and process transfer/production orders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/requisition/create")}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold"
          >
            Create Requisition
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button className={`px-4 py-2 rounded-lg ${tab === "requisitions" ? "bg-indigo-600 text-white" : "bg-white"}`} onClick={() => setTab("requisitions")}>Requisitions</button>
        <button className={`px-4 py-2 rounded-lg ${tab === "transfer_orders" ? "bg-indigo-600 text-white" : "bg-white"}`} onClick={() => setTab("transfer_orders")}>Transfer Orders</button>
        <button className={`px-4 py-2 rounded-lg ${tab === "production_orders" ? "bg-indigo-600 text-white" : "bg-white"}`} onClick={() => setTab("production_orders")}>Production Orders</button>
        <button className={`px-4 py-2 rounded-lg ${tab === "purchase_orders" ? "bg-indigo-600 text-white" : "bg-white"}`} onClick={() => setTab("purchase_orders")}>Purchase Orders</button>
      </div>

      {tab === "requisitions" && (
        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-4 mb-4 flex flex-wrap gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference/title..." className="p-2 rounded-lg border border-gray-300 bg-white/70" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-2 rounded-lg border border-gray-300 bg-white/70">
            <option value="">All Status</option>
            <option value="pending">pending</option>
            <option value="segmented">segmented</option>
            <option value="in_process">in_process</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 rounded-lg border border-gray-300 bg-white/70">
            <option value="createdAt">Created At</option>
            <option value="reference">Reference</option>
            <option value="status">Status</option>
          </select>
          <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value)} className="p-2 rounded-lg border border-gray-300 bg-white/70">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      )}

      <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-4">
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : tab === "requisitions" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-left">Requester</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">{row.reference}</td>
                    <td className="p-3">{row.requesterType} - {row.requesterName || row.requesterId}</td>
                    <td className="p-3">{(row.items || []).length}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="p-2 rounded bg-blue-50 text-blue-700" onClick={() => navigate(`/requisition/view/${row.id}`)} title="View"><Eye size={15} /></button>
                        {!row.isSegmented && row.requesterUserId === currentUser?.id && (
                          <button className="p-2 rounded bg-teal-50 text-teal-700" onClick={() => navigate(`/requisition/edit/${row.id}`)} title="Edit"><Edit size={15} /></button>
                        )}
                        {isAdmin && row.status === "pending" && (
                          <>
                            <button className="p-2 rounded bg-green-50 text-green-700" onClick={() => approve(row.id)} title="Approve"><Check size={15} /></button>
                            <button className="p-2 rounded bg-red-50 text-red-700" onClick={() => reject(row.id)} title="Reject"><X size={15} /></button>
                            <button className="p-2 rounded bg-purple-50 text-purple-700" onClick={() => openSegment(row)} title="Segment"><Plus size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Requisition</th>
                  <th className="p-3 text-left">Section</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Destination</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">{row.requisition?.reference}</td>
                    <td className="p-3">{row.title || `Section ${row.sectionNo}`} ({row.status})</td>
                    <td className="p-3">{(row.items || []).length}</td>
                    <td className="p-3">{row.destinationType || "-"} {row.destinationId || ""}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => acceptOrder(row, tab === "transfer_orders" ? "transfer" : tab === "production_orders" ? "production" : "purchase")}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold inline-flex items-center gap-2"
                        >
                          {tab === "transfer_orders" ? <Truck size={14} /> : tab === "production_orders" ? <Factory size={14} /> : <Plus size={14} />}
                          Order Accept
                        </button>
                        {tab === "production_orders" && (
                          <button
                            type="button"
                            onClick={() => addChildRequisition(row)}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-semibold inline-flex items-center gap-2"
                          >
                            <GitBranchPlus size={14} />
                            Add Requisition
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tab === "requisitions" && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">Total: {meta.total}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} className="px-3 py-2 rounded bg-white border disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span className="px-3 py-2">{page}/{meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} className="px-3 py-2 rounded bg-white border disabled:opacity-50" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {segmentModal.open && segmentModal.requisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSegmentModal({ open: false, requisition: null })}></div>
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Segment Requisition {segmentModal.requisition.reference}</h2>
              <button type="button" onClick={addSection} className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 inline-flex items-center gap-2">
                <Plus size={15} /> Add Section
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="border rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                    <input className="p-2 border rounded-lg" value={section.title} onChange={(e) => updateSection(sIdx, "title", e.target.value)} placeholder="Section title" />
                    <select className="p-2 border rounded-lg" value={section.actionType} onChange={(e) => updateSection(sIdx, "actionType", e.target.value)}>
                      {segmentModal.requisition?.requestType === "money" ? (
                        <>
                          <option value="approval">approval</option>
                          <option value="rejected">rejected</option>
                        </>
                      ) : (
                        <>
                          <option value="transfer_order">transfer_order</option>
                          <option value="production_order">production_order</option>
                          <option value="purchase_order">purchase_order</option>
                          <option value="rejected">rejected</option>
                        </>
                      )}
                    </select>
                    <select className="p-2 border rounded-lg" value={section.destinationType} onChange={(e) => updateSection(sIdx, "destinationType", e.target.value)}>
                      <option value="">destination type</option>
                      <option value="shop">shop</option>
                      <option value="store">store</option>
                      <option value="factory">factory</option>
                    </select>
                    <select className="p-2 border rounded-lg" value={section.destinationId} onChange={(e) => updateSection(sIdx, "destinationId", e.target.value)}>
                      <option value="">destination</option>
                      {(placeOptions[section.destinationType] || []).map((row) => (
                        <option key={row.id} value={row.id}>{row.name}</option>
                      ))}
                    </select>
                    <input className="p-2 border rounded-lg" value={section.note} onChange={(e) => updateSection(sIdx, "note", e.target.value)} placeholder="note" />
                  </div>
                  {segmentModal.requisition?.requestType === "money" && (
                    <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 mb-3">
                      Money requisition: {segmentModal.requisition.currency || "BDT"} {segmentModal.requisition.requestedAmount || 0} ({segmentModal.requisition.amountPurpose || "No purpose"})
                    </div>
                  )}
                  {segmentModal.requisition?.requestType === "items" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <p className="font-semibold mb-2">Available Items</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {(segmentModal.requisition.items || []).map((it) => {
                          const row = {
                            requisitionItemId: it.id,
                            itemType: it.itemType,
                            itemId: it.itemType === "product" ? it.productId : it.materialId,
                            name: it.itemType === "product" ? it.product?.name : it.material?.name,
                            quantity: it.requestedQty,
                          };
                          const selected = section.items.some((x) => x.requisitionItemId === it.id);
                          return (
                            <label key={it.id} className="flex items-center justify-between text-sm">
                              <span>{row.name} ({row.itemType})</span>
                              <input type="checkbox" checked={selected} onChange={() => toggleItemInSection(sIdx, row)} />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="font-semibold mb-2">Selected Items</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {section.items.map((it) => (
                          <div key={it.requisitionItemId} className="flex items-center justify-between gap-2 text-sm">
                            <span>{it.name}</span>
                            <input
                              type="number"
                              className="w-24 p-1 border rounded"
                              value={it.quantity}
                              min="0.01"
                              step="0.01"
                              onChange={(e) => updateSectionItemQty(sIdx, it.requisitionItemId, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border" onClick={() => setSegmentModal({ open: false, requisition: null })}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white" onClick={submitSegmentation}>Save Segments</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionList;
