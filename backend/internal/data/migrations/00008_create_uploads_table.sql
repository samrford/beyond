-- +goose Up

CREATE TABLE uploads (
    key        VARCHAR(255) PRIMARY KEY,
    user_id    VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX uploads_user_id_idx  ON uploads(user_id);
CREATE INDEX uploads_created_at_idx ON uploads(created_at);

-- Backfill: pull existing image references into uploads so they aren't orphaned.
-- We only insert rows whose key isn't already present (UPSERT is idempotent on reruns).

-- trips.header_photo
INSERT INTO uploads (key, user_id)
SELECT header_photo, user_id
FROM   trips
WHERE  header_photo IS NOT NULL AND header_photo <> ''
ON CONFLICT (key) DO NOTHING;

-- plans.cover_photo
INSERT INTO uploads (key, user_id)
SELECT cover_photo, user_id
FROM   plans
WHERE  cover_photo IS NOT NULL AND cover_photo <> ''
ON CONFLICT (key) DO NOTHING;

-- checkpoints.hero_photo  (joins to trips.user_id via trip_id)
INSERT INTO uploads (key, user_id)
SELECT c.hero_photo, t.user_id
FROM   checkpoints c
JOIN   trips t ON t.id = c.trip_id
WHERE  c.hero_photo IS NOT NULL AND c.hero_photo <> ''
ON CONFLICT (key) DO NOTHING;

-- checkpoints.photos  (JSONB array — expand each element)
INSERT INTO uploads (key, user_id)
SELECT jsonb_array_elements_text(c.photos), t.user_id
FROM   checkpoints c
JOIN   trips t ON t.id = c.trip_id
WHERE  c.photos IS NOT NULL AND jsonb_array_length(c.photos) > 0
ON CONFLICT (key) DO NOTHING;

-- +goose Down

DROP TABLE IF EXISTS uploads;
