import axios, { AxiosError } from "axios";

import { ApiResponse, AuthData } from "@/types";

/**
 * Centralised Axios instance. The base URL is provided at build time via
 * VITE_API_URL (defaults to the Vite dev proxy path "/api").
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "koda.access_token";
const REFRESH_KEY = "koda.refresh_token";

export function getStoredTokens(): { access: string | null; refresh: string | null } {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function storeTokens(auth: AuthData): void {
  localStorage.setItem(TOKEN_KEY, auth.access_token);
  localStorage.setItem(REFRESH_KEY, auth.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original.headers["_retry"]) {
      original.headers["_retry"] = "1";
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (refresh) {
        try {
          if (!refreshing) {
            refreshing = api
              .post<ApiResponse<{ access_token: string }>>("/auth/refresh", {
                refresh_token: refresh,
              })
              .then((res) => {
                const token = res.data.data?.access_token as string;
                localStorage.setItem(TOKEN_KEY, token);
                return token;
              })
              .finally(() => {
                refreshing = null;
              });
          }
          const token = await refreshing;
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        } catch {
          clearTokens();
          window.location.assign("/login");
          return Promise.reject(error);
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
