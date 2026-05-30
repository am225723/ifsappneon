ALTER TABLE ifs_clients
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT NULL;
