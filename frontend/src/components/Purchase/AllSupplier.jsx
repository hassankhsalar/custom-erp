import { useEffect, useState } from "react";
import { ArrowUpDown, Users } from "lucide-react";

export default function AllSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

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

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Format suppliers data for table display
  const formatSuppliersData = (suppliers) => {
    return suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      mobile: supplier.mobile || "-",
      address: supplier.address || "-",
      "created at": new Date(supplier.createdAt).toLocaleDateString(),
      rawDate: supplier.createdAt
    }));
  };

  const sortedData = sortConfig.key ? 
    [...formatSuppliersData(suppliers)].sort((a, b) => {
      if (sortConfig.key === 'created at') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
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
    formatSuppliersData(suppliers);

  const tableHeaders = suppliers.length > 0 ? 
    Object.keys(formatSuppliersData(suppliers)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['name', 'mobile', 'address', 'created at'];

  if (loading)
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2 bg-gray-200">
          <Users size={32} /> All Suppliers
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2 bg-gray-200">
          <Users size={32} /> All Suppliers
        </h2>
        <div className="text-center py-8 text-red-500">
          <p>❌ {error}</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2 bg-gray-200">
        <Users size={32} /> All Suppliers
      </h2>

      {/* table */}
      <div className="customTable w-full rounded-md border overflow-hidden dark:border-slate-700 border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-900">
            <tr>
              <th className="p-3 text-left font-medium dark:text-[#abc2d3] text-gray-700">
                #
              </th>
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
            {sortedData.map((item, index) => (
              <tr
                key={item.id}
                className="border-t dark:border-slate-700 border-gray-200 hover:bg-gray-50"
              >
                <td className="p-3 dark:text-black">{index + 1}</td>
                {tableHeaders.map((key) => (
                  <td key={key} className="p-3 dark:text-black">
                    {item[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!suppliers?.length && (
          <p className="text-[0.9rem] text-gray-500 py-6 text-center w-full">
            No suppliers found!
          </p>
        )}
      </div>
    </div>
  );
}