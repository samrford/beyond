-- +goose Up
-- Clear existing orphaned data (no user ownership)
DELETE FROM checkpoints;
DELETE FROM plan_items;
DELETE FROM plan_days;
DELETE FROM trips;
DELETE FROM plans;

-- Add user_id to trips and plans
ALTER TABLE trips ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE plans ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT '';

-- Index for fast user-scoped queries
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_plans_user_id ON plans(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_plans_user_id;
DROP INDEX IF EXISTS idx_trips_user_id;
ALTER TABLE plans DROP COLUMN user_id;
ALTER TABLE trips DROP COLUMN user_id;
