import { useEffect, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";

const TransferReport = () => {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [overview, setOverview] = useState({ totalCount: 0, byStatus: {}, from: { shops: [], stores: [], factories: [] }, to: { shops: [], stores: [], factories: [] } });
  const [topSender, setTopSender] = useState([]);
  const [topReceiver, setTopReceiver] = useState([]);
  const [topMode, setTopMode] = useState("transfer");
  const [topItems, setTopItems] = useState([]);
  const [topItemsPagination, setTopItemsPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const token = localStorage.getItem("token");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const withRange = (params) => {
    if (range.startDate) params.append("startDate", range.startDate);
    if (range.endDate) params.append("endDate", range.endDate);
    return params;
  };

  const fetchOverview = async () => {
    const params = withRange(new URLSearchParams());
    const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_OVERVIEW}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setOverview(data);
  };

  const fetchTopSender = async () => {
    const params = withRange(new URLSearchParams());
    params.append("mode", topMode);
    const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_SENDER}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTopSender(data.rows || []);
  };

  const fetchTopReceiver = async () => {
    const params = withRange(new URLSearchParams());
    params.append("mode", topMode);
    const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_RECEIVER}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTopReceiver(data.rows || []);
  };

  const fetchTopItems = async (page = 1, limit = 10) => {
    const params = withRange(new URLSearchParams());
    params.append("page", page);
    params.append("limit", limit);
    const res = await fetch(`${API_ROUTES.REPORT_TRANSFER_TOP_ITEMS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTopItems(data.rows || []);
    setTopItemsPagination(data.pagination || { page: 1, limit, totalPages: 1 });
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (tab === "topSender") fetchTopSender();
    if (tab === "topReceiver") fetchTopReceiver();
    if (tab === "topItems") fetchTopItems(1, topItemsPagination.limit);
  }, [tab]);

  const applyFilter = () => {
    if (tab === "overview") fetchOverview();
    if (tab === "topSender") fetchTopSender();
    if (tab === "topReceiver") fetchTopReceiver();
    if (tab === "topItems") fetchTopItems(1, topItemsPagination.limit);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Transfer Report</h1>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab === "overview" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("overview")}>Overview</button>
        <button className={`px-3 py-2 rounded ${tab === "topSender" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("topSender")}>Top Sender</button>
        <button className={`px-3 py-2 rounded ${tab === "topReceiver" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("topReceiver")}>Top Receiver</button>
        <button className={`px-3 py-2 rounded ${tab === "topItems" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("topItems")}>Top Items</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={range.startDate} onChange={(e) => setRange(prev => ({ ...prev, startDate: e.target.value }))} className="border p-2 rounded" />
        <input type="date" value={range.endDate} onChange={(e) => setRange(prev => ({ ...prev, endDate: e.target.value }))} className="border p-2 rounded" />
        {(tab === "topSender" || tab === "topReceiver") && (
          <select className="border p-2 rounded" value={topMode} onChange={(e) => setTopMode(e.target.value)}>
            <option value="transfer">Transfer Wise</option>
            <option value="product">Product Wise</option>
          </select>
        )}
        <button className="bg-blue-600 text-white px-3 rounded" onClick={applyFilter}>Apply</button>
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Total Transfers</div>
              <div className="text-xl font-semibold">{overview.totalCount || 0}</div>
            </div>
            {Object.entries(overview.byStatus || {}).map(([status, count]) => (
              <div key={status} className="border rounded p-3 bg-white">
                <div className="text-sm text-gray-500 capitalize">{status.replace("_", " ")}</div>
                <div className="text-xl font-semibold">{count}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Transfer From</h3>
              {["shops", "stores", "factories"].map((group) => (
                <div key={group} className="mb-4">
                  <div className="text-sm text-gray-600 mb-1 capitalize">{group}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {(overview.from?.[group] || []).map(p => (
                      <div key={`${group}-${p.id}`} className="border rounded p-2 bg-white">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">Total: {p.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Destination</h3>
              {["shops", "stores", "factories"].map((group) => (
                <div key={group} className="mb-4">
                  <div className="text-sm text-gray-600 mb-1 capitalize">{group}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {(overview.to?.[group] || []).map(p => (
                      <div key={`${group}-${p.id}`} className="border rounded p-2 bg-white">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">Total: {p.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "topSender" && (
        <div className="bg-white rounded shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Place</th>
                <th className="p-2 text-left">Total Transfers</th>
                <th className="p-2 text-left">Total Items</th>
                <th className="p-2 text-left">Item Types</th>
                <th className="p-2 text-left">Shipping Cost</th>
              </tr>
            </thead>
            <tbody>
              {topSender.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{r.placeName}</td>
                  <td className="p-2">{r.totalTransfers}</td>
                  <td className="p-2">{Number(r.totalItems || 0)}</td>
                  <td className="p-2">{r.itemTypeCount}</td>
                  <td className="p-2">{Number(r.totalShippingCost || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "topReceiver" && (
        <div className="bg-white rounded shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Place</th>
                <th className="p-2 text-left">Total Transfers</th>
                <th className="p-2 text-left">Total Items</th>
                <th className="p-2 text-left">Item Types</th>
                <th className="p-2 text-left">Shipping Cost</th>
              </tr>
            </thead>
            <tbody>
              {topReceiver.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{r.placeName}</td>
                  <td className="p-2">{r.totalTransfers}</td>
                  <td className="p-2">{Number(r.totalItems || 0)}</td>
                  <td className="p-2">{r.itemTypeCount}</td>
                  <td className="p-2">{Number(r.totalShippingCost || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "topItems" && (
        <>
          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Image</th>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Category</th>
                  <th className="p-2 text-left">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((r, idx) => {
                  const imageUrl = getImageUrl(r.image);
                  const qty = r.unit ? `${Number(r.totalQty || 0)} ${r.unit}` : Number(r.totalQty || 0);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        {imageUrl ? (
                          <img src={imageUrl} alt={r.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded" />
                        )}
                      </td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.category || "-"}</td>
                      <td className="p-2">{qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1 border rounded" disabled={topItemsPagination.page <= 1} onClick={() => fetchTopItems(topItemsPagination.page - 1, topItemsPagination.limit)}>Prev</button>
            <div className="px-3 py-1">{topItemsPagination.page} / {topItemsPagination.totalPages || 1}</div>
            <button className="px-3 py-1 border rounded" disabled={topItemsPagination.page >= topItemsPagination.totalPages} onClick={() => fetchTopItems(topItemsPagination.page + 1, topItemsPagination.limit)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferReport;
