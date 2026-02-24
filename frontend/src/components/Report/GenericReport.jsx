import { useEffect, useState } from "react";
import { API_ROUTES } from "../../config";
import {
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Filter,
  Calendar,
  BarChart3
} from 'lucide-react';

export default function GenericReport({ title, endpoint }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
        setFilteredData(json?.rows || []);
        setTotalPages(Math.ceil((json?.rows?.length || 0) / itemsPerPage));
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [endpoint, token]);

  useEffect(() => {
    if (data?.rows) {
      const filtered = data.rows.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      setCurrentPage(1);
    }
  }, [searchTerm, data, itemsPerPage]);

  const handleRefresh = () => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
        setFilteredData(json?.rows || []);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  };

  const handleExport = () => {
    if (!data?.rows) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + [Object.keys(data.rows[0]), ...data.rows.map(row => Object.values(row))].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTable = (rows) => {
    if (!rows || rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-white/50 rounded-2xl inline-block mb-4">
            <FileText size={48} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-600">No records found for this report</p>
        </div>
      );
    }

    const headers = Object.keys(rows[0]);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRows = rows.slice(startIndex, endIndex);

    return (
      <div className="overflow-hidden rounded-xl border border-white/60">
        <table className="w-full text-sm">
          <thead className="bg-gray-100/80">
            <tr>
              {headers.map(h => (
                <th key={h} className="p-4 text-left font-medium text-gray-700 uppercase tracking-wider">
                  {h.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => (
              <tr 
                key={idx} 
                className={`border-t border-white/50 hover:bg-white/30 transition-colors duration-200 ${
                  idx % 2 === 0 ? 'bg-white/10' : ''
                }`}
              >
                {headers.map(h => (
                  <td key={h} className="p-4">
                    <div className="flex items-center gap-2">
                      {typeof row[h] === 'boolean' ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          row[h] 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {row[h] ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {row[h] ? 'Yes' : 'No'}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{String(row[h])}</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
  const totalRecords = filteredData.length;
  const showingStart = Math.min((currentPage - 1) * itemsPerPage + 1, totalRecords);
  const showingEnd = Math.min(currentPage * itemsPerPage, totalRecords);

  return (
    <div className="min-h-screen rounded-t-2xl w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
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
                <BarChart3 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {title}
                </h1>
                <p className="text-gray-600 mt-2">View and analyze report data</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 text-gray-700 font-medium rounded-xl hover:bg-white/80 transition-all duration-300 border border-white/40"
                title="Refresh Report"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                title="Export to CSV"
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Statistics and Filters Card */}
        <div className="backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            {/* Statistics */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100/80 rounded-lg">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100/80 rounded-lg">
                  <Calendar size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Showing</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {showingStart}-{showingEnd}
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search report..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent w-64"
                />
              </div>
              
              <button className="p-2.5 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl hover:bg-white/90 transition-colors duration-300">
                <Filter size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-2xl p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading report data...</p>
                </div>
              </div>
            ) : data?.rows ? (
              <>
                {renderTable(filteredData)}
                
                {/* Pagination Controls */}
                {totalRecords > 0 && (
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
                          Showing <span className="font-semibold">{showingStart}</span> to{" "}
                          <span className="font-semibold">{showingEnd}</span> of{" "}
                          <span className="font-semibold">{totalRecords}</span> records
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
            ) : (
              <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}