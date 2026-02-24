import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { Banknote, PlusCircle, MinusCircle, Power, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function CashRegisterList() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("deposit");
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    accountId: "",
    payment_method: "cash",
    notes: "",
  });

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [crRes, acRes] = await Promise.all([
        fetch(API_ROUTES.CASHREGISTER, { headers }),
        fetch(API_ROUTES.ACCOUNTS, { headers }),
      ]);

      const [crData, acData] = await Promise.all([crRes.json(), acRes.json()]);
      if (!crRes.ok) throw new Error(crData.error || "Failed to load cash registers");
      if (!acRes.ok) throw new Error(acData.error || "Failed to load accounts");

      setRows(Array.isArray(crData) ? crData : []);
      setAccounts(Array.isArray(acData) ? acData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id, status) => {
    setActionLoadingId(id);
    setError("");
    try {
      const res = await fetch(API_ROUTES.CASHREGISTER_STATUS(id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openMoneyModal = (type, row) => {
    setModalType(type);
    setSelectedRegister(row);
    setForm({
      amount: "",
      accountId: "",
      payment_method: "cash",
      notes: "",
    });
    setShowModal(true);
  };

  const submitMoneyAction = async () => {
    if (!selectedRegister) return;
    try {
      const endpoint =
        modalType === "deposit"
          ? API_ROUTES.CASHREGISTER_DEPOSIT(selectedRegister.id)
          : API_ROUTES.CASHREGISTER_WITHDRAW(selectedRegister.id);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(form.amount),
          accountId: Number(form.accountId),
          payment_method: "cash",
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setShowModal(false);
      setSelectedRegister(null);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading cash registers...</div>;
  }

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Cash Register List
            </h1>
            <p className="text-gray-600 mt-1">Manage status, deposit and withdraw for all cash registers</p>
          </div>
          <Link
            to="/cash-register-records"
            className="px-6 py-2 rounded-lg text-sm inline-flex items-center gap-2 text-white bg-gradient-to-br from-teal-500 to-green-500 transition-all hover:drop-shadow hover:drop-shadow-teal-200 drop-shadow drop-shadow-gray-100"
          >
            View Records
          </Link>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 mb-4 border border-red-200/40 bg-red-50/40 text-red-700">{error}</div>
      )}

      <div className="glass-card border border-white/20 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50">
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Cash In Hand</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="p-4">
                  <div className="font-medium text-gray-800">{row.name}</div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      row.status === "active"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : row.status === "closed"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-600" />
                    <span>{Number(row.cash_in_hand || 0).toFixed(2)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => updateStatus(row.id, "active")}
                      disabled={actionLoadingId === row.id || (row.status !== "closed" && row.status !== "inactive")}
                      className={`flex items-center text-white bg-gradient-to-r from-teal-700 to-green-600 gap-2 px-3 py-1 rounded-md disabled:opacity-40 ${(actionLoadingId === row.id || (row.status !== "closed" && row.status !== "inactive")) ? "hidden" : "flex"}`}
                      title="Set Active"
                    >
                      <Power size={16} className="text-white" /> Open Cash
                    </button>
                    <button
                      onClick={() => updateStatus(row.id, "closed")}
                      disabled={actionLoadingId === row.id || (row.status !== "active" && row.status !== "inactive")}
                      className={`flex gap-2 items-center bg-gradient-to-r from-orange-600 to-amber-600 text-white px-3 py-1 rounded-md disabled:opacity-40 ${(actionLoadingId === row.id || (row.status !== "active" && row.status !== "inactive")) ? "hidden" : "flex"}`}
                      title="Set Closed"
                    >
                      <Lock size={16} className="text-white" /> Close Cash
                    </button>
                    <button
                      onClick={() => updateStatus(row.id, "inactive")}
                      disabled={actionLoadingId === row.id || row.status !== "closed"}
                      className="glass-icon-button p-1.5 rounded disabled:opacity-40"
                      title="Deactivate (Closed to Inactive)"
                    >
                      <Power size={16} className="text-red-600" />
                    </button>
                    <button
                      onClick={() => openMoneyModal("deposit", row)}
                      disabled={row.status === "inactive"}
                      className="glass-icon-button p-1.5 rounded disabled:opacity-40"
                      title="Deposit"
                    >
                      <PlusCircle size={16} className="text-emerald-600" />
                    </button>
                    <button
                      onClick={() => openMoneyModal("withdraw", row)}
                      disabled={row.status === "inactive"}
                      className="glass-icon-button p-1.5 rounded disabled:opacity-40"
                      title="Withdraw"
                    >
                      <MinusCircle size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={4}>
                  No cash registers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedRegister && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 border border-white/20">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === "deposit" ? "Cash Register Deposit" : "Cash Register Withdraw"}
            </h3>
            <div className="space-y-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Amount"
                className="glass-input w-full px-3 py-2 rounded border border-gray-300"
              />
              <select
                value={form.accountId}
                onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
                className="glass-input w-full px-3 py-2 rounded border border-gray-300"
              >
                <option value="">Select account (required)</option>
                {accounts
                  .filter((a) => String(a.status).toLowerCase() === "active")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({Number(a.balance || 0).toFixed(2)})
                    </option>
                  ))}
              </select>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Note"
                className="glass-input w-full px-3 py-2 rounded border border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitMoneyAction}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
