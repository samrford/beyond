package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
)

var ErrImportNotFound = errors.New("import job not found")

type ImportStatus string

const (
	ImportStatusPending  ImportStatus = "pending"
	ImportStatusRunning  ImportStatus = "running"
	ImportStatusComplete ImportStatus = "complete"
	ImportStatusFailed   ImportStatus = "failed"
)

type ImportJob struct {
	ID             string       `json:"id"`
	UserID         string       `json:"-"`
	SessionID      string       `json:"-"`
	Status         ImportStatus `json:"status"`
	TotalItems     int          `json:"total"`
	CompletedItems int          `json:"completed"`
	FailedItems    int          `json:"failed"`
	ImageURLs      []string     `json:"imageUrls"`
	Error          string       `json:"error,omitempty"`
}

type GoogleImportStore struct {
	db *sql.DB
}

func NewGoogleImportStore(db *sql.DB) *GoogleImportStore {
	return &GoogleImportStore{db: db}
}

// CreateJob registers a new pending import job.
func (s *GoogleImportStore) CreateJob(ctx context.Context, userID, sessionID string) (string, error) {
	id := uuid.New().String()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO google_photo_imports (id, user_id, session_id, status, image_urls)
		VALUES ($1, $2, $3, 'pending', '[]')
	`, id, userID, sessionID)
	if err != nil {
		return "", err
	}
	return id, nil
}

// ClaimNextPending atomically marks the oldest pending job as running and returns it.
// Returns (nil, nil) if no work is available.
func (s *GoogleImportStore) ClaimNextPending(ctx context.Context) (*ImportJob, error) {
	row := s.db.QueryRowContext(ctx, `
		UPDATE google_photo_imports
		SET status = 'running', updated_at = NOW()
		WHERE id = (
			SELECT id FROM google_photo_imports
			WHERE status = 'pending'
			ORDER BY created_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING id, user_id, session_id, status, total_items, completed_items, failed_items
	`)
	var j ImportJob
	err := row.Scan(&j.ID, &j.UserID, &j.SessionID, &j.Status, &j.TotalItems, &j.CompletedItems, &j.FailedItems)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	j.ImageURLs = []string{}
	return &j, nil
}

// SetTotal records how many items will be imported for this job.
func (s *GoogleImportStore) SetTotal(ctx context.Context, jobID string, total int) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE google_photo_imports SET total_items = $2, updated_at = NOW()
		WHERE id = $1
	`, jobID, total)
	return err
}

// RecordItemSuccess appends a successfully imported image URL and increments the counter.
func (s *GoogleImportStore) RecordItemSuccess(ctx context.Context, jobID, imageURL string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE google_photo_imports
		SET completed_items = completed_items + 1,
		    image_urls      = image_urls || to_jsonb($2::text),
		    updated_at      = NOW()
		WHERE id = $1
	`, jobID, imageURL)
	return err
}

func (s *GoogleImportStore) RecordItemFailure(ctx context.Context, jobID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE google_photo_imports
		SET failed_items = failed_items + 1, updated_at = NOW()
		WHERE id = $1
	`, jobID)
	return err
}

func (s *GoogleImportStore) MarkComplete(ctx context.Context, jobID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE google_photo_imports SET status = 'complete', updated_at = NOW()
		WHERE id = $1
	`, jobID)
	return err
}

func (s *GoogleImportStore) MarkFailed(ctx context.Context, jobID, errMsg string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE google_photo_imports SET status = 'failed', error = $2, updated_at = NOW()
		WHERE id = $1
	`, jobID, errMsg)
	return err
}

// Get returns a job scoped to its owning user. Terminal jobs are deleted after
// being read — they only need to survive long enough for one final poll.
func (s *GoogleImportStore) Get(ctx context.Context, userID, jobID string) (*ImportJob, error) {
	var (
		j            ImportJob
		imageURLsRaw []byte
		errStr       sql.NullString
	)
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, session_id, status, total_items, completed_items, failed_items, image_urls, error
		FROM google_photo_imports WHERE id = $1 AND user_id = $2
	`, jobID, userID).Scan(&j.ID, &j.UserID, &j.SessionID, &j.Status,
		&j.TotalItems, &j.CompletedItems, &j.FailedItems, &imageURLsRaw, &errStr)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrImportNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(imageURLsRaw) > 0 {
		_ = json.Unmarshal(imageURLsRaw, &j.ImageURLs)
	}
	if j.ImageURLs == nil {
		j.ImageURLs = []string{}
	}
	if errStr.Valid {
		j.Error = errStr.String
	}
	if j.Status == ImportStatusComplete || j.Status == ImportStatusFailed {
		_, _ = s.db.ExecContext(ctx, `DELETE FROM google_photo_imports WHERE id = $1`, jobID)
	}
	return &j, nil
}
