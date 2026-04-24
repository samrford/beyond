-- +goose Up
-- Strip the `/api/image/` prefix from stored image paths so the DB holds bare
-- filenames and the URL is constructed client-side. External URLs (http/https)
-- are left untouched by the regex anchor on `^/api/image/`.

UPDATE trips
SET header_photo = regexp_replace(header_photo, '^/api/image/', '')
WHERE header_photo LIKE '/api/image/%';

UPDATE checkpoints
SET hero_photo = regexp_replace(hero_photo, '^/api/image/', '')
WHERE hero_photo LIKE '/api/image/%';

UPDATE plans
SET cover_photo = regexp_replace(cover_photo, '^/api/image/', '')
WHERE cover_photo LIKE '/api/image/%';

UPDATE checkpoints
SET photos = (
    SELECT jsonb_agg(
        to_jsonb(regexp_replace(elem #>> '{}', '^/api/image/', ''))
    )
    FROM jsonb_array_elements(photos) AS elem
)
WHERE photos::text LIKE '%/api/image/%';

-- +goose Down
-- Restore the `/api/image/` prefix. Any row whose value is empty, absolute URL,
-- or already-prefixed is left alone.

UPDATE trips
SET header_photo = '/api/image/' || header_photo
WHERE header_photo <> ''
  AND header_photo NOT LIKE '/api/image/%'
  AND header_photo NOT LIKE 'http://%'
  AND header_photo NOT LIKE 'https://%';

UPDATE checkpoints
SET hero_photo = '/api/image/' || hero_photo
WHERE hero_photo IS NOT NULL
  AND hero_photo <> ''
  AND hero_photo NOT LIKE '/api/image/%'
  AND hero_photo NOT LIKE 'http://%'
  AND hero_photo NOT LIKE 'https://%';

UPDATE plans
SET cover_photo = '/api/image/' || cover_photo
WHERE cover_photo <> ''
  AND cover_photo NOT LIKE '/api/image/%'
  AND cover_photo NOT LIKE 'http://%'
  AND cover_photo NOT LIKE 'https://%';

UPDATE checkpoints
SET photos = (
    SELECT jsonb_agg(
        CASE
            WHEN elem #>> '{}' = '' THEN elem
            WHEN elem #>> '{}' LIKE '/api/image/%' THEN elem
            WHEN elem #>> '{}' LIKE 'http://%' THEN elem
            WHEN elem #>> '{}' LIKE 'https://%' THEN elem
            ELSE to_jsonb('/api/image/' || (elem #>> '{}'))
        END
    )
    FROM jsonb_array_elements(photos) AS elem
)
WHERE jsonb_array_length(photos) > 0;
