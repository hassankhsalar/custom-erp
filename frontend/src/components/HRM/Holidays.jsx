import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  Calendar,
  Gift,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Star,
  PartyPopper
} from "lucide-react";

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ name: "", date: "", isPaid: true, description: "" });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const token = localStorage.getItem("token");

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROUTES.HRM}/holidays`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching holidays:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_ROUTES.HRM}/holidays`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(form)
      });
      setForm({ name: "", date: "", isPaid: true, description: "" });
      fetchHolidays();
    } catch (error) {
      console.error("Error creating holiday:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday) => {
    setModal({ isOpen: true, type: 'edit', data: holiday });
    setForm({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      isPaid: holiday.isPaid,
      description: holiday.description || ""
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      try {
        await fetch(`${API_ROUTES.HRM}/holidays/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchHolidays();
      } catch (error) {
        console.error("Error deleting holiday:", error);
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_ROUTES.HRM}/holidays/${modal.data.id}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(form)
      });
      setModal({ isOpen: false, type: null, data: null });
      setForm({ name: "", date: "", isPaid: true, description: "" });
      fetchHolidays();
    } catch (error) {
      console.error("Error updating holiday:", error);
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
    setForm({ name: "", date: "", isPaid: true, description: "" });
  };

  // Calculate statistics
  const paidHolidays = holidays.filter(h => h.isPaid).length;
  const upcomingHolidays = holidays.filter(h => {
    const holidayDate = new Date(h.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate >= today;
  }).length;
  const thisYearHolidays = holidays.filter(h => {
    const holidayDate = new Date(h.date);
    const currentYear = new Date().getFullYear();
    return holidayDate.getFullYear() === currentYear;
  }).length;

  // Get upcoming holidays (next 30 days)
  const nextThirtyDays = new Date();
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);
  const upcomingThirtyDays = holidays.filter(h => {
    const holidayDate = new Date(h.date);
    const today = new Date();
    return holidayDate >= today && holidayDate <= nextThirtyDays;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHolidays = holidays.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getHolidayStatus = (date) => {
    const holidayDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    holidayDate.setHours(0, 0, 0, 0);
    
    if (holidayDate < today) {
      return { text: 'Passed', color: 'bg-gradient-to-r from-gray-500 to-gray-600' };
    } else if (holidayDate.getTime() === today.getTime()) {
      return { text: 'Today', color: 'bg-gradient-to-r from-emerald-500 to-green-500' };
    } else {
      const diffTime = holidayDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, 
        color: 'bg-gradient-to-r from-blue-500 to-cyan-500' 
      };
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-blue-100/50 mb-6 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                <Calendar className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Holiday Calendar
                </h1>
                <p className="text-gray-600 mt-2">Manage company holidays and special days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-amber-50/60 to-orange-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Holidays</p>
                <p className="text-2xl font-bold text-amber-600">{holidays.length}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Calendar size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Holidays</p>
                <p className="text-2xl font-bold text-emerald-600">{paidHolidays}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-blue-600">{thisYearHolidays}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Star size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Holidays Preview */}
        {upcomingThirtyDays.length > 0 && (
          <div className="backdrop-blur-lg bg-gradient-to-r from-amber-50/40 to-orange-50/40 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <PartyPopper size={20} className="text-amber-600" />
                Upcoming Holidays (Next 30 Days)
              </h3>
              <span className="text-sm text-gray-600">{upcomingThirtyDays.length} upcoming</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingThirtyDays.slice(0, 3).map(holiday => {
                const status = getHolidayStatus(holiday.date);
                return (
                  <div key={holiday.id} className="bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl p-4 hover:bg-white/80 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-amber-500" />
                        <span className="font-semibold text-gray-800">{holiday.name}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(holiday.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {holiday.isPaid ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={14} className="text-emerald-500" />
                            <span className="text-xs text-emerald-600">Paid</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <XCircle size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500">Unpaid</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-blue-600" />
            {modal.type === 'edit' ? 'Edit Holiday' : 'Add New Holiday'}
          </h2>
          <form 
            onSubmit={modal.type === 'edit' ? handleUpdate : handleSubmit} 
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"
          >
            <div className="relative">
              <input 
                className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
                placeholder="Holiday Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required 
              />
            </div>
            
            <div className="relative">
              <input 
                className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required 
              />
            </div>
            
            <div className="relative">
              <select 
                className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 appearance-none"
                value={form.isPaid ? "paid" : "unpaid"}
                onChange={(e) => setForm({ ...form, isPaid: e.target.value === "paid" })}
              >
                <option value="paid">Paid Holiday</option>
                <option value="unpaid">Unpaid Holiday</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : modal.type === 'edit' ? (
                  <>
                    <Edit2 size={18} />
                    Update
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Holiday
                  </>
                )}
              </button>
              
              {modal.type === 'edit' && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          
          {/* Description field */}
          <div className="relative">
            <textarea 
              className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
              placeholder="Description (optional)"
              rows="2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          {loading && holidays.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading holidays...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Holiday Name</th>
                      <th className="p-4 text-left font-medium text-gray-700">Date</th>
                      <th className="p-4 text-left font-medium text-gray-700">Status</th>
                      <th className="p-4 text-left font-medium text-gray-700">Type</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHolidays.map((holiday, index) => {
                      const status = getHolidayStatus(holiday.date);
                      return (
                        <tr 
                          key={holiday.id} 
                          className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg">
                                <Gift size={16} className="text-amber-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{holiday.name}</p>
                                {holiday.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{holiday.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-blue-500" />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {new Date(holiday.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {holiday.isPaid ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-full">
                                  <DollarSign size={14} className="text-emerald-600" />
                                  <span className="text-emerald-700 font-medium">Paid</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-500/10 to-gray-400/10 rounded-full">
                                  <Clock size={14} className="text-gray-600" />
                                  <span className="text-gray-700 font-medium">Unpaid</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(holiday)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              
                              <button
                                onClick={() => handleDelete(holiday.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {holidays.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Calendar size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Holidays Found</h3>
                    <p className="text-gray-600 mb-6">Start by adding your first holiday</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {holidays.length > 0 && (
                <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl p-4">
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
                          className="text-sm border border-white/60 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                        <span className="font-semibold">{Math.min(endIndex, holidays.length)}</span>{" "}
                        of <span className="font-semibold">{holidays.length}</span> holidays
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}