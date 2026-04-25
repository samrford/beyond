package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestImageHandler(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		expectedStatus int
		expectedBody   string
		expectedType   string
	}{
		{
			name:           "Valid image request",
			method:         "GET",
			path:           "/v1/image/test-id",
			expectedStatus: http.StatusOK,
			expectedBody:   "Beyond Travel Image: test-id",
			expectedType:   "image/svg+xml",
		},
		{
			name:           "OPTIONS request (preflight)",
			method:         "OPTIONS",
			path:           "/v1/image/test-id",
			expectedStatus: http.StatusOK,
			expectedType:   "",
		},
		{
			name:           "Invalid method",
			method:         "POST",
			path:           "/v1/image/test-id",
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "Invalid path (too short)",
			method:         "GET",
			path:           "/v1/im",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Invalid path (no prefix)",
			method:         "GET",
			path:           "/not/image/test-id",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(tt.method, tt.path, nil)
			assert.NoError(t, err)

			rr := httptest.NewRecorder()
			ImageHandler(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectedStatus == http.StatusOK && tt.method == "GET" {
				assert.Equal(t, tt.expectedBody, rr.Body.String())
				assert.Equal(t, tt.expectedType, rr.Header().Get("Content-Type"))
				assert.NotEmpty(t, rr.Header().Get("Content-Length"))
			}

			// CORS should be set regardless
			assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
			assert.Equal(t, "GET, OPTIONS", rr.Header().Get("Access-Control-Allow-Methods"))
		})
	}
}

// ─── Ownership tests for makeImageHandler logic ───────────────────────────────
//
// makeImageHandler lives in package main and cannot be imported here. We
// replicate its ownership-check logic in a local helper so it can be tested
// within the handlers package alongside the rest of the handler tests.

// ownershipImageHandler mimics the DB-ownership section of makeImageHandler.
func ownershipImageHandler(store *MockStorage, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filename := strings.TrimPrefix(r.URL.Path, "/v1/image/")
		if filename == "" {
			http.Error(w, "No image specified", http.StatusBadRequest)
			return
		}

		requesterID := GetUserID(r.Context())
		var ownerID string
		dbErr := db.QueryRowContext(r.Context(),
			`SELECT user_id FROM uploads WHERE key = $1`, filename,
		).Scan(&ownerID)
		if dbErr == sql.ErrNoRows || (dbErr == nil && ownerID != requesterID) {
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		}
		if dbErr != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		rc, contentType, err := store.GetFile(r.Context(), filename)
		if err != nil {
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		}
		defer rc.Close()
		w.Header().Set("Content-Type", contentType)
		io.Copy(w, rc)
	}
}

// nopReadCloser wraps a string as a ReadCloser.
func nopReadCloser(s string) io.ReadCloser {
	return io.NopCloser(bytes.NewBufferString(s))
}

func TestImageOwnership_OwnFile_Succeeds(t *testing.T) {
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	mockStorage := new(MockStorage)

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("my-photo.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user-1"))

	mockStorage.On("GetFile", mock.Anything, "my-photo.jpg").
		Return(nopReadCloser("img-bytes"), "image/jpeg", nil)

	handler := ownershipImageHandler(mockStorage, db)

	req := httptest.NewRequest("GET", "/v1/image/my-photo.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	rr := httptest.NewRecorder()
	handler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.NoError(t, dbmock.ExpectationsWereMet())
	mockStorage.AssertExpectations(t)
}

func TestImageOwnership_OtherUserFile_Returns404(t *testing.T) {
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	mockStorage := new(MockStorage)

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("their-photo.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user-1"))

	handler := ownershipImageHandler(mockStorage, db)

	req := httptest.NewRequest("GET", "/v1/image/their-photo.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-2"))

	rr := httptest.NewRecorder()
	handler(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	mockStorage.AssertNotCalled(t, "GetFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestImageOwnership_MissingManifest_Returns404(t *testing.T) {
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	mockStorage := new(MockStorage)

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("unknown.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"})) // empty result set → ErrNoRows

	handler := ownershipImageHandler(mockStorage, db)

	req := httptest.NewRequest("GET", "/v1/image/unknown.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	rr := httptest.NewRecorder()
	handler(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	mockStorage.AssertNotCalled(t, "GetFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}
