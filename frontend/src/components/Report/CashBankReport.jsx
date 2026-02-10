import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";

const CashBankReport = () => {
  const [tab, setTab] = useState("cash");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [cash, setCash] = useState({ saleCount: 0, saleAmount: 0, cashRegisters: [] });
  const [bank, setBank] = useState({ saleCount: 0, saleAmount: 0, purchaseCount: 0, purchaseAmount: 0, rows: [], pagination: { page: 1, limit: 10, totalPages: 1 } });
  const token = localStorage.getItem("token");

  const fetchReport = async (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    const res = await fetch(`${API_ROUTES.REPORT_CASH_BANK_DETAILS}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCash(data.cash || { saleCount: 0, saleAmount: 0, cashRegisters: [] });
    setBank(data.bank || { saleCount: 0, saleAmount: 0, purchaseCount: 0, purchaseAmount: 0, rows: [], pagination: { page: 1, limit, totalPages: 1 } });
  };

  useEffect(() => {
    fetchReport(bank.pagination.page, bank.pagination.limit);
  }, []);

  const applyFilter = () => {
    fetchReport(1, bank.pagination.limit);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Cash & Bank Report</h1>

      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab === "cash" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("cash")}>Cash</button>
        <button className={`px-3 py-2 rounded ${tab === "bank" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setTab("bank")}>Bank</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={dateRange.startDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dateRange.endDate}
          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          className="border p-2 rounded"
        />
        <button className="bg-blue-600 text-white px-3 rounded" onClick={applyFilter}>
          Apply
        </button>
      </div>

      {tab === "cash" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Sale Count</div>
              <div className="text-xl font-semibold">{cash.saleCount || 0}</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Sale Amount</div>
              <div className="text-xl font-semibold">{Number(cash.saleAmount || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Cash Register</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Current Cash</th>
                </tr>
              </thead>
              <tbody>
                {cash.cashRegisters.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{Number(r.cash_in_hand || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {cash.cashRegisters.length === 0 && (
                  <tr>
                    <td className="p-2 text-gray-500" colSpan="3">No cash registers</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "bank" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Sale Count</div>
              <div className="text-xl font-semibold">{bank.saleCount || 0}</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Sale Amount</div>
              <div className="text-xl font-semibold">{Number(bank.saleAmount || 0).toFixed(2)}</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Purchase Count</div>
              <div className="text-xl font-semibold">{bank.purchaseCount || 0}</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Purchase Amount</div>
              <div className="text-xl font-semibold">{Number(bank.purchaseAmount || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-white rounded shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Bank</th>
                  <th className="p-2 text-left">Account Number</th>
                  <th className="p-2 text-left">Txn Count</th>
                  <th className="p-2 text-left">Total Receive</th>
                  <th className="p-2 text-left">Total Withdrawable</th>
                  <th className="p-2 text-left">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {bank.rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.account_number}</td>
                    <td className="p-2">{(r.receiveCount || 0) + (r.paidCount || 0)}</td>
                    <td className="p-2">{Number(r.totalReceive || 0).toFixed(2)}</td>
                    <td className="p-2">{Number(r.totalWithdrawable || 0).toFixed(2)}</td>
                    <td className="p-2">{Number(r.totalPaid || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {bank.rows.length === 0 && (
                  <tr>
                    <td className="p-2 text-gray-500" colSpan="6">No bank accounts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              className="px-3 py-1 border rounded"
              disabled={bank.pagination.page <= 1}
              onClick={() => fetchReport(bank.pagination.page - 1, bank.pagination.limit)}
            >
              Prev
            </button>
            <div className="px-3 py-1">{bank.pagination.page} / {bank.pagination.totalPages || 1}</div>
            <button
              className="px-3 py-1 border rounded"
              disabled={bank.pagination.page >= bank.pagination.totalPages}
              onClick={() => fetchReport(bank.pagination.page + 1, bank.pagination.limit)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CashBankReport;
