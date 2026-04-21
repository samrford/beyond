-- +goose Up
ALTER TABLE checkpoints ADD COLUMN hero_photo VARCHAR(255);

-- +goose Down
ALTER TABLE checkpoints DROP COLUMN hero_photo;
