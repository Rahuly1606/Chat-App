import { pool } from "../lib/db.js";

const messageColumns = `
  id AS "_id",
  sender_id AS "senderId",
  receiver_id AS "receiverId",
  text,
  image_url AS image,
  CASE
    WHEN file_url IS NULL THEN NULL
    ELSE json_build_object('url', file_url, 'name', file_name, 'type', file_type)
  END AS file,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const createMessage = async ({ senderId, receiverId, text, image, file }) => {
  const result = await pool.query(
    `INSERT INTO messages (
       sender_id, receiver_id, text, image_url, file_url, file_name, file_type
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${messageColumns}`,
    [
      senderId,
      receiverId,
      text || null,
      image || null,
      file?.url || null,
      file?.name || null,
      file?.type || null,
    ],
  );
  return result.rows[0];
};

export const findConversation = async (firstUserId, secondUserId, limit = 100) => {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT ${messageColumns}
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at DESC, id DESC
       LIMIT $3
     ) AS recent_messages
     ORDER BY "createdAt" ASC, "_id" ASC`,
    [firstUserId, secondUserId, limit],
  );
  return result.rows;
};
