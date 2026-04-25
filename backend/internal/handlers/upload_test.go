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

func (m *MockStorage) GetFile(ctx context.Context, filename string) (io.ReadCloser, string, error) {
	args := m.Called(ctx, filename)
	var rc io.ReadCloser
	if args.Get(0) != nil {
		rc = args.Get(0).(io.ReadCloser)
	}
	return rc, args.String(1), args.Error(2)
}

// jpegPrefix is enough bytes to make http.DetectContentType identify the
// payload as image/jpeg. Decode will still fail (the content is junk after
// the magic bytes), exercising the upload handler's compression-fallback path.
var jpegPrefix = []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}

func TestHandleUpload(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "test.jpg")
	assert.NoError(t, err)
	_, err = part.Write(append(jpegPrefix, []byte("dummy data")...))
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)

	req := httptest.NewRequest("POST", "/v1/upload", body)
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
	req := httptest.NewRequest("POST", "/v1/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleUpload_InvalidForm(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)
	req := httptest.NewRequest("POST", "/v1/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandleUpload_UploadError(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.jpg")
	part.Write(jpegPrefix)
	writer.Close()

	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	mockStorage.On("UploadFile", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return("", errors.New("upload fail"))

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandleUpload_RejectsNonImage(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "notes.txt")
	part.Write([]byte("this is just plain text, not an image"))
	writer.Close()

	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
	mockStorage.AssertNotCalled(t, "UploadFile")
}

func TestHandleUpload_RejectsGIF(t *testing.T) {
	mockStorage := new(MockStorage)
	h := NewUploadHandler(mockStorage)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "anim.gif")
	part.Write([]byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61})
	writer.Close()

	req := httptest.NewRequest("POST", "/v1/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	rr := httptest.NewRecorder()
	h.HandleUpload(rr, req)

	assert.Equal(t, http.StatusUnsupportedMediaType, rr.Code)
	mockStorage.AssertNotCalled(t, "UploadFile")
}
