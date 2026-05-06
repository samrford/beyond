package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"beyond/backend/internal/data"
)

// TripsHandler handles trip-related HTTP requests
type TripsHandler struct {
	db *sql.DB
}

// NewTripsHandler creates a new TripsHandler
func NewTripsHandler(db *sql.DB) *TripsHandler {
	return &TripsHandler{
		db: db,
	}
}

// ListTrips handles GET /v1/trips
func (h *TripsHandler) ListTrips(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	rows, err := h.db.Query("SELECT id, name, start_date, end_date, header_photo, summary, is_public FROM trips WHERE user_id = $1 ORDER BY start_date ASC", userID)
	if err != nil {
		log.Printf("Error querying trips: %v", err)
		http.Error(w, "Failed to load trips", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var trips []data.Trip
	for rows.Next() {
		var t data.Trip
		if err := rows.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &t.HeaderPhoto, &t.Summary, &t.IsPublic); err != nil {
			log.Printf("Error scanning trip: %v", err)
			continue
		}
		t.IsOwner = true
		trips = append(trips, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trips)
}

// GetTrip handles GET /v1/trips/:id
func (h *TripsHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/trips/")

	row := h.db.QueryRow(`
		SELECT t.id, t.name, t.start_date, t.end_date, t.header_photo, t.summary,
			t.bg_mode, t.bg_blur, t.bg_opacity, t.bg_darkness, t.is_public, t.user_id,
			COALESCE(p.handle, '')
		FROM trips t
		LEFT JOIN user_profiles p ON p.user_id = t.user_id
		WHERE t.id = $1
	`, id)

	var t data.Trip
	var ownerID string
	if err := row.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &t.HeaderPhoto, &t.Summary, &t.BgMode, &t.BgBlur, &t.BgOpacity, &t.BgDarkness, &t.IsPublic, &ownerID, &t.OwnerHandle); err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Trip not found"})
			return
		}
		log.Printf("Error querying trip: %v", err)
		http.Error(w, "Failed to load trip", http.StatusInternalServerError)
		return
	}

	t.IsOwner = ownerID == userID
	if !t.IsOwner && !t.IsPublic {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Trip not found"})
		return
	}

	// Fetch checkpoints for the trip
	cRows, err := h.db.Query("SELECT id, name, location, timestamp, end_timestamp, description, photos, journal, COALESCE(hero_photo, ''), COALESCE(side_photo_1, ''), COALESCE(side_photo_2, ''), COALESCE(side_photo_3, '') FROM checkpoints WHERE trip_id = $1 ORDER BY timestamp ASC", id)
	if err != nil {
		log.Printf("Error querying checkpoints: %v", err)
		http.Error(w, "Failed to load trip checkpoints", http.StatusInternalServerError)
		return
	}
	defer cRows.Close()

	for cRows.Next() {
		var c data.Checkpoint
		var photosJSON []byte
		if err := cRows.Scan(&c.ID, &c.Name, &c.Location, &c.Timestamp, &c.EndTimestamp, &c.Description, &photosJSON, &c.Journal, &c.HeroPhoto, &c.SidePhoto1, &c.SidePhoto2, &c.SidePhoto3); err != nil {
			log.Printf("Error scanning checkpoint: %v", err)
			continue
		}
		
		// Parse photos JSON properly
		if err := json.Unmarshal(photosJSON, &c.Photos); err != nil {
			log.Printf("Error unmarshaling photos: %v", err)
			c.Photos = []string{}
		}
		
		t.Checkpoints = append(t.Checkpoints, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// CreateTrip handles POST /v1/trips
func (h *TripsHandler) CreateTrip(w http.ResponseWriter, r *http.Request) {
	var t data.Trip
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID := GetUserID(r.Context())
	t.ID = uuid.New().String()

	_, err := h.db.Exec(
		"INSERT INTO trips (id, name, start_date, end_date, header_photo, summary, user_id, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		t.ID, t.Name, t.StartDate, t.EndDate, t.HeaderPhoto, t.Summary, userID, t.IsPublic,
	)
	if err != nil {
		log.Printf("Error inserting trip: %v", err)
		http.Error(w, "Failed to create trip", http.StatusInternalServerError)
		return
	}

	t.IsOwner = true
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

// UpdateTrip handles PUT /v1/trips/:id
func (h *TripsHandler) UpdateTrip(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/trips/")

	var t data.Trip
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(
		"UPDATE trips SET name = $1, start_date = $2, end_date = $3, header_photo = $4, summary = $5, bg_mode = $6, bg_blur = $7, bg_opacity = $8, bg_darkness = $9, is_public = $10 WHERE id = $11 AND user_id = $12",
		t.Name, t.StartDate, t.EndDate, t.HeaderPhoto, t.Summary, t.BgMode, t.BgBlur, t.BgOpacity, t.BgDarkness, t.IsPublic, id, userID,
	)
	if err != nil {
		log.Printf("Error updating trip: %v", err)
		http.Error(w, "Failed to update trip", http.StatusInternalServerError)
		return
	}

	t.ID = id
	t.IsOwner = true
	json.NewEncoder(w).Encode(t)
}

// DeleteTrip handles DELETE /v1/trips/:id
func (h *TripsHandler) DeleteTrip(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/trips/")

	_, err := h.db.Exec("DELETE FROM trips WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		log.Printf("Error deleting trip: %v", err)
		http.Error(w, "Failed to delete trip", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
