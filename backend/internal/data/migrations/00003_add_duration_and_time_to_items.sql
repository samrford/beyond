-- +goose Up
ALTER TABLE plan_items ADD COLUMN duration INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plan_items ADD COLUMN start_time TIME;

-- +goose Down
ALTER TABLE plan_items DROP COLUMN start_time;
ALTER TABLE plan_items DROP COLUMN duration;
