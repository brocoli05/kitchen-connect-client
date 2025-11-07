// utils/api.js

import axios from "axios";

// Use a relative path to point to the Next.js API routes on the same server.
const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header using the same localStorage key the app uses elsewhere (`userToken`).
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Support both 'userToken' (app) and fallback to 'token' if present.
      const token = localStorage.getItem("userToken") || localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response handler: if token is expired/invalid, clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      // Remove stored auth and redirect to login so user can re-authenticate.
      try {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userInfo");
      } catch (e) {
        // ignore
      }
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
