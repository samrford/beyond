package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCorsMiddleware(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("Standard Request", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		recorder := httptest.NewRecorder()

		corsMiddleware(handler).ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "*", recorder.Header().Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "GET, OPTIONS, POST, PUT, DELETE", recorder.Header().Get("Access-Control-Allow-Methods"))
	})

	t.Run("OPTIONS Request", func(t *testing.T) {
		req := httptest.NewRequest("OPTIONS", "/", nil)
		recorder := httptest.NewRecorder()

		corsMiddleware(handler).ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, "*", recorder.Header().Get("Access-Control-Allow-Origin"))
	})
}

