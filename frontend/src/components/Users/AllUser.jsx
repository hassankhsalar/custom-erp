import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { Users, UserPlus, Edit, Trash2, Save, X, Building, Store, ShoppingCart, Plus, Minus } from 'lucide-react';

const AllUser = () => {
  const [users, setUsers] = useState([]);
  const [factories, setFactories] = useState([]);
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'USER',
    permissions: {
      locations: [] // Structured under 'locations' array
    }
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.USERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const [factoriesRes, storesRes, shopsRes] = await Promise.all([
        axios.get(API_ROUTES.FACTORIES, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(API_ROUTES.STORES, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(API_ROUTES.SHOPS, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setFactories(factoriesRes.data || []);
      setStores(storesRes.data.stores || []);
      setShops(shopsRes.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      permissions: user.permissions || { locations: [] }
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
    setEditForm({
      name: '',
      email: '',
      role: 'USER',
      permissions: { locations: [] }
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new location permission
  const addLocationPermission = () => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        locations: [
          ...(prev.permissions.locations || []),
          {
            type: 'factory',
            id: null,
            name: '',
            permissions: {
              create: false,
              read: false,
              update: false,
              delete: false
            }
          }
        ]
      }
    }));
  };

  // Remove location permission
  const removeLocationPermission = (index) => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        locations: (prev.permissions.locations || []).filter((_, i) => i !== index)
      }
    }));
  };

  // Handle location type and ID change
  const handleLocationChange = (index, field, value) => {
    setEditForm(prev => {
      const updatedLocations = [...(prev.permissions.locations || [])];
      
      if (field === 'type') {
        updatedLocations[index] = {
          ...updatedLocations[index],
          type: value,
          id: null,
          name: ''
        };
      } else if (field === 'id') {
        let locationName = '';
        const locationId = parseInt(value);
        
        if (updatedLocations[index].type === 'factory') {
          const factory = factories.find(f => f.id === locationId);
          locationName = factory?.name || '';
        } else if (updatedLocations[index].type === 'store') {
          const store = stores.find(s => s.id === locationId);
          locationName = store?.name || '';
        } else if (updatedLocations[index].type === 'shop') {
          const shop = shops.find(s => s.id === locationId);
          locationName = shop?.name || '';
        }

        updatedLocations[index] = {
          ...updatedLocations[index],
          id: locationId,
          name: locationName
        };
      }
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          locations: updatedLocations
        }
      };
    });
  };

  // Handle permission change for specific location
  const handleLocationPermissionChange = (index, permission, checked) => {
    setEditForm(prev => {
      const updatedLocations = [...(prev.permissions.locations || [])];
      updatedLocations[index] = {
        ...updatedLocations[index],
        permissions: {
          ...updatedLocations[index].permissions,
          [permission]: checked
        }
      };
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          locations: updatedLocations
        }
      };
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUpdateLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_ROUTES.USERS}/${selectedUser.id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? response.data.user : user
      ));

      closeEditModal();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_ROUTES.USERS}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove user from local state
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  // Get location options based on type
  const getLocationOptions = (type) => {
    switch (type) {
      case 'factory':
        return factories;
      case 'store':
        return stores;
      case 'shop':
        return shops;
      default:
        return [];
    }
  };

  // Get location icon based on type
  const getLocationIcon = (type) => {
    switch (type) {
      case 'factory':
        return <Building size={14} />;
      case 'store':
        return <Store size={14} />;
      case 'shop':
        return <ShoppingCart size={14} />;
      default:
        return null;
    }
  };

  // Get location permissions from the permissions object
  const getLocationPermissions = (permissions) => {
    return permissions?.locations || [];
  };

  if (loading) return <div className="container mx-auto p-6">Loading users...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Users className="mr-2" />
          User Management
        </h1>
        <Link 
          to="/users/create" 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <UserPlus size={18} className="mr-2" />
          Add New User
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Locations</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => {
              const locationPermissions = getLocationPermissions(user.permissions);
              
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {locationPermissions.length > 0 ? (
                      <div className="space-y-1">
                        {locationPermissions.map((location, index) => (
                          <div key={index} className="flex items-center">
                            {getLocationIcon(location.type)}
                            <span className="ml-1">{location.name}</span>
                            <span className="ml-2 text-xs text-gray-400">
                              ({Object.keys(location.permissions || {}).filter(p => location.permissions[p]).join(', ')})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button 
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Edit className="mr-2" />
                  Edit User
                </h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleEditInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Location Permissions */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Building className="mr-2" />
                      Location Permissions
                    </h3>
                    <button
                      type="button"
                      onClick={addLocationPermission}
                      className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center text-sm"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Location
                    </button>
                  </div>
                  
                  {(!editForm.permissions.locations || editForm.permissions.locations.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">No location permissions assigned</p>
                  ) : (
                    <div className="space-y-4">
                      {editForm.permissions.locations.map((location, index) => (
                        <div key={index} className="border rounded p-4 bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium">Location Permission #{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeLocationPermission(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Minus size={16} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Location Type</label>
                              <select
                                value={location.type}
                                onChange={(e) => handleLocationChange(index, 'type', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded"
                              >
                                <option value="factory">Factory</option>
                                <option value="store">Store</option>
                                <option value="shop">Shop</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Location</label>
                              <select
                                value={location.id || ''}
                                onChange={(e) => handleLocationChange(index, 'id', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded"
                              >
                                <option value="">Select {location.type}</option>
                                {getLocationOptions(location.type).map(loc => (
                                  <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Location-specific Permissions */}
                          {location.id && (
                            <div className="border-t pt-3">
                              <label className="block text-sm font-medium mb-2">Permissions for {location.name}</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {['create', 'read', 'update', 'delete'].map(permission => (
                                  <label key={permission} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={location.permissions[permission] || false}
                                      onChange={(e) => handleLocationPermissionChange(index, permission, e.target.checked)}
                                      className="mr-2"
                                    />
                                    <span className="text-sm capitalize">{permission}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
                  >
                    <Save size={16} className="mr-2" />
                    {updateLoading ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUser;