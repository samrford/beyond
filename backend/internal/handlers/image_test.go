package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
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
