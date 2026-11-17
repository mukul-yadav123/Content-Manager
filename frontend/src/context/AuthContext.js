'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAuthToken, clearAuthToken, getAuthToken } from '@/services/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and verify authentication state on mount
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Clear token if unauthorized
      if (err.statusCode === 401 || err.statusCode === 403) {
        clearAuthToken();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Handle user login
  const login = async (credentials) => {
    setError(null);
    try {
      const response = await authApi.login(credentials);
      const { user: userData, token } = response.data;
      if (token) {
        setAuthToken(token);
      }
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    }
  };

  // Handle user registration
  const register = async (userDataPayload) => {
    setError(null);
    try {
      const response = await authApi.register(userDataPayload);
      const { user: userData, token } = response.data;
      if (token) {
        setAuthToken(token);
      }
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.message || 'Registration failed.';
      setError(message);
      throw err;
    }
  };

  // Handle user logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout warning:', err.message);
    } finally {
      clearAuthToken();
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

