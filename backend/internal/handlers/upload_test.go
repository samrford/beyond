package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockStorage is a testify mock of data.FileStore.
type MockStorage struct {
	mock.Mock
}

func (m *MockStorage) UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	args := m.Called(ctx, filename, reader, size, contentType)
	return args.String(0), args.Error(1)
}

func (m *MockStorage) GetFile(ctx context.Context, filename string) (io.ReadCloser, string, error) {
	args := m.Called(ctx, filename)
	var rc io.ReadCloser
	if args.Get(0) != nil {
		rc = args.Get(0).(io.ReadCloser)
	}
	return rc, args.String(1), args.Error(2)
}

func (m *MockStorage) DeleteFile(ctx context.Context, filename string) error {
	args := m.Called(ctx, filename)
	return args.Error(0)
}

// jpegPrefix is enough bytes to make http.DetectContentType identify the
// payload as image/jpeg. Decode will still fail (the content is junk after
// the magic bytes), exercising the upload handler's compression-fallback path.
var jpegPrefix = []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}

// buildMultipartBody creates a multipart form body with a single file field.
func buildMultipartBody(filename string, content []byte) (*bytes.Buffer, string) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", filename)
	part.Write(content)
	writer.Close()
	return body, writer.FormDataContentType()
}

// ─── Existing upload tests (updated to satisfy new constructor signature) ──────

func TestHandleUpload(t *testing.T) {
	mockStorage := new(MockStorage)
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	h := NewUploadHandler(mockStorage, db)

	body, ct := buildMultipartBody("test.jpg", append(jpegPrefix, []byte("dummy data")...))
	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", ct)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	mockStorage.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return("test-file.jpg", nil)

	dbmock.ExpectExec(`INSERT INTO uploads`).
		WithArgs(sqlmock.AnyArg(), "user-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	err := json.NewDecoder(rr.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "test-file.jpg", resp["url"])

	mockStorage.AssertExpectations(t)
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestHandleUpload_NoStorage(t *testing.T) {
	h := NewUploadHandler(nil, nil)
	req := httptest.NewRequest("POST", "/v1/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleUpload_InvalidForm(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage, nil)
	req := httptest.NewRequest("POST", "/v1/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandleUpload_UploadError(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage, nil)

	body, ct := buildMultipartBody("test.jpg", jpegPrefix)
	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", ct)

	mockStorage.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return("", errors.New("upload fail"))

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleUpload_RejectsNonImage(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage, nil)

	body, ct := buildMultipartBody("notes.txt", []byte("this is just plain text, not an image"))
	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", ct)

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
	mockStorage.AssertNotCalled(t, "UploadFile")
}

func TestHandleUpload_RejectsGIF(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage, nil)

	body, ct := buildMultipartBody("anim.gif", []byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61})
	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", ct)

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
	mockStorage.AssertNotCalled(t, "UploadFile")
}

// ─── New DELETE tests ─────────────────────────────────────────────────────────

func TestHandleDelete_HappyPath(t *testing.T) {
	mockStorage := new(MockStorage)
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	h := NewUploadHandler(mockStorage, db)

	req := httptest.NewRequest("DELETE", "/v1/upload/file-to-delete.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	// Ownership lookup.
	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("file-to-delete.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user-1"))

	// Reference check — not referenced.
	dbmock.ExpectQuery(`SELECT EXISTS`).
		WithArgs("file-to-delete.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	mockStorage.On("DeleteFile", mock.Anything, "file-to-delete.jpg").Return(nil)

	dbmock.ExpectExec(`DELETE FROM uploads WHERE key`).
		WithArgs("file-to-delete.jpg").
		WillReturnResult(sqlmock.NewResult(1, 1))

	rr := httptest.NewRecorder()
	h.HandleDelete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockStorage.AssertExpectations(t)
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestHandleDelete_ReferencedFile_Returns204(t *testing.T) {
	mockStorage := new(MockStorage)
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	h := NewUploadHandler(mockStorage, db)

	req := httptest.NewRequest("DELETE", "/v1/upload/hero.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("hero.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user-1"))

	dbmock.ExpectQuery(`SELECT EXISTS`).
		WithArgs("hero.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	rr := httptest.NewRecorder()
	h.HandleDelete(rr, req)

	// Should succeed silently — file stays because it is attached.
	assert.Equal(t, http.StatusNoContent, rr.Code)
	mockStorage.AssertNotCalled(t, "DeleteFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestHandleDelete_NotOwned_Returns404(t *testing.T) {
	mockStorage := new(MockStorage)
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	h := NewUploadHandler(mockStorage, db)

	req := httptest.NewRequest("DELETE", "/v1/upload/someone-else.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-2"))

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("someone-else.jpg").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user-1"))

	rr := httptest.NewRecorder()
	h.HandleDelete(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	mockStorage.AssertNotCalled(t, "DeleteFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}

func TestHandleDelete_NotFound_Returns404(t *testing.T) {
	mockStorage := new(MockStorage)
	db, dbmock, _ := sqlmock.New()
	defer db.Close()

	h := NewUploadHandler(mockStorage, db)

	req := httptest.NewRequest("DELETE", "/v1/upload/ghost.jpg", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, "user-1"))

	dbmock.ExpectQuery(`SELECT user_id FROM uploads WHERE key`).
		WithArgs("ghost.jpg").
		WillReturnError(sql.ErrNoRows)

	rr := httptest.NewRecorder()
	h.HandleDelete(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	mockStorage.AssertNotCalled(t, "DeleteFile")
	assert.NoError(t, dbmock.ExpectationsWereMet())
}
