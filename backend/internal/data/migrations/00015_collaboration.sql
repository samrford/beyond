-- +goose Up
CREATE TABLE trip_collaborators (
    trip_id    VARCHAR(50) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id    TEXT        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('viewer','contributor')),
    added_by   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX trip_collaborators_user_idx ON trip_collaborators (user_id);

CREATE TABLE plan_collaborators (
    plan_id    VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id    TEXT        NOT NULL,
    role       TEXT        NOT NULL CHECK (role IN ('viewer','contributor')),
    added_by   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (plan_id, user_id)
);
CREATE INDEX plan_collaborators_user_idx ON plan_collaborators (user_id);

CREATE TABLE trip_invites (
    token             TEXT        PRIMARY KEY,
    trip_id           VARCHAR(50) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    role              TEXT        NOT NULL CHECK (role IN ('viewer','contributor')),
    created_by        TEXT        NOT NULL,
    recipient_user_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    max_uses          INTEGER,
    use_count         INTEGER     NOT NULL DEFAULT 0,
    revoked_at        TIMESTAMPTZ
);
CREATE INDEX trip_invites_trip_idx       ON trip_invites (trip_id)           WHERE revoked_at IS NULL;
CREATE INDEX trip_invites_recipient_idx  ON trip_invites (recipient_user_id) WHERE revoked_at IS NULL AND recipient_user_id IS NOT NULL;

CREATE TABLE plan_invites (
    token             TEXT        PRIMARY KEY,
    plan_id           VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    role              TEXT        NOT NULL CHECK (role IN ('viewer','contributor')),
    created_by        TEXT        NOT NULL,
    recipient_user_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    max_uses          INTEGER,
    use_count         INTEGER     NOT NULL DEFAULT 0,
    revoked_at        TIMESTAMPTZ
);
CREATE INDEX plan_invites_plan_idx       ON plan_invites (plan_id)           WHERE revoked_at IS NULL;
CREATE INDEX plan_invites_recipient_idx  ON plan_invites (recipient_user_id) WHERE revoked_at IS NULL AND recipient_user_id IS NOT NULL;

-- +goose Down
DROP TABLE plan_invites;
DROP TABLE trip_invites;
DROP TABLE plan_collaborators;
DROP TABLE trip_collaborators;
