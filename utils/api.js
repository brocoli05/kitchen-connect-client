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

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        delete config.headers["x-auth-token"];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
