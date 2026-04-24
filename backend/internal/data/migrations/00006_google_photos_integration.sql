-- +goose Up
CREATE TABLE google_oauth_tokens (
    user_id       VARCHAR(255) PRIMARY KEY,
    refresh_token BYTEA NOT NULL,
    access_token  BYTEA,
    expires_at    TIMESTAMPTZ,
    scopes        TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE google_photo_imports (
    id              VARCHAR(50) PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    session_id      TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_items     INT NOT NULL DEFAULT 0,
    completed_items INT NOT NULL DEFAULT 0,
    failed_items    INT NOT NULL DEFAULT 0,
    image_urls      JSONB NOT NULL DEFAULT '[]',
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_google_photo_imports_user_status ON google_photo_imports(user_id, status);
CREATE INDEX idx_google_photo_imports_pending ON google_photo_imports(status, created_at) WHERE status = 'pending';

-- +goose Down
DROP TABLE IF EXISTS google_photo_imports;
DROP TABLE IF EXISTS google_oauth_tokens;
