import { type ReactNode, useEffect, useState } from "react";

import { AuthContext, type AuthContextType, type User } from "./auth-context";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (check localStorage for token)
    const checkAuth = async () => {
      const token = localStorage.getItem("auth-token");
      const storedUser = localStorage.getItem("auth-user");
      
      if (token && storedUser) {
        try {
          // TODO: Verify token with backend
          setUser(JSON.parse(storedUser));
        } catch (error) {
          // Invalid token or user data
          localStorage.removeItem("auth-token");
          localStorage.removeItem("auth-user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.message || 'Login failed') };
      }

      const data = await response.json();
      
      // Store token and user data
      localStorage.setItem("auth-token", data.token);
      localStorage.setItem("auth-user", JSON.stringify(data.user));
      setUser(data.user);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          full_name: metadata?.full_name 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.message || 'Registration failed') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.message || 'Password reset failed') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const token = localStorage.getItem("auth-token");
      
      const response = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.message || 'Password update failed') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
