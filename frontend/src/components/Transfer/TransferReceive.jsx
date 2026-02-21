import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { usePermission } from "../../hooks/usePermission";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle,
  DollarSign,
  History,
  Package,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";

const MANUAL_STATUSES = ["processing", "pending", "on_the_way"];
const WORKFLOW_STATUSES = ["processing", "pending", "on_the_way", "receive", "cancel"];

const formatStatus = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const getStatusColor = (status) => {
  switch (status) {
    case "processing":
      return "bg-gradient-to-r from-amber-500 to-orange-500";
    case "pending":
      return "bg-gradient-to-r from-gray-500 to-gray-600";
    case "on_the_way":
      return "bg-gradient-to-r from-blue-500 to-cyan-500";
    case "partial":
      return "bg-gradient-to-r from-yellow-500 to-amber-500";
    case "complete":
      return "bg-gradient-to-r from-emerald-500 to-green-500";
    case "not_received":
    case "cancel":
      return "bg-gradient-to-r from-red-500 to-rose-600";
    default:
      return "bg-gradient-to-r from-gray-500 to-gray-600";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "processing":
    case "pending":
      return <AlertCircle className="w-4 h-4" />;
    case "on_the_way":
      return <Truck className="w-4 h-4" />;
    case "receive":
      return <CheckCircle className="w-4 h-4" />;
    case "cancel":
      return <Ban className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function TransferReceive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receiveQty, setReceiveQty] = useState({});
  const [statusDraft, setStatusDraft] = useState("receive");

  const token = localStorage.getItem("token");
  const canManualStatus = hasPermission("transfers_change_status");
  const canReceive = hasPermission("transfers_receive");
  const canReturn = hasPermission("transfer_return");

  const fetchTransfer = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(API_ROUTES.TRANSFER_BY_ID(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfer(res.data);
      setStatusDraft(
        MANUAL_STATUSES.includes(res.data.status)
          ? res.data.status
          : res.data.status === "not_received"
            ? "cancel"
            : "receive"
      );
      setReceiveQty((prev) => {
        const next = { ...prev };
        (res.data.transferItems || []).forEach((item) => {
          if (next[item.id] === undefined) next[item.id] = "";
        });
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load transfer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const summary = useMemo(() => {
    const totalSent = (transfer?.transferItems || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const totalReceived = (transfer?.transferItems || []).reduce((sum, item) => sum + (parseFloat(item.receivedQuantity) || 0), 0);
    return {
      totalSent,
      totalReceived,
      totalRemaining: Math.max(0, totalSent - totalReceived),
    };
  }, [transfer]);

  const updateStatus = async () => {
    if (!canManualStatus) return;
    if (!MANUAL_STATUSES.includes(statusDraft)) return;
    try {
      setSaving(true);
      setMessage("");
      setError("");
      await axios.put(
        API_ROUTES.TRANSFER_STATUS(id),
        { status: statusDraft },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Status updated.");
      await fetchTransfer();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const submitReceive = async () => {
    if (!canReceive) return;
    const items = (transfer?.transferItems || [])
      .map((item) => {
        const qty = parseFloat(receiveQty[item.id]);
        return {
          transferItemId: item.id,
          receivedQuantity: Number.isFinite(qty) ? qty : 0,
        };
      })
      .filter((item) => item.receivedQuantity > 0);

    if (items.length === 0) {
      setError("Enter at least one received quantity.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await axios.post(
        API_ROUTES.TRANSFER_RECEIVE(id),
        { mode: "receive", items },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Receive recorded.");
      setReceiveQty({});
      await fetchTransfer();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to receive items");
    } finally {
      setSaving(false);
    }
  };

  const returnUnreceived = async () => {
    if (!canReturn) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await axios.post(
        API_ROUTES.TRANSFER_RETURN_UNRECEIVED(id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Unreceived items returned to source.");
      await fetchTransfer();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to return unreceived items");
    } finally {
      setSaving(false);
    }
  };

  const cancelTransfer = async () => {
    if (!canReceive) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await axios.post(
        API_ROUTES.TRANSFER_CANCEL(id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Transfer canceled. Received quantities reset to 0.");
      await fetchTransfer();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel transfer");
    } finally {
      setSaving(false);
    }
  };

  const canReturnRemaining =
    canReturn &&
    ["partial", "not_received"].includes(String(transfer?.status || "")) &&
    summary.totalRemaining > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-6 text-red-700">
          {error || "Transfer not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
                <Truck className="text-white" size={34} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Transfer Receive
                </h1>
                <p className="text-gray-600 mt-1">{transfer.reference}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchTransfer}
                className="p-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <Link
                to={`/transfers/${id}/receipts`}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <History size={18} />
                Receive History
              </Link>
              <button
                onClick={() => navigate("/transfers")}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200"
              >
                <ArrowLeft size={18} />
                Back
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-indigo-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <p className="text-sm text-gray-600">Status</p>
            <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${getStatusColor(transfer.status)}`}>
              <AlertCircle className="w-4 h-4" />
              {formatStatus(transfer.status)}
            </div>
          </div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <p className="text-sm text-gray-600">Sent</p>
            <p className="text-2xl font-bold text-blue-700">{summary.totalSent}</p>
          </div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <p className="text-sm text-gray-600">Received</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.totalReceived}</p>
          </div>
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-2xl font-bold text-amber-700">{summary.totalRemaining}</p>
          </div>
        </div>

        {(canManualStatus || canReceive || canReturn) && (
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Transfer Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              {WORKFLOW_STATUSES.map((status) => {
                const selected = statusDraft === status;
                const selectable =
                  status === "receive"
                    ? canReceive
                    : status === "cancel"
                      ? canReceive
                      : canManualStatus;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={!selectable}
                    onClick={() => setStatusDraft(status)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                      selected
                        ? `${getStatusColor(status)} text-white border-transparent scale-[1.02]`
                        : "bg-white/80 border border-white/60 hover:bg-white text-gray-700"
                    } ${!selectable ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {getStatusIcon(status)}
                    <span className="text-xs font-medium mt-2">{formatStatus(status)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {MANUAL_STATUSES.includes(statusDraft) && (
                <button
                  onClick={updateStatus}
                  disabled={saving || statusDraft === transfer.status}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    saving || statusDraft === transfer.status
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg hover:shadow-xl"
                  }`}
                >
                  <CheckCircle size={18} />
                  Update Status
                </button>
              )}
              {statusDraft === "cancel" && (
                <button
                  onClick={cancelTransfer}
                  disabled={saving || !canReceive}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    saving || !canReceive
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl"
                  }`}
                >
                  <Ban size={18} />
                  Cancel Transfer
                </button>
              )}
              {canReturnRemaining && (
                <button
                  onClick={returnUnreceived}
                  disabled={saving}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    saving
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl"
                  }`}
                >
                  <RefreshCw size={18} />
                  Return Remaining
                </button>
              )}
            </div>
          </div>
        )}

        {statusDraft === "receive" && (
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-600" />
            Receive Items
          </h3>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700">Item</th>
                    <th className="p-3 text-left font-medium text-gray-700">Sent</th>
                    <th className="p-3 text-left font-medium text-gray-700">Received</th>
                    <th className="p-3 text-left font-medium text-gray-700">Remaining</th>
                    <th className="p-3 text-left font-medium text-gray-700">Receive Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {(transfer.transferItems || []).map((item, idx) => {
                    const sent = parseFloat(item.quantity) || 0;
                    const received = parseFloat(item.receivedQuantity) || 0;
                    const remaining = Math.max(0, sent - received);
                    return (
                      <tr key={item.id ?? idx} className="hover:bg-white/30">
                        <td className="p-3 font-medium text-gray-800">{item.selectedName || `Item ${item.itemId}`}</td>
                        <td className="p-3 text-gray-700">{sent}</td>
                        <td className="p-3 text-gray-700">{received}</td>
                        <td className="p-3 text-gray-700">{remaining}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step="0.01"
                            value={receiveQty[item.id] ?? ""}
                            onChange={(e) => setReceiveQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-28 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            disabled={remaining <= 0 || saving}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {statusDraft === "receive" && (
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={submitReceive}
              disabled={saving || !canReceive}
              className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                saving || !canReceive
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg hover:shadow-xl"
              }`}
            >
              Receive
            </button>
          </div>
        </div>
        )}

        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-xl p-4 text-green-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
