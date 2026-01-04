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

  // Helper function to get destination display name
  const getDestinationDisplay = (purchase) => {
    // First, check if we have destination data from the API
    if (purchase.destination) {
      const dest = purchase.destination;
      return `${dest.type.charAt(0).toUpperCase() + dest.type.slice(1)}: ${dest.name}`;
    }
    
    // Fallback to store for backward compatibility
    if (purchase.store) {
      return `Store: ${purchase.store.name}`;
    }
    
    // If no destination info is available
    return "-";
  };

  // Helper function to get destination for the detailed table
  const getDestinationForTable = (purchase) => {
    if (purchase.destination) {
      const dest = purchase.destination;
      return `${dest.type}: ${dest.name}`;
    }
    
    if (purchase.store) {
      return `store: ${purchase.store.name}`;
    }
    
    return "-";
  };

  if (loading)
    return (
      <p style={{ textAlign: "center", marginTop: "2rem" }}>
        Loading purchases...
      </p>
    );

  if (error)
    return (
      <p style={{ textAlign: "center", color: "red", marginTop: "2rem" }}>
        ❌ {error}
      </p>
    );

  return (
    <section>
      <div style={container}>
        <h2 style={title}>All Purchases</h2>

        {purchases.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            No purchases found.
          </p>
        ) : (
          purchases.map((purchase) => (
            <div key={purchase.id} style={purchaseCard}>
              {/* Purchase Header */}
              <div style={purchaseHeader}>
                <div style={purchaseInfo}>
                  <strong>Reference: {purchase.reference}</strong>
                  <span>Supplier: {purchase.supplier?.name || "-"}</span>
                  <span>Destination: {getDestinationDisplay(purchase)}</span>
                  <span>
                    Date: {new Date(purchase.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={grandTotal}>
                  Grand Total: ${purchase.grandTotal?.toFixed(2) || "0.00"}
                </div>
              </div>

              {/* Purchase Items Table */}
              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table style={table}>
                  <thead style={thead}>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>Material</th>
                      <th style={th}>Quantity</th>
                      <th style={th}>Unit Price</th>
                      <th style={th}>Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.purchaseItems?.map((item, index) => (
                      <tr key={item.id} style={index % 2 ? rowAlt : row}>
                        <td style={td}>{index + 1}</td>
                        <td style={td}>{item.material?.name || "-"}</td>
                        <td style={td}>
                          {item.quantity} {item.material?.unit || ""}
                        </td>
                        <td style={td}>
                          ${item.unitPrice?.toFixed(2) || "0.00"}
                        </td>
                        <td style={td}>
                          ${item.totalPrice?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={summary}>
                Total Items: {purchase.purchaseItems?.length || 0}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={container}>
        <h2 style={title}>All Purchase Items</h2>

        {purchases.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            No purchases found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead style={thead}>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Purchase Ref</th>
                  <th style={th}>Material</th>
                  <th style={th}>Supplier</th>
                  <th style={th}>Quantity</th>
                  <th style={th}>Unit Price</th>
                  <th style={th}>Total Price</th>
                  <th style={th}>Date</th>
                  <th style={th}>Destination</th>
                </tr>
              </thead>
              <tbody>
                {purchases.flatMap((purchase, purchaseIndex) =>
                  purchase.purchaseItems?.map((item, itemIndex) => (
                    <tr
                      key={`${purchase.id}-${item.id}`}
                      style={(purchaseIndex + itemIndex) % 2 ? rowAlt : row}
                    >
                      <td style={td}>{purchaseIndex * 10 + itemIndex + 1}</td>
                      <td style={td}>{purchase.reference}</td>
                      <td style={td}>{item.material?.name || "-"}</td>
                      <td style={td}>{purchase.supplier?.name || "-"}</td>
                      <td style={td}>
                        {item.quantity} {item.material?.unit || ""}
                      </td>
                      <td style={td}>
                        ${item.unitPrice?.toFixed(2) || "0.00"}
                      </td>
                      <td style={td}>
                        ${item.totalPrice?.toFixed(2) || "0.00"}
                      </td>
                      <td style={td}>
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </td>
                      <td style={td}>{getDestinationForTable(purchase)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// --- Styles (unchanged) ---
const container = {
  maxWidth: "1000px",
  margin: "2rem auto",
  background: "#fff",
  padding: "1.5rem",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const title = {
  textAlign: "center",
  fontSize: "1.5rem",
  marginBottom: "1.5rem",
};

const purchaseCard = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem",
  marginBottom: "1.5rem",
  background: "#f8fafc",
};

const purchaseHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid #e2e8f0",
  marginBottom: "1rem",
};

const purchaseInfo = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const grandTotal = {
  fontSize: "1.1rem",
  fontWeight: "bold",
  color: "#059669",
  background: "#d1fae5",
  padding: "0.5rem 1rem",
  borderRadius: "6px",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const thead = {
  background: "#e2e8f0",
  textAlign: "left",
};

const th = {
  border: "1px solid #cbd5e0",
  padding: "8px 12px",
  fontWeight: "600",
};

const td = {
  border: "1px solid #cbd5e0",
  padding: "8px 12px",
};

const row = {
  background: "#fff",
  "&:hover": {
    background: "#f7fafc",
  },
};

const rowAlt = {
  background: "#f7fafc",
  "&:hover": {
    background: "#edf2f7",
  },
};

const summary = {
  textAlign: "right",
  marginTop: "0.5rem",
  fontSize: "0.9rem",
  color: "#4a5568",
  fontWeight: "500",
};