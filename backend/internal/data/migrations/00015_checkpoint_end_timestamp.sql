-- +goose Up
ALTER TABLE checkpoints ADD COLUMN end_timestamp TIMESTAMP;

-- +goose Down
ALTER TABLE checkpoints DROP COLUMN end_timestamp;
