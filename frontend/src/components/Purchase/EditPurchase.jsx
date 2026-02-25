import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Loader2, Save, Truck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_ROUTES } from "../../config";

export default function EditPurchase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchaseId = Number(id);
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [shippingCost, setShippingCost] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [additionalPayment, setAdditionalPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    if (!purchaseId) {
      setMessage("Invalid purchase id.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_ROUTES.PURCHASE_BY_ID(purchaseId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load purchase");
        const row = data?.purchase || data;
        setPurchase(row);
        setShippingCost(String(Number(row?.shippingCost || 0)));
        setDiscount(String(Number(row?.discount || 0)));
        setTax(String(Number(row?.tax || 0)));
        setAdditionalPayment("0");
        setPaymentMethod("cash");
        setItems(
          (row?.purchaseItems || []).map((item) => ({
            purchaseItemId: item.id,
            itemType: item.itemType,
            productId: item.productId,
            materialId: item.materialId,
            name: item.itemType === "product" ? item.product?.name : item.material?.name,
            quantity: Number(item.quantity || 0),
            receivedQuantity: Number((item.receivedQuantity ?? item.quantity) || 0),
            unitPrice: Number(item.unitPrice || 0),
            batchNumber: item.batchNumber || "",
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
          }))
        );
      } catch (error) {
        setMessage(error.message || "Failed to load purchase");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [purchaseId, token]);

  const totals = useMemo(() => {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
    const discountAmount = (subTotal * Number(discount || 0)) / 100;
    const taxable = subTotal - discountAmount;
    const taxAmount = (taxable * Number(tax || 0)) / 100;
    const grandTotal = taxable + taxAmount + Number(shippingCost || 0);
    return { subTotal, grandTotal };
  }, [items, discount, tax, shippingCost]);

  const save = async () => {
    setMessage("");
    const payloadItems = items
      .filter((i) => Number(i.quantity) > 0)
      .map((i) => ({
        itemType: i.itemType,
        productId: i.itemType === "product" ? i.productId : null,
        materialId: i.itemType === "material" ? i.materialId : null,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        receivedQuantity: Number(i.receivedQuantity ?? i.quantity),
        batchNumber: i.batchNumber || null,
        expiryDate: i.expiryDate || null,
      }));

    if (!payloadItems.length) {
      setMessage("At least one item is required.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(API_ROUTES.PURCHASE_BY_ID(purchaseId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingCost: Number(shippingCost || 0),
          discount: Number(discount || 0),
          tax: Number(tax || 0),
          additionalPayment: Number(additionalPayment || 0),
          paymentMethod,
          items: payloadItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save purchase");
      navigate("/purchase/all");
    } catch (error) {
      setMessage(error.message || "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-gray-700">
          <Loader2 size={18} className="animate-spin" />
          Loading purchase...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl xl:max-w-full space-y-6">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Truck className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Edit Purchase
                </h1>
                <p className="text-gray-600 mt-1">{purchase?.reference || "-"}</p>
              </div>
            </div>
            <Link to="/purchase/all" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white/70">
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
          {message ? <p className="mt-3 text-sm text-rose-600">{message}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="text-blue-600" size={20} />
              </div>
              Costs And Payment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Shipping cost" />
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Discount %" />
              <input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Tax %" />
              <input type="number" min="0" step="0.01" value={additionalPayment} onChange={(e) => setAdditionalPayment(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2" placeholder="Additional payment" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Purchase Items</h2>
            <div className="overflow-x-auto rounded-xl border border-white/60 bg-white/70">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/80">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-left">Qty</th>
                    <th className="p-3 text-left">Received</th>
                    <th className="p-3 text-left">Unit Price</th>
                    <th className="p-3 text-left">Batch</th>
                    <th className="p-3 text-left">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.purchaseItemId} className="border-t border-gray-200">
                      <td className="p-3">
                        {item.name} <span className="text-xs text-gray-500">({item.itemType})</span>
                      </td>
                      <td className="p-3">
                        <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className="w-28 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="number" min="0" step="0.01" value={item.receivedQuantity} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, receivedQuantity: e.target.value } : x))} className="w-28 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))} className="w-32 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={item.batchNumber} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, batchNumber: e.target.value } : x))} className="w-36 rounded border border-gray-200 px-2 py-1.5" placeholder="Batch no." />
                      </td>
                      <td className="p-3">
                        <input type="date" value={item.expiryDate} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, expiryDate: e.target.value } : x))} className="w-36 rounded border border-gray-200 px-2 py-1.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              <span className="mr-4">Subtotal: <b>{totals.subTotal.toFixed(2)}</b></span>
              <span>Estimated Total: <b>{totals.grandTotal.toFixed(2)}</b></span>
            </div>
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-60 inline-flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
