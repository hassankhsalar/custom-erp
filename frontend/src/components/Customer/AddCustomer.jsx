import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { 
  UserPlus, 
  Save, 
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export default function AddCustomer() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams(); // Get customer ID from URL for editing

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      fetchCustomerData();
    }
  }, [isEditing, id]);

  const fetchCustomerData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_ROUTES.CUSTOMERS}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setName(data.name);
      setMobile(data.mobile);
      setEmail(data.email || "");
      setAddress(data.address || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_ROUTES.CUSTOMERS}/${id}` : API_ROUTES.CUSTOMERS;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, mobile, email, address }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      setSuccess(true);
      
      // Show success message briefly then navigate
      setTimeout(() => {
        navigate("/customers/all");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto max-w-4xl">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                {isEditing ? <User className="text-white" size={36} /> : <UserPlus className="text-white" size={36} />}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {isEditing ? "Edit Customer" : "Add New Customer"}
                </h1>
                <p className="text-gray-600 mt-2">
                  {isEditing ? "Update customer information" : "Enter customer details to add to your database"}
                </p>
              </div>
            </div>
            
            <Link
              to="/customers/all"
              className="flex items-center gap-2 px-6 py-3 bg-white/60 hover:bg-white/80 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60"
            >
              <ArrowLeft size={20} />
              Back to Customers
            </Link>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 backdrop-blur-lg bg-gradient-to-r from-emerald-500/90 to-green-500/90 border border-white/40 rounded-2xl shadow-xl p-4">
            <div className="flex items-center gap-3 text-white">
              <CheckCircle size={24} />
              <p className="font-medium">
                Customer {isEditing ? "updated" : "added"} successfully! Redirecting...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 backdrop-blur-lg bg-gradient-to-r from-red-500/90 to-rose-500/90 border border-white/40 rounded-2xl shadow-xl p-4">
            <div className="flex items-center gap-3 text-white">
              <AlertCircle size={24} />
              <p className="font-medium">Error: {error}</p>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={16} className="text-blue-500" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    className="w-full pl-4 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent placeholder-gray-400 transition-all duration-300"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter customer full name"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Required field</p>
              </div>

              {/* Mobile Field */}
              <div className="space-y-2">
                <label htmlFor="mobile" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone size={16} className="text-green-500" />
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="mobile"
                    className="w-full pl-4 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent placeholder-gray-400 transition-all duration-300"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Required field</p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail size={16} className="text-purple-500" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    className="w-full pl-4 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent placeholder-gray-400 transition-all duration-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address (optional)"
                  />
                </div>
                <p className="text-xs text-gray-500">Optional field</p>
              </div>

              {/* Address Field */}
              <div className="space-y-2">
                <label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin size={16} className="text-amber-500" />
                  Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="address"
                    className="w-full pl-4 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent placeholder-gray-400 transition-all duration-300"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter address (optional)"
                  />
                </div>
                <p className="text-xs text-gray-500">Optional field</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/40">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{isEditing ? "Updating..." : "Adding..."}</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>{isEditing ? "Update Customer" : "Add Customer"}</span>
                  </>
                )}
              </button>
              
              <Link
                to="/customers/all"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/60 hover:bg-white/80 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60"
              >
                <ArrowLeft size={20} />
                Cancel
              </Link>
            </div>
          </form>

          {/* Form Tips */}
          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200/50 rounded-xl">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Quick Tips:</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Name and Mobile number are required fields</li>
              <li>Email address should be valid for communication</li>
              <li>You can add address details for delivery purposes</li>
              <li>All information can be edited later from the customers list</li>
            </ul>
          </div>
        </div>

        {/* Preview Card (Optional) - Shows when form has values */}
        {(name || mobile || email || address) && (
          <div className="mt-6 backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              Customer Preview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {name && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-gray-400" />
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-800">{name}</span>
                </div>
              )}
              {mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-gray-600">Mobile:</span>
                  <span className="font-medium text-gray-800">{mobile}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-800">{email}</span>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-gray-800">{address}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}