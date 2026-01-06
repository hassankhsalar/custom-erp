import { ArrowUpDown, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";

export default function AllSales() {
  const [sales, setSales] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

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

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  

  // Format sales data for table display
  const formatSalesData = (sales) => {
    return sales.map(sale => ({
      id: sale.id,
      reference: sale.reference,
      shop: sale.shop?.name || "-",
      customer: sale.customer || "-",
      total: `$${sale.totalAmount.toFixed(2)}`,
      discount: `$${sale.discount.toFixed(2)}`,
      "grand total": `$${sale.grandTotal.toFixed(2)}`,
      payment: sale.paymentType,
      date: new Date(sale.createdAt).toLocaleDateString(),
      rawDate: sale.createdAt
    }));
  };

  const sortedData = sortConfig.key ? 
    [...formatSalesData(sales)].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      // Special handling for currency values
      if (sortConfig.key === 'total' || sortConfig.key === 'discount' || sortConfig.key === 'grand total') {
        const valueA = parseFloat(a[sortConfig.key].replace('$', ''));
        const valueB = parseFloat(b[sortConfig.key].replace('$', ''));
        if (sortConfig.direction === 'ascending') {
          return valueA - valueB;
        }
        return valueB - valueA;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    }) : 
    formatSalesData(sales);

  const tableHeaders = sales.length > 0 ? 
    Object.keys(formatSalesData(sales)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['reference', 'shop', 'customer', 'total', 'discount', 'grand total', 'payment', 'date'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2 bg-gray-200">
        <ClipboardList size={32} /> All Sales
      </h2>

      {/* table */}
      <div className="customTable w-full rounded-md border overflow-hidden dark:border-slate-700 border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-900">
            <tr>
              {tableHeaders.map((key) => (
                <th
                  key={key}
                  className="p-3 text-left font-medium dark:text-[#abc2d3] text-gray-700 cursor-pointer"
                >
                  <div className="flex items-center gap-[5px]">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    <ArrowUpDown
                      onClick={() => handleSort(key)}
                      className="hover:bg-gray-200 dark:hover:bg-slate-800 p-[5px] rounded-md text-[1.6rem]"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={item.id}
                className="border-t dark:border-slate-700 border-gray-200 hover:bg-gray-50"
              >
                {tableHeaders.map((key) => (
                  <td key={key} className="p-3 dark:text-black">
                    {item[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!sales?.length && (
          <p className="text-[0.9rem] text-gray-500 py-6 text-center w-full">
            No data found!
          </p>
        )}
      </div>
    </div>
  );
}