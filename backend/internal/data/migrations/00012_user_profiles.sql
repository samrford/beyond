-- +goose Up
CREATE TABLE user_profiles (
    user_id      TEXT PRIMARY KEY,
    handle       TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    bio          TEXT NOT NULL DEFAULT '',
    avatar_url   TEXT NOT NULL DEFAULT '',
    is_public    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_profiles_handle_lower_idx       ON user_profiles (LOWER(handle));
CREATE INDEX user_profiles_display_name_lower_idx ON user_profiles (LOWER(display_name));
CREATE INDEX user_profiles_public_idx             ON user_profiles (is_public) WHERE is_public;

-- +goose Down
DROP TABLE user_profiles;
