import { authCookieOptions, generateToken } from "../lib/utils.js";
import { createUser, findUserByEmail, updateUserProfilePicture } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary, { assertCloudinaryConfigured } from "../lib/cloudinary.js";
import { validateDataUrl } from "../lib/uploads.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dummyHash = "$2b$10$4x8VB0aQPQEz/L7GMXGWv.DcLr2yG6Q9fMCMn6Z9EoxvTqpJpw0am";

export const signup = async (req, res, next) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const fullName = String(req.body.fullName || "").trim();
  const password = String(req.body.password || "");

  if (!emailPattern.test(email) || email.length > 254) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  if (fullName.length < 2 || fullName.length > 80) {
    return res.status(400).json({ message: "Full name must be between 2 and 80 characters" });
  }
  if (Buffer.byteLength(password) < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: "Password must be between 8 and 72 bytes" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, fullName, passwordHash });
    generateToken(user._id, res);
    return res.status(201).json(user);
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "An account with that email already exists" });
    return next(error);
  }
};

export const login = async (req, res, next) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  try {
    const user = await findUserByEmail(email);
    const isPasswordCorrect = await bcrypt.compare(password, user?.passwordHash || dummyHash);
    if (!user || !isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const { passwordHash: _passwordHash, ...publicUser } = user;
    generateToken(user._id, res);
    return res.status(200).json(publicUser);
  } catch (error) {
    return next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    ...authCookieOptions,
    maxAge: undefined,
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res, next) => {
  let uploadedResponse;
  try {
    assertCloudinaryConfigured();
    const image = validateDataUrl(
      req.body.profilePic,
      ["image/jpeg", "image/png", "image/webp", "image/gif"],
      5 * 1024 * 1024,
    );
    uploadedResponse = await cloudinary.uploader.upload(image.dataUrl, {
      folder: "chat_profiles",
      quality: "auto",
      resource_type: "image",
    });
    const updatedUser = await updateUserProfilePicture(req.user._id, uploadedResponse.secure_url);
    return res.status(200).json(updatedUser);
  } catch (error) {
    if (uploadedResponse?.public_id) await cloudinary.uploader.destroy(uploadedResponse.public_id).catch(() => {});
    if (error.message.startsWith("Attachment") || error.message.startsWith("Unsupported")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

export const checkAuth = (req, res) => res.status(200).json(req.user);
