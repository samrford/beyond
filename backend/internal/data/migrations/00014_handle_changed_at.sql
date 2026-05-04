-- +goose Up
ALTER TABLE user_profiles ADD COLUMN handle_changed_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE user_profiles DROP COLUMN handle_changed_at;
