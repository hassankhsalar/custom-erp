import { useEffect, useState } from "react";

export default function AllSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/suppliers");
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        const data = await res.json();
        setSuppliers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <p>Loading suppliers...</p>
      </div>
    );

  if (error)
    return (
      <div style={{ textAlign: "center", color: "red", marginTop: "2rem" }}>
        <p>❌ {error}</p>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "2rem auto",
        background: "#fff",
        padding: "1.5rem",
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", textAlign: "center", marginBottom: "1rem" }}>
        All Suppliers
      </h2>

      {suppliers.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666" }}>No suppliers found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Name</th>
                <th style={th}>Mobile</th>
                <th style={th}>Address</th>
                <th style={th}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, index) => (
                <tr key={s.id} style={{ background: index % 2 ? "#fafafa" : "#fff" }}>
                  <td style={td}>{index + 1}</td>
                  <td style={td}>{s.name}</td>
                  <td style={td}>{s.mobile || "-"}</td>
                  <td style={td}>{s.address || "-"}</td>
                  <td style={td}>{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  border: "1px solid #ddd",
  textAlign: "left",
  padding: "8px",
};

const td = {
  border: "1px solid #ddd",
  padding: "8px",
};
