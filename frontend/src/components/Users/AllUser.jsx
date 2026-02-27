import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { Users, UserPlus, Edit, Trash2, Save, X, Building, Store, ShoppingCart, Plus, Minus, ToggleLeft, ToggleRight, Key, Shield, Mail, User as UserIcon, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AllUser = () => {
  const location = useLocation();
  const { socket, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [factories, setFactories] = useState([]);
  const [stores, setStores] = useState([]);
  const [shops, setShops] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false);
  const [forceLogoutUserId, setForceLogoutUserId] = useState(null);
  const [userListMode, setUserListMode] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    loginStartTime: '',
    loginEndTime: '',
    isActive: true,
    bypassGlobalAccessWindow: false,
    permissionId: '',
    permissions: {
      locations: []
    }
  });
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [globalAccessWindow, setGlobalAccessWindow] = useState({ enabled: false, windows: [] });
  const [globalWindowSaving, setGlobalWindowSaving] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const canManageSessions = currentUser?.permission?.name === 'admin'
    || currentUser?.permission?.name === 'superadmin'
    || (Array.isArray(currentUser?.permission?.permissions)
      && currentUser.permission.permissions.includes('user_logout'));
  const permissionList = Array.isArray(currentUser?.permission?.permissions) ? currentUser.permission.permissions : [];
  const isAdmin = ['admin', 'superadmin'].includes((currentUser?.permission?.name || '').toLowerCase());
  const canEditUsers = isAdmin || permissionList.includes('user_edit');
  const canDeleteUsers = isAdmin || permissionList.includes('user_delete');
  const canToggleUsers = isAdmin || permissionList.includes('user_activate_deactivate');
  const activeSessionByUserId = activeSessions.reduce((acc, session) => {
    acc[session.userId] = session;
    return acc;
  }, {});
  const displayedUsers = userListMode === 'active'
    ? users.filter((user) => !!activeSessionByUserId[user.id])
    : users;

  useEffect(() => {
    fetchUsers();
    fetchLocations();
    fetchPermissions();
    fetchGlobalAccessWindow();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setUserListMode(params.get('mode') === 'active' ? 'active' : 'all');
  }, [location.search]);

  useEffect(() => {
    if (!canManageSessions) return;
    fetchActiveSessions();
  }, [canManageSessions]);

  useEffect(() => {
    if (!socket || !canManageSessions) return undefined;

    const handleActiveUsersUpdate = (sessions) => {
      setActiveSessions(Array.isArray(sessions) ? sessions : []);
    };

    socket.on('active-users:update', handleActiveUsersUpdate);
    return () => {
      socket.off('active-users:update', handleActiveUsersUpdate);
    };
  }, [socket, canManageSessions]);

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

      setFactories(factoriesRes.data?.factories || factoriesRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);
      setShops(shopsRes.data?.shops || shopsRes.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(API_ROUTES.PERMISSIONS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissionOptions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissionOptions([]);
    }
  };

  const fetchGlobalAccessWindow = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(API_ROUTES.USER_GLOBAL_ACCESS_WINDOW, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const value = res.data || { enabled: false, windows: [] };
      setGlobalAccessWindow({
        enabled: !!value.enabled,
        windows: Array.isArray(value.windows) ? value.windows : [],
      });
    } catch (error) {
      console.error('Error fetching global access window:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setLoadingActiveSessions(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ROUTES.USER_ACTIVE_SESSIONS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    } finally {
      setLoadingActiveSessions(false);
    }
  };

  const handleForceLogout = async (userId) => {
    if (!window.confirm('Are you sure you want to force logout this user now?')) {
      return;
    }

    try {
      setForceLogoutUserId(userId);
      const token = localStorage.getItem('token');
      await axios.post(
        API_ROUTES.USER_FORCE_LOGOUT(userId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error forcing user logout:', error);
      alert(error.response?.data?.error || 'Failed to force logout user');
    } finally {
      setForceLogoutUserId(null);
    }
  };

  const openEditModal = (user) => {
    const fallbackLocations = Array.isArray(user.userAssociate)
      ? user.userAssociate
          .filter((a) => ['factory', 'store', 'shop'].includes(a.associateName))
          .map((a) => ({
            type: a.associateName,
            id: a.associateId,
            name: `${a.associateName} #${a.associateId}`,
          }))
      : [];

    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      loginStartTime: user.loginStartTime || '',
      loginEndTime: user.loginEndTime || '',
      isActive: user.isActive !== false,
      bypassGlobalAccessWindow: !!user.bypassGlobalAccessWindow,
      permissionId: user.permission?.id || '',
      permissions: {
        locations: getLocationPermissions(user.permissions).length
          ? getLocationPermissions(user.permissions)
          : fallbackLocations,
      }
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
    setEditForm({
      name: '',
      email: '',
      loginStartTime: '',
      loginEndTime: '',
      isActive: true,
      bypassGlobalAccessWindow: false,
      permissionId: '',
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
            name: ''
          }
        ]
      }
    }));
  };

  const removeLocationPermission = (index) => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        locations: (prev.permissions.locations || []).filter((_, i) => i !== index)
      }
    }));
  };

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

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUpdateLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_ROUTES.USERS}/${selectedUser.id}`,
        {
          ...editForm,
          permissionId: editForm.permissionId ? Number(editForm.permissionId) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
    if (!canDeleteUsers) return;
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_ROUTES.USERS}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleActiveToggle = async (user) => {
    if (!canToggleUsers) return;
    try {
      const token = localStorage.getItem('token');
      const nextState = !(user.isActive !== false);
      await axios.patch(
        API_ROUTES.USER_SET_ACTIVE(user.id),
        { isActive: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: nextState } : u)));
    } catch (error) {
      console.error('Error updating active status:', error);
      alert(error.response?.data?.error || 'Failed to update user active status');
    }
  };

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

  const getLocationPermissions = (permissions) => {
    return Array.isArray(permissions?.locations) ? permissions.locations : [];
  };

  const addGlobalWindow = () => {
    setGlobalAccessWindow((prev) => ({
      ...prev,
      windows: [...(prev.windows || []), { start: '', end: '' }],
    }));
  };

  const removeGlobalWindow = (index) => {
    setGlobalAccessWindow((prev) => ({
      ...prev,
      windows: (prev.windows || []).filter((_, i) => i !== index),
    }));
  };

  const changeGlobalWindow = (index, field, value) => {
    setGlobalAccessWindow((prev) => ({
      ...prev,
      windows: (prev.windows || []).map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    }));
  };

  const saveGlobalAccessWindow = async () => {
    try {
      setGlobalWindowSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(
        API_ROUTES.USER_GLOBAL_ACCESS_WINDOW,
        { value: globalAccessWindow },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error saving global access window:', error);
      alert(error.response?.data?.error || 'Failed to save global access window');
    } finally {
      setGlobalWindowSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6">
      <div className="glass-card p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading users...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen rounded-t-2xl bg-linear-to-br from-gray-50 via-white to-blue-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <div className="glass-icon p-3 rounded-xl mr-4 bg-linear-to-r from-blue-500/10 to-purple-500/10">
              <Users className="text-blue-600" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-gray-600 mt-1">Manage user permissions and access</p>
            </div>
          </div>
          <Link 
            to="/users/create" 
            className="group bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
          >
            <UserPlus size={20} className="mr-2 group-hover:scale-110 transition-transform" />
            Add New User
          </Link>
        </div>
      </div>
      {canManageSessions && (
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Clock size={18} className="mr-2 text-blue-600" />
              Live Active Users
            </h2>
            <span className="text-sm text-gray-600">
              {loadingActiveSessions ? 'Loading...' : `${activeSessions.length} online`}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUserListMode('all')}
              className={`px-3 py-2 rounded-lg text-sm ${userListMode === 'all' ? 'bg-blue-600 text-white' : 'bg-white/60 text-gray-700'}`}
            >
              All Users
            </button>
            <button
              type="button"
              onClick={() => setUserListMode('active')}
              className={`px-3 py-2 rounded-lg text-sm ${userListMode === 'active' ? 'bg-blue-600 text-white' : 'bg-white/60 text-gray-700'}`}
            >
              Active Users Only
            </button>
          </div>
        </div>
      )}

      {canEditUsers && (
        <div className="glass-card p-6 mb-6 border border-white/20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Clock size={18} className="mr-2 text-blue-600" />
              Global Access Time Limit
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!globalAccessWindow.enabled}
                  onChange={(e) => setGlobalAccessWindow((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={saveGlobalAccessWindow}
                disabled={globalWindowSaving}
                className="bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg"
              >
                {globalWindowSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {(globalAccessWindow.windows || []).map((w, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <input
                  type="datetime-local"
                  value={w.start || ''}
                  onChange={(e) => changeGlobalWindow(idx, 'start', e.target.value)}
                  className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50"
                />
                <input
                  type="datetime-local"
                  value={w.end || ''}
                  onChange={(e) => changeGlobalWindow(idx, 'end', e.target.value)}
                  className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50"
                />
                <button
                  type="button"
                  onClick={() => removeGlobalWindow(idx)}
                  className="glass-icon-button p-2 rounded-lg bg-linear-to-r from-red-500/10 to-red-600/10 text-red-600 w-fit"
                >
                  <Minus size={18} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addGlobalWindow}
              className="bg-linear-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Global Block Window
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card overflow-hidden border border-white/20 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-linear-to-r from-gray-50/50 to-gray-100/50 backdrop-blur-sm">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-white/20">
                  <div className="flex items-center">
                    <UserIcon size={16} className="mr-2" />
                    Name
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-white/20">
                  <div className="flex items-center">
                    <Mail size={16} className="mr-2" />
                    Email
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-white/20">
                  <div className="flex items-center">
                    <Shield size={16} className="mr-2" />
                    Role
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-white/20">
                  <div className="flex items-center">
                    <Key size={16} className="mr-2" />
                    Assigned Locations
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-white/20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {displayedUsers.map((user) => {
                const locationPermissions = getLocationPermissions(user.permissions);
                
                return (
                  <tr key={user.id} className="hover:bg-white/10 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-linear-to-r from-blue-500/10 to-purple-500/10">
                          <UserIcon size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 flex items-center">
                        <Mail size={14} className="mr-2 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full capitalize text-xs font-semibold ${
                        ['admin', 'superadmin'].includes((user.permission?.name || '').toLowerCase())
                          ? 'bg-linear-to-r from-purple-500/20 to-pink-500/20 text-purple-700 border border-purple-200/50' 
                          : 'bg-linear-to-r from-green-500/20 to-emerald-500/20 text-green-700 border border-green-200/50'
                      }`}>
                        {['admin', 'superadmin'].includes((user.permission?.name || '').toLowerCase()) && <Shield size={12} className="mr-1" />}
                        {user.permission?.name || '-'}
                      </span>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          user.isActive === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.isActive === false ? 'Deactivated' : 'Active'}
                        </span>
                        {user.bypassGlobalAccessWindow === true &&
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-lime-100 text-lime-700`}>
                          {user.bypassGlobalAccessWindow === true ? 'Whitelisted' : ''}
                        </span>
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {locationPermissions.length > 0 ? (
                        <div className="space-y-2">
                          {locationPermissions.map((location, index) => (
                            <div key={index} className="flex items-center glass-tag px-3 py-1.5 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200">
                              <div className="glass-icon-xs p-1.5 rounded-md mr-2 bg-linear-to-r from-blue-500/10 to-purple-500/10">
                                {getLocationIcon(location.type)}
                              </div>
                              <span className="font-medium">{location.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic flex items-center">
                          <Minus size={14} className="mr-1" />
                          Not assigned
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {canEditUsers && (
                          <button 
                            onClick={() => openEditModal(user)}
                            className="glass-icon-button p-2 rounded-lg bg-linear-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-600 hover:text-blue-700 transition-all duration-200"
                            title="Edit User"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {canDeleteUsers && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="glass-icon-button p-2 rounded-lg bg-linear-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-600 hover:text-red-700 transition-all duration-200"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {canToggleUsers && (
                          <button
                            type="button"
                            onClick={() => handleActiveToggle(user)}
                            className={`glass-icon-button p-2 rounded-lg transition-all duration-200 ${
                              user.isActive === false
                                ? 'bg-gradient-to-r from-emerald-500/10 to-green-600/10 hover:from-emerald-500/20 hover:to-green-600/20 text-emerald-700'
                                : 'bg-gradient-to-r from-amber-500/10 to-orange-600/10 hover:from-amber-500/20 hover:to-orange-600/20 text-amber-700'
                            }`}
                            title={user.isActive === false ? 'Activate User' : 'Deactivate User'}
                          >
                            {user.isActive === false ? <ToggleLeft size={20} className="text-gray-700" /> : <ToggleRight size={20} className="text-emerald-500" />}
                          </button>
                        )}
                        {canManageSessions && activeSessionByUserId[user.id] && (
                          <button
                            type="button"
                            onClick={() => handleForceLogout(user.id)}
                            disabled={forceLogoutUserId === user.id}
                            className="glass-icon-button p-2 rounded-lg bg-linear-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 text-orange-700 hover:text-red-700 transition-all duration-200 disabled:opacity-50"
                            title="Force Logout Active User"
                          >
                            <LogOut size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    {userListMode === 'active' ? 'No active users found.' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 backdrop-blur-xl shadow-2xl">
            <div className="p-6 md:p-8">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/20">
                <div className="flex items-center">
                  <div className="glass-icon p-3 rounded-xl mr-4 bg-linear-to-r from-blue-500/10 to-purple-500/10">
                    <Edit className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Edit User
                    </h2>
                    <p className="text-gray-600 text-sm">Update user details and permissions</p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="glass-icon-button p-2 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdateUser} className="space-y-8">
                {/* Basic Information */}
                <div className="glass-section p-6 rounded-xl border border-white/20 bg-linear-to-br from-white/30 to-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
                    <UserIcon size={20} className="mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditInputChange}
                        className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditInputChange}
                        className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Role</label>
                      <select
                        name="permissionId"
                        value={editForm.permissionId}
                        onChange={handleEditInputChange}
                        className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                      >
                        <option value="">Select role</option>
                        {permissionOptions.map((perm) => (
                          <option key={perm.id} value={perm.id}>
                            {perm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="isActive"
                        type="checkbox"
                        checked={!!editForm.isActive}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium text-gray-700">User Active</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="bypassGlobalAccessWindow"
                        type="checkbox"
                        checked={!!editForm.bypassGlobalAccessWindow}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bypassGlobalAccessWindow: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
                      />
                      <label htmlFor="bypassGlobalAccessWindow" className="text-sm font-medium text-gray-700">Whitelist From Global Access Window</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Login Start Time</label>
                      <input
                        type="time"
                        name="loginStartTime"
                        value={editForm.loginStartTime}
                        onChange={handleEditInputChange}
                        className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Login End Time</label>
                      <input
                        type="time"
                        name="loginEndTime"
                        value={editForm.loginEndTime}
                        onChange={handleEditInputChange}
                        className="glass-input w-full p-3 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Permissions */}
                <div className="glass-section p-6 rounded-xl border border-white/20 bg-linear-to-br from-white/30 to-white/10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center text-gray-800">
                        <Building className="mr-2 text-blue-600" size={20} />
                        Location Permissions
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">Assign specific location access permissions</p>
                    </div>
                    <button
                      type="button"
                      onClick={addLocationPermission}
                      className="mt-4 md:mt-0 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Location
                    </button>
                  </div>
                  
                  {(!editForm.permissions.locations || editForm.permissions.locations.length === 0) ? (
                    <div className="text-center py-8">
                      <div className="glass-icon p-4 rounded-full inline-flex mb-4 bg-linear-to-r from-gray-100/50 to-gray-200/50">
                        <Key className="text-gray-400" size={24} />
                      </div>
                      <p className="text-gray-500">No location permissions assigned</p>
                      <p className="text-gray-400 text-sm mt-1">Click "Add Location" to assign permissions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editForm.permissions.locations.map((location, index) => (
                        <div key={index} className="glass-card-inner p-4 rounded-xl border border-gray-200 bg-white/40 backdrop-blur-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                              <div className="glass-icon-sm p-2 rounded-lg mr-3 bg-linear-to-r from-blue-500/10 to-purple-500/10">
                                {getLocationIcon(location.type)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-800">Location Permission #{index + 1}</h4>
                                <p className="text-gray-600 text-sm">Type: <span className="capitalize">{location.type}</span></p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLocationPermission(index)}
                              className="glass-icon-button p-2 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors"
                              title="Remove Location"
                            >
                              <Minus size={18} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700">Location Type</label>
                              <select
                                value={location.type}
                                onChange={(e) => handleLocationChange(index, 'type', e.target.value)}
                                className="glass-input w-full p-3 rounded-lg border border-gray-300 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                              >
                                <option value="factory">Factory</option>
                                <option value="store">Store</option>
                                <option value="shop">Shop</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700">Location</label>
                              <select
                                value={location.id || ''}
                                onChange={(e) => handleLocationChange(index, 'id', e.target.value)}
                                className="glass-input w-full p-3 rounded-lg border border-gray-300 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
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

                          {location.id && (
                            <div className="glass-section-inner p-4 rounded-lg border border-white/20 bg-white/30 mt-4">
                              <label className="block text-sm font-semibold mb-3 text-gray-800">
                                Assigned Location: <span className="text-blue-600">{location.name}</span>
                              </label>
                              <p className="text-sm text-gray-600">This user will be associated with this location.</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-4 pt-6 border-t border-white/20">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-6 py-3 border border-gray-300/50 text-gray-700 rounded-lg hover:bg-gray-50/50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="px-6 py-3 text-white bg-linear-to-r from-blue-500 to-blue-600 text-gray-700 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center"
                  >
                    <Save size={18} className="mr-2" />
                    {updateLoading ? (
                      <>
                        <span className="inline-block animate-spin text-white rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                        Updating...
                      </>
                    ) : 'Update User'}
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
