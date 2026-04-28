-- +goose Up
ALTER TABLE trips ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX trips_user_public_idx ON trips (user_id) WHERE is_public;
CREATE INDEX plans_user_public_idx ON plans (user_id) WHERE is_public;

-- +goose Down
DROP INDEX IF EXISTS plans_user_public_idx;
DROP INDEX IF EXISTS trips_user_public_idx;
ALTER TABLE plans DROP COLUMN is_public;
ALTER TABLE trips DROP COLUMN is_public;
