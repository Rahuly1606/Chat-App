import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

let messagesRequestId = 0;
let messagesController;
let socketMessageHandler;

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.response?.data?.error || fallback
);

const mergeMessages = (messages) => [...new Map(messages.map((message) => [message._id, message])).values()]
  .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSending: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load users"));
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    messagesController?.abort();
    messagesController = new AbortController();
    const requestId = ++messagesRequestId;
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`, { signal: messagesController.signal });
      if (requestId === messagesRequestId && get().selectedUser?._id === userId) {
        set({ messages: mergeMessages([...res.data, ...get().messages]) });
      }
    } catch (error) {
      if (error.code !== "ERR_CANCELED") toast.error(getErrorMessage(error, "Could not load messages"));
    } finally {
      if (requestId === messagesRequestId) set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, isSending } = get();
    if (!selectedUser || isSending) return false;
    const conversationId = selectedUser._id;
    const loadingToast = toast.loading("Sending message...");
    set({ isSending: true });
    try {
      const res = await axiosInstance.post(`/messages/send/${conversationId}`, messageData);
      if (get().selectedUser?._id === conversationId) {
        set((state) => ({ messages: mergeMessages([...state.messages, res.data]) }));
      }
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send message"));
      return false;
    } finally {
      toast.dismiss(loadingToast);
      set({ isSending: false });
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket || socketMessageHandler) return;

    socketMessageHandler = (newMessage) => {
      const selectedUserId = get().selectedUser?._id;
      const authUserId = useAuthStore.getState().authUser?._id;
      const belongsToConversation = selectedUserId && (
        (newMessage.senderId === selectedUserId && newMessage.receiverId === authUserId)
        || (newMessage.senderId === authUserId && newMessage.receiverId === selectedUserId)
      );
      if (belongsToConversation) {
        set((state) => ({ messages: mergeMessages([...state.messages, newMessage]) }));
      }
    };
    socket.on("newMessage", socketMessageHandler);
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socketMessageHandler) socket.off("newMessage", socketMessageHandler);
    socketMessageHandler = null;
  },

  setSelectedUser: (selectedUser) => {
    messagesController?.abort();
    messagesRequestId += 1;
    set({ selectedUser, messages: [], isMessagesLoading: Boolean(selectedUser) });
  },
  reset: () => {
    messagesController?.abort();
    messagesRequestId += 1;
    set({
      isMessagesLoading: false,
      isSending: false,
      isUsersLoading: false,
      messages: [],
      selectedUser: null,
      users: [],
    });
  },
}));

window.addEventListener("chat:reset", () => useChatStore.getState().reset());
