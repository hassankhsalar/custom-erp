import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ROUTES } from '../config';

export const useCurrentUser = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username');
      const token = localStorage.getItem('token');

      if (!username || !token) {
        setError('No username or token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_ROUTES.USERS}/username/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setCurrentUser(data);
      if (data?.activeFeatures && typeof data.activeFeatures === 'object') {
        localStorage.setItem('active_features_cache_v1', JSON.stringify(data.activeFeatures));
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError(err.response?.data?.error || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchCurrentUser();
  };

  return { currentUser, loading, error, refetch };
};