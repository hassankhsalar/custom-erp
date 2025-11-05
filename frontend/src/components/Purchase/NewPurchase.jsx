import { useEffect, useState } from "react";

export default function NewPurchase() {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    materialId: "",
    supplierId: "",
    storeId: "",
    quantity: "",
    unitPrice: "",
    totalPrice: 0,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data.materials || []))
      .catch(() => setMaterials([]));

    fetch("http://localhost:3001/api/suppliers")
      .then((res) => res.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));


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

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };

    // Auto-calculate totalPrice
    if (name === "quantity" || name === "unitPrice") {
      const q = parseFloat(updated.quantity) || 0;
      const u = parseFloat(updated.unitPrice) || 0;
      updated.totalPrice = q * u;
    }

    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: parseInt(form.materialId),
          supplierId: parseInt(form.supplierId),
          quantity: parseFloat(form.quantity),
          unitPrice: parseFloat(form.unitPrice),
          storeId: parseInt(form.storeId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Purchase added successfully!");
        setForm({
          materialId: "",
          supplierId: "",
          storeId: "",
          quantity: "",
          unitPrice: "",
          totalPrice: 0,
        });
      } else setMessage(`❌ ${data.error}`);
    } catch {
      setMessage("❌ Failed to add purchase");
    }
  };

  return (
    <div style={container}>
      <h2 style={title}>New Purchase</h2>
      <form onSubmit={handleSubmit} style={formBox}>
        <div style={row}>
          <label>Material:</label>
          <select
            name="materialId"
            value={form.materialId}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={row}>
          <label>Supplier:</label>
          <select
            name="supplierId"
            value={form.supplierId}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 🆕 Deliver To (Store) */}
        <div style={row}>
          <label>Deliver to:</label>
          <select
            name="storeId"
            value={form.storeId}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Store --</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div style={row}>
          <label>Quantity:</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            required
          />
        </div>

        <div style={row}>
          <label>Unit Price:</label>
          <input
            type="number"
            name="unitPrice"
            value={form.unitPrice}
            onChange={handleChange}
            required
          />
        </div>

        <div style={row}>
          <label>Total Price:</label>
          <input type="text" value={form.totalPrice.toFixed(2)} readOnly />
        </div>

        <button type="submit" style={button}>
          Add Purchase
        </button>
      </form>
      {message && (
        <p style={{ textAlign: "center", marginTop: "1rem" }}>{message}</p>
      )}
    </div>
  );
}

// --- Simple inline styles ---
const container = {
  maxWidth: "600px",
  margin: "2rem auto",
  padding: "1.5rem",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};
const title = { textAlign: "center", marginBottom: "1rem" };
const formBox = { display: "flex", flexDirection: "column", gap: "1rem" };
const row = { display: "flex", flexDirection: "column", gap: ".3rem" };
const button = {
  padding: "10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
