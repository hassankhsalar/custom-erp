import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const EditFactory = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { id } = useParams();
  const [factory, setFactory] = useState({
    name: '',
    phone: '',
    manager: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchFactory = async () => {
    if (!token) {
      alert('Authentication required. Please login.');
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_ROUTES.FACTORIES}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setFactory(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching factory:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert('Permission denied. You do not have access to this factory.');
      }
      
      setLoading(false);
    }
  };
  
  if (token) {
    fetchFactory();
  } else {
    setLoading(false);
  }
}, [id, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFactory((prevFactory) => ({
      ...prevFactory,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check authentication
  if (!token) {
    alert('Authentication required. Please login.');
    navigate('/login');
    return;
  }

  try {
    await axios.put(`${API_ROUTES.FACTORIES}/${id}`, factory, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    alert('Factory updated successfully!');
    navigate('/factories/all');
  } catch (error) {
    console.error('Error updating factory:', error);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      alert('Session expired. Please login again.');
      localStorage.removeItem('token');
      navigate('/login');
    } else if (error.response?.status === 403) {
      alert('Permission denied. You cannot update this factory.');
    } else {
      alert('Error updating factory. Please try again.');
    }
  }
};

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-12 border border-white/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading factory details...</p>
        </div>
      </div>
    );
  }

  const hasContactInfo = factory.phone || factory.email || factory.manager;

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
              Edit Factory
            </h1>
            <p className="text-gray-600 mt-2">Update factory information and contact details</p>
          </div>
          <button 
            onClick={() => navigate('/factories/all')}
            className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
          >
            ← Back to Factories
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 border border-white/40 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Factory Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factory Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={factory.name}
                      onChange={handleChange}
                      placeholder="Factory name"
                      required
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="manager"
                      value={factory.manager}
                      onChange={handleChange}
                      placeholder="Manager's name"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <textarea
                      name="address"
                      value={factory.address}
                      onChange={handleChange}
                      placeholder="Factory address"
                      rows="3"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={factory.phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={factory.email}
                      onChange={handleChange}
                      placeholder="email@factory.com"
                      className="w-full pl-10 p-3 border border-gray-300/50 rounded-lg bg-white/80 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Contact Summary */}
                <div className="backdrop-blur-sm bg-gray-50/50 rounded-lg p-4 border border-gray-200/50 mt-4">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Contact Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <div className={`w-2 h-2 rounded-full mr-3 ${factory.phone ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <div className="text-gray-600">Phone</div>
                        <div className={`font-medium ${factory.phone ? 'text-gray-900' : 'text-gray-500'}`}>
                          {factory.phone || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`w-2 h-2 rounded-full mr-3 ${factory.email ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <div className="text-gray-600">Email</div>
                        <div className={`font-medium ${factory.email ? 'text-gray-900' : 'text-gray-500'}`}>
                          {factory.email || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className={`w-2 h-2 rounded-full mr-3 ${factory.manager ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <div className="text-gray-600">Manager</div>
                        <div className={`font-medium ${factory.manager ? 'text-gray-900' : 'text-gray-500'}`}>
                          {factory.manager || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Overview */}
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Factory Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="backdrop-blur-sm bg-gradient-to-r from-blue-50 to-blue-100/30 rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Factory</div>
                      <div className="font-semibold text-gray-900 truncate">{factory.name}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={`backdrop-blur-sm rounded-xl p-4 border ${
                  factory.manager 
                    ? 'bg-gradient-to-r from-green-50 to-green-100/30 border-green-200/50' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100/30 border-gray-200/50'
                }`}>
                  <div className="text-sm text-gray-600">Manager</div>
                  <div className={`font-semibold ${factory.manager ? 'text-green-700' : 'text-gray-500'}`}>
                    {factory.manager || 'Not assigned'}
                  </div>
                </div>

                <div className={`backdrop-blur-sm rounded-xl p-4 border ${
                  factory.phone 
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100/30 border-purple-200/50' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100/30 border-gray-200/50'
                }`}>
                  <div className="text-sm text-gray-600">Phone</div>
                  <div className={`font-semibold truncate ${factory.phone ? 'text-purple-700' : 'text-gray-500'}`}>
                    {factory.phone || 'Not provided'}
                  </div>
                </div>

                <div className={`backdrop-blur-sm rounded-xl p-4 border ${
                  factory.email 
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100/30 border-amber-200/50' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100/30 border-gray-200/50'
                }`}>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className={`font-semibold truncate ${factory.email ? 'text-amber-700' : 'text-gray-500'}`}>
                    {factory.email || 'Not provided'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/factories/all')}
              className="bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 hover:text-gray-900 p-3 px-8 rounded-xl font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm border border-gray-300/50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-700 hover:to-green-800 text-white p-3 px-12 rounded-xl font-medium text-lg transition-all duration-200 hover:shadow-xl backdrop-blur-sm transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Update Factory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFactory;