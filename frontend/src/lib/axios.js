import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const apiOrigin = configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5001" : "");
export const socketUrl = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, "") || apiOrigin || window.location.origin;

export const axiosInstance = axios.create({
  baseURL: `${apiOrigin}/api`,
  withCredentials: true,
  timeout: 15_000,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  },
);
