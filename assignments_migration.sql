-- Migration: Add Assignment Engine
-- Run this once against your PostgreSQL database

-- 1. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id          SERIAL PRIMARY KEY,
    coach_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(256) NOT NULL,
    description TEXT,
    batch_id    INTEGER REFERENCES batches(id) ON DELETE SET NULL,   -- NULL = individual student
    student_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,     -- NULL = whole batch
    due_date    TIMESTAMP WITH TIME ZONE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- At least one of batch_id or student_id must be set (enforced in app layer)
    CONSTRAINT chk_assignment_target CHECK (
        batch_id IS NOT NULL OR student_id IS NOT NULL
    )
);

-- 2. Junction table: which puzzles belong to an assignment (ordered)
CREATE TABLE IF NOT EXISTS assignment_puzzles (
    id              SERIAL PRIMARY KEY,
    assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    puzzle_id       INTEGER NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL DEFAULT 0,   -- display / completion order
    UNIQUE (assignment_id, puzzle_id)
);

-- 3. Completion tracking: one row per student per puzzle per assignment
CREATE TABLE IF NOT EXISTS assignment_completions (
    id              SERIAL PRIMARY KEY,
    assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle_id       INTEGER NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    completed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (assignment_id, student_id, puzzle_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_assignments_coach     ON assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_assignments_batch     ON assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student   ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_asgn_puzzles_asgn     ON assignment_puzzles(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asgn_completions_asgn ON assignment_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asgn_completions_stu  ON assignment_completions(student_id);
