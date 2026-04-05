package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
)

type contextKey string

const userIDKey contextKey = "userID"

// InitAuth initializes an OIDC provider and returned an IDTokenVerifier.
// It automatically discovers the JWKS and other endpoints from the provider's discovery URL.
func InitAuth(ctx context.Context, supabaseURL string) (*oidc.IDTokenVerifier, error) {
	// Supabase OIDC issuer URL is typically the Auth API endpoint
	issuerURL := strings.TrimRight(supabaseURL, "/") + "/auth/v1"
	log.Printf("Initializing OIDC provider for %s", issuerURL)

	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, err
	}

	// Configure the verifier to check for the 'authenticated' audience
	// and allow for standard signature algorithms (Supabase uses RS256/ES256)
	verifier := provider.Verifier(&oidc.Config{
		ClientID: "authenticated",
	})

	return verifier, nil
}

// AuthMiddleware verifies the Supabase JWT using go-oidc and stores the user ID in context.
func AuthMiddleware(verifier *oidc.IDTokenVerifier, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract Bearer token
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"Missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Verify the ID Token
		idToken, err := verifier.Verify(r.Context(), tokenString)
		if err != nil {
			log.Printf("JWT verification failed: %v", err)
			http.Error(w, `{"error":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Extract user ID from "sub" claim
		// idToken.Subject is directly available as the "sub" claim
		sub := idToken.Subject
		if sub == "" {
			http.Error(w, `{"error":"Missing user ID in token"}`, http.StatusUnauthorized)
			return
		}

		// Store user ID in context
		ctx := context.WithValue(r.Context(), userIDKey, sub)
		next(w, r.WithContext(ctx))
	}
}

// GetUserID retrieves the authenticated user's ID from the request context.
func GetUserID(ctx context.Context) string {
	id, _ := ctx.Value(userIDKey).(string)
	return id
}
