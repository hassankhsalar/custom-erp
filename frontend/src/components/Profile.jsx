import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setBio(res.data.profile?.bio || '');
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await axios.put('http://localhost:3001/api/profile', { bio }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Show success message
  };

  if (!profile) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-600">Email</label>
            <p className="w-full px-4 py-2 mt-2 border rounded-md bg-gray-50">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600">Name</label>
            <p className="w-full px-4 py-2 mt-2 border rounded-md bg-gray-50">{profile.name}</p>
          </div>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-600">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              ></textarea>
            </div>
            <div>
              <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Update Bio
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;