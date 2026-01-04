import { useEffect, useState } from "react";

export default function NewPurchase() {
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [destinationType, setDestinationType] = useState("store");
  const [destinationId, setDestinationId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([
    { 
      itemType: "material", // "material" or "product"
      materialId: "", 
      productId: "", 
      quantity: "", 
      unitPrice: "", 
      total: 0, 
      materialUnitPrice: 0,
      productCost: 0
    }
  ]);
  const [form, setForm] = useState({
    supplierId: "",
    destinationType: "store",
    destinationId: "",
    grandTotal: 0,
    reference: `PUR-${Date.now()}`
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchProducts();
    fetchSuppliers();
    fetchDestinations();
  }, [destinationType]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/materials");
      const data = await res.json();
      setMaterials(data.materials || data || []);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      setMaterials([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/products");
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/suppliers");
      const data = await res.json();
      setSuppliers(data || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      setSuppliers([]);
    }
  };

  const fetchDestinations = async () => {
    try {
      let endpoint = "";
      switch (destinationType) {
        case "store":
          endpoint = "http://localhost:3001/api/stores";
          break;
        case "shop":
          endpoint = "http://localhost:3001/api/shops";
          break;
        case "factory":
          endpoint = "http://localhost:3001/api/factories";
          break;
        default:
          endpoint = "http://localhost:3001/api/stores";
      }

      const token = localStorage.getItem("token");
      const headers = {};
      
      // Add token for protected routes (stores require auth)
      if (destinationType === "store") {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error("Failed to fetch destinations");
      const data = await res.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setDestinations(data);
      } else if (data.stores) {
        setDestinations(data.stores);
      } else if (data.shops) {
        setDestinations(data.shops || data);
      } else {
        setDestinations([]);
      }
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
      setDestinations([]);
    }
  };

  // Update grand total whenever purchase items change
  useEffect(() => {
    const grandTotal = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    setForm(prev => ({ ...prev, grandTotal }));
  }, [purchaseItems]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDestinationTypeChange = (e) => {
    const newType = e.target.value;
    setDestinationType(newType);
    setDestinationId("");
    setForm(prev => ({ 
      ...prev, 
      destinationType: newType,
      destinationId: ""
    }));
  };

  const handleDestinationChange = (e) => {
    const newId = e.target.value;
    setDestinationId(newId);
    setForm(prev => ({ ...prev, destinationId: newId }));
  };

  const handleItemTypeChange = (index, newType) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index].itemType = newType;
    
    // Clear the other ID when switching types
    if (newType === "material") {
      updatedItems[index].productId = "";
      updatedItems[index].productCost = 0;
    } else {
      updatedItems[index].materialId = "";
      updatedItems[index].materialUnitPrice = 0;
    }
    
    // Clear unit price when switching types
    updatedItems[index].unitPrice = "";
    updatedItems[index].total = 0;
    
    setPurchaseItems(updatedItems);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...purchaseItems];
    
    if (field === 'materialId') {
      const selectedMaterial = materials.find(m => m.id === parseInt(value));
      
      if (selectedMaterial) {
        updatedItems[index].materialId = value;
        updatedItems[index].materialUnitPrice = selectedMaterial.unit_cost || 0;
        
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = selectedMaterial.unit_cost.toString();
        }
      } else {
        updatedItems[index].materialId = value;
        updatedItems[index].materialUnitPrice = 0;
      }
    } 
    else if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      
      if (selectedProduct) {
        updatedItems[index].productId = value;
        updatedItems[index].productCost = selectedProduct.cost || 0;
        
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = selectedProduct.cost.toString();
        }
      } else {
        updatedItems[index].productId = value;
        updatedItems[index].productCost = 0;
      }
    }
    else {
      updatedItems[index][field] = value;
    }
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'materialId' || field === 'productId') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].total = quantity * unitPrice;
    }
    
    setPurchaseItems(updatedItems);
  };

  const addItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { 
        itemType: "material",
        materialId: "", 
        productId: "", 
        quantity: "", 
        unitPrice: "", 
        total: 0, 
        materialUnitPrice: 0,
        productCost: 0
      }
    ]);
  };

  const removeItem = (index) => {
    if (purchaseItems.length > 1) {
      const updatedItems = purchaseItems.filter((_, i) => i !== index);
      setPurchaseItems(updatedItems);
    }
  };

  // Helper function to get item details
  const getItemDetails = (item) => {
    if (item.itemType === "material" && item.materialId) {
      const material = materials.find(m => m.id === parseInt(item.materialId));
      return {
        name: material?.name || "",
        unit: material?.unit || "",
        standardPrice: material?.unit_cost || 0
      };
    } else if (item.itemType === "product" && item.productId) {
      const product = products.find(p => p.id === parseInt(item.productId));
      return {
        name: product?.name || "",
        unit: "unit",
        standardPrice: product?.cost || 0
      };
    }
    return { name: "", unit: "", standardPrice: 0 };
  };

  const handleItemSelect = (index, itemType, itemId) => {
    if (!itemId) return;
    
    const updatedItems = [...purchaseItems];
    
    if (itemType === "material") {
      const material = materials.find(m => m.id === parseInt(itemId));
      if (material) {
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = material.unit_cost.toString();
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          updatedItems[index].total = quantity * material.unit_cost;
        }
        updatedItems[index].materialUnitPrice = material.unit_cost;
      }
    } else {
      const product = products.find(p => p.id === parseInt(itemId));
      if (product) {
        if (!updatedItems[index].unitPrice || updatedItems[index].unitPrice === "0") {
          updatedItems[index].unitPrice = product.cost.toString();
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          updatedItems[index].total = quantity * product.cost;
        }
        updatedItems[index].productCost = product.cost;
      }
    }
    
    setPurchaseItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    // Validate form
    if (!form.supplierId || !form.destinationId) {
      setMessage("❌ Please select supplier and destination");
      setLoading(false);
      return;
    }

    // Validate items
    const validItems = purchaseItems.filter(item => {
      if (!item.itemType || !item.quantity || !item.unitPrice) return false;
      if (parseFloat(item.quantity) <= 0 || parseFloat(item.unitPrice) <= 0) return false;
      
      if (item.itemType === "material" && !item.materialId) return false;
      if (item.itemType === "product" && !item.productId) return false;
      
      return true;
    });

    if (validItems.length === 0) {
      setMessage("❌ Please add at least one valid item with quantity and unit price");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        supplierId: parseInt(form.supplierId),
        destinationType: form.destinationType,
        destinationId: parseInt(form.destinationId),
        grandTotal: form.grandTotal,
        reference: form.reference,
        items: validItems.map(item => ({
          itemType: item.itemType,
          materialId: item.itemType === "material" ? parseInt(item.materialId) : undefined,
          productId: item.itemType === "product" ? parseInt(item.productId) : undefined,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        }))
      };

      const res = await fetch("http://localhost:3001/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
        
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Purchase added successfully!");
        // Reset form
        setForm({
          supplierId: "",
          destinationType: "store",
          destinationId: "",
          grandTotal: 0,
          reference: `PUR-${Date.now()}`
        });
        setDestinationType("store");
        setDestinationId("");
        setPurchaseItems([{ 
          itemType: "material",
          materialId: "", 
          productId: "", 
          quantity: "", 
          unitPrice: "", 
          total: 0, 
          materialUnitPrice: 0,
          productCost: 0
        }]);
      } else {
        setMessage(`❌ ${data.error || data.message || "Failed to add purchase"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to add purchase: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <h2 style={title}>New Purchase</h2>
      <form onSubmit={handleSubmit} style={formBox}>
        {/* Supplier and Destination Selection */}
        <div style={gridRow}>
          <div style={row}>
            <label>Supplier:</label>
            <select
              name="supplierId"
              value={form.supplierId}
              onChange={handleFormChange}
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

          <div style={row}>
            <label>Deliver to Type:</label>
            <select
              value={destinationType}
              onChange={handleDestinationTypeChange}
              required
            >
              <option value="store">Store</option>
              <option value="shop">Shop</option>
              <option value="factory">Factory</option>
            </select>
          </div>

          <div style={row}>
            <label>Deliver to:</label>
            <select
              name="destinationId"
              value={form.destinationId}
              onChange={handleDestinationChange}
              required
            >
              <option value="">-- Select {destinationType.charAt(0).toUpperCase() + destinationType.slice(1)} --</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Purchase Items Section */}
        <div style={itemsSection}>
          <div style={sectionHeader}>
            <h3>Purchase Items</h3>
            <button type="button" onClick={addItem} style={addButton}>
              + Add Item
            </button>
          </div>

          {purchaseItems.map((item, index) => {
            const itemDetails = getItemDetails(item);
            const standardPrice = itemDetails.standardPrice;
            const currentPrice = parseFloat(item.unitPrice) || 0;
            
            return (
              <div key={index} style={itemRow}>
                <div style={gridRow}>
                  {/* Item Type Selector */}
                  <div style={row}>
                    <label>Item Type:</label>
                    <select
                      value={item.itemType}
                      onChange={(e) => handleItemTypeChange(index, e.target.value)}
                      required
                      style={{
                        backgroundColor: item.itemType === "material" ? "#e0f2fe" : "#f0fdf4",
                        borderColor: item.itemType === "material" ? "#0ea5e9" : "#10b981"
                      }}
                    >
                      <option value="material">📦 Material</option>
                      <option value="product">🏷️ Product</option>
                    </select>
                  </div>

                  {/* Item Selection */}
                  <div style={row}>
                    <label>
                      {item.itemType === "material" ? "Material:" : "Product:"}
                    </label>
                    <select
                      value={item.itemType === "material" ? item.materialId : item.productId}
                      onChange={(e) => {
                        if (item.itemType === "material") {
                          handleItemChange(index, 'materialId', e.target.value);
                        } else {
                          handleItemChange(index, 'productId', e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (item.itemType === "material") {
                          handleItemSelect(index, "material", item.materialId);
                        } else {
                          handleItemSelect(index, "product", item.productId);
                        }
                      }}
                      required
                      style={{
                        backgroundColor: item.itemType === "material" ? "#f0f9ff" : "#f0fdf4"
                      }}
                    >
                      <option value="">
                        -- Select {item.itemType === "material" ? "Material" : "Product"} --
                      </option>
                      {item.itemType === "material" ? (
                        materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit}) - ${m.unit_cost}/unit
                          </option>
                        ))
                      ) : (
                        products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - Cost: ${p.cost}
                          </option>
                        ))
                      )}
                    </select>
                    {((item.itemType === "material" && item.materialId) || 
                      (item.itemType === "product" && item.productId)) && (
                      <small style={{ color: "#666", fontSize: "0.8rem", marginTop: "2px" }}>
                        Standard price: ${standardPrice.toFixed(2)}
                      </small>
                    )}
                  </div>

                  <div style={row}>
                    <label>Quantity:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div style={row}>
                    <label>Unit Price:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={`e.g., ${standardPrice.toFixed(2)}`}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      required
                      style={{
                        ...(standardPrice > 0 && currentPrice === standardPrice 
                          ? { borderColor: "#10b981", backgroundColor: "#f0fdf4" } 
                          : standardPrice > 0 && currentPrice !== standardPrice
                          ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }
                          : {})
                      }}
                    />
                    {standardPrice > 0 && currentPrice !== standardPrice && item.unitPrice && (
                      <small style={{ color: "#f59e0b", fontSize: "0.8rem", marginTop: "2px" }}>
                        Different from standard price (${standardPrice.toFixed(2)})
                      </small>
                    )}
                  </div>

                  <div style={row}>
                    <label>Total:</label>
                    <input 
                      type="text" 
                      value={item.total.toFixed(2)} 
                      readOnly 
                      style={totalInput}
                    />
                  </div>

                  {purchaseItems.length > 1 && (
                    <div style={removeButtonContainer}>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={removeButton}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Item Type Indicator */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  fontSize: "0.8rem"
                }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: item.itemType === "material" ? "#dbeafe" : "#dcfce7",
                    color: item.itemType === "material" ? "#1e40af" : "#166534"
                  }}>
                    {item.itemType === "material" ? "📦 Material" : "🏷️ Product"}
                  </span>
                  {itemDetails.name && (
                    <span style={{ color: "#6b7280" }}>
                      Selected: {itemDetails.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div style={grandTotalRow}>
          <label style={grandTotalLabel}>Grand Total:</label>
          <input 
            type="text" 
            value={form.grandTotal.toFixed(2)} 
            readOnly 
            style={grandTotalInput}
          />
        </div>

        <button 
          type="submit" 
          style={{ ...button, ...(loading ? buttonLoading : {}) }}
          disabled={loading}
        >
          {loading ? "Creating Purchase..." : "Create Purchase"}
        </button>
      </form>
      {message && (
        <p style={{ 
          textAlign: "center", 
          marginTop: "1rem", 
          color: message.includes("✅") ? "green" : "red",
          fontWeight: "bold" 
        }}>
          {message}
        </p>
      )}
    </div>
  );
}

// Styles (keep the same styles as before)
const container = {
  maxWidth: "900px",
  margin: "2rem auto",
  padding: "1.5rem",
  background: "#fff",
  borderRadius: "10px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const title = { textAlign: "center", marginBottom: "1rem" };

const formBox = { 
  display: "flex", 
  flexDirection: "column", 
  gap: "1.5rem" 
};

const gridRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
  gap: "1rem",
  alignItems: "end"
};

const row = { 
  display: "flex", 
  flexDirection: "column", 
  gap: ".3rem" 
};

const itemsSection = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem",
  background: "#f8fafc"
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem"
};

const addButton = {
  padding: "0.5rem 1rem",
  background: "#10b981",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.9rem"
};

const itemRow = {
  padding: "1rem",
  background: "white",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  marginBottom: "0.5rem"
};

const totalInput = {
  background: "#f1f5f9",
  fontWeight: "bold"
};

const removeButtonContainer = {
  display: "flex",
  alignItems: "center",
  height: "100%"
};

const removeButton = {
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "50%",
  width: "30px",
  height: "30px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.2rem"
};

const grandTotalRow = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem",
  background: "#dbeafe",
  borderRadius: "6px",
  border: "2px solid #3b82f6"
};

const grandTotalLabel = {
  fontSize: "1.1rem",
  fontWeight: "bold",
  color: "#1e40af"
};

const grandTotalInput = {
  fontSize: "1.2rem",
  fontWeight: "bold",
  color: "#1e40af",
  background: "transparent",
  border: "none",
  width: "120px",
  textAlign: "right"
};

const button = {
  padding: "12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: "bold"
};

const buttonLoading = {
  background: "#9ca3af",
  cursor: "not-allowed"
};