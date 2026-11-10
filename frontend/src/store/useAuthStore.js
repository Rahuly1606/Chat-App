import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { socketUrl } from "../lib/axios.js";

let authCheckPromise;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    if (authCheckPromise) return authCheckPromise;
    authCheckPromise = (async () => {
      try {
        const res = await axiosInstance.get("/auth/check");
        set({ authUser: res.data });
        get().connectSocket();
      } catch {
        get().clearSession();
      } finally {
        set({ isCheckingAuth: false });
        authCheckPromise = null;
      }
    })();
    return authCheckPromise;
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Error creating account. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Error logging in. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      toast.success("Logged out successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Logged out locally, but the server could not be reached.";
      toast.error(errorMessage);
    } finally {
      get().clearSession();
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Error updating profile. Please try again.";
      toast.error(errorMessage);
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket) return;

    const socket = io(socketUrl, {
      withCredentials: true,
    });
    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
  clearSession: () => {
    get().disconnectSocket();
    set({ authUser: null });
    window.dispatchEvent(new Event("chat:reset"));
  },
}));

window.addEventListener("auth:unauthorized", () => useAuthStore.getState().clearSession());
