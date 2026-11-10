import { v2 as cloudinary } from "cloudinary";
import { appConfig } from "../config.js";

cloudinary.config({
  cloud_name: appConfig.cloudinary.cloudName,
  api_key: appConfig.cloudinary.apiKey,
  api_secret: appConfig.cloudinary.apiSecret,
});

export const assertCloudinaryConfigured = () => {
  if (!appConfig.cloudinary.cloudName || !appConfig.cloudinary.apiKey || !appConfig.cloudinary.apiSecret) {
    const error = new Error("File uploads are not configured");
    error.statusCode = 503;
    throw error;
  }
};

export default cloudinary;
