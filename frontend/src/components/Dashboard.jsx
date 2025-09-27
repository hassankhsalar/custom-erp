import React from 'react';

const Dashboard = ({ setToken }) => {
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Dashboard</h1>
        <button onClick={handleLogout} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;