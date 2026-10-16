-- Migration 001: Add sessions table and allow nullable NIM for user registration
-- Database: teman_jawara

-- 1. Create sessions table for secure server-side session management
CREATE TABLE IF NOT EXISTS sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    session_token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires_at (expires_at)
);

-- 2. Allow nullable nim in profiles table so registration can succeed prior to profile completion
ALTER TABLE profiles MODIFY COLUMN nim VARCHAR(30) NULL DEFAULT NULL;
