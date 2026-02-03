import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_ROUTES } from "../config";
import { useAuth } from '../App';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Warehouse,
  Store,
  Users,
  Calendar,
  RefreshCw,
  Download,
  ChevronDown,
  Eye,
  MoreVertical,
  Clock,
  Activity,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const Dashboard = () => {
  const { token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_ROUTES.DASHBOARD2}?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4 animate-pulse">
            <Activity size={24} className="text-white" />
          </div>
          <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
          <div className="mt-4 h-1 w-48 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full mx-auto animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 mb-4">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Failed to load dashboard data</h3>
          <p className="text-gray-600 mb-4">Please check your connection and try again</p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-300 hover:shadow-xl"
          >
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            Real-time insights and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={logout}
            className="px-5 py-2.5 font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:shadow-lg backdrop-blur-sm"
          >
            Logout
          </button>
          
          <div className="relative group">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 cursor-pointer"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown size={18} className="text-gray-500" />
            </div>
          </div>
          
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-gradient-to-r from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 text-blue-600 hover:text-blue-800 transition-all duration-300 border border-blue-200/50 hover:border-blue-300/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={dashboardData.kpis.revenue.value}
          change={dashboardData.kpis.revenue.change}
          trend={dashboardData.kpis.revenue.trend}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title="Total Sales"
          value={dashboardData.kpis.sales.value}
          change={dashboardData.kpis.sales.change}
          trend={dashboardData.kpis.sales.trend}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="blue"
        />
        <KPICard
          title="Inventory Value"
          value={dashboardData.kpis.inventory.value}
          change={dashboardData.kpis.inventory.change}
          trend={dashboardData.kpis.inventory.trend}
          icon={<Package className="h-6 w-6" />}
          color="purple"
        />
        <KPICard
          title="Pending Transfers"
          value={dashboardData.kpis.transfers.value}
          change={dashboardData.kpis.transfers.change}
          trend={dashboardData.kpis.transfers.trend}
          icon={<Truck className="h-6 w-6" />}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueChart data={dashboardData.sales.monthlyRevenue} />
        <InventoryChart data={dashboardData.inventory.byCategory} />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopProductsTable data={dashboardData.sales.topProducts} />
        <LowStockTable data={dashboardData.inventory.lowStock} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TransferStatus data={dashboardData.transfers} />
        <RecentActivity data={dashboardData.recentActivity} />
        <ShopPerformance data={dashboardData.performance} />
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, change, trend, icon, color }) => {
  const colorClasses = {
    green: {
      bg: "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
      iconBg: "bg-gradient-to-r from-emerald-500 to-green-500",
      text: "text-emerald-600",
      trendUp: "text-emerald-500",
      trendDown: "text-red-500"
    },
    blue: {
      bg: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
      iconBg: "bg-gradient-to-r from-blue-500 to-blue-600",
      text: "text-blue-600",
      trendUp: "text-blue-500",
      trendDown: "text-red-500"
    },
    purple: {
      bg: "bg-gradient-to-r from-purple-500/10 to-purple-600/10",
      iconBg: "bg-gradient-to-r from-purple-500 to-purple-600",
      text: "text-purple-600",
      trendUp: "text-purple-500",
      trendDown: "text-red-500"
    },
    orange: {
      bg: "bg-gradient-to-r from-orange-500/10 to-orange-600/10",
      iconBg: "bg-gradient-to-r from-orange-500 to-orange-600",
      text: "text-orange-600",
      trendUp: "text-orange-500",
      trendDown: "text-red-500"
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40 hover:scale-[1.02] transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <div className={`flex items-center mt-3 text-sm ${trend === "up" ? colors.trendUp : colors.trendDown}`}>
            {trend === "up" ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            <span className="ml-1 font-medium">{change}</span>
            <span className="text-xs text-gray-500 ml-2">from last period</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${colors.iconBg} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <div className={`h-1 w-full rounded-full mt-4 ${colors.bg}`}>
        <div className={`h-full rounded-full ${colors.iconBg}`} style={{ width: '85%' }}></div>
      </div>
    </div>
  );
};

// Revenue Chart Component
const RevenueChart = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <BarChart3 className="mr-2 text-blue-600" />
          Revenue Trend
        </h3>
        <p className="text-sm text-gray-500 mt-1">Monthly revenue overview</p>
      </div>
      <button className="p-2 rounded-lg hover:bg-gray-100/50 text-gray-500 hover:text-gray-700 transition-colors">
        <MoreVertical size={18} />
      </button>
    </div>
    <div className="h-64 flex items-end justify-between space-x-2">
      {data.map((item, index) => {
        const height = Math.max(20, (item.revenue / 500000) * 200);
        return (
          <div key={index} className="flex flex-col items-center flex-1 group">
            <div className="relative w-full max-w-14">
              <div
                className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg w-full transition-all duration-500 group-hover:from-blue-600 group-hover:to-blue-700"
                style={{ height: `${height}px` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400/20 to-transparent rounded-t-lg"></div>
              </div>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                ${(item.revenue / 1000).toFixed(0)}K
              </div>
            </div>
            <span className="text-xs mt-2 text-gray-600 font-medium">{item.month}</span>
            <span className="text-xs text-gray-400">
              ${(item.revenue / 1000).toFixed(0)}K
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

// Inventory Chart Component
const InventoryChart = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Package className="mr-2 text-purple-600" />
          Inventory Distribution
        </h3>
        <p className="text-sm text-gray-500 mt-1">Value by category</p>
      </div>
      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
        <Eye size={14} />
        View All
      </button>
    </div>
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = (item.value / 2000000) * 100;
        const gradientColors = [
          'from-blue-500 to-cyan-500',
          'from-emerald-500 to-green-500',
          'from-purple-500 to-pink-500',
          'from-amber-500 to-orange-500',
          'from-indigo-500 to-blue-500'
        ];
        
        return (
          <div key={index} className="flex items-center justify-between group hover:bg-white/30 p-2 rounded-lg transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${gradientColors[index % gradientColors.length]} flex items-center justify-center`}>
                <Package size={14} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-800">{item.category}</span>
                <div className="text-xs text-gray-500">${(item.value / 1000).toFixed(0)}K</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-32 bg-gray-200/50 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${gradientColors[index % gradientColors.length]} transition-all duration-1000`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-800 w-10 text-right">
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Top Products Table Component
const TopProductsTable = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Top Selling Products</h3>
        <p className="text-sm text-gray-500 mt-1">Best performers this period</p>
      </div>
      <button className="p-2 rounded-lg hover:bg-gray-100/50 text-gray-500 hover:text-gray-700 transition-colors">
        <Download size={18} />
      </button>
    </div>
    <div className="space-y-3">
      {data.map((product, index) => (
        <div
          key={product.id}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-all duration-300 group"
        >
          <div className="flex items-center">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium mr-3 shadow-sm ${
              index === 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
              index === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white' :
              index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white' :
              'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700'
            }`}>
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-gray-900 group-hover:text-gray-800">{product.name}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <ShoppingCart size={12} />
                {product.sales} units sold
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-green-600 text-lg">
              ${(product.revenue / 1000).toFixed(1)}K
            </span>
            <div className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp size={12} />
              +{(Math.random() * 20 + 10).toFixed(0)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Low Stock Table Component
const LowStockTable = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <AlertTriangle className="mr-2 text-orange-500" />
          Low Stock Alert
        </h3>
        <p className="text-sm text-gray-500 mt-1">Items needing attention</p>
      </div>
      <button className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
        <AlertTriangle size={14} />
        {data.length} alerts
      </button>
    </div>
    <div className="space-y-3">
      {data.map((item) => {
        const stockPercentage = (item.current / item.min) * 100;
        const severity = stockPercentage <= 30 ? 'high' : stockPercentage <= 60 ? 'medium' : 'low';
        
        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-all duration-300"
          >
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-500 capitalize">{item.type}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                severity === 'high' ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-600 border border-red-500/20' :
                severity === 'medium' ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 text-orange-600 border border-orange-500/20' :
                'bg-gradient-to-r from-amber-500/10 to-yellow-600/10 text-amber-600 border border-amber-500/20'
              }`}>
                {item.current} / {item.min}
              </span>
              <div className={`text-xs mt-1 ${
                severity === 'high' ? 'text-red-500' :
                severity === 'medium' ? 'text-orange-500' :
                'text-amber-500'
              }`}>
                {stockPercentage.toFixed(0)}% of minimum
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Transfer Status Component
const TransferStatus = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Truck className="mr-2 text-indigo-600" />
          Transfer Status
        </h3>
        <p className="text-sm text-gray-500 mt-1">Current transfer overview</p>
      </div>
      <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
        View All
      </button>
    </div>
    <div className="space-y-4">
      {Object.entries(data.statusOverview).map(([status, count]) => {
        const percentage = (count / data.statusOverview.total) * 100;
        const statusColors = {
          transferred: { bg: 'from-emerald-500 to-green-500', text: 'text-emerald-600' },
          being_shipped: { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-600' },
          pending: { bg: 'from-amber-500 to-orange-500', text: 'text-amber-600' },
          cancelled: { bg: 'from-red-500 to-red-600', text: 'text-red-600' }
        };
        
        const colors = statusColors[status] || { bg: 'from-gray-500 to-gray-600', text: 'text-gray-600' };
        
        return (
          <div key={status} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${colors.bg} flex items-center justify-center`}>
                <Truck size={16} className="text-white" />
              </div>
              <div>
                <span className="capitalize text-gray-700 font-medium">
                  {status.replace("_", " ")}
                </span>
                <div className="text-xs text-gray-500">Transfers</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-32 bg-gray-200/50 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${colors.bg} transition-all duration-1000`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="font-medium text-gray-800 w-8 text-right">{count}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Recent Activity Component
const RecentActivity = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
        <p className="text-sm text-gray-500 mt-1">Latest system activities</p>
      </div>
      <button className="p-2 rounded-lg hover:bg-gray-100/50 text-gray-500 hover:text-gray-700 transition-colors">
        <Activity size={18} />
      </button>
    </div>
    <div className="space-y-3">
      {data.map((activity, index) => (
        <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-white/50 transition-all duration-200 group">
          <div className={`p-2 rounded-xl ${
            activity.type === "sale"
              ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-600"
              : activity.type === "transfer"
              ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600"
              : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600"
          }`}>
            {activity.type === "sale" ? (
              <ShoppingCart size={16} />
            ) : activity.type === "transfer" ? (
              <Truck size={16} />
            ) : (
              <Package size={16} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock size={12} />
              {activity.time}
            </p>
          </div>
          <span className={`text-sm font-medium ${
            activity.amount > 0 ? "text-emerald-600" : "text-gray-600"
          }`}>
            {activity.amount > 0 ? `+$${activity.amount}` : ""}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Store Performance Component
const ShopPerformance = ({ data }) => (
  <div className="glass-card rounded-2xl p-6 backdrop-blur-sm border border-white/40">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Store className="mr-2 text-blue-600" />
          Shop Performance
        </h3>
        <p className="text-sm text-gray-500 mt-1">Sales efficiency by shop</p>
      </div>
      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
        <Target size={14} />
        Efficiency
      </button>
    </div>
    <div className="space-y-4">
      {data.shops.map((shop) => (
        <div key={shop.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 flex items-center justify-center">
              <Store size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{shop.name}</p>
              <p className="text-sm text-gray-500">{shop.sales} sales</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              ${(shop.revenue / 1000).toFixed(1)}K
            </p>
            <div className={`flex items-center text-sm ${shop.efficiency >= 80 ? 'text-emerald-500' : shop.efficiency >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
              <Percent size={12} />
              <span>{shop.efficiency}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Dashboard;