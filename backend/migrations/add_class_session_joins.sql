-- In-app class join tracking + attendance source (auto vs coach manual)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source VARCHAR(20);

CREATE TABLE IF NOT EXISTS class_session_joins (
    id SERIAL PRIMARY KEY,
    class_session_id INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    join_source VARCHAR(20) NOT NULL DEFAULT 'in_app',
    CONSTRAINT uq_class_session_joins_session_student UNIQUE (class_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_session_joins_session ON class_session_joins (class_session_id);
CREATE INDEX IF NOT EXISTS idx_class_session_joins_student ON class_session_joins (student_id);
