import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithOTP: (phone: string, otp?: string) => Promise<void>;
  demoLogin: (role: 'owner' | 'marshal' | 'admin') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('parkmumbai_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (token) {
        const res = await api.get<User>('/auth/me');
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('parkmumbai_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const loginWithOTP = async (phone: string, otp: string = '123456') => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', {
      phone,
      otp,
    });
    localStorage.setItem('parkmumbai_token', res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
  };

  const demoLogin = async (targetRole: 'owner' | 'marshal' | 'admin') => {
    const res = await api.post<{ access_token: string; user: User }>(`/auth/demo-login/${targetRole}`);
    localStorage.setItem('parkmumbai_token', res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('parkmumbai_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!user,
        isLoading,
        loginWithOTP,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
