import { Server } from "socket.io";
import http from "http";
import express from "express";
import { parseCookie } from "cookie";
import { appConfig } from "../config.js";
import { verifyToken } from "./utils.js";
import { findPublicUserById } from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: appConfig.allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const userSockets = new Map();

const emitOnlineUsers = () => {
  io.emit("getOnlineUsers", [...userSockets.keys()]);
};

io.use(async (socket, next) => {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie || "");
    if (!cookies.token) return next(new Error("Authentication required"));

    const decoded = verifyToken(cookies.token);
    const user = await findPublicUserById(decoded.userId);
    if (!user) return next(new Error("Authentication required"));

    socket.data.userId = user._id;
    return next();
  } catch {
    return next(new Error("Authentication required"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  const sockets = userSockets.get(userId) || new Set();
  sockets.add(socket.id);
  userSockets.set(userId, sockets);
  socket.join(`user:${userId}`);
  emitOnlineUsers();

  socket.on("disconnect", () => {
    const currentSockets = userSockets.get(userId);
    currentSockets?.delete(socket.id);
    if (currentSockets?.size === 0) userSockets.delete(userId);
    emitOnlineUsers();
  });
});

export { io, app, server };
