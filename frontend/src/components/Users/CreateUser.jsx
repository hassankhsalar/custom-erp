import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { UserPlus, Save, X, CheckSquare, Square } from 'lucide-react';

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'USER',
    permissions: {
      dashboard: ['read'],
      profile: ['read', 'write'],
      sale: ['read'],
      shop: ['read'],
      materials: ['read'],
      production: ['read'],
      purchase: ['read'],
      factory: ['read'],
      stores: ['read'],
      report: ['read']
    }
  });

  // Permission options
  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profile', label: 'Profile' },
    { key: 'sale', label: 'Sales' },
    { key: 'shop', label: 'Shops' },
    { key: 'materials', label: 'Materials' },
    { key: 'production', label: 'Production' },
    { key: 'purchase', label: 'Purchases' },
    { key: 'factory', label: 'Factories' },
    { key: 'stores', label: 'Stores' },
    { key: 'report', label: 'Reports' }
  ];

  const permissionTypes = [
    { key: 'read', label: 'Read' },
    { key: 'write', label: 'Write' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (module, permission, checked) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      
      if (checked) {
        // Add permission if not already present
        if (!newPermissions[module].includes(permission)) {
          newPermissions[module] = [...newPermissions[module], permission];
        }
      } else {
        // Remove permission
        newPermissions[module] = newPermissions[module].filter(p => p !== permission);
      }
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const handleSelectAllRead = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        if (!newPermissions[module.key].includes('read')) {
          newPermissions[module.key] = [...newPermissions[module.key], 'read'];
        }
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAllWrite = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        if (!newPermissions[module.key].includes('write')) {
          newPermissions[module.key] = [...newPermissions[module.key], 'write'];
        }
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleClearAllRead = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        newPermissions[module.key] = newPermissions[module.key].filter(p => p !== 'read');
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleClearAllWrite = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        newPermissions[module.key] = newPermissions[module.key].filter(p => p !== 'write');
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        newPermissions[module.key] = ['read', 'write'];
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleClearAllPermissions = () => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      modules.forEach(module => {
        newPermissions[module.key] = [];
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.name || !formData.password) {
      setMessage('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return false;
    }

    // Check if at least one module has read permission
    const hasReadPermission = Object.values(formData.permissions).some(
      permissions => permissions.includes('read')
    );

    if (!hasReadPermission) {
      setMessage('User must have at least read permission for one module');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(API_ROUTES.USERS, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('User created successfully!');
      setTimeout(() => {
        navigate('/users/all');
      }, 2000);

    } catch (error) {
      console.error('Error creating user:', error);
      setMessage(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'USER',
      permissions: {
        dashboard: ['read'],
        profile: ['read', 'write'],
        sale: ['read'],
        shop: ['read'],
        materials: ['read'],
        production: ['read'],
        purchase: ['read'],
        factory: ['read'],
        stores: ['read'],
        report: ['read']
      }
    });
    setMessage('');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <UserPlus className="mr-2" />
            Create New User
          </h1>
          <button
            onClick={() => navigate('/users')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center"
          >
            <X size={16} className="mr-1" />
            Cancel
          </button>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded ${
            message.includes('successfully') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimum 6 characters"
                minLength="6"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="USER_ASSOCIATE">User Associate</option>
              </select>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <CheckSquare className="mr-2" />
                Permissions
              </h3>
              
              {/* Bulk Actions */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllRead}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                >
                  All Read
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllWrite}
                  className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                >
                  All Write
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm hover:bg-purple-200"
                >
                  All Permissions
                </button>
                <button
                  type="button"
                  onClick={handleClearAllPermissions}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Module
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                      Read
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                      Write
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.key} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {module.label}
                      </td>
                      
                      {/* Read Permission */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handlePermissionChange(
                            module.key, 
                            'read', 
                            !formData.permissions[module.key].includes('read')
                          )}
                          className={`p-2 rounded ${
                            formData.permissions[module.key].includes('read')
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {formData.permissions[module.key].includes('read') ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      
                      {/* Write Permission */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handlePermissionChange(
                            module.key, 
                            'write', 
                            !formData.permissions[module.key].includes('write')
                          )}
                          className={`p-2 rounded ${
                            formData.permissions[module.key].includes('write')
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {formData.permissions[module.key].includes('write') ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Permission Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                <span>Read: View data</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                <span>Write: Create, edit, delete</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
              disabled={loading}
            >
              <X size={18} className="mr-2" />
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
            >
              <Save size={18} className="mr-2" />
              {loading ? 'Creating User...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;