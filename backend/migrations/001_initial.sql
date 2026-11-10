CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 80),
  password_hash text NOT NULL,
  profile_pic text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text,
  image_url text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_distinct_users CHECK (sender_id <> receiver_id),
  CONSTRAINT messages_have_content CHECK (
    nullif(btrim(text), '') IS NOT NULL OR image_url IS NOT NULL OR file_url IS NOT NULL
  ),
  CONSTRAINT messages_text_length CHECK (text IS NULL OR length(text) <= 4000),
  CONSTRAINT messages_file_complete CHECK (
    (file_url IS NULL AND file_name IS NULL AND file_type IS NULL)
    OR (file_url IS NOT NULL AND file_name IS NOT NULL AND file_type IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_idx
  ON messages (sender_id, receiver_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_idx
  ON messages (receiver_id, sender_id, created_at DESC, id DESC);
