import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

// Auth state management
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    
    default:
      return state;
  }
};

// Auth service for API calls
class AuthService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async register(userData) {
    return await this.request('/api/auth/register', {
      method: 'POST',
      body: userData
    });
  }

  async login(email, password) {
    return await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      // Even if logout fails on backend, clear frontend state
      console.warn('Logout request failed:', error.message);
    }
  }

  async refreshToken() {
    return await this.request('/api/auth/refresh', {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return await this.request('/api/auth/me');
  }

  async forgotPassword(email) {
    return await this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
  }

  async resetPassword(token, password) {
    return await this.request('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password }
    });
  }

  async verifyEmail(token) {
    return await this.request('/api/auth/verify-email', {
      method: 'POST',
      body: { token }
    });
  }

  async resendVerification(email) {
    return await this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: { email }
    });
  }

  async changePassword(currentPassword, newPassword) {
    return await this.request('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }

  // Helper to add auth token to requests
  authenticatedRequest(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    return this.request(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });
  }
}

const authService = new AuthService();

// Token management utilities
const TokenManager = {
  get() {
    return localStorage.getItem('accessToken');
  },

  set(token) {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  },

  clear() {
    localStorage.removeItem('accessToken');
  },

  isExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const token = TokenManager.get();
    
    if (!token || TokenManager.isExpired(token)) {
      // Try to refresh token
      try {
        const response = await authService.refreshToken();
        TokenManager.set(response.data.accessToken);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            accessToken: response.data.accessToken
          }
        });
      } catch (error) {
        TokenManager.clear();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      // Token exists and is valid, get current user
      try {
        const response = await authService.authenticatedRequest('/api/auth/me');
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            accessToken: token
          }
        });
      } catch (error) {
        TokenManager.clear();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(email, password);
      TokenManager.set(response.data.accessToken);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          accessToken: response.data.accessToken
        }
      });
      return response;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.register(userData);
      dispatch({ type: 'SET_LOADING', payload: false });
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authService.logout();
    } finally {
      TokenManager.clear();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authService.forgotPassword(email);
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await authService.resetPassword(token, password);
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await authService.verifyEmail(token);
      // If user is logged in, update their verification status
      if (state.user) {
        dispatch({
          type: 'UPDATE_USER',
          payload: { ...state.user, emailVerified: true }
        });
      }
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await authService.resendVerification(email);
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Auto refresh token when it's about to expire
  useEffect(() => {
    let refreshTimer;
    
    if (state.isAuthenticated && state.accessToken) {
      const token = state.accessToken;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const timeUntilExpiry = expiresAt - Date.now();
        const refreshTime = timeUntilExpiry - 60000; // Refresh 1 minute before expiry

        if (refreshTime > 0) {
          refreshTimer = setTimeout(async () => {
            try {
              const response = await authService.refreshToken();
              TokenManager.set(response.data.accessToken);
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: response.data.user,
                  accessToken: response.data.accessToken
                }
              });
            } catch (error) {
              console.error('Token refresh failed:', error);
              logout();
            }
          }, refreshTime);
        }
      } catch (error) {
        console.error('Invalid token format:', error);
      }
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [state.accessToken, state.isAuthenticated]);

  const value = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    changePassword,
    clearError,
    authService
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}