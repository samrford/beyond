package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/stretchr/testify/assert"
)

type mockVerifier struct {
	verifyFunc func(ctx context.Context, token string) (*oidc.IDToken, error)
}

func (m *mockVerifier) Verify(ctx context.Context, token string) (*oidc.IDToken, error) {
	return m.verifyFunc(ctx, token)
}

func TestAuthMiddleware(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		w.Header().Set("X-User-ID", userID)
		w.WriteHeader(http.StatusOK)
	})

	t.Run("Missing Authorization Header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		recorder := httptest.NewRecorder()

		verifier := &mockVerifier{}
		handler := AuthMiddleware(verifier, next)
		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Contains(t, recorder.Body.String(), "Missing or invalid Authorization header")
	})

	t.Run("Invalid Authorization Format", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "InvalidFormat token")
		recorder := httptest.NewRecorder()

		verifier := &mockVerifier{}
		handler := AuthMiddleware(verifier, next)
		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Contains(t, recorder.Body.String(), "Missing or invalid Authorization header")
	})

	t.Run("Verifier Fails", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		recorder := httptest.NewRecorder()

		verifier := &mockVerifier{
			verifyFunc: func(ctx context.Context, token string) (*oidc.IDToken, error) {
				return nil, errors.New("invalid token")
			},
		}
		handler := AuthMiddleware(verifier, next)
		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Contains(t, recorder.Body.String(), "Invalid or expired token")
	})

	t.Run("Missing Sub Claim", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		recorder := httptest.NewRecorder()

		verifier := &mockVerifier{
			verifyFunc: func(ctx context.Context, token string) (*oidc.IDToken, error) {
				return &oidc.IDToken{Subject: ""}, nil
			},
		}
		handler := AuthMiddleware(verifier, next)
		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		assert.Contains(t, recorder.Body.String(), "Missing user ID in token")
	})

	t.Run("Success", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		recorder := httptest.NewRecorder()

		expectedUserID := "user-123"
		verifier := &mockVerifier{
			verifyFunc: func(ctx context.Context, token string) (*oidc.IDToken, error) {
				assert.Equal(t, "valid-token", token)
				return &oidc.IDToken{Subject: expectedUserID}, nil
			},
		}
		handler := AuthMiddleware(verifier, next)
		handler.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		assert.Equal(t, expectedUserID, recorder.Header().Get("X-User-ID"))
	})
}

func TestGetUserID(t *testing.T) {
	t.Run("Found", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userIDKey, "user-123")
		assert.Equal(t, "user-123", GetUserID(ctx))
	})

	t.Run("Not Found", func(t *testing.T) {
		assert.Equal(t, "", GetUserID(context.Background()))
	})
}
