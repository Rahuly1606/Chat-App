const imageSignatures = {
  "image/gif": (buffer) => buffer.subarray(0, 4).toString("ascii") === "GIF8",
  "image/jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

const fileSignatures = {
  "application/msword": (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
  "application/pdf": (buffer) => buffer.subarray(0, 4).toString("ascii") === "%PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (buffer) => buffer.subarray(0, 2).toString("ascii") === "PK",
  "text/plain": (buffer) => !buffer.includes(0),
};

export const validateDataUrl = (value, allowedTypes, maxBytes) => {
  if (typeof value !== "string") throw new Error("Invalid attachment data");

  const match = value.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=\r\n]+)$/);
  if (!match || !allowedTypes.includes(match[1])) throw new Error("Unsupported attachment type");

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > maxBytes) throw new Error("Attachment is too large");

  const signatureCheck = imageSignatures[match[1]] || fileSignatures[match[1]];
  if (!signatureCheck?.(buffer)) throw new Error("Attachment content does not match its type");

  return { dataUrl: value, mimeType: match[1] };
};

export const sanitizeFileName = (value) => {
  const name = String(value || "").trim().replace(/[\\/\0-\x1f\x7f]/g, "_");
  if (!name || name.length > 120) throw new Error("Invalid file name");
  return name;
};
