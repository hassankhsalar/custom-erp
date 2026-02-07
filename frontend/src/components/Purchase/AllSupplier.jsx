import { useEffect, useState } from "react";
import { ArrowUpDown, Users, Phone, MapPin, Calendar, Hash, Building2, TrendingUp, Search, X, Clock, UserCircle } from "lucide-react";

import { API_ROUTES } from '../../config';

export default function AllSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }
      
      const res = await fetch(`${API_ROUTES.SUPPLIERS}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Handle authentication errors
          localStorage.removeItem('token');
          setError("Session expired. Please log in again.");
        } else {
          throw new Error("Failed to fetch suppliers");
        }
      }
      
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchSuppliers();
}, []);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatSuppliersData = (suppliers) => {
    return suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      mobile: supplier.mobile || "-",
      address: supplier.address || "-",
      "created at": new Date(supplier.createdAt).toLocaleDateString(),
      rawDate: supplier.createdAt
    }));
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(query) ||
      supplier.mobile?.includes(query) ||
      supplier.address?.toLowerCase().includes(query) ||
      supplier.id?.toString().includes(query)
    );
  });

  const sortedData = sortConfig.key ? 
    [...formatSuppliersData(filteredSuppliers)].sort((a, b) => {
      if (sortConfig.key === 'created at') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    }) : 
    formatSuppliersData(filteredSuppliers);

  const tableHeaders = suppliers.length > 0 ? 
    Object.keys(formatSuppliersData(suppliers)[0]).filter(key => key !== 'id' && key !== 'rawDate') : 
    ['name', 'mobile', 'address', 'created at'];

  const getColumnIcon = (key) => {
    switch(key) {
      case 'name': return <UserCircle size={14} className="mr-2" />;
      case 'mobile': return <Phone size={14} className="mr-2" />;
      case 'address': return <MapPin size={14} className="mr-2" />;
      case 'created at': return <Calendar size={14} className="mr-2" />;
      default: return <Hash size={14} className="mr-2" />;
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-8 text-center max-w-md mx-auto mt-10">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2">
            <Users size={32} /> All Suppliers
          </h2>
          <div className="glass-card-inner p-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-3 rounded-lg mr-4 bg-gradient-to-r from-red-500/10 to-red-600/10">
                <X className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-red-700 font-medium">❌ {error}</p>
                <p className="text-red-600 text-sm mt-1">Failed to load suppliers data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <Users className="text-indigo-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                All Suppliers
              </h1>
              <p className="text-gray-600 mt-1">Manage and view all supplier information</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Building2 size={16} className="text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              {suppliers.length} {suppliers.length === 1 ? 'Supplier' : 'Suppliers'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Suppliers</p>
              <h3 className="text-2xl font-bold text-gray-900">{suppliers.length}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-indigo-600/10">
              <Users className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Today</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => {
                  const today = new Date().toDateString();
                  const supplierDate = new Date(s.createdAt).toDateString();
                  return supplierDate === today;
                }).length}
              </h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Contact Info</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.mobile).length}
              </h3>
              <p className="text-xs text-gray-500">With phone numbers</p>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <Phone className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center text-gray-800 mb-2">
              <Search size={20} className="mr-2 text-indigo-600" /> 
              Search Suppliers
            </h3>
            <p className="text-gray-600 text-sm">Filter suppliers by name, mobile, or address</p>
          </div>
          <div className="glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <span className="text-sm font-medium text-gray-700">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </span>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, mobile, address, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-12 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center glass-icon-button p-1.5 rounded"
            >
              <X size={20} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {searchQuery && filteredSuppliers.length > 0 && (
          <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg mt-4 bg-gradient-to-r from-indigo-50/50 to-indigo-100/50 border border-indigo-200/30">
            <Hash size={14} className="mr-2 text-indigo-600" />
            <span className="text-sm text-indigo-700">
              Found {filteredSuppliers.length} supplier(s) matching "{searchQuery}"
            </span>
          </div>
        )}
      </div>

      {/* Suppliers Table */}
      <div className="glass-card overflow-hidden border border-white/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="mr-2" />
                    #
                  </div>
                </th>
                {tableHeaders.map((key) => (
                  <th
                    key={key}
                    className="p-4 text-left font-medium text-gray-700 cursor-pointer border-b border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      {getColumnIcon(key)}
                      <span className="font-semibold">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                      <ArrowUpDown
                        onClick={() => handleSort(key)}
                        className="glass-icon-button p-1.5 rounded-md hover:bg-gray-200/50 transition-colors cursor-pointer"
                        size={16}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-t border-white/10 hover:bg-white/10 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-white/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="glass-tag px-3 py-1.5 rounded bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200/50 text-center">
                      <span className="font-semibold text-gray-700">{index + 1}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-indigo-500/10 to-indigo-600/10">
                        <UserCircle size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <div className="glass-tag inline-flex items-center px-2 py-0.5 rounded mt-1 bg-gray-100/50 border border-gray-200/50">
                          <Hash size={10} className="mr-1 text-gray-500" />
                          <span className="text-xs text-gray-600">ID: {item.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                        <Phone size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.mobile}</p>
                        <p className="text-xs text-gray-500">Mobile</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                        <MapPin size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 truncate max-w-[200px]">{item.address}</p>
                        <p className="text-xs text-gray-500">Address</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                        <Calendar size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item["created at"]}</p>
                        <div className="glass-tag inline-flex items-center px-2 py-0.5 rounded mt-1 bg-gray-100/50 border border-gray-200/50">
                          <Clock size={10} className="mr-1 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {new Date(item.rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty States */}
          {!suppliers?.length && !loading && (
            <div className="text-center py-16">
              <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <Users className="text-gray-400" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No suppliers found</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                No supplier records are currently available in the system
              </p>
              <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-white/30">
                <Hash size={16} className="mr-2 text-gray-500" />
                <span className="text-sm text-gray-700">Start by adding your first supplier</span>
              </div>
            </div>
          )}

          {suppliers.length > 0 && filteredSuppliers.length === 0 && searchQuery && (
            <div className="text-center py-16">
              <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <Search className="text-gray-400" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No matching suppliers</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                No suppliers found matching "{searchQuery}"
              </p>
              <button
                onClick={clearSearch}
                className="glass-button px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
              >
                Clear search to see all suppliers
              </button>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {filteredSuppliers.length > 0 && (
          <div className="glass-card-inner p-4 border-t border-white/20 bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                  </span>
                </div>
                {sortConfig.key && (
                  <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                    <span className="text-sm font-medium text-gray-700">
                      Sorted by: <span className="text-indigo-600">{sortConfig.key}</span>
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {filteredSuppliers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-indigo-500/10 to-indigo-600/10">
                <Users size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Suppliers</p>
                <p className="text-xl font-bold text-gray-900">{filteredSuppliers.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                <Phone size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">With Contact Info</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredSuppliers.filter(s => s.mobile && s.mobile !== "-").length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <MapPin size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">With Address</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredSuppliers.filter(s => s.address && s.address !== "-").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}