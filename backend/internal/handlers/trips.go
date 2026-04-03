package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"

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

// ListTrips handles GET /api/trips
func (h *TripsHandler) ListTrips(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, name, start_date, end_date, header_photo, summary FROM trips ORDER BY start_date ASC")
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
		// Notice Checkpoints are empty for the list view, we don't load them eagerly.
		trips = append(trips, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trips)
}

// GetTrip handles GET /api/trips/:id
func (h *TripsHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	// Extract trip ID from URL path
	id := strings.TrimPrefix(r.URL.Path, "/api/trips/")

	row := h.db.QueryRow("SELECT id, name, start_date, end_date, header_photo, summary FROM trips WHERE id = $1", id)

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
	cRows, err := h.db.Query("SELECT id, name, location, timestamp, description, photos, journal FROM checkpoints WHERE trip_id = $1 ORDER BY timestamp ASC", id)
	if err != nil {
		log.Printf("Error querying checkpoints: %v", err)
		http.Error(w, "Failed to load trip checkpoints", http.StatusInternalServerError)
		return
	}
	defer cRows.Close()

	for cRows.Next() {
		var c data.Checkpoint
		var photosJSON []byte
		if err := cRows.Scan(&c.ID, &c.Name, &c.Location, &c.Timestamp, &c.Description, &photosJSON, &c.Journal); err != nil {
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
