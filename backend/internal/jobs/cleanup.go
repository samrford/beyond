package jobs

import (
	"context"
	"database/sql"
	"log"
	"time"

	"beyond/backend/internal/data"
)

// cleanupLockKey is a stable int64 used as a Postgres advisory lock key so that
// only one replica runs the sweep at a time when scaled horizontally.
const cleanupLockKey int64 = 0x6F72_7068_6E63_6C6E

// RunOrphanCleanup ticks every 24 hours and deletes MinIO objects whose uploads
// manifest row is older than 24 hours and whose key is not referenced by any
// trip, plan, or checkpoint.
func RunOrphanCleanup(ctx context.Context, db *sql.DB, store data.FileStore) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	// Also run once immediately on startup.
	runOnce(ctx, db, store)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runOnce(ctx, db, store)
		}
	}
}

func runOnce(ctx context.Context, db *sql.DB, store data.FileStore) {
	// Acquire a session-level advisory lock on a dedicated connection so the
	// lock and all subsequent work (including the eventual unlock) share the
	// same underlying connection — required by Postgres advisory locks.
	conn, err := db.Conn(ctx)
	if err != nil {
		log.Printf("orphan-cleanup: failed to acquire connection: %v", err)
		return
	}
	defer conn.Close()

	var locked bool
	if err := conn.QueryRowContext(ctx,
		`SELECT pg_try_advisory_lock($1)`, cleanupLockKey,
	).Scan(&locked); err != nil {
		log.Printf("orphan-cleanup: advisory lock check failed: %v", err)
		return
	}
	if !locked {
		// Another replica is already running the sweep.
		return
	}
	defer conn.ExecContext(ctx, `SELECT pg_advisory_unlock($1)`, cleanupLockKey) //nolint:errcheck

	// Find orphaned uploads: older than 24 hours and not referenced anywhere.
	rows, err := conn.QueryContext(ctx, `
		SELECT key FROM uploads
		WHERE created_at < NOW() - INTERVAL '24 hours'
		  AND key NOT IN (
		      SELECT header_photo FROM trips        WHERE header_photo <> ''
		      UNION
		      SELECT cover_photo  FROM plans        WHERE cover_photo  <> ''
		      UNION
		      SELECT hero_photo   FROM checkpoints  WHERE hero_photo IS NOT NULL AND hero_photo <> ''
		      UNION
		      SELECT jsonb_array_elements_text(photos) FROM checkpoints WHERE photos IS NOT NULL
		  )
	`)
	if err != nil {
		log.Printf("orphan-cleanup: query failed: %v", err)
		return
	}
	defer rows.Close()

	var candidates []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			log.Printf("orphan-cleanup: scan error: %v", err)
			continue
		}
		candidates = append(candidates, key)
	}
	if err := rows.Err(); err != nil {
		log.Printf("orphan-cleanup: rows error: %v", err)
	}

	if len(candidates) == 0 {
		return
	}

	log.Printf("orphan-cleanup: found %d orphaned file(s)", len(candidates))

	// Delete from object storage first, then remove the manifest row.
	// If storage delete fails we keep the manifest row so we don't lose the
	// pointer; the next sweep will retry.
	for _, key := range candidates {
		if err := store.DeleteFile(ctx, key); err != nil {
			log.Printf("orphan-cleanup: failed to delete %q from storage: %v", key, err)
			continue
		}
		if _, err := conn.ExecContext(ctx,
			`DELETE FROM uploads WHERE key = $1`, key,
		); err != nil {
			log.Printf("orphan-cleanup: failed to remove manifest row for %q: %v", key, err)
		} else {
			log.Printf("orphan-cleanup: reaped %q", key)
		}
	}
}
