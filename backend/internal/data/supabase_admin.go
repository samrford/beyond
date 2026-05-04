package data

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// SupabaseAdmin is a thin client for Supabase's auth admin API. It uses the
// service-role key, so it must never be reachable from anything that handles
// untrusted input. Used only for backend-to-Supabase user lookups.
type SupabaseAdmin struct {
	baseURL    string // e.g. "https://xxx.supabase.co"
	serviceKey string
	http       *http.Client
}

func NewSupabaseAdmin(baseURL, serviceRoleKey string) *SupabaseAdmin {
	return &SupabaseAdmin{
		baseURL:    strings.TrimRight(baseURL, "/"),
		serviceKey: serviceRoleKey,
		http:       &http.Client{Timeout: 10 * time.Second},
	}
}

// AuthUser is the subset of Supabase's admin user payload we care about.
type AuthUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// GetUser fetches the auth user by ID via the admin API.
func (s *SupabaseAdmin) GetUser(ctx context.Context, userID string) (*AuthUser, error) {
	if s == nil {
		return nil, fmt.Errorf("supabase admin not configured")
	}
	url := s.baseURL + "/auth/v1/admin/users/" + userID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("supabase admin %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}

	var u AuthUser
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return nil, fmt.Errorf("decode supabase admin response: %w", err)
	}
	return &u, nil
}
