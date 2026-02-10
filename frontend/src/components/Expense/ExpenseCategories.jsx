import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import { 
  Tag,
  Layers,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  DollarSign,
  Filter
} from "lucide-react";

export default function ExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROUTES.EXPENSES}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      setTotalPages(Math.ceil(data.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching expense categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_ROUTES.EXPENSES}/categories`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ name })
      });
      setName("");
      fetchCategories();
    } catch (error) {
      console.error("Error creating expense category:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    
    try {
      await fetch(`${API_ROUTES.EXPENSES}/categories/${id}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ name: editName })
      });
      setEditingId(null);
      setEditName("");
      fetchCategories();
    } catch (error) {
      console.error("Error updating expense category:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense category?")) {
      try {
        await fetch(`${API_ROUTES.EXPENSES}/categories/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCategories();
      } catch (error) {
        console.error("Error deleting expense category:", error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Calculate color for category badge
  const getCategoryColor = (index) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-emerald-500 to-green-500',
      'from-amber-500 to-orange-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-teal-500 to-emerald-500',
      'from-yellow-500 to-amber-500',
      'from-rose-500 to-pink-500',
      'from-cyan-500 to-blue-500'
    ];
    return colors[index % colors.length];
  };

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
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <Tag className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Expense Categories
                </h1>
                <p className="text-gray-600 mt-2">Organize and manage your expense classifications</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-lg bg-gradient-to-br from-purple-50/60 to-pink-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Layers size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Displayed</p>
                <p className="text-2xl font-bold text-blue-600">{filteredCategories.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Filter size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-emerald-50/60 to-green-50/60 border border-white/40 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{categories.length}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Category Form */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-blue-600" />
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          <form 
            onSubmit={editingId ? (e) => {
              e.preventDefault();
              handleUpdate(editingId);
            } : handleSubmit}
            className="flex flex-col md:flex-row gap-4 mb-4"
          >
            <div className="relative flex-1">
              <input 
                className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
                placeholder="Enter category name"
                value={editingId ? editName : name}
                onChange={(e) => editingId ? setEditName(e.target.value) : setName(e.target.value)}
                required 
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex-1 md:flex-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : editingId ? (
                  <>
                    <Edit2 size={18} />
                    Update
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Category
                  </>
                )}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 bg-gray-200/60 text-gray-700 font-medium rounded-xl hover:bg-gray-300/80 transition-all duration-300 border border-white/60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          
          {/* Search Filter */}
          <div className="relative">
            <input 
              className="w-full border border-white/60 bg-white/80 backdrop-blur-sm rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Filter size={16} className="absolute left-3 top-3.5 text-gray-400" />
          </div>
        </div>

        {/* Main Content */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6">
          {loading && categories.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading expense categories...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/60 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th className="p-4 text-left font-medium text-gray-700">Category</th>
                      <th className="p-4 text-left font-medium text-gray-700">ID</th>
                      <th className="p-4 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCategories.map((category, index) => (
                      <tr 
                        key={category.id} 
                        className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getCategoryColor(index)} flex items-center justify-center`}>
                              <Tag size={16} className="text-white" />
                            </div>
                            <div>
                              {editingId === category.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUpdate(category.id)}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="font-semibold text-gray-800">{category.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Created: {new Date(category.created_at || Date.now()).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg">
                              <Layers size={14} className="text-gray-600" />
                            </div>
                            <span className="font-mono text-sm text-gray-700">{category.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {editingId === category.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdate(category.id)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors duration-300"
                                  title="Save"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-300"
                                  title="Cancel"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(category)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-300"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                
                                <button
                                  onClick={() => handleDelete(category.id)}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-300"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {categories.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Tag size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Expense Categories</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first expense category</p>
                  </div>
                )}

                {categories.length > 0 && filteredCategories.length === 0 && searchTerm && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-white/50 rounded-xl inline-block mb-4">
                      <Filter size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Matching Categories</h3>
                    <p className="text-gray-600 mb-6">No categories found for "{searchTerm}"</p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredCategories.length > 0 && (
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
                        <span className="font-semibold">{Math.min(endIndex, filteredCategories.length)}</span>{" "}
                        of <span className="font-semibold">{filteredCategories.length}</span> categories
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

// Add missing icons
const CheckCircle = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircle = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);