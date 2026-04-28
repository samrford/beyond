package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/lib/pq"

	"beyond/backend/internal/data"
)

// handleRegex is the validation pattern for user-chosen handles.
// Lowercase letters, digits, and underscores; 3–30 chars.
var handleRegex = regexp.MustCompile(`^[a-z0-9_]{3,30}$`)

type ProfilesHandler struct {
	db *sql.DB
}

func NewProfilesHandler(db *sql.DB) *ProfilesHandler {
	return &ProfilesHandler{db: db}
}

// HandleMe dispatches GET/PUT for /v1/profiles/me.
func (h *ProfilesHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getMe(w, r)
	case http.MethodPut:
		h.updateMe(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// getMe returns the calling user's profile, or {needs_setup: true} if absent.
func (h *ProfilesHandler) getMe(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	var p data.UserProfile
	row := h.db.QueryRow(
		"SELECT user_id, handle, display_name, bio, avatar_url, is_public, created_at, updated_at FROM user_profiles WHERE user_id = $1",
		userID,
	)
	if err := row.Scan(&p.UserID, &p.Handle, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.IsPublic, &p.CreatedAt, &p.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{"needs_setup": true})
			return
		}
		log.Printf("Error querying my profile: %v", err)
		http.Error(w, "Failed to load profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"profile":     p,
		"needs_setup": false,
	})
}

// updateMe upserts the calling user's profile.
func (h *ProfilesHandler) updateMe(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())

	var body struct {
		Handle      string `json:"handle"`
		DisplayName string `json:"displayName"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatarUrl"`
		IsPublic    bool   `json:"isPublic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	body.Handle = strings.TrimSpace(strings.ToLower(body.Handle))
	if !handleRegex.MatchString(body.Handle) {
		http.Error(w, "Handle must be 3–30 characters: lowercase letters, digits, underscores", http.StatusBadRequest)
		return
	}

	var p data.UserProfile
	row := h.db.QueryRow(`
		INSERT INTO user_profiles (user_id, handle, display_name, bio, avatar_url, is_public)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE SET
			handle = EXCLUDED.handle,
			display_name = EXCLUDED.display_name,
			bio = EXCLUDED.bio,
			avatar_url = EXCLUDED.avatar_url,
			is_public = EXCLUDED.is_public,
			updated_at = NOW()
		RETURNING user_id, handle, display_name, bio, avatar_url, is_public, created_at, updated_at
	`,
		userID, body.Handle, body.DisplayName, body.Bio, body.AvatarURL, body.IsPublic,
	)
	if err := row.Scan(&p.UserID, &p.Handle, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.IsPublic, &p.CreatedAt, &p.UpdatedAt); err != nil {
		// Surface unique-handle violation as 409.
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			http.Error(w, "Handle already taken", http.StatusConflict)
			return
		}
		log.Printf("Error upserting profile: %v", err)
		http.Error(w, "Failed to save profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"profile":     p,
		"needs_setup": false,
	})
}

// GetByHandle returns the public-facing view of a profile and its public
// trips & plans. Owners see all of their own resources regardless of
// visibility. Private profiles return only {handle, is_private: true} to
// non-owners; missing handles 404.
func (h *ProfilesHandler) GetByHandle(w http.ResponseWriter, r *http.Request) {
	viewerID := GetUserID(r.Context())
	handle := strings.TrimPrefix(r.URL.Path, "/v1/profiles/")
	handle = strings.TrimSuffix(handle, "/")
	if handle == "" || handle == "me" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	var p data.UserProfile
	row := h.db.QueryRow(
		"SELECT user_id, handle, display_name, bio, avatar_url, is_public, created_at, updated_at FROM user_profiles WHERE LOWER(handle) = LOWER($1)",
		handle,
	)
	if err := row.Scan(&p.UserID, &p.Handle, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.IsPublic, &p.CreatedAt, &p.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying profile by handle: %v", err)
		http.Error(w, "Failed to load profile", http.StatusInternalServerError)
		return
	}

	isOwner := p.UserID == viewerID

	// Private profile + non-owner: return minimal "is_private" payload.
	if !p.IsPublic && !isOwner {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"handle":     p.Handle,
			"is_private": true,
			"is_owner":   false,
		})
		return
	}

	trips, err := h.fetchTrips(p.UserID, isOwner)
	if err != nil {
		log.Printf("Error loading profile trips: %v", err)
		http.Error(w, "Failed to load profile", http.StatusInternalServerError)
		return
	}

	plans, err := h.fetchPlans(p.UserID, isOwner)
	if err != nil {
		log.Printf("Error loading profile plans: %v", err)
		http.Error(w, "Failed to load profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"profile":  p,
		"is_owner": isOwner,
		"trips":    trips,
		"plans":    plans,
	})
}

func (h *ProfilesHandler) fetchTrips(ownerID string, includePrivate bool) ([]data.TripSummary, error) {
	q := "SELECT id, name, start_date, end_date, header_photo, summary, is_public FROM trips WHERE user_id = $1"
	if !includePrivate {
		q += " AND is_public"
	}
	q += " ORDER BY start_date DESC"
	rows, err := h.db.Query(q, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []data.TripSummary{}
	for rows.Next() {
		var t data.TripSummary
		if err := rows.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &t.HeaderPhoto, &t.Summary, &t.IsPublic); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (h *ProfilesHandler) fetchPlans(ownerID string, includePrivate bool) ([]data.PlanSummary, error) {
	q := "SELECT id, name, start_date, end_date, summary, cover_photo, is_public FROM plans WHERE user_id = $1"
	if !includePrivate {
		q += " AND is_public"
	}
	q += " ORDER BY start_date DESC"
	rows, err := h.db.Query(q, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []data.PlanSummary{}
	for rows.Next() {
		var p data.PlanSummary
		if err := rows.Scan(&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.Summary, &p.CoverPhoto, &p.IsPublic); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// Search returns up to `limit` public profiles whose handle or display_name
// has the given prefix (case-insensitive). Handle-prefix matches sort first.
func (h *ProfilesHandler) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 2 {
		http.Error(w, "q must be at least 2 characters", http.StatusBadRequest)
		return
	}

	limit := 10
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
			if limit > 25 {
				limit = 25
			}
		}
	}

	prefix := strings.ToLower(q) + "%"
	rows, err := h.db.Query(`
		SELECT user_id, handle, display_name, avatar_url
		FROM user_profiles
		WHERE is_public AND (LOWER(handle) LIKE $1 OR LOWER(display_name) LIKE $1)
		ORDER BY (LOWER(handle) LIKE $1) DESC, handle ASC
		LIMIT $2
	`, prefix, limit)
	if err != nil {
		log.Printf("Error searching users: %v", err)
		http.Error(w, "Search failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	hits := []data.SearchHit{}
	for rows.Next() {
		var hit data.SearchHit
		if err := rows.Scan(&hit.UserID, &hit.Handle, &hit.DisplayName, &hit.AvatarURL); err != nil {
			log.Printf("Error scanning search hit: %v", err)
			continue
		}
		hits = append(hits, hit)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hits)
}
