package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"beyond/backend/internal/data"
)

// TripsHandler handles trip-related HTTP requests
type TripsHandler struct {
	trips []data.Trip
}

// NewTripsHandler creates a new TripsHandler
func NewTripsHandler(trips []data.Trip) *TripsHandler {
	return &TripsHandler{
		trips: trips,
	}
}

// ListTrips handles GET /api/trips
func (h *TripsHandler) ListTrips(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.trips)
}

// GetTrip handles GET /api/trips/:id
func (h *TripsHandler) GetTrip(w http.ResponseWriter, r *http.Request) {
	// Extract trip ID from URL path
	id := strings.TrimPrefix(r.URL.Path, "/api/trips/")

	for _, trip := range h.trips {
		if trip.ID == id {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(trip)
			return
		}
	}

	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]string{"error": "Trip not found"})
}
