-- Structured recurring class schedule + per-session student roster (who will join)

ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_weekdays VARCHAR;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS schedule_time VARCHAR;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER DEFAULT 60;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS default_meeting_link VARCHAR;

ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS session_kind VARCHAR DEFAULT 'regular';

CREATE TABLE IF NOT EXISTS session_students (
    id SERIAL PRIMARY KEY,
    class_session_id INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id),
    expected_to_join BOOLEAN DEFAULT TRUE NOT NULL,
    UNIQUE(class_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS ix_session_students_class_session_id ON session_students(class_session_id);
