import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function POS() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:3001/api/stores", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setStores(Array.isArray(data) ? data : data.stores || []))
      .catch(() => setStores([]));

  }, []);

  // fetch products when store changes
useEffect(() => {
  if (!storeId) return;

  fetch(`http://localhost:3001/api/products/store/${storeId}`)
    .then((res) => res.json())
    .then(setProducts)
    .catch(() => setProducts([]));
}, [storeId]);

console.log(products);

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleChangeItem = (index, field, value) => {
  const updated = [...items];

  if (field === "productId") {
    const selectedProduct = products.find((p) => p.id === parseInt(value));

    updated[index].productId = parseInt(value);
    updated[index].unitPrice = selectedProduct ? selectedProduct.sale_price || 0 : 0;
  } else if (field === "quantity" || field === "unitPrice") {
    updated[index][field] = parseFloat(value) || 0;
  } else {
    updated[index][field] = value;
  }

  setItems(updated);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { storeId: parseInt(storeId), customer, paymentType, discount: parseFloat(discount), items };

    const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:3001/api/sales", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

    if (res.ok) {
      alert("✅ Sale added successfully!");
      navigate("/sale/pos");
    } else {
      const error = await res.json();
      alert("❌ Error: " + error.message);
    }
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grandTotal = total - discount;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">🧾 New Sale (POS)</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <select className="border p-2 rounded" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select Store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Customer Name (optional)"
            className="border p-2 rounded"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>

        <div className="border rounded p-4 space-y-4 bg-gray-50">
          <h3 className="font-semibold">🛍️ Sale Items</h3>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-3 items-center">
              <select
                className="border w-40 p-2 rounded"
                value={item.productId}
                onChange={(e) => handleChangeItem(idx, "productId", parseInt(e.target.value))}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}> {p.name} — (Stock: {p.stock})</option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                className="border w-35 ml-2 p-2 rounded"
                placeholder="Quantity"
                value={item.quantity}
                onChange={(e) => handleChangeItem(idx, "quantity", e.target.value)}
              />
              <input
                type="number"
                min="0"
                className="border p-2 rounded"
                placeholder="Unit Price"
                value={item.unitPrice}
                onChange={(e) => handleChangeItem(idx, "unitPrice", e.target.value)}
              />
              <p className="text-right font-semibold">
                {(item.quantity * item.unitPrice).toFixed(2)}
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            ➕ Add Item
          </button>
        </div>

        <div className="space-y-3 text-right">
          <p>Total: <strong>{total.toFixed(2)}</strong></p>
          <p>Discount</p>
          <input
            type="number"
            placeholder="Discount"
            className="border p-2 rounded w-32 text-right"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <p>Grand Total: <strong>{grandTotal.toFixed(2)}</strong></p>

          <select
            className="border p-2 rounded w-40"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile Payment</option>
          </select>
        </div>

        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          💾 Save Sale
        </button>
      </form>
    </div>
  );
}
