package jobs

import (
	"context"
	"database/sql"
	"io"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// mockStore satisfies data.FileStore for testing.
type mockStore struct {
	mock.Mock
}

func (m *mockStore) UploadFile(_ context.Context, _ string, _ io.Reader, _ int64, _ string) (string, error) {
	return "", nil
}

func (m *mockStore) GetFile(_ context.Context, _ string) (io.ReadCloser, string, error) {
	return nil, "", nil
}

func (m *mockStore) DeleteFile(ctx context.Context, filename string) error {
	args := m.Called(ctx, filename)
	return args.Error(0)
}

func newMockDB(t *testing.T) (*sql.DB, sqlmock.Sqlmock) {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db, mock
}

func TestRunOnce_ReapsOrphans(t *testing.T) {
	db, dbmock := newMockDB(t)
	store := new(mockStore)
	ctx := context.Background()

	// Advisory lock acquired.
	dbmock.ExpectQuery(`SELECT pg_try_advisory_lock`).
		WithArgs(cleanupLockKey).
		WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(true))

	// Candidate query returns two orphaned keys.
	dbmock.ExpectQuery(`SELECT key FROM uploads`).
		WillReturnRows(sqlmock.NewRows([]string{"key"}).
			AddRow("orphan-a.jpg").
			AddRow("orphan-b.jpg"))

	// Each orphan is deleted from storage, then from the DB.
	store.On("DeleteFile", mock.Anything, "orphan-a.jpg").Return(nil)
	dbmock.ExpectExec(`DELETE FROM uploads WHERE key`).
		WithArgs("orphan-a.jpg").
		WillReturnResult(sqlmock.NewResult(1, 1))

	store.On("DeleteFile", mock.Anything, "orphan-b.jpg").Return(nil)
	dbmock.ExpectExec(`DELETE FROM uploads WHERE key`).
		WithArgs("orphan-b.jpg").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Advisory unlock.
	dbmock.ExpectExec(`SELECT pg_advisory_unlock`).
		WithArgs(cleanupLockKey).
		WillReturnResult(sqlmock.NewResult(0, 0))

	runOnce(ctx, db, store)

	store.AssertExpectations(t)
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestRunOnce_NoOrphans(t *testing.T) {
	db, dbmock := newMockDB(t)
	store := new(mockStore)
	ctx := context.Background()

	dbmock.ExpectQuery(`SELECT pg_try_advisory_lock`).
		WithArgs(cleanupLockKey).
		WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(true))

	// Query returns no rows.
	dbmock.ExpectQuery(`SELECT key FROM uploads`).
		WillReturnRows(sqlmock.NewRows([]string{"key"}))

	dbmock.ExpectExec(`SELECT pg_advisory_unlock`).
		WithArgs(cleanupLockKey).
		WillReturnResult(sqlmock.NewResult(0, 0))

	runOnce(ctx, db, store)

	store.AssertNotCalled(t, "DeleteFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestRunOnce_AdvisoryLockContended(t *testing.T) {
	db, dbmock := newMockDB(t)
	store := new(mockStore)
	ctx := context.Background()

	// Lock not acquired — another replica is running.
	dbmock.ExpectQuery(`SELECT pg_try_advisory_lock`).
		WithArgs(cleanupLockKey).
		WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(false))

	runOnce(ctx, db, store)

	store.AssertNotCalled(t, "DeleteFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestRunOnce_StorageDeleteFailure_SkipsDBRow(t *testing.T) {
	db, dbmock := newMockDB(t)
	store := new(mockStore)
	ctx := context.Background()

	dbmock.ExpectQuery(`SELECT pg_try_advisory_lock`).
		WithArgs(cleanupLockKey).
		WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(true))

	dbmock.ExpectQuery(`SELECT key FROM uploads`).
		WillReturnRows(sqlmock.NewRows([]string{"key"}).AddRow("bad-file.jpg"))

	// Storage delete fails — the manifest row must NOT be removed.
	store.On("DeleteFile", mock.Anything, "bad-file.jpg").Return(assert.AnError)

	dbmock.ExpectExec(`SELECT pg_advisory_unlock`).
		WithArgs(cleanupLockKey).
		WillReturnResult(sqlmock.NewResult(0, 0))

	runOnce(ctx, db, store)

	store.AssertExpectations(t)
	assert.NoError(t, dbmock.ExpectationsWereMet())
}
