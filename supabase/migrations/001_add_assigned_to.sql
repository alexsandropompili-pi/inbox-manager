-- Add assigned_to column to messages table
-- Run this in the Supabase SQL editor or via the CLI before deploying the assignment feature.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL;
