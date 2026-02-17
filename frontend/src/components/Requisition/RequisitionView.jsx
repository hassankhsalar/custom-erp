import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { ArrowLeft, ClipboardList } from "lucide-react";

const RequisitionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(API_ROUTES.REQUISITION_BY_ID(id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (error) {
        console.error("Failed to load requisition", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  if (!data) {
    return <div className="p-6">Requisition not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-indigo-600" size={30} />
            <div>
              <h1 className="text-2xl font-bold text-indigo-700">Requisition {data.reference}</h1>
              <p className="text-gray-600">Status: {data.status}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/requisition/list")}
            className="px-4 py-2 rounded-lg bg-white border flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6">
          <h2 className="font-semibold text-lg mb-3">Basic Info</h2>
          <p><strong>Title:</strong> {data.title || "-"}</p>
          <p><strong>Request Type:</strong> {data.requestType || "items"}</p>
          {data.requestType === "money" && (
            <p><strong>Amount:</strong> {data.currency || "BDT"} {data.requestedAmount || 0} ({data.amountPurpose || "-"})</p>
          )}
          <p><strong>Requester:</strong> {data.requesterType} - {data.requesterName || data.requesterId}</p>
          <p><strong>Created By:</strong> {data.requesterUser?.name || "-"}</p>
          <p><strong>Parent:</strong> {data.parentRequisition?.reference || "-"}</p>
          <p><strong>Note:</strong> {data.note || "-"}</p>
        </div>

        <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6">
          <h2 className="font-semibold text-lg mb-3">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/80">
                <tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Qty</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.itemType === "product" ? it.product?.name : it.material?.name}</td>
                    <td className="p-2">{it.itemType}</td>
                    <td className="p-2">{it.requestedQty}</td>
                    <td className="p-2">{it.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6 mt-6">
        <h2 className="font-semibold text-lg mb-3">Sections & Tracking</h2>
        {(data.sections || []).length === 0 ? (
          <p className="text-gray-500">No sections created yet.</p>
        ) : (
          <div className="space-y-4">
            {data.sections.map((section) => (
              <div key={section.id} className="border rounded-xl p-4 bg-white/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{section.title || `Section ${section.sectionNo}`}</h3>
                  <span className="text-sm text-indigo-700">{section.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Action: {section.actionType} | Destination: {section.destinationType || "-"} {section.destinationId || ""}
                </p>
                <div className="mt-2 text-sm">
                  {(section.items || []).map((it) => (
                    <div key={it.id}>
                      {it.itemType === "product" ? it.product?.name : it.material?.name} - {it.quantity}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Transfers: {(section.transfers || []).length} | Productions: {(section.productions || []).length}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequisitionView;
