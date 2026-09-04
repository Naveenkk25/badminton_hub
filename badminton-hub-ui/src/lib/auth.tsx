"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, {
  getStoredToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredAuth,
  refreshAccessToken,
  isTokenExpired,
} from "@/lib/api";
import { UserDto, LoginRequest, PlayerCategory } from "@/lib/types";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<UserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous optimistic initialization from localStorage to prevent PWA flash/redirects
  const [user, setUser] = useState<UserDto | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("bh_user") || sessionStorage.getItem("bh_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredToken();
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If no token exists at all, we are not loading a session
    if (typeof window === "undefined") return true;
    return !!getStoredToken();
  });

  // Logout handler
  const logout = useCallback(async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        // Notify backend to invalidate refresh token in database
        await api.post("/auth/logout", { refreshToken }).catch(() => {});
      }
    } finally {
      setToken(null);
      setUser(null);
      clearStoredAuth();
    }
  }, []);

  // Restore and verify session on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        let currentToken = getStoredToken();
        if (!currentToken) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            setIsLoading(false);
          }
          return;
        }

        // Set global Authorization header and populate React state immediately
        api.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
        if (isMounted) {
          setToken(currentToken);
          try {
            const cached = localStorage.getItem("bh_user") || sessionStorage.getItem("bh_user");
            if (cached) {
              setUser(JSON.parse(cached));
            }
          } catch {}
        }

        // If access token is expired or close to expiring (< 2 minutes), refresh it first
        if (isTokenExpired(currentToken, 120)) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            currentToken = newToken;
            if (isMounted) setToken(newToken);
          } else if (!getStoredRefreshToken()) {
            // Refresh token is completely invalid/expired
            if (isMounted) {
              await logout();
              setIsLoading(false);
            }
            return;
          }
        }

        // Validate session with /auth/me
        try {
          const response = await api.get<any>("/auth/me");
          const userData = response.data;

          const restoredUser: UserDto = {
            id: userData.id || "",
            fullName: userData.fullName,
            userName: userData.userName || userData.mobileNumber,
            phoneNumber: userData.mobileNumber,
            role: userData.role,
            status: userData.status,
            category: userData.category as PlayerCategory,
            walletBalance: userData.walletBalance,
            profilePictureUrl: userData.profilePictureUrl,
            createdDate: new Date().toISOString(),
          };

          if (isMounted) {
            setUser(restoredUser);
            if (typeof window !== "undefined") {
              localStorage.setItem("bh_user", JSON.stringify(restoredUser));
            }
          }
        } catch (meError: any) {
          // If /auth/me failed with 401 or 403, attempt a refresh before giving up
          if (meError.response?.status === 401 || meError.response?.status === 403) {
            const refreshedToken = await refreshAccessToken();
            if (refreshedToken) {
              const retryResponse = await api.get<any>("/auth/me");
              const retryData = retryResponse.data;
              const refreshedUser: UserDto = {
                id: retryData.id || "",
                fullName: retryData.fullName,
                userName: retryData.userName || retryData.mobileNumber,
                phoneNumber: retryData.mobileNumber,
                role: retryData.role,
                status: retryData.status,
                category: retryData.category as PlayerCategory,
                walletBalance: retryData.walletBalance,
                profilePictureUrl: retryData.profilePictureUrl,
                createdDate: new Date().toISOString(),
              };
              if (isMounted) {
                setUser(refreshedUser);
                localStorage.setItem("bh_user", JSON.stringify(refreshedUser));
              }
            } else {
              // Both access token and refresh failed
              if (isMounted) await logout();
            }
          }
          // Note: On offline/network errors, keep the cached user to support resilient PWA experience
        }
      } catch (error) {
        console.error("Session restoration error:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Handle app lifecycle: when mobile PWA is minimized and reopened (visibilitychange / focus)
  useEffect(() => {
    const handleAppForeground = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const currentToken = getStoredToken();
        const refreshToken = getStoredRefreshToken();

        if (currentToken && refreshToken && isTokenExpired(currentToken, 300)) {
          // Access token is expiring within 5 minutes or already expired — rotate it
          await refreshAccessToken();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleAppForeground);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleAppForeground);
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleAppForeground);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleAppForeground);
      }
    };
  }, []);

  // Listen to custom auth events emitted by api interceptors
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    const handleRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("bh_auth_unauthorized", handleUnauthorized);
      window.addEventListener("bh_auth_refreshed", handleRefreshed);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("bh_auth_unauthorized", handleUnauthorized);
        window.removeEventListener("bh_auth_refreshed", handleRefreshed);
      }
    };
  }, [logout]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await api.post<any>("/auth/login", data);
    const { token: newToken, refreshToken: newRefreshToken, ...userData } = response.data;

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
      createdDate: new Date().toISOString(),
    };

    setToken(newToken);
    setUser(newUser);
    setStoredTokens(newToken, newRefreshToken);

    if (typeof window !== "undefined") {
      localStorage.setItem("bh_user", JSON.stringify(newUser));
      sessionStorage.setItem("bh_user", JSON.stringify(newUser));
    }

    api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    return newUser;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user || user.role !== "Player") return;
    try {
      const response = await api.get<UserDto>(`/players/${user.id}`);
      setUser(response.data);
      if (typeof window !== "undefined") {
        localStorage.setItem("bh_user", JSON.stringify(response.data));
        sessionStorage.setItem("bh_user", JSON.stringify(response.data));
      }
    } catch {
      // Silently fail — stale user data is retained
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
