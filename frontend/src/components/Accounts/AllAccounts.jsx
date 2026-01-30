import { useEffect, useState } from "react";
import { 
  ArrowUpDown, 
  CreditCard, 
  DollarSign, 
  Hash, 
  Building2, 
  TrendingUp, 
  Search, 
  X, 
  Clock, 
  UserCircle,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Activity,
  FileDigit,
  ArrowDown01
} from "lucide-react";

export default function AllAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/accounts");
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();
        setAccounts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleStatusToggle = async (accountId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const res = await fetch(`http://localhost:3001/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update account status");

      // Update local state
      setAccounts(accounts.map(account => 
        account.id === accountId 
          ? { ...account, status: newStatus } 
          : account
      ));
    } catch (err) {
      console.error("Error updating account status:", err);
      setError(err.message);
    }
  };

  const formatAccountsData = (accounts) => {
    return accounts.map(account => ({
      id: account.id,
      name: account.name,
      account_number: account.account_number,
      balance: `$${parseFloat(account.balance || 0).toFixed(2)}`,
      status: account.status || 'active',
      createdAt: new Date(account.createdAt).toLocaleDateString(),
      rawDate: account.createdAt,
      rawBalance: parseFloat(account.balance || 0)
    }));
  };

  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      account.name?.toLowerCase().includes(query) ||
      account.account_number?.includes(query) ||
      account.status?.toLowerCase().includes(query) ||
      account.id?.toString().includes(query)
    );
  });

  const sortedData = sortConfig.key ? 
    [...formatAccountsData(filteredAccounts)].sort((a, b) => {
      if (sortConfig.key === 'createdAt') {
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }

      if (sortConfig.key === 'balance') {
        if (sortConfig.direction === 'ascending') {
          return a.rawBalance - b.rawBalance;
        }
        return b.rawBalance - a.rawBalance;
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
    formatAccountsData(filteredAccounts);

  const tableHeaders = accounts.length > 0 ? 
    Object.keys(formatAccountsData(accounts)[0]).filter(key => 
      key !== 'id' && key !== 'rawDate' && key !== 'rawBalance'
    ) : 
    ['name', 'account_number', 'balance', 'status', 'createdAt'];

  const getColumnIcon = (key) => {
    switch(key) {
      case 'name': return <UserCircle size={14} className="mr-2" />;
      case 'account_number': return <CreditCard size={14} className="mr-2" />;
      case 'balance': return <DollarSign size={14} className="mr-2" />;
      case 'status': return <Activity size={14} className="mr-2" />;
      case 'createdAt': return <Clock size={14} className="mr-2" />;
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
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <h2 className="text-2xl text-gray-800 font-bold mb-6 inline-flex p-2 rounded-md items-center gap-2">
            <CreditCard size={32} /> All Accounts
          </h2>
          <div className="glass-card-inner p-6 border border-red-200/50 bg-gradient-to-r from-red-50/50 to-red-100/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="glass-icon p-3 rounded-lg mr-4 bg-gradient-to-r from-red-500/10 to-red-600/10">
                <X className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-red-700 font-medium">❌ {error}</p>
                <p className="text-red-600 text-sm mt-1">Failed to load accounts data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
              <CreditCard className="text-green-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                All Accounts
              </h1>
              <p className="text-gray-600 mt-1">Manage and view all financial accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <Building2 size={16} className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Accounts</p>
              <h3 className="text-2xl font-bold text-gray-900">{accounts.length}</h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10">
              <CreditCard className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Balance</p>
              <h3 className="text-2xl font-bold text-gray-900">
                ${accounts.reduce((sum, account) => sum + parseFloat(account.balance || 0), 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Accounts</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.status === 'active').length}
              </h3>
              <p className="text-xs text-gray-500">
                {accounts.length > 0 
                  ? `${Math.round((accounts.filter(a => a.status === 'active').length / accounts.length) * 100)}% active`
                  : 'No accounts'
                }
              </p>
            </div>
            <div className="glass-icon p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
              <TrendingUp className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center text-gray-800 mb-2">
              <Search size={20} className="mr-2 text-green-600" /> 
              Search Accounts
            </h3>
            <p className="text-gray-600 text-sm">Filter accounts by name, account number, or status</p>
          </div>
          <div className="glass-tag px-4 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
            <span className="text-sm font-medium text-gray-700">
              Showing {filteredAccounts.length} of {accounts.length} accounts
            </span>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, account number, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-12 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
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

        {searchQuery && filteredAccounts.length > 0 && (
          <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg mt-4 bg-gradient-to-r from-green-50/50 to-green-100/50 border border-green-200/30">
            <Hash size={14} className="mr-2 text-green-600" />
            <span className="text-sm text-green-700">
              Found {filteredAccounts.length} account(s) matching "{searchQuery}"
            </span>
          </div>
        )}
      </div>

      {/* Accounts Table */}
      <div className="glass-card overflow-hidden border border-white/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                <th className="p-4 text-left font-medium text-gray-700 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <ArrowDown01 size={24} className="mr-2" />
                    
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
                        {key === 'account_number' ? 'Account Number' : 
                         key === 'createdAt' ? 'Created At' :
                         key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
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
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-green-500/10 to-green-600/10">
                        <UserCircle size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                        <CreditCard size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 font-mono">{item.account_number}</p>
                        <p className="text-xs text-gray-500">Account Number</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-amber-500/10 to-amber-600/10">
                        <DollarSign size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 font-mono">{item.balance}</p>
                        <p className="text-xs text-gray-500">Balance</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className={`glass-icon-sm p-2 rounded-lg mr-3 ${
                        item.status === 'active' 
                          ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10' 
                          : 'bg-gradient-to-r from-red-500/10 to-red-600/10'
                      }`}>
                        {item.status === 'active' 
                          ? <CheckCircle size={16} className="text-emerald-600" />
                          : <XCircle size={16} className="text-red-600" />
                        }
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => handleStatusToggle(item.id, item.status)}
                            className="glass-icon-button p-1 rounded hover:bg-gray-100/50 transition-colors"
                            title={`Toggle ${item.status === 'active' ? 'Inactive' : 'Active'}`}
                          >
                            {item.status === 'active' 
                              ? <ToggleRight size={30} className="text-emerald-600" />
                              : <ToggleLeft size={30} className="text-red-600" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10">
                        <Clock size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.createdAt}</p>
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
          {!accounts?.length && !loading && (
            <div className="text-center py-16">
              <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <CreditCard className="text-gray-400" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No accounts found</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                No account records are currently available in the system
              </p>
              <div className="glass-tag inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-white/30">
                <Hash size={16} className="mr-2 text-gray-500" />
                <span className="text-sm text-gray-700">Start by adding your first account</span>
              </div>
            </div>
          )}

          {accounts.length > 0 && filteredAccounts.length === 0 && searchQuery && (
            <div className="text-center py-16">
              <div className="glass-icon p-6 rounded-full inline-flex mb-6 bg-gradient-to-r from-gray-100/50 to-gray-200/50">
                <Search className="text-gray-400" size={48} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No matching accounts</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                No accounts found matching "{searchQuery}"
              </p>
              <button
                onClick={clearSearch}
                className="glass-button px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25"
              >
                Clear search to see all accounts
              </button>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {filteredAccounts.length > 0 && (
          <div className="glass-card-inner p-4 border-t border-white/20 bg-gradient-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredAccounts.length} of {accounts.length} accounts
                  </span>
                </div>
                {sortConfig.key && (
                  <div className="glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                    <span className="text-sm font-medium text-gray-700">
                      Sorted by: <span className="text-green-600">{sortConfig.key === 'account_number' ? 'Account Number' : sortConfig.key}</span>
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
      {filteredAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-green-500/10 to-green-600/10">
                <CreditCard size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-xl font-bold text-gray-900">{filteredAccounts.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                <DollarSign size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-xl font-bold text-gray-900">
                  ${filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Accounts</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredAccounts.filter(a => a.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border border-white/20 backdrop-blur-xl">
            <div className="flex items-center">
              <div className="glass-icon p-2 rounded-lg mr-3 bg-gradient-to-r from-red-500/10 to-red-600/10">
                <XCircle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive Accounts</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredAccounts.filter(a => a.status === 'inactive').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}