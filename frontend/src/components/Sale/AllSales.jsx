import { useEffect, useState } from "react";

export default function AllSales() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
   
      const token = localStorage.getItem("token");
    fetch("http://localhost:3001/api/shop-sales", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setSales);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">📋 All Sales</h2>

      <table className="w-full border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Reference</th>
            <th className="p-2 border">Store</th>
            <th className="p-2 border">Customer</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Discount</th>
            <th className="p-2 border">Grand Total</th>
            <th className="p-2 border">Payment</th>
            <th className="p-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="p-2 border">{s.reference}</td>
              <td className="p-2 border">{s.store?.name}</td>
              <td className="p-2 border">{s.customer || "-"}</td>
              <td className="p-2 border">{s.totalAmount.toFixed(2)}</td>
              <td className="p-2 border">{s.discount.toFixed(2)}</td>
              <td className="p-2 border font-semibold">{s.grandTotal.toFixed(2)}</td>
              <td className="p-2 border capitalize">{s.paymentType}</td>
              <td className="p-2 border">{new Date(s.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
