ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_timezone VARCHAR DEFAULT 'Asia/Kolkata';

UPDATE batches SET schedule_timezone = 'Asia/Kolkata' WHERE schedule_timezone IS NULL;
