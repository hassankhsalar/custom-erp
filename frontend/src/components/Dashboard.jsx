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
} from "lucide-react";

const Dashboard = () => {
 const { token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month"); // day, week, month, year

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Failed to load dashboard data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
      <button
        onClick={logout}
        className="px-5 py-1 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
      >
        Logout
      </button>
    </div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
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
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div
            className={`flex items-center mt-2 text-sm ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            <span className="ml-1">{change}</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

// Revenue Chart Component
const RevenueChart = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <BarChart3 className="mr-2" />
      Revenue Trend
    </h3>
    <div className="h-64 flex items-end justify-between space-x-2">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1">
          <div
            className="bg-blue-500 rounded-t w-full max-w-12"
            style={{ height: `${(item.revenue / 500000) * 200}px` }}
          ></div>
          <span className="text-xs mt-2 text-gray-600">{item.month}</span>
          <span className="text-xs font-medium">
            ${(item.revenue / 1000).toFixed(0)}K
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Inventory Chart Component
const InventoryChart = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <Package className="mr-2" />
      Inventory Distribution
    </h3>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{item.category}</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(item.value / 2000000) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium w-16 text-right">
              ${(item.value / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Top Products Table Component
const TopProductsTable = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
    <div className="space-y-3">
      {data.map((product, index) => (
        <div
          key={product.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">
                {product.sales} units sold
              </p>
            </div>
          </div>
          <span className="font-semibold text-green-600">
            ${(product.revenue / 1000).toFixed(1)}K
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Low Stock Table Component
const LowStockTable = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <AlertTriangle className="mr-2 text-orange-500" />
      Low Stock Alert
    </h3>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-500 capitalize">{item.type}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                item.current <= item.min * 0.3
                  ? "bg-red-100 text-red-800"
                  : item.current <= item.min * 0.6
                  ? "bg-orange-100 text-orange-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {item.current} / {item.min}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Transfer Status Component
const TransferStatus = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <Truck className="mr-2" />
      Transfer Status
    </h3>
    <div className="space-y-4">
      {Object.entries(data.statusOverview).map(([status, count]) => (
        <div key={status} className="flex items-center justify-between">
          <span className="capitalize text-gray-600">
            {status.replace("_", " ")}
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  status === "transferred"
                    ? "bg-green-500"
                    : status === "being_shipped"
                    ? "bg-blue-500"
                    : status === "pending"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${(count / data.statusOverview.total) * 100}%`,
                }}
              ></div>
            </div>
            <span className="font-medium w-8 text-right">{count}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Recent Activity Component
const RecentActivity = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
    <div className="space-y-3">
      {data.map((activity, index) => (
        <div key={index} className="flex items-start space-x-3 p-2">
          <div
            className={`p-2 rounded-full ${
              activity.type === "sale"
                ? "bg-green-100 text-green-600"
                : activity.type === "transfer"
                ? "bg-blue-100 text-blue-600"
                : "bg-purple-100 text-purple-600"
            }`}
          >
            {activity.type === "sale" ? (
              <ShoppingCart size={16} />
            ) : activity.type === "transfer" ? (
              <Truck size={16} />
            ) : (
              <Package size={16} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.description}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
          <span
            className={`text-sm font-medium ${
              activity.amount > 0 ? "text-green-600" : "text-gray-600"
            }`}
          >
            {activity.amount > 0 ? `+$${activity.amount}` : ""}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Store Performance Component
const ShopPerformance = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <Store className="mr-2" />
      Shop Performance
    </h3>
    <div className="space-y-4">
      {data.shops.map((shop, index) => (
        <div key={shop.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{shop.name}</p>
            <p className="text-sm text-gray-500">{shop.sales} sales</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              ${(shop.revenue / 1000).toFixed(1)}K
            </p>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp size={14} />
              <span>{shop.efficiency}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Dashboard;

// import React from 'react';
// import { useAuth } from '../App'; // Adjust path if necessary

// const Dashboard = () => {
//   const { token, logout } = useAuth();

//   return (
    // <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
    //   <h2 className="text-3xl font-bold mb-4">Welcome to the Dashboard!</h2>
    //   <button
    //     onClick={logout}
    //     className="px-6 py-3 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
    //   >
    //     Logout
    //   </button>
    // </div>
//   );
// };

// export default Dashboard;
