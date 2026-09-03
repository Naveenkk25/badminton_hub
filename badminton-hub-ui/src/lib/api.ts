import axios from "axios";
import { API_BASE_URL } from "./constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor — inject JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("bh_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("bh_token");
        sessionStorage.removeItem("bh_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
