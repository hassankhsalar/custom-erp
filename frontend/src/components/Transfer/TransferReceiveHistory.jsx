import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ArrowLeft, Calendar, History, Package, RefreshCw, Truck } from "lucide-react";

const formatStatus = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const badgeClass = (status) => {
  switch (status) {
    case "complete":
      return "bg-gradient-to-r from-emerald-500 to-green-500";
    case "partial":
      return "bg-gradient-to-r from-yellow-500 to-amber-500";
    case "receive_with_missing":
      return "bg-gradient-to-r from-orange-500 to-amber-500";
    case "not_received":
      return "bg-gradient-to-r from-red-500 to-rose-600";
    default:
      return "bg-gradient-to-r from-blue-500 to-cyan-500";
  }
};

export default function TransferReceiveHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReceipts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(API_ROUTES.TRANSFER_RECEIPTS(id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceipts(res.data.receipts || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load receive history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
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
                <History className="text-white" size={34} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Receive History
                </h1>
                <p className="text-gray-600 mt-1">Transfer #{id}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchReceipts}
                className="p-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <Link
                to={`/transfers/${id}/receive`}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Truck size={18} />
                Back To Receive
              </Link>
              <button
                onClick={() => navigate("/transfers")}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl hover:bg-white transition-colors duration-200"
              >
                <ArrowLeft size={18} />
                Back To List
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {!error && receipts.length === 0 && (
          <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl p-8 text-center">
            <History className="w-14 h-14 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 text-lg font-medium">No receive history yet</p>
          </div>
        )}

        {receipts.map((receipt) => (
          <div key={receipt.id} className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 rounded-full bg-white/80 text-sm font-semibold text-gray-800">
                  {receipt.reference}
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${badgeClass(receipt.status)}`}>
                  {formatStatus(receipt.status)}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                  {formatStatus(receipt.receiptType)}
                </div>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar size={14} />
                {new Date(receipt.createdAt).toLocaleString()}
              </div>
            </div>

            {receipt.note && (
              <div className="mb-4 text-sm text-gray-700 bg-white/60 border border-white/60 rounded-xl p-3">
                {receipt.note}
              </div>
            )}

            <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-700">Item</th>
                      <th className="p-3 text-left font-medium text-gray-700">Type</th>
                      <th className="p-3 text-left font-medium text-gray-700">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {(receipt.items || []).map((item) => (
                      <tr key={item.id} className="hover:bg-white/30">
                        <td className="p-3 font-medium text-gray-800">
                          {item.transferItem?.selectedName || item.product?.name || item.material?.name || `Item ${item.itemId}`}
                        </td>
                        <td className="p-3 capitalize text-gray-700">{item.itemType}</td>
                        <td className="p-3 text-gray-700">
                          <span className="inline-flex items-center gap-1">
                            <Package size={14} className="text-purple-600" />
                            {item.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
