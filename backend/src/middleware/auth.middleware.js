import { findPublicUserById } from "../models/user.model.js";
import { verifyToken } from "../lib/utils.js";

export const protectRoute = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const user = await findPublicUserById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Authentication required" });

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      res.clearCookie("token");
      return res.status(401).json({ message: "Authentication required" });
    }
    return next(error);
  }
};
