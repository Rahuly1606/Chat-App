import { createMessage, findConversation } from "../models/message.model.js";
import { findPublicUserById, listOtherUsers } from "../models/user.model.js";
import cloudinary, { assertCloudinaryConfigured } from "../lib/cloudinary.js";
import { sanitizeFileName, validateDataUrl } from "../lib/uploads.js";
import { io } from "../lib/socket.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const fileTypes = [
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export const getUserForSidebar = async (req, res) => {
  const users = await listOtherUsers(req.user._id);
  return res.status(200).json(users);
};

export const getMessages = async (req, res) => {
  const userToChatId = req.params.id;
  if (!uuidPattern.test(userToChatId) || userToChatId === req.user._id) {
    return res.status(400).json({ message: "Invalid chat user" });
  }
  if (!await findPublicUserById(userToChatId)) return res.status(404).json({ message: "User not found" });

  const messages = await findConversation(req.user._id, userToChatId);
  return res.status(200).json(messages);
};

export const sendMessage = async (req, res, next) => {
  const receiverId = req.params.id;
  const senderId = req.user._id;
  const text = String(req.body.text || "").trim();
  const uploadedAssets = [];

  if (!uuidPattern.test(receiverId) || receiverId === senderId) {
    return res.status(400).json({ message: "Invalid message recipient" });
  }
  if (text.length > 4_000) return res.status(400).json({ message: "Message text is too long" });
  if (!text && !req.body.image && !req.body.file?.data) {
    return res.status(400).json({ message: "A message must include text or an attachment" });
  }
  if (!await findPublicUserById(receiverId)) return res.status(404).json({ message: "Recipient not found" });

  try {
    let imageUrl = null;
    let fileData = null;

    if (req.body.image) {
      assertCloudinaryConfigured();
      const image = validateDataUrl(req.body.image, imageTypes, 5 * 1024 * 1024);
      const uploadedImage = await cloudinary.uploader.upload(image.dataUrl, {
        folder: "chat_images",
        quality: "auto",
        resource_type: "image",
      });
      uploadedAssets.push(uploadedImage);
      imageUrl = uploadedImage.secure_url;
    }

    if (req.body.file?.data) {
      assertCloudinaryConfigured();
      const file = validateDataUrl(req.body.file.data, fileTypes, 5 * 1024 * 1024);
      const uploadedFile = await cloudinary.uploader.upload(file.dataUrl, {
        folder: "chat_files",
        resource_type: "raw",
        use_filename: false,
      });
      uploadedAssets.push(uploadedFile);
      fileData = {
        name: sanitizeFileName(req.body.file.name),
        type: file.mimeType,
        url: uploadedFile.secure_url,
      };
    }

    const message = await createMessage({ senderId, receiverId, text, image: imageUrl, file: fileData });
    io.to([`user:${senderId}`, `user:${receiverId}`]).emit("newMessage", message);
    return res.status(201).json(message);
  } catch (error) {
    await Promise.all(uploadedAssets.map((asset) => (
      cloudinary.uploader.destroy(asset.public_id, { resource_type: asset.resource_type }).catch(() => {})
    )));
    if (error.message.startsWith("Attachment") || error.message.startsWith("Unsupported") || error.message === "Invalid file name") {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};
