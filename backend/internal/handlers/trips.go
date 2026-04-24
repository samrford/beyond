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
	rows, err := h.db.Query("SELECT id, name, start_date, end_date, header_photo, summary FROM trips WHERE user_id = $1 ORDER BY start_date ASC", userID)
	if err != nil {
		log.Printf("Error querying trips: %v", err)
		http.Error(w, "Failed to load trips", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var trips []data.Trip
	for rows.Next() {
		var t data.Trip
		if err := rows.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &t.HeaderPhoto, &t.Summary); err != nil {
			log.Printf("Error scanning trip: %v", err)
			continue
		}
		trips = append(trips, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trips)
}

// GetTrip handles GET /v1/trips/:id
func (h *TripsHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/trips/")

	row := h.db.QueryRow("SELECT id, name, start_date, end_date, header_photo, summary FROM trips WHERE id = $1 AND user_id = $2", id, userID)

	var t data.Trip
	if err := row.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &t.HeaderPhoto, &t.Summary); err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Trip not found"})
			return
		}
		log.Printf("Error querying trip: %v", err)
		http.Error(w, "Failed to load trip", http.StatusInternalServerError)
		return
	}

	// Fetch checkpoints for the trip
	cRows, err := h.db.Query("SELECT id, name, location, timestamp, description, photos, journal, COALESCE(hero_photo, '') FROM checkpoints WHERE trip_id = $1 ORDER BY timestamp ASC", id)
	if err != nil {
		log.Printf("Error querying checkpoints: %v", err)
		http.Error(w, "Failed to load trip checkpoints", http.StatusInternalServerError)
		return
	}
	defer cRows.Close()

	for cRows.Next() {
		var c data.Checkpoint
		var photosJSON []byte
		if err := cRows.Scan(&c.ID, &c.Name, &c.Location, &c.Timestamp, &c.Description, &photosJSON, &c.Journal, &c.HeroPhoto); err != nil {
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
		"INSERT INTO trips (id, name, start_date, end_date, header_photo, summary, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		t.ID, t.Name, t.StartDate, t.EndDate, t.HeaderPhoto, t.Summary, userID,
	)
	if err != nil {
		log.Printf("Error inserting trip: %v", err)
		http.Error(w, "Failed to create trip", http.StatusInternalServerError)
		return
	}

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
		"UPDATE trips SET name = $1, start_date = $2, end_date = $3, header_photo = $4, summary = $5 WHERE id = $6 AND user_id = $7",
		t.Name, t.StartDate, t.EndDate, t.HeaderPhoto, t.Summary, id, userID,
	)
	if err != nil {
		log.Printf("Error updating trip: %v", err)
		http.Error(w, "Failed to update trip", http.StatusInternalServerError)
		return
	}

	t.ID = id
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
