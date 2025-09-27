import React from 'react';
import { useAuth } from '../App'; // Adjust path if necessary

const Dashboard = () => {
  const { token, logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-3xl font-bold mb-4">Welcome to the Dashboard!</h2>
      <button
        onClick={logout}
        className="px-6 py-3 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
