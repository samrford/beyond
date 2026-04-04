-- +goose Up
CREATE TABLE plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    summary TEXT NOT NULL,
    cover_photo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_days (
    id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    notes TEXT NOT NULL
);

CREATE TABLE plan_items (
    id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    plan_day_id VARCHAR(50) REFERENCES plan_days(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    order_index INTEGER NOT NULL DEFAULT 0,
    estimated_time VARCHAR(100) NOT NULL DEFAULT ''
);

-- +goose Down
DROP TABLE plan_items;
DROP TABLE plan_days;
DROP TABLE plans;
