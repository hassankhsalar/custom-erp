import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_ROUTES } from '../../config';

const AllFactory = () => {
  const [factories, setFactories] = useState([]);
  const [showDropdown, setShowDropdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const response = await axios.get(API_ROUTES.FACTORIES);
        setFactories(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching factories:', error);
        setLoading(false);
      }
    };
    fetchFactories();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this factory?')) {
      try {
        await axios.delete(`${API_ROUTES.FACTORIES}/${id}`);
        setFactories(factories.filter((factory) => factory.id !== id));
        alert('Factory deleted successfully!');
      } catch (error) {
        console.error('Error deleting factory:', error);
        alert('Error deleting factory. Please try again.');
      }
    }
  };

  const formatContactInfo = (factory) => {
    const hasPhone = factory.phone && factory.phone.trim() !== '';
    const hasEmail = factory.email && factory.email.trim() !== '';
    const hasManager = factory.manager && factory.manager.trim() !== '';
    
    return { hasPhone, hasEmail, hasManager };
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-2xl p-6 border border-white/30">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              All Factories
            </h2>
            <p className="text-gray-600 mt-2">Manage your factory locations and contacts</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/40">
              {factories.length} factor{factories.length !== 1 ? 'ies' : 'y'}
            </div>
            <Link 
              to="/factories/add" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Factory
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading factories...</p>
          </div>
        ) : factories.length > 0 ? (
          <div className="backdrop-blur-sm bg-white/50 rounded-xl overflow-hidden border border-white/40 shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                  <tr>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Factory</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Manager</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Contact</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Address</th>
                    <th className="py-4 px-6 text-left font-medium text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {factories.map((factory, index) => {
                    const contactInfo = formatContactInfo(factory);
                    return (
                      <tr 
                        key={factory.id} 
                        className={`${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white/30'} hover:bg-gray-100/50 transition-colors duration-150`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{factory.name}</div>
                              <div className="text-sm text-gray-600">
                                {contactInfo.hasEmail ? factory.email : 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {contactInfo.hasManager ? factory.manager : 'Not assigned'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {contactInfo.hasPhone ? factory.phone : 'No phone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className={`${contactInfo.hasPhone ? 'text-gray-900' : 'text-gray-500'}`}>
                                {contactInfo.hasPhone ? factory.phone : 'No phone'}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className={`${contactInfo.hasEmail ? 'text-gray-900' : 'text-gray-500'}`}>
                                {contactInfo.hasEmail ? factory.email : 'No email'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-xs">
                            <div className="text-gray-900 truncate">{factory.address || 'No address'}</div>
                            {factory.address && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                Location
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-full rounded-lg border border-gray-300/50 shadow-sm px-4 py-2 bg-white/80 text-sm font-medium text-gray-700 hover:bg-gray-100/80 focus:outline-none transition-all duration-200 backdrop-blur-sm hover:shadow-md"
                              onClick={() => setShowDropdown(showDropdown === factory.id ? null : factory.id)}
                            >
                              Actions
                              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {showDropdown === factory.id && (
                              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white/95 backdrop-blur-lg ring-1 ring-black/5 z-10 border border-white/40">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  <Link
                                    to={`/factories/edit/${factory.id}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-colors duration-150"
                                    role="menuitem"
                                    onClick={() => setShowDropdown(null)}
                                  >
                                    <svg className="w-4 h-4 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Factory
                                  </Link>
                                  <button
                                    onClick={() => {
                                      handleDelete(factory.id);
                                      setShowDropdown(null);
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-colors duration-150"
                                    role="menuitem"
                                  >
                                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Factory
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 backdrop-blur-sm bg-white/50 rounded-xl border border-white/40">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Factories Found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first factory location</p>
            <Link 
              to="/factories/add" 
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Factory
            </Link>
          </div>
        )}

        {/* Summary Cards */}
        {factories.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="backdrop-blur-sm bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
              <div className="text-sm text-gray-600">Total Factories</div>
              <div className="text-2xl font-bold text-blue-700">{factories.length}</div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
              <div className="text-sm text-gray-600">With Manager</div>
              <div className="text-2xl font-bold text-green-700">
                {factories.filter(f => f.manager && f.manager.trim() !== '').length}
              </div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
              <div className="text-sm text-gray-600">With Email</div>
              <div className="text-2xl font-bold text-purple-700">
                {factories.filter(f => f.email && f.email.trim() !== '').length}
              </div>
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
              <div className="text-sm text-gray-600">With Phone</div>
              <div className="text-2xl font-bold text-amber-700">
                {factories.filter(f => f.phone && f.phone.trim() !== '').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllFactory;