package handlers

import (
	"context"
	"net/http"
)

const testUserID = "test-user-123"

// reqWithAuth adds a test user ID to the request context for testing.
func reqWithAuth(r *http.Request) *http.Request {
	ctx := context.WithValue(r.Context(), userIDKey, testUserID)
	return r.WithContext(ctx)
}
