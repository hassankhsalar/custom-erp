import { useState } from "react";
import { 
  PlusCircle, 
  CreditCard, 
  Hash, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Building2,
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  FileDigit
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AddAccount() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [formData, setFormData] = useState({
    name: "",
    account_number: "",
    balance: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "account_number") {
      // Allow only digits for account number
      if (value === "" || /^\d*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === "balance") {
      // Allow numbers with decimal point for balance
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error("Account name is required");
      }
      if (!formData.account_number.trim()) {
        throw new Error("Account number is required");
      }
      if (formData.account_number.length < 5) {
        throw new Error("Account number must be at least 5 digits");
      }
      if (formData.balance === "") {
        throw new Error("Initial balance is required");
      }

      const response = await fetch(API_ROUTES.ACCOUNTS, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          account_number: formData.account_number.trim(),
          balance: parseFloat(formData.balance) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      setSuccess("Account created successfully!");
      setFormData({
        name: "",
        account_number: "",
        balance: "",
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/allaccounts");
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      account_number: "",
      balance: "",
    });
    setError("");
    setSuccess("");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-gray-50 via-white to-indigo-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <button
              onClick={handleGoBack}
              className="glass-icon p-2 rounded-xl mr-4 bg-gradient-to-r from-gray-500/10 to-gray-600/10 hover:from-gray-600/10 hover:to-gray-700/10 transition-all duration-300"
            >
              <ArrowLeft className="text-gray-600" size={24} />
            </button>
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <CreditCard className="text-emerald-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Add New Account
              </h1>
              <p className="text-gray-600 mt-1">Create a new bank account record in the system</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Building2 size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">
              Financial Accounts
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Default Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-600" />
                <h3 className="text-2xl font-bold text-gray-900">Active</h3>
              </div>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Account Type</p>
              <h3 className="text-2xl font-bold text-gray-900">Bank Account</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <CreditCard className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Minimum Length</p>
              <h3 className="text-2xl font-bold text-gray-900">5 Digits</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10">
              <FileDigit className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center text-gray-800 mb-2">
              <PlusCircle size={20} className="mr-2 text-emerald-600" /> 
              Account Details
            </h3>
            <p className="text-gray-600 text-sm">
              Enter the account information below. All fields are required.
            </p>
          </div>
          <div className="glass-tag px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 border border-emerald-200/30">
            <span className="text-sm font-medium text-emerald-700">
              <CheckCircle size={16} className="inline mr-2" />
              Status will be set to "Active" by default
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="glass-card-inner p-4 mb-6 border border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-3 rounded-lg mr-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <CheckCircle className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-emerald-700 font-medium">✅ {success}</p>
                <p className="text-emerald-600 text-sm mt-1">Redirecting to accounts list...</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card-inner p-4 mb-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-3 rounded-lg mr-4 bg-gradient-to-r from-red-500/10 to-red-600/10">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-red-700 font-medium">⚠️ {error}</p>
                <p className="text-red-600 text-sm mt-1">Please check your input and try again</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Account Name Field */}
          <div className="glass-card-inner px-6 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="glass-icon p-2.5 rounded-lg mr-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                <Building2 size={28} className="text-blue-600" />
              </div>
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Account Name
                </label>
              </div>
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., City Bank Savings, John Doe Account"
              className="glass-input w-full p-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              required
              disabled={loading}
            />
            {formData.name && (
              <div className="glass-tag inline-flex items-center px-3 py-1 rounded-lg mt-3 bg-gradient-to-r from-blue-50/50 to-blue-100/50 border border-blue-200/30">
                <span className="text-xs text-blue-700">
                  {formData.name.length} characters
                </span>
              </div>
            )}
          </div>

          {/* Account Number Field */}
          <div className="glass-card-inner px-6 py-2 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="glass-icon p-2.5 rounded-lg mr-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                <FileDigit size={28} className="text-purple-600" />
              </div>
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Account Number
                </label>
              </div>
            </div>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              placeholder="e.g., 1234567890"
              pattern="\d*"
              inputMode="numeric"
              className="glass-input w-full p-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              required
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="glass-tag inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-purple-50/50 to-purple-100/50 border border-purple-200/30">
                <span className="text-xs text-purple-700">
                  Must be unique, digits only
                </span>
              </div>
              {formData.account_number && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    {formData.account_number.length} digits
                  </div>
                  {formData.account_number.length < 5 && (
                    <div className="text-xs text-red-600 font-medium">
                      Min 5 digits
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Initial Balance Field */}
          <div className="glass-card-inner px-6 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="glass-icon p-2.5 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <DollarSign size={28} className="text-emerald-600" />
              </div>
              <div>
                <label className="block text-md font-medium text-gray-700 mb-1">
                  Initial Balance
                </label>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="text"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                placeholder="0.00"
                inputMode="decimal"
                className="glass-input  border-2 border-gray-300 w-full pl-10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="glass-tag inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 border border-emerald-200/30">
                <span className="text-xs text-emerald-700">
                  Can be 0.00 for new accounts
                </span>
              </div>
              {formData.balance && (
                <div className="text-sm font-medium text-emerald-700">
                  ${parseFloat(formData.balance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status Preview */}
          <div className="glass-card-inner p-6 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <div className="glass-icon p-2.5 rounded-lg mr-3 bg-gradient-to-r from-gray-500/10 to-gray-600/10">
                <CheckCircle size={20} className="text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Status
                </label>
                <p className="text-sm text-gray-500">This will be set automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-50/50 to-gray-100/50 border border-gray-200/30">
              <div className="glass-icon p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <CheckCircle className="text-emerald-600" size={20} />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Active</h4>
                <p className="text-sm text-gray-600">Account will be active upon creation</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/20">
            <button
              type="submit"
              disabled={loading}
              className=" flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <Save size={20} className="mr-2" />
                  Create Account
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className=" flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/25 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={20} className="mr-2" />
              Reset Form
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              disabled={loading}
              className=" flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} className="mr-2" />
              Go Back
            </button>
          </div>
        </form>
      </div>

      {/* Help Information */}
      <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
        <div className="flex items-start">
          <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
            <AlertCircle className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Important Notes</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <div className="glass-tag-sm p-1 rounded mr-3 mt-1 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                  <CheckCircle size={12} className="text-emerald-600" />
                </div>
                <span>Account number must be unique and contain only digits (no spaces or hyphens).</span>
              </li>
              <li className="flex items-start">
                <div className="glass-tag-sm p-1 rounded mr-3 mt-1 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                  <DollarSign size={12} className="text-blue-600" />
                </div>
                <span>Initial balance can be zero for new accounts. Use decimal point for cents.</span>
              </li>
              <li className="flex items-start">
                <div className="glass-tag-sm p-1 rounded mr-3 mt-1 bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                  <CreditCard size={12} className="text-purple-600" />
                </div>
                <span>Account status is automatically set to "Active" upon creation.</span>
              </li>
              <li className="flex items-start">
                <div className="glass-tag-sm p-1 rounded mr-3 mt-1 bg-gradient-to-r from-gray-500/10 to-gray-600/10">
                  <Building2 size={12} className="text-gray-600" />
                </div>
                <span>You can update account details later if needed.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}