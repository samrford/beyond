package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"errors"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockStorage is a mock of data.FileUploader
type MockStorage struct {
	mock.Mock
}

func (m *MockStorage) UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	args := m.Called(ctx, filename, reader, size, contentType)
	return args.String(0), args.Error(1)
}

func TestHandleUpload(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "test.jpg")
	assert.NoError(t, err)
	_, err = part.Write([]byte("dummy data"))
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Match arguments exactly or use mock.Anything
	mockStorage.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return("http://storage/test.jpg", nil)

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	err = json.NewDecoder(rr.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "http://storage/test.jpg", resp["url"])

	mockStorage.AssertExpectations(t)
}

func TestHandleUpload_NoStorage(t *testing.T) {
	h := NewUploadHandler(nil)
	req := httptest.NewRequest("POST", "/api/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleUpload_InvalidForm(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)
	req := httptest.NewRequest("POST", "/api/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandleUpload_UploadError(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.CreateFormFile("file", "test.jpg")
	writer.Close()

	req := httptest.NewRequest("POST", "/api/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	mockStorage.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return("", errors.New("upload fail"))

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}
