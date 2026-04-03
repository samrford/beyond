-- +goose Up
CREATE TABLE trips (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    header_photo VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL
);

CREATE TABLE checkpoints (
    id VARCHAR(50) PRIMARY KEY,
    trip_id VARCHAR(50) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    photos JSONB NOT NULL DEFAULT '[]',
    journal TEXT NOT NULL
);

-- +goose Down
DROP TABLE checkpoints;
DROP TABLE trips;
