"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { UserDto, LoginRequest, LoginResponse, PlayerCategory } from "@/lib/types";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<UserDto>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = sessionStorage.getItem("bh_token");
        if (storedToken) {
          setToken(storedToken);
          // Set authorization header globally
          api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
          
          // Fetch full user profile
          const response = await api.get<any>("/auth/me");
          const userData = response.data;
          
          setUser({
            id: userData.id || "",
            fullName: userData.fullName,
            userName: userData.userName || userData.mobileNumber,
            phoneNumber: userData.mobileNumber,
            role: userData.role,
            status: userData.status,
            category: userData.category as PlayerCategory,
            walletBalance: userData.walletBalance,
            profilePictureUrl: userData.profilePictureUrl,
            createdDate: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        sessionStorage.removeItem("bh_token");
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await api.post<any>("/auth/login", data);
    const { token: newToken, ...userData } = response.data;
    
    // Construct the UserDto from the flattened response
    const newUser: UserDto = {
      id: userData.id || "",
      fullName: userData.fullName,
      userName: userData.userName || userData.mobileNumber,
      phoneNumber: userData.mobileNumber,
      role: userData.role,
      status: userData.status,
      category: userData.category as PlayerCategory,
      walletBalance: userData.walletBalance,
      profilePictureUrl: userData.profilePictureUrl || userData.ProfilePictureUrl,
      createdDate: new Date().toISOString()
    };

    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem("bh_token", newToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("bh_token");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user || user.role !== 'Player') return;
    try {
      const response = await api.get<UserDto>(`/players/${user.id}`);
      setUser(response.data);
      sessionStorage.setItem("bh_user", JSON.stringify(response.data));
    } catch {
      // Silently fail — user data will be stale but functional
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
