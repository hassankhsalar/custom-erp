import { useEffect, useMemo, useState } from "react";
import { API_ROUTES, MEDIA_BASE_URL } from "../../config";

const StockReport = () => {
  const [tab, setTab] = useState("products");
  const [placeType, setPlaceType] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [places, setPlaces] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const placeLabel = useMemo(() => {
    if (placeType === "store") return "Store";
    if (placeType === "shop") return "Shop";
    if (placeType === "factory") return "Factory";
    return "";
  }, [placeType]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${MEDIA_BASE_URL}${imagePath}`;
    return `${MEDIA_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchPlaces = async (type) => {
    if (!type) {
      setPlaces([]);
      return;
    }
    const endpoint = type === "store" ? API_ROUTES.STORES : type === "shop" ? API_ROUTES.SHOPS : API_ROUTES.FACTORIES;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPlaces(Array.isArray(data) ? data : []);
  };

  const fetchRows = async (page = 1, limit = 10) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (placeType) params.append("placeType", placeType);
    if (placeId) params.append("placeId", placeId);
    params.append("page", page);
    params.append("limit", limit);
    const endpoint = tab === "products" ? API_ROUTES.REPORT_STOCK_PRODUCTS : API_ROUTES.REPORT_STOCK_MATERIALS;
    const res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRows(data.rows || []);
    setPagination(data.pagination || { page: 1, limit, totalPages: 1 });
    setLoading(false);
  };

  useEffect(() => {
    fetchRows(1, pagination.limit);
  }, [tab]);

  useEffect(() => {
    setPlaceId("");
    fetchPlaces(placeType);
  }, [placeType]);

  const applyFilter = () => {
    fetchRows(1, pagination.limit);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Stock Report</h1>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab === "products" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("products")}>Product</button>
        <button className={`px-3 py-2 rounded ${tab === "materials" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("materials")}>Material</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={placeType}
          onChange={(e) => setPlaceType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Places</option>
          <option value="store">Store</option>
          <option value="shop">Shop</option>
          <option value="factory">Factory</option>
        </select>
        {placeType && (
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">{placeLabel} (All)</option>
            {places.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button className="bg-blue-600 text-white px-3 rounded" onClick={applyFilter}>
          Apply
        </button>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Brand</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Stock</th>
              <th className="p-2 text-left">Damage/Scrap</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-2" colSpan="6">Loading...</td>
              </tr>
            ) : rows.map((r, idx) => {
              const imageUrl = getImageUrl(r.image);
              const stockText = r.unit ? `${Number(r.stock || 0)} ${r.unit}` : Number(r.stock || 0);
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
                  <td className="p-2">{r.brand || "-"}</td>
                  <td className="p-2">{r.category || "-"}</td>
                  <td className="p-2">{stockText}</td>
                  <td className="p-2">{Number(r.scrap || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          className="px-3 py-1 border rounded"
          disabled={pagination.page <= 1}
          onClick={() => fetchRows(pagination.page - 1, pagination.limit)}
        >
          Prev
        </button>
        <div className="px-3 py-1">{pagination.page} / {pagination.totalPages || 1}</div>
        <button
          className="px-3 py-1 border rounded"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => fetchRows(pagination.page + 1, pagination.limit)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default StockReport;
