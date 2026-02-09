import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { Banknote, Plus, Pencil, Trash2, X, Save, AlertCircle } from "lucide-react";

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    account_number: "",
    starting_balance: "",
    current_balance: "",
    withdraw_charge: ""
  });
  const [editing, setEditing] = useState(null);
  const token = localStorage.getItem("token");

  const fetchAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_ROUTES.BANK_ACCOUNTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(API_ROUTES.BANK_ACCOUNTS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create bank account");
      }
      setForm({
        name: "",
        account_number: "",
        starting_balance: "",
        current_balance: "",
        withdraw_charge: ""
      });
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bank account?")) return;
    try {
      const res = await fetch(`${API_ROUTES.BANK_ACCOUNTS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete bank account");
      }
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (account) => {
    setEditing({ ...account });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditing(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`${API_ROUTES.BANK_ACCOUNTS}/${editing.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editing.name,
          account_number: editing.account_number,
          starting_balance: editing.starting_balance,
          current_balance: editing.current_balance,
          withdraw_charge: editing.withdraw_charge
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bank account");
      }
      closeEdit();
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
            <Banknote className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Bank Accounts
            </h1>
            <p className="text-gray-600 mt-1">Create, edit, and manage bank accounts</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={18} />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-600" />
            New Bank Account
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Bank name"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
              required
            />
            <input
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              placeholder="Account number"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
              required
            />
            <input
              name="starting_balance"
              type="number"
              step="0.01"
              value={form.starting_balance}
              onChange={handleChange}
              placeholder="Starting balance"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            />
            <input
              name="current_balance"
              type="number"
              step="0.01"
              value={form.current_balance}
              onChange={handleChange}
              placeholder="Current balance"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            />
            <input
              name="withdraw_charge"
              type="number"
              step="0.01"
              value={form.withdraw_charge}
              onChange={handleChange}
              placeholder="Withdraw charge"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold"
            >
              Create Bank Account
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 glass-card p-6 border border-white/20 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Accounts</h2>
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100/70">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Account #</th>
                    <th className="p-3 text-left">Current Balance</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-t border-white/40">
                      <td className="p-3 font-medium text-gray-800">{acc.name}</td>
                      <td className="p-3 text-gray-600">{acc.account_number}</td>
                      <td className="p-3 text-gray-800">${parseFloat(acc.current_balance || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(acc)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-500">
                        No bank accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Bank Account</h3>
              <button onClick={closeEdit} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                name="name"
                value={editing.name || ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200"
                placeholder="Bank name"
              />
              <input
                name="account_number"
                value={editing.account_number || ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200"
                placeholder="Account number"
              />
              <input
                name="starting_balance"
                type="number"
                step="0.01"
                value={editing.starting_balance ?? ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200"
                placeholder="Starting balance"
              />
              <input
                name="current_balance"
                type="number"
                step="0.01"
                value={editing.current_balance ?? ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200"
                placeholder="Current balance"
              />
              <input
                name="withdraw_charge"
                type="number"
                step="0.01"
                value={editing.withdraw_charge ?? ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-200"
                placeholder="Withdraw charge"
              />
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">
                Cancel
              </button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2">
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
