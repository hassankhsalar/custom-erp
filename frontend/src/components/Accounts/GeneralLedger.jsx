import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { BookOpen, Filter, Calendar } from "lucide-react";

export default function GeneralLedger() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", accountId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const fetchAccounts = async () => {
    try {
      const res = await fetch(API_ROUTES.ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.accountId) params.append("accountId", filters.accountId);
      const res = await fetch(`${API_ROUTES.GENERAL_LEDGER}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchLedger();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchLedger();
  };

  const totals = transactions.reduce((acc, t) => {
    const amt = parseFloat(t.amount) || 0;
    if (t.added_to_account === true) acc.credit += amt;
    if (t.added_to_account === false) acc.debit += amt;
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
            <BookOpen className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              General Ledger
            </h1>
            <p className="text-gray-600 mt-1">Transactions overview</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
              <Calendar size={14} /> Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
              <Calendar size={14} /> End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Account</label>
            <select
              name="accountId"
              value={filters.accountId}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            >
              <option value="">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold"
            >
              Apply
            </button>
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
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/70">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Purpose</th>
                    <th className="p-3 text-left">Account</th>
                    <th className="p-3 text-left">Method</th>
                    <th className="p-3 text-left">Credit</th>
                    <th className="p-3 text-left">Debit</th>
                    <th className="p-3 text-left">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} className="border-t border-white/40">
                      <td className="p-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">{t.reference}</td>
                      <td className="p-3">{t.purpose || "-"}</td>
                      <td className="p-3">{t.account?.name || "-"}</td>
                      <td className="p-3">
                        <span className="block">{t.payment_method ? t.payment_method.replaceAll("_", " ").replaceAll("-", " ") : "-"}</span>
                        <span className="text-xs text-gray-400">{t.bankAccount?.name}</span>
                      </td>
                      <td className="p-3">
                        { t.added_to_account && t.added_to_account === true ? (
                          <span className="text-green-500">${parseFloat(t.amount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-500">$0</span>
                        )}
                      </td>
                      <td className="p-3">
                        { t.added_to_account && t.added_to_account === false ? (
                          <span className="text-teal-500">${parseFloat(t.amount || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-500">$0</span>
                        )}
                      </td>
                      <td className="p-3">
                        {t.current_account_balance !== null && t.current_account_balance !== undefined
                          ? `$${parseFloat(t.current_account_balance).toFixed(2)}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-4 text-center text-gray-500">
                        No transactions found.
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
