import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <Router>
      <div className="bg-gray-100 min-h-screen">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">InventoryApp</Link>
              </div>
              <div className="flex items-center">
                <div className="flex items-baseline space-x-4">
                  {token ? (
                    <>
                      <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-200">Dashboard</Link>
                      <Link to="/profile" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-200">Profile</Link>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-200">Login</Link>
                      <Link to="/register" className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-200">Register</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route path="/register" element={<Registration />} />
            <Route 
              path="/dashboard" 
              element={token ? <Dashboard setToken={setToken} /> : <Navigate to="/login" />}
            />
            <Route 
              path="/profile" 
              element={token ? <Profile /> : <Navigate to="/login" />}
            />
            <Route 
              path="/" 
              element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;