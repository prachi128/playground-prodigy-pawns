CREATE TABLE IF NOT EXISTS attendance (
    id              SERIAL PRIMARY KEY,
    class_session_id INTEGER NOT NULL 
                    REFERENCES class_sessions(id) 
                    ON DELETE CASCADE,
    student_id      INTEGER NOT NULL 
                    REFERENCES users(id) 
                    ON DELETE CASCADE,
    status          VARCHAR(10) NOT NULL 
                    DEFAULT 'absent'
                    CHECK (status IN ('present', 'absent')),
    marked_by       INTEGER NOT NULL 
                    REFERENCES users(id),
    marked_at       TIMESTAMP WITH TIME ZONE 
                    NOT NULL DEFAULT NOW(),
    notes           TEXT,
    UNIQUE (class_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session 
    ON attendance(class_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student 
    ON attendance(student_id);
