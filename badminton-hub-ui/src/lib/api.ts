import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Storage helpers — prefers localStorage for persistent PWA sessions with sessionStorage fallback
export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bh_token") || sessionStorage.getItem("bh_token");
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bh_refresh_token") || sessionStorage.getItem("bh_refresh_token");
};

export const setStoredTokens = (token: string, refreshToken?: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("bh_token", token);
  sessionStorage.setItem("bh_token", token);
  if (refreshToken) {
    localStorage.setItem("bh_refresh_token", refreshToken);
    sessionStorage.setItem("bh_refresh_token", refreshToken);
  }
};

export const clearStoredAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bh_token");
  localStorage.removeItem("bh_refresh_token");
  localStorage.removeItem("bh_user");
  sessionStorage.removeItem("bh_token");
  sessionStorage.removeItem("bh_refresh_token");
  sessionStorage.removeItem("bh_user");
  delete api.defaults.headers.common["Authorization"];
};

// Check if JWT access token is expired or close to expiring (within bufferSeconds)
export const isTokenExpired = (jwtToken: string, bufferSeconds = 60): boolean => {
  try {
    const parts = jwtToken.split(".");
    if (parts.length < 2) return true;
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;
    return payload.exp * 1000 - Date.now() < bufferSeconds * 1000;
  } catch {
    return true;
  }
};

// Request interceptor — inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Mutex promise queue for token refresh to avoid duplicate parallel refresh calls
let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      // Standalone axios call to avoid interceptor recursion
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;
      if (!newAccessToken) {
        throw new Error("No access token returned from refresh endpoint");
      }

      setStoredTokens(newAccessToken, newRefreshToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bh_auth_refreshed", { detail: { token: newAccessToken } })
        );
      }

      return newAccessToken;
    } catch (err: any) {
      // If refresh token is expired, revoked, or account is suspended/inactive (401 / 403)
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearStoredAuth();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("bh_auth_unauthorized"));
        }
      }
      // Note: For network/offline errors, we do NOT clear stored tokens to avoid logging out users on momentary connection drops
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Response interceptor — handle 401s by transparently refreshing the token and retrying
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and request has not already been retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || "";
      // Do not attempt refresh on auth endpoints (login, refresh)
      if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // If refresh failed and auth was cleared, navigate to login
      if (typeof window !== "undefined" && !getStoredRefreshToken()) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
