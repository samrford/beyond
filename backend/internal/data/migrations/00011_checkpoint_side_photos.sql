-- +goose Up
ALTER TABLE checkpoints ADD COLUMN side_photo_1 VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE checkpoints ADD COLUMN side_photo_2 VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE checkpoints ADD COLUMN side_photo_3 VARCHAR(255) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE checkpoints DROP COLUMN side_photo_1;
ALTER TABLE checkpoints DROP COLUMN side_photo_2;
ALTER TABLE checkpoints DROP COLUMN side_photo_3;
