import { useEffect, useState } from "react";

export default function AllPurchase() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/purchases");
        if (!res.ok) throw new Error("Failed to fetch purchases");
        const data = await res.json();
        setPurchases(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, []);
  console.log(purchases);

  if (loading)
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading purchases...</p>;

  if (error)
    return (
      <p style={{ textAlign: "center", color: "red", marginTop: "2rem" }}>
        ❌ {error}
      </p>
    );

  return (
    <div style={container}>
      <h2 style={title}>All Purchases</h2>

      {purchases.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666" }}>No purchases found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead style={thead}>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Material</th>
                <th style={th}>Supplier</th>
                <th style={th}>Quantity</th>
                <th style={th}>Unit Price</th>
                <th style={th}>Total Price</th>
                <th style={th}>Date</th>
                <th style={th}>Store location</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={p.id} style={i % 2 ? rowAlt : row}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{p.material?.name || "-"}</td>
                  <td style={td}>{p.supplier?.name || "-"}</td>
                  <td style={td}>{p.quantity}</td>
                  <td style={td}>{p.unitPrice.toFixed(2)}</td>
                  <td style={td}>{p.totalPrice.toFixed(2)}</td>
                  <td style={td}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td style={td}>{p.store?.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const container = {
  maxWidth: "900px",
  margin: "2rem auto",
  background: "#fff",
  padding: "1.5rem",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const title = {
  textAlign: "center",
  fontSize: "1.5rem",
  marginBottom: "1rem",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const thead = {
  background: "#f5f5f5",
  textAlign: "left",
};

const th = {
  border: "1px solid #ddd",
  padding: "8px",
};

const td = {
  border: "1px solid #ddd",
  padding: "8px",
};

const row = { background: "#fff" };
const rowAlt = { background: "#fafafa" };
