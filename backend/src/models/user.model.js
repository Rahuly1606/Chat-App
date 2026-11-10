import { pool } from "../lib/db.js";

const publicUserColumns = `
  id AS "_id",
  full_name AS "fullName",
  email,
  profile_pic AS "profilePic",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const createUser = async ({ email, fullName, passwordHash }) => {
  const result = await pool.query(
    `INSERT INTO users (email, full_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${publicUserColumns}`,
    [email, fullName, passwordHash],
  );
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT ${publicUserColumns}, password_hash AS "passwordHash"
     FROM users
     WHERE email = $1`,
    [email],
  );
  return result.rows[0] || null;
};

export const findPublicUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${publicUserColumns} FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
};

export const listOtherUsers = async (userId, limit = 100) => {
  const result = await pool.query(
    `SELECT ${publicUserColumns}
     FROM users
     WHERE id <> $1
     ORDER BY full_name ASC, id ASC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
};

export const updateUserProfilePicture = async (id, profilePic) => {
  const result = await pool.query(
    `UPDATE users
     SET profile_pic = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING ${publicUserColumns}`,
    [id, profilePic],
  );
  return result.rows[0] || null;
};
