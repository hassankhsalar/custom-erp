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
      const userEmail = localStorage.getItem('userEmail');
      const token = localStorage.getItem('token');

      if (!userEmail || !token) {
        setError('No user email or token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_ROUTES.USERS}/email/${userEmail}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentUser(response.data);
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