import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_ROUTES } from '../../config';
import { 
  UserPlus, 
  Save, 
  X, 
  ArrowLeft, 
  Mail, 
  User, 
  Lock, 
  Shield, 
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'USER',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ text: '', type: '' });
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.name || !formData.password) {
      setMessage({ text: 'Please fill in all required fields', type: 'error' });
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return false;
    }

    if (formData.password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long', type: 'error' });
      return false;
    }

    // Password strength check (basic)
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setMessage({ 
        text: 'Password should contain uppercase, lowercase letters and numbers', 
        type: 'warning' 
      });
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const userData = {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role
      };

      const response = await axios.post(API_ROUTES.USERS, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ 
        text: 'User created successfully! Redirecting...', 
        type: 'success' 
      });
      
      setTimeout(() => {
        navigate('/users/all');
      }, 1500);

    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({ 
        text: error.response?.data?.error || 'Failed to create user. Please try again.', 
        type: 'error' 
      });
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
    });
    setMessage({ text: '', type: '' });
    setShowPassword(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const passwordStrength = () => {
    if (!formData.password) return 0;
    
    let strength = 0;
    if (formData.password.length >= 6) strength += 20;
    if (/[A-Z]/.test(formData.password)) strength += 20;
    if (/[a-z]/.test(formData.password)) strength += 20;
    if (/\d/.test(formData.password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 20;
    
    return Math.min(strength, 100);
  };

  const getStrengthColor = (strength) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength) => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Moderate';
    return 'Strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/users/all')}
              className="group p-2 glass-card rounded-xl border border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="text-gray-600 group-hover:text-gray-800" size={24} />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                <UserPlus className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Create New User
                </h1>
                <p className="text-gray-600 mt-2">Add a new user to the system</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-200/50">
            <Sparkles size={16} className="text-indigo-500" />
            <span className="text-sm text-indigo-600">New User Setup</span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 glass-card rounded-xl p-4 border ${
          message.type === 'success' ? 'border-green-200/50 bg-green-500/10' :
          message.type === 'error' ? 'border-red-200/50 bg-red-500/10' :
          'border-amber-200/50 bg-amber-500/10'
        } backdrop-blur-sm animate-fadeIn`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <AlertCircle className={
                message.type === 'error' ? 'text-red-500' : 'text-amber-500'
              } size={20} />
            )}
            <p className={
              message.type === 'success' ? 'text-green-600' :
              message.type === 'error' ? 'text-red-600' :
              'text-amber-600'
            }>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="glass-card rounded-2xl border border-white/30 shadow-xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <User className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">User Information</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Personal Info */}
            <div className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <Mail size={16} />
                    Email Address *
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-300"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    Full Name *
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-300"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Security Info */}
            <div className="space-y-6">
              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <Lock size={16} />
                    Password *
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="glass-card w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-300"
                    placeholder="Minimum 6 characters"
                    minLength="6"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="text-gray-400 hover:text-gray-600" size={18} />
                    ) : (
                      <Eye className="text-gray-400 hover:text-gray-600" size={18} />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength() < 40 ? 'text-red-600' :
                        passwordStrength() < 80 ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {getStrengthText(passwordStrength())}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getStrengthColor(passwordStrength())}`}
                        style={{ width: `${passwordStrength()}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Role Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                    <Shield size={16} />
                    Role *
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="text-gray-400" size={18} />
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="glass-card w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-300 appearance-none cursor-pointer"
                    required
                  >
                    <option value="USER" className="bg-white">User</option>
                    <option value="ADMIN" className="bg-white">Admin</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="w-2 h-2 border-b-2 border-r-2 border-gray-400 transform rotate-45"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'ADMIN' 
                    ? 'Admins have full system access'
                    : 'Users have limited access based on permissions'}
                </p>
              </div>
            </div>
          </div>

          {/* Information Note */}
          <div className="mt-8 glass-card rounded-xl p-4 border border-blue-200/50 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-500 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-blue-600">Note about permissions</p>
                <p className="text-sm text-blue-500 mt-1">
                  Permissions and location assignments can be added later by editing the user profile.
                  You'll be able to customize access levels after user creation.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200/50">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{formData.name || 'New user'}</span>
              {formData.email && ` • ${formData.email}`}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="group flex items-center justify-center gap-2 px-6 py-3 glass-card border border-gray-300 text-gray-700 font-medium rounded-xl transition-all duration-300 hover:bg-white/30 hover:scale-[1.02] disabled:opacity-50"
              >
                <X size={18} />
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating User...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Create User
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="glass-card rounded-2xl p-6 mt-8 border border-white/30 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="text-indigo-500" size={20} />
          Quick Tips for User Creation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 glass-card rounded-xl border border-white/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Mail className="text-green-500" size={16} />
              </div>
              <h4 className="font-medium text-gray-700">Email</h4>
            </div>
            <p className="text-sm text-gray-600">Use a valid email that the user can access for notifications.</p>
          </div>
          
          <div className="p-4 glass-card rounded-xl border border-white/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Lock className="text-blue-500" size={16} />
              </div>
              <h4 className="font-medium text-gray-700">Password Security</h4>
            </div>
            <p className="text-sm text-gray-600">Strong passwords combine uppercase, lowercase, numbers & symbols.</p>
          </div>
          
          <div className="p-4 glass-card rounded-xl border border-white/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Shield className="text-purple-500" size={16} />
              </div>
              <h4 className="font-medium text-gray-700">Role Assignment</h4>
            </div>
            <p className="text-sm text-gray-600">Start with USER role for new team members. Upgrade to ADMIN as needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;