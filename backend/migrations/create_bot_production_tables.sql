-- Production bot platform tables

CREATE TABLE IF NOT EXISTS bot_profiles (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    target_rating INTEGER NOT NULL DEFAULT 1200,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_profile_versions (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES bot_profiles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_profile_versions_profile_id ON bot_profile_versions(profile_id);

CREATE TABLE IF NOT EXISTS bot_profile_rollouts (
    id SERIAL PRIMARY KEY,
    profile_version_id INTEGER NOT NULL REFERENCES bot_profile_versions(id) ON DELETE CASCADE,
    traffic_percent INTEGER NOT NULL DEFAULT 100,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    note VARCHAR(512) NULL,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_profile_rollouts_profile_version_id ON bot_profile_rollouts(profile_version_id);

CREATE TABLE IF NOT EXISTS bot_calibration_runs (
    id SERIAL PRIMARY KEY,
    profile_version_id INTEGER NULL REFERENCES bot_profile_versions(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    run_type VARCHAR(32) NOT NULL DEFAULT 'simulation',
    estimated_rating INTEGER NULL,
    confidence_low INTEGER NULL,
    confidence_high INTEGER NULL,
    acceptance_passed BOOLEAN NULL,
    summary_json TEXT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_calibration_runs_profile_version_id ON bot_calibration_runs(profile_version_id);

CREATE TABLE IF NOT EXISTS bot_move_jobs (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    requested_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 100,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message VARCHAR(512) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_move_jobs_status_priority ON bot_move_jobs(status, priority, created_at);

CREATE TABLE IF NOT EXISTS bot_move_telemetry (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL DEFAULT 0,
    bot_id VARCHAR(64) NOT NULL,
    profile_version_id INTEGER NULL REFERENCES bot_profile_versions(id) ON DELETE SET NULL,
    target_rating INTEGER NULL,
    selected_move_uci VARCHAR(16) NULL,
    selected_rank INTEGER NULL,
    eval_cp INTEGER NULL,
    eval_loss_cp INTEGER NULL,
    clock_ms_before INTEGER NULL,
    clock_ms_after INTEGER NULL,
    policy_name VARCHAR(64) NULL,
    decision_meta_json TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_move_telemetry_bot_id_created_at ON bot_move_telemetry(bot_id, created_at);
