-- Add Logistics Token fields to the messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS token_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notion_1   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notion_2   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notion_3   TEXT DEFAULT NULL;

-- Ensure token codes are globally unique (NULL values are excluded from uniqueness check)
CREATE UNIQUE INDEX IF NOT EXISTS messages_token_code_unique
  ON messages(token_code) WHERE token_code IS NOT NULL;
