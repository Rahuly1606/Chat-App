import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";

export const authCookieOptions = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: appConfig.isProduction ? "none" : "lax",
  secure: appConfig.isProduction,
};

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, appConfig.jwtSecret, {
    algorithm: "HS256",
    audience: appConfig.jwtAudience,
    expiresIn: "7d",
    issuer: appConfig.jwtIssuer,
  });
  res.cookie("token", token, authCookieOptions);
  return token;
};

export const verifyToken = (token) => jwt.verify(token, appConfig.jwtSecret, {
  algorithms: ["HS256"],
  audience: appConfig.jwtAudience,
  issuer: appConfig.jwtIssuer,
});

