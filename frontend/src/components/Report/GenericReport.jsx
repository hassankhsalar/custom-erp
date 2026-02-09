import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

export default function GenericReport({ title, endpoint }) {
  const [data, setData] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchReport = async () => {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    };
    fetchReport();
  }, [endpoint, token]);

  const renderTable = (rows) => {
    if (!rows || rows.length === 0) return <div className="text-gray-500">No data</div>;
    const headers = Object.keys(rows[0]);
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            {headers.map(h => <th key={h} className="p-2 text-left">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {headers.map(h => <td key={h} className="p-2">{String(r[h])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="bg-white rounded shadow p-4">
        {data?.rows ? renderTable(data.rows) : (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
