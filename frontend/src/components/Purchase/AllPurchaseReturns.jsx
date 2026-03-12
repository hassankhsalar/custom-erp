import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Loader2,
  MoreVertical,
  Package,
  Store,
  ShoppingBag,
  Factory,
  Truck,
  Trash2,
  XCircle
} from "lucide-react";
import { API_ROUTES } from "../../config";
import { usePermission } from "../../hooks/usePermission";

const locationIcon = (type) => {
  if (type === "store") return <Store size={13} />;
  if (type === "shop") return <ShoppingBag size={13} />;
  return <Factory size={13} />;
};

export default function AllPurchaseReturns() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");

  const [shipmentModal, setShipmentModal] = useState({
    open: false, row: null, destinationType: "store", destinationId: "", destinations: [], lines: [], saving: false, error: "",
  });
  const [paymentModal, setPaymentModal] = useState({
    open: false, row: null, amount: "", paymentMethod: "cash", note: "", saving: false, error: "",
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false, row: null, activeTab: "returned_items",
  });

  // 'purchases_return_create', 'purchases_return_add_payment', 'purchases_return_add_shipment', 'purchases_return_delete', 'purchases_return_read', 'damage_return_create', 'damage_return_read', 'damage_return_add_payment', 'damage_return_add_shipment', 'damage_return_delete'
  const { hasPermission } = usePermission();
  const canAddPurchasePayment = hasPermission("purchases_return_add_payment");
  const canAddPurchaseShipment = hasPermission("purchases_return_add_shipment");
  const canDeletePurchaseReturn = hasPermission("purchases_return_delete");
  const canAddDamageReturnPayment = hasPermission("damage_return_add_payment");
  const canAddDamageReturnShipment = hasPermission("damage_return_add_shipment");
  const canDeleteDamageReturn = hasPermission("damage_return_delete");


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    if (type === "purchase_return" || type === "damage_return") {
      setTypeFilter(type);
      setCurrentPage(1);
    }
  }, [location.search]);

  const fetchReturns = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (typeFilter !== "all") params.append("returnType", typeFilter);
      const res = await fetch(`${API_ROUTES.PURCHASE_RETURNS_ALL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch purchase returns");
      setRows(data?.data || []);
      setTotalCount(data?.pagination?.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to fetch purchase returns");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinations = async (type) => {
    const res = await fetch(API_ROUTES.PURCHASE_DESTINATIONS(type), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    fetchReturns();
  }, [currentPage, itemsPerPage, typeFilter]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) setActiveDropdown(null);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const openShipmentModal = async (row) => {
    if (isItemsCompensationFullyShipped(row)) {
      return;
    }
    try {
      const destinationType = row.sourceType || "store";
      const destinations = await fetchDestinations(destinationType);
      setShipmentModal({
        open: true,
        row,
        destinationType,
        destinationId: destinations[0]?.id ? String(destinations[0].id) : "",
        destinations,
        lines: (row.items || []).map((item) => ({
          key: `${item.itemType}:${item.itemType === "product" ? item.productId : item.materialId}`,
          itemType: item.itemType,
          productId: item.productId || null,
          materialId: item.materialId || null,
          name: item.product?.name || item.material?.name || "-",
          returnQuantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          receiveQuantity: 0,
        })),
        saving: false,
        error: "",
      });
      setActiveDropdown(null);
    } catch (_) {
      alert("Failed to open shipment modal");
    }
  };

  const submitShipment = async () => {
    const picked = shipmentModal.lines.filter((x) => Number(x.receiveQuantity) > 0);
    if (!picked.length) return setShipmentModal((p) => ({ ...p, error: "Set receive qty for at least one item." }));
    if (!shipmentModal.destinationId) return setShipmentModal((p) => ({ ...p, error: "Select destination location." }));

    try {
      setShipmentModal((p) => ({ ...p, saving: true, error: "" }));
      const res = await fetch(API_ROUTES.PURCHASE_RETURN_COMP_SHIPMENTS(shipmentModal.row.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationType: shipmentModal.destinationType,
          destinationId: Number(shipmentModal.destinationId),
          items: picked.map((x) => ({
            itemType: x.itemType,
            productId: x.productId,
            materialId: x.materialId,
            quantity: Number(x.receiveQuantity),
            unitPrice: Number(x.unitPrice),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add shipment");
      setShipmentModal((p) => ({ ...p, open: false, saving: false }));
      fetchReturns();
    } catch (err) {
      setShipmentModal((p) => ({ ...p, saving: false, error: err.message || "Failed to add shipment" }));
    }
  };

  const openPaymentModal = (row) => {
    setPaymentModal({
      open: true,
      row,
      amount: "",
      paymentMethod: "cash",
      note: "",
      saving: false,
      error: "",
    });
    setActiveDropdown(null);
  };

  const submitPayment = async () => {
    const amount = Number(paymentModal.amount || 0);
    if (amount <= 0) return setPaymentModal((p) => ({ ...p, error: "Amount must be greater than 0." }));
    try {
      setPaymentModal((p) => ({ ...p, saving: true, error: "" }));
      const res = await fetch(API_ROUTES.PURCHASE_RETURN_PAYMENTS(paymentModal.row.id), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          paymentMethod: paymentModal.paymentMethod,
          note: paymentModal.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add payment");
      setPaymentModal((p) => ({ ...p, open: false, saving: false }));
      fetchReturns();
    } catch (err) {
      setPaymentModal((p) => ({ ...p, saving: false, error: err.message || "Failed to add payment" }));
    }
  };

  const openDetailsModal = (row, tab = "returned_items") => {
    setDetailsModal({
      open: true,
      row,
      activeTab: tab,
    });
    setActiveDropdown(null);
  };

  const getShippedQtyByLine = (row) => {
    const shipped = {};
    (row?.compensationShipments || []).forEach((shipment) => {
      (shipment.items || []).forEach((item) => {
        const key = `${item.itemType}:${item.itemType === "product" ? item.productId : item.materialId}`;
        shipped[key] = (shipped[key] || 0) + Number(item.quantity || 0);
      });
    });
    return shipped;
  };

  const isItemsCompensationFullyShipped = (row) => {
    if (!row || row.compensationType !== "items") return false;
    const shippedByLine = getShippedQtyByLine(row);
    const returnItems = Array.isArray(row.items) ? row.items : [];
    if (!returnItems.length) return false;
    return returnItems.every((item) => {
      const key = `${item.itemType}:${item.itemType === "product" ? item.productId : item.materialId}`;
      const returnedQty = Number(item.quantity || 0);
      return shippedByLine[key] >= returnedQty;
    });
  };

  const handleDeleteReturn = async (row) => {
    if (!window.confirm(`Delete ${row.reference}? This will rollback stock and account effects.`)) {
      return;
    }

    try {
      setDeletingId(row.id);
      const res = await fetch(API_ROUTES.PURCHASE_RETURN_BY_ID(row.id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete return");
      await fetchReturns();
    } catch (err) {
      alert(err.message || "Failed to delete return");
    } finally {
      setDeletingId(null);
      setActiveDropdown(null);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl mb-6 p-6">
        <div className="flex items-center justify-start flex-col md:flex-row gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl shadow-lg">
            <Package className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              All { typeFilter === "purchase_return" ? "Purchase Returns" : "Damage Returns" }
            </h1>
            <p className="text-gray-600">View returns, add shipments, and manage compensation payments.</p>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-3">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <option value="all">All Types</option>
              <option value="purchase_return">Purchase Return</option>
              <option value="damage_return">Damage Return</option>
            </select>
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">Total: {totalCount}</div>
        </div>

        {error && <div className="mb-3 text-rose-600">{error}</div>}

        {loading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/60">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-3 text-left">Reference</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-left">Return Value</th>
                  <th className="p-3 text-left">Money Paid</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/50">
                    <td className="p-3 font-semibold">{row.reference}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.returnType === "damage_return" ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
                        {row.returnType === "damage_return" ? "Damage" : "Purchase"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 rounded-full">
                        {locationIcon(row.sourceType)} {row.sourceType} #{row.sourceId}
                      </span>
                    </td>
                    <td className="p-3">{row.supplier?.name || "-"}</td>
                    <td className="p-3">${Number(row.totalReturnValue || 0).toFixed(2)}</td>
                    <td className="p-3">${Number(row.compensationAmount || 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">{row.compensationStatus}</span>
                    </td>
                    <td className="p-3">
                      <div className="relative dropdown-container">
                        <button onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                        {activeDropdown === row.id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 shadow-xl rounded-xl z-20 py-1">
                            
                            <button 
                              onClick={() => openDetailsModal(row, "returned_items")} 
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                              <Eye size={14} /> View Details
                            </button>

                            {row.compensationType === "items" && !isItemsCompensationFullyShipped(row) && ((typeFilter === "purchase_return" && canAddPurchaseShipment) || (typeFilter === "damage_return" && canAddDamageReturnShipment)) && (
                              <button 
                                onClick={() => openShipmentModal(row)} 
                                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex items-center gap-2">
                                <Truck size={14} /> 
                                Add Shipment
                              </button>
                            )}

                            { row.compensationType != "items" && (Number(row.totalReturnValue || 0).toFixed(2) < Number(row.compensationAmount || 0).toFixed(2)) && ((typeFilter === "purchase_return" && canAddPurchasePayment) || (typeFilter === "damage_return" && canAddDamageReturnPayment)) && (
                              <button 
                                onClick={() => openPaymentModal(row)} 
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2">
                                <CreditCard size={14} />
                                Add Payment
                              </button>
                            )}

                            {((typeFilter === "purchase_return" && canDeletePurchaseReturn) || (typeFilter === "damage_return" && canDeleteDamageReturn)) && (
                              <button 
                                disabled={deletingId === row.id} 
                                onClick={() => handleDeleteReturn(row)} 
                                className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 flex items-center gap-2 disabled:opacity-60">
                                <Trash2 size={14} /> 
                                {deletingId === row.id ? "Deleting..." : "Delete"}
                              </button>
                            )}

                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td className="p-8 text-center text-gray-500" colSpan={8}>No returns found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"><ChevronLeft size={16} /></button>
            <span className="text-sm">Page {currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {detailsModal.open && detailsModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Return Details - {detailsModal.row.reference}</h3>
              <button onClick={() => setDetailsModal({ open: false, row: null, activeTab: "returned_items" })}><XCircle /></button>
            </div>
            <div className="px-5 pt-4 border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailsModal((prev) => ({ ...prev, activeTab: "returned_items" }))}
                  className={`px-3 py-2 text-sm rounded-t-lg ${detailsModal.activeTab === "returned_items" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Returned Items
                </button>
                <button
                  onClick={() => setDetailsModal((prev) => ({ ...prev, activeTab: "shipments" }))}
                  className={`px-3 py-2 text-sm rounded-t-lg ${detailsModal.activeTab === "shipments" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Shipments
                </button>
                <button
                  onClick={() => setDetailsModal((prev) => ({ ...prev, activeTab: "payments" }))}
                  className={`px-3 py-2 text-sm rounded-t-lg ${detailsModal.activeTab === "payments" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Payments
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {detailsModal.activeTab === "returned_items" && (
                <>
                  {(detailsModal.row.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 text-sm border-b pb-2">
                      <div>{item.product?.name || item.material?.name || "-"}</div>
                      <div>{item.itemType}</div>
                      <div>Qty: {Number(item.quantity || 0)}</div>
                      <div>Price: ${Number(item.unitPrice || 0).toFixed(2)}</div>
                    </div>
                  ))}
                  {!detailsModal.row.items?.length && <div className="text-sm text-gray-500">No returned items.</div>}
                </>
              )}

              {detailsModal.activeTab === "shipments" && (
                <>
                  {(detailsModal.row.compensationShipments || []).map((shipment) => (
                    <div key={shipment.id} className="border rounded-xl p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="font-semibold">{shipment.reference || `Shipment #${shipment.id}`}</div>
                        <div className="text-gray-500">{shipment.receivedAt ? new Date(shipment.receivedAt).toLocaleString() : "-"}</div>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Destination: {shipment.destinationType} #{shipment.destinationId}
                      </div>
                      <div className="space-y-1">
                        {(shipment.items || []).map((item) => (
                          <div key={item.id} className="grid grid-cols-4 gap-2 text-sm">
                            <div>{item.product?.name || item.material?.name || "-"}</div>
                            <div>{item.itemType}</div>
                            <div>Qty: {Number(item.quantity || 0)}</div>
                            <div>Price: ${Number(item.unitPrice || 0).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!detailsModal.row.compensationShipments?.length && <div className="text-sm text-gray-500">No shipments found.</div>}
                </>
              )}

              {detailsModal.activeTab === "payments" && (
                <>
                  <div className="mb-3 text-sm">
                    Total Paid: <strong>${Number(detailsModal.row.paymentsTotal || 0).toFixed(2)}</strong>
                  </div>
                  <div className="space-y-2">
                    {(detailsModal.row.compensationPayments || []).map((p) => (
                      <div key={p.id} className="border rounded-lg p-3 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-semibold">${Number(p.amount || 0).toFixed(2)} ({p.paymentMethod})</div>
                          <div className="text-gray-500">{p.note || "-"}</div>
                        </div>
                        <div className="text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                    {!detailsModal.row.compensationPayments?.length && <div className="text-sm text-gray-500">No payments found.</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {shipmentModal.open && shipmentModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-lg">Add Shipment - {shipmentModal.row.reference}</h3>
            </div>
            <div className="p-5 space-y-3">
              {isItemsCompensationFullyShipped(shipmentModal.row) && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This return is fully compensated by shipments. New shipment is not allowed.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={shipmentModal.destinationType}
                  onChange={async (e) => {
                    const destinationType = e.target.value;
                    const destinations = await fetchDestinations(destinationType);
                    setShipmentModal((prev) => ({
                      ...prev,
                      destinationType,
                      destinations,
                      destinationId: destinations[0]?.id ? String(destinations[0].id) : "",
                    }));
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="store">Store</option>
                  <option value="shop">Shop</option>
                  <option value="factory">Factory</option>
                </select>
                <select value={shipmentModal.destinationId} onChange={(e) => setShipmentModal((prev) => ({ ...prev, destinationId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2">
                  <option value="">Destination location</option>
                  {shipmentModal.destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                {shipmentModal.lines.map((line) => (
                  <div key={line.key} className="grid grid-cols-4 gap-2 items-center text-sm">
                    <div>{line.name}</div>
                    <div>Return: {line.returnQuantity}</div>
                    <div>Price: {line.unitPrice}</div>
                    <input type="number" min="0" step="0.01" value={line.receiveQuantity} onChange={(e) => setShipmentModal((prev) => ({ ...prev, lines: prev.lines.map((x) => x.key === line.key ? { ...x, receiveQuantity: e.target.value } : x) }))} className="rounded-lg border border-gray-200 px-2 py-1.5" placeholder="Receive" />
                  </div>
                ))}
              </div>
              {shipmentModal.error && <div className="text-rose-600 text-sm">{shipmentModal.error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShipmentModal((prev) => ({ ...prev, open: false }))} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
                <button onClick={submitShipment} disabled={shipmentModal.saving || isItemsCompensationFullyShipped(shipmentModal.row)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">{shipmentModal.saving ? "Saving..." : "Add Shipment"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentModal.open && paymentModal.row && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-lg">Add Payment - {paymentModal.row.reference}</h3>
            </div>
            <div className="p-5 space-y-3">
              <input type="number" min="0" step="0.01" value={paymentModal.amount} onChange={(e) => setPaymentModal((prev) => ({ ...prev, amount: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Amount" />
              <select value={paymentModal.paymentMethod} onChange={(e) => setPaymentModal((prev) => ({ ...prev, paymentMethod: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
              <textarea rows={2} value={paymentModal.note} onChange={(e) => setPaymentModal((prev) => ({ ...prev, note: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Note" />
              {paymentModal.error && <div className="text-rose-600 text-sm">{paymentModal.error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setPaymentModal((prev) => ({ ...prev, open: false }))} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
                <button onClick={submitPayment} disabled={paymentModal.saving} className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60">{paymentModal.saving ? "Saving..." : "Add Payment"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
