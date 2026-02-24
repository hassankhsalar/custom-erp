import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { Scale } from "lucide-react";

export default function BalanceSheet() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const fetchBalanceSheet = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_ROUTES.BALANCE_SHEET, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch balance sheet");
      const data = await res.json();
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, []);

  const totals = accounts.reduce((acc, a) => {
    acc.debit += parseFloat(a.debit || 0);
    acc.credit += parseFloat(a.credit || 0);
    acc.balance += parseFloat(a.balance || 0);
    return acc;
  }, { debit: 0, credit: 0, balance: 0 });

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
            <Scale className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Balance Sheet
            </h1>
            <p className="text-gray-600 mt-1">Account debit, credit, and balances</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
        {error && <div className="text-red-600 mb-3">{error}</div>}
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Total Debit: <span className="font-semibold text-gray-800">${totals.debit.toFixed(2)}</span>
              <span className="mx-3">|</span>
              Total Credit: <span className="font-semibold text-gray-800">${totals.credit.toFixed(2)}</span>
              <span className="mx-3">|</span>
              Total Balance: <span className="font-semibold text-gray-800">${totals.balance.toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/70">
                  <tr>
                    <th className="p-3 text-left">Account</th>
                    <th className="p-3 text-left">Account #</th>
                    <th className="p-3 text-left">Debit</th>
                    <th className="p-3 text-left">Credit</th>
                    <th className="p-3 text-left">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-t border-white/40">
                      <td className="p-3 font-medium text-gray-800">{acc.name}</td>
                      <td className="p-3 text-gray-600">{acc.account_number || "-"}</td>
                      <td className="p-3 text-teal-600">${parseFloat(acc.debit || 0).toFixed(2)}</td>
                      <td className="p-3 text-green-600">${parseFloat(acc.credit || 0).toFixed(2)}</td>
                      <td className="p-3 text-gray-800">${parseFloat(acc.balance || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500">
                        No accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
