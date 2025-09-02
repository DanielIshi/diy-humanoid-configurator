import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

// Auth state management
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,
  sessionId: null,
  deviceTrust: null,
  sessions: [],
  csrfToken: null
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
        sessionId: action.payload.sessionId || null,
        deviceTrust: action.payload.deviceTrust || null,
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
    
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    
    case 'SET_CSRF_TOKEN':
      return { ...state, csrfToken: action.payload };
    
    case 'TERMINATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== action.payload)
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

  async login(email, password, rememberMe = false) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password, rememberMe }
    });
    
    // Store session ID for subsequent requests
    if (response.data?.sessionId) {
      sessionStorage.setItem('sessionId', response.data.sessionId);
    }
    
    return response;
  }

  async logout() {
    try {
      const sessionId = sessionStorage.getItem('sessionId');
      await this.request('/api/auth/logout', {
        method: 'POST',
        body: sessionId ? { sessionId } : {}
      });
    } catch (error) {
      // Even if logout fails on backend, clear frontend state
      console.warn('Logout request failed:', error.message);
    } finally {
      sessionStorage.removeItem('sessionId');
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
    const sessionId = sessionStorage.getItem('sessionId');
    return await this.request('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, sessionId },
      headers: {
        'X-CSRF-Token': this.getCsrfToken()
      }
    });
  }
  
  // Session management methods
  async getSessions() {
    return await this.authenticatedRequest('/api/auth/sessions');
  }
  
  async terminateSession(sessionId) {
    return await this.authenticatedRequest(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': this.getCsrfToken()
      }
    });
  }
  
  async terminateAllSessions() {
    return await this.authenticatedRequest('/api/auth/sessions/terminate-all', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': this.getCsrfToken()
      }
    });
  }
  
  async trustDevice(deviceName) {
    return await this.authenticatedRequest('/api/auth/trust-device', {
      method: 'POST',
      body: { deviceName },
      headers: {
        'X-CSRF-Token': this.getCsrfToken()
      }
    });
  }
  
  async fetchCsrfToken() {
    return await this.request('/api/auth/csrf-token');
  }

  // Helper to add auth token and session ID to requests
  authenticatedRequest(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    const sessionId = sessionStorage.getItem('sessionId');
    return this.request(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
        'X-Session-Id': sessionId || undefined
      }
    });
  }
  
  // Get CSRF token from global state
  getCsrfToken() {
    return window.__CSRF_TOKEN__ || null;
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

  const login = async (email, password, rememberMe = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(email, password, rememberMe);
      TokenManager.set(response.data.accessToken);
      
      // Store CSRF token globally for forms
      if (response.data.csrfToken) {
        window.__CSRF_TOKEN__ = response.data.csrfToken;
        dispatch({ type: 'SET_CSRF_TOKEN', payload: response.data.csrfToken });
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          accessToken: response.data.accessToken,
          sessionId: response.data.sessionId,
          deviceTrust: response.data.deviceTrust
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
      window.__CSRF_TOKEN__ = null;
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
      // Password change will terminate other sessions, so refresh current session
      await refreshSessions();
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };
  
  // Session management functions
  const refreshSessions = async () => {
    try {
      const response = await authService.getSessions();
      dispatch({ type: 'SET_SESSIONS', payload: response.data.sessions });
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };
  
  const terminateSession = async (sessionId) => {
    try {
      await authService.terminateSession(sessionId);
      dispatch({ type: 'TERMINATE_SESSION', payload: sessionId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };
  
  const terminateAllOtherSessions = async () => {
    try {
      const response = await authService.terminateAllSessions();
      await refreshSessions(); // Refresh to show only current session
      return response;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };
  
  const trustCurrentDevice = async (deviceName) => {
    try {
      const response = await authService.trustDevice(deviceName);
      // Update device trust status
      dispatch({
        type: 'UPDATE_USER',
        payload: { ...state.user, deviceTrusted: true }
      });
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

  // Initialize CSRF token on app load
  useEffect(() => {
    const initializeCsrf = async () => {
      try {
        const response = await authService.fetchCsrfToken();
        if (response.data?.csrfToken) {
          window.__CSRF_TOKEN__ = response.data.csrfToken;
          dispatch({ type: 'SET_CSRF_TOKEN', payload: response.data.csrfToken });
        }
      } catch (error) {
        console.warn('Failed to initialize CSRF token:', error.message);
      }
    };
    
    initializeCsrf();
  }, []);

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
    refreshSessions,
    terminateSession,
    terminateAllOtherSessions,
    trustCurrentDevice,
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