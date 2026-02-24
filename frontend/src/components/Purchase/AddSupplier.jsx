import { useState } from "react";
import { API_ROUTES } from '../../config';

export default function AddSupplier() {
  const [formData, setFormData] = useState({ name: "", mobile: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem('token');
 
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  const res = await fetch(`${API_ROUTES.SUPPLIERS}`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  setLoading(false);

  if (res.ok) {
    setMessage("✅ Supplier added successfully!");
    setFormData({ name: "", mobile: "", address: "" });
  } else {
    setMessage(`❌ Error: ${data.error || "Failed to add supplier"}`);
  }
};

  return (
    <div className="min-h-screen rounded-t-2xl flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Glass effect container */}
          <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-2xl shadow-blue-100/50 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-300/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-300/20 rounded-full blur-xl"></div>
            
            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Add New Supplier
                </h2>
                <p className="text-gray-600 mt-2 text-sm">Fill in the supplier details below</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter supplier name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    placeholder="Enter mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    placeholder="Enter supplier address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 placeholder:text-gray-400 resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Adding Supplier...
                    </div>
                  ) : (
                    "Add Supplier"
                  )}
                </button>
              </form>

              {/* Message */}
              {message && (
                <div className={`mt-6 p-4 rounded-xl backdrop-blur-sm ${message.includes("✅") ? "bg-green-50/50 border border-green-200/50" : "bg-red-50/50 border border-red-200/50"}`}>
                  <p className={`text-sm font-medium ${message.includes("✅") ? "text-green-700" : "text-red-700"}`}>
                    {message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom decorative text */}
          <p className="text-center text-gray-500 text-xs mt-6">
            All fields are securely processed and stored
          </p>
        </div>
      </div>
    </div>
  );
}