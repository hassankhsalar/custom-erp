import { useState } from "react";
import {
  Calculator,
  DollarSign,
  Plus,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_ROUTES } from '../../config';


export default function AddCashRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    cash_in_hand: "0",
    status: "active",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const token = localStorage.getItem('token');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_ROUTES.CASHREGISTER}`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create cash register");
      }

      const result = await res.json();
      
      setSuccess(`Cash register "${result.name}" created successfully!`);
      setFormData({
        name: "",
        cash_in_hand: "0",
        status: "active",
        notes: ""
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
        // Optionally navigate back or stay
        // navigate("/cash-register-assign");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="glass-icon-button p-2 rounded-lg mr-4 hover:bg-gray-100/50 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-green-500/10 to-green-600/10">
                <Calculator className="text-green-600" size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Add New Cash Register
                </h1>
                <p className="text-gray-600 mt-1">
                  Create a new cash register for your business
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="glass-card p-4 mb-6 border border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <CheckCircle className="text-emerald-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-emerald-700 font-medium">{success}</p>
                <p className="text-emerald-600 text-sm mt-1">
                  You can now assign this cash register to stores, shops, or factories.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-red-500/10 to-red-600/10">
                <AlertCircle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass-card border border-white/20 backdrop-blur-xl shadow-lg">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Calculator size={24} className="text-green-600" />
              Cash Register Details
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Fill in the details to create a new cash register
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Register Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Main Cash Register, Counter 1, etc."
                  className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-300/50"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Choose a descriptive name for easy identification
                </p>
              </div>

              {/* Initial Cash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Cash in Hand
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="cash_in_hand"
                    value={formData.cash_in_hand}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="glass-input w-full pl-12 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-300/50"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Starting amount in the cash register (default: $0.00)
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    formData.status === 'active'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white/50 border-gray-200 hover:bg-gray-50/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={handleChange}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <CheckCircle size={20} className="text-emerald-600" />
                        <div>
                          <p className="font-medium text-gray-800">Active</p>
                          <p className="text-sm text-gray-600">Ready for use</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  <label className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    formData.status === 'inactive'
                      ? 'bg-red-50 border-red-300'
                      : 'bg-white/50 border-gray-200 hover:bg-gray-50/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={handleChange}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2">
                        <XCircle size={20} className="text-red-600" />
                        <div>
                          <p className="font-medium text-gray-800">Inactive</p>
                          <p className="text-sm text-gray-600">Not in use</p>
                        </div>
                      </div>
                    </div>
                  </label>

                  <label className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    formData.status === 'maintenance'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white/50 border-gray-200 hover:bg-gray-50/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="status"
                        value="maintenance"
                        checked={formData.status === 'maintenance'}
                        onChange={handleChange}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <Calculator size={20} className="text-amber-600" />
                        <div>
                          <p className="font-medium text-gray-800">Maintenance</p>
                          <p className="text-sm text-gray-600">Under repair</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Add any additional notes about this cash register..."
                  className="glass-input w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-300/50"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={20} className="inline mr-2" />
                      Create Cash Register
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/cash-register-assign")}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Help Information */}
        <div className="glass-card p-6 mt-6 border border-white/20 backdrop-blur-xl">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-blue-600" />
            Important Notes
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
              <span>Cash registers must be created before they can be assigned to entities.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
              <span>Only "Active" cash registers can be assigned to stores, shops, or factories.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
              <span>Each cash register can only be assigned to one entity at a time.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
              <span>You can add or withdraw cash from registers after they're created.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}