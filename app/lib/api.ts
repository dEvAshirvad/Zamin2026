import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3001';

/** Cookie-authenticated API client for better-auth + Express. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: { message?: string } }>) => {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(
      Object.assign(error, {
        friendlyMessage: message,
      }),
    );
  },
);

export type ApiError = AxiosError & { friendlyMessage?: string };

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.get<T>(url, config);
  return data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) {
  const { data } = await api.post<T>(url, body, config);
  return data;
}

export default api;
