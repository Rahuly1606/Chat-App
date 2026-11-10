import express from 'express';
import { signup,login, logout,updateProfile, checkAuth  } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { rateLimit } from "express-rate-limit";

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout",logout);

router.put("/update-profile",protectRoute,updateProfile);
router.get("/check",protectRoute,checkAuth);

export default router;
