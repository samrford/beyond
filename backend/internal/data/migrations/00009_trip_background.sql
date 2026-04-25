-- +goose Up
ALTER TABLE trips
    ADD COLUMN bg_mode VARCHAR(20) NOT NULL DEFAULT 'default',
    ADD COLUMN bg_blur INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN bg_opacity INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN bg_darkness INTEGER NOT NULL DEFAULT 10;

-- +goose Down
ALTER TABLE trips
    DROP COLUMN bg_mode,
    DROP COLUMN bg_blur,
    DROP COLUMN bg_opacity,
    DROP COLUMN bg_darkness;
