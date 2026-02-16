import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ROUTES } from "../../config";
import { 
  Trash2, 
  Edit, 
  UserPlus, 
  Search, 
  CircleUserRound,
  Users,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CreditCard,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCircle,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export default function AllCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, customer: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, itemsPerPage]);

  const fetchCustomers = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const url = new URL(API_ROUTES.CUSTOMERS, window.location.origin);
      url.searchParams.append('page', currentPage);
      url.searchParams.append('limit', itemsPerPage);
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 0);
      setTotalCustomers(data.totalCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CUSTOMERS}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      // Refresh the current page
      fetchCustomers();
    } catch (err) {
      setError(err.message);
      alert("Failed to delete customer: " + err.message);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchCustomers();
  };

  const openDetailsModal = (customer) => {
    setModal({ isOpen: true, customer });
  };

  const closeModal = () => {
    setModal({ isOpen: false, customer: null });
  };

  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Calculate statistics
  const totalPurchase = customers.reduce((sum, c) => sum + (c.total_purchase || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-lg">Error: {error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
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

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Users className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  All Customers
                </h1>
                <p className="text-gray-600 mt-2">Manage your customer relationships and details</p>
              </div>
            </div>
            
            <Link
              to="/customers/add"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <UserPlus size={20} />
              Add Customer
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-600">{totalCustomers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchase</p>
                <p className="text-2xl font-bold text-emerald-600">${totalPurchase.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-amber-600">${totalDue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <CreditCard size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, mobile, or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Search size={20} />
              Search
            </button>
          </form>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                <Users size={48} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Customers Found</h3>
              <p className="text-gray-600 mb-6">Start by adding your first customer</p>
              <Link
                to="/customers/add"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <UserPlus size={20} />
                Add First Customer
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Customer</th>
                      <th className="p-4 text-left font-medium text-gray-700">Contact Info</th>
                      <th className="p-4 text-left font-medium text-gray-700">Address</th>
                      <th className="p-4 text-left font-medium text-gray-700">Financials</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr 
                        key={customer.id} 
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                              <CircleUserRound className="text-white" size={24} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{customer.name}</p>
                              <p className="text-xs text-gray-500">ID: #{customer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-gray-400" />
                              <span className="text-gray-700">{customer.mobile}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-gray-400" />
                                <span className="text-gray-700 text-sm">{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {customer.address ? (
                            <div className="flex items-start gap-2">
                              <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">{customer.address}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-emerald-500" />
                              <span className="text-sm">
                                <span className="text-gray-600">Purchase:</span>{' '}
                                <span className="font-semibold text-emerald-600">
                                  ${(customer.total_purchase || 0).toFixed(2)}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CreditCard size={14} className="text-amber-500" />
                              <span className="text-sm">
                                <span className="text-gray-600">Due:</span>{' '}
                                <span className="font-semibold text-amber-600">
                                  ${(customer.total_due || 0).toFixed(2)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDetailsModal(customer)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            
                            <Link
                              to={`/customers/edit/${customer.id}`}
                              className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors duration-300"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Link>
                            
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4 mt-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-semibold">
                        {Math.min(currentPage * itemsPerPage, totalCustomers)}
                      </span>{" "}
                      of <span className="font-semibold">{totalCustomers}</span> customers
                    </div>
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center gap-2">
                    {/* First page */}
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="First page"
                    >
                      <ChevronsLeft size={16} className="text-gray-600" />
                    </button>

                    {/* Previous page */}
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="mx-1 text-gray-400">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "hover:bg-white/50 text-gray-700"
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Next page */}
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Next page"
                    >
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>

                    {/* Last page */}
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50 transition-colors border border-white/30"
                      title="Last page"
                    >
                      <ChevronsRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {modal.isOpen && modal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative backdrop-blur-xl bg-white/95 border border-white/60 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 p-6 border-b border-white/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <UserCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Customer Details</h2>
                    <p className="text-gray-600">{modal.customer.name}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors duration-300"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <UserCircle size={20} className="text-blue-500" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Customer ID</p>
                      <p className="font-medium text-gray-900">#{modal.customer.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium text-gray-900">{modal.customer.name}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone size={20} className="text-green-500" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Mobile</p>
                        <p className="font-medium text-gray-900">{modal.customer.mobile}</p>
                      </div>
                    </div>
                    {modal.customer.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{modal.customer.email}</p>
                        </div>
                      </div>
                    )}
                    {modal.customer.address && (
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium text-gray-900">{modal.customer.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Information */}
                <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-500" />
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Purchase</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${(modal.customer.total_purchase || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-amber-50/50 to-amber-100/30 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Due</p>
                      <p className="text-2xl font-bold text-amber-600">
                        ${(modal.customer.total_due || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 p-6 border-t border-white/50 bg-white/80 backdrop-blur-sm">
              <div className="flex justify-end gap-3">
                <Link
                  to={`/customers/edit/${modal.customer.id}`}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all duration-300"
                >
                  Edit Customer
                </Link>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}