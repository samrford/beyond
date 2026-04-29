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

// CheckpointsHandler handles checkpoint-related HTTP requests
type CheckpointsHandler struct {
	db *sql.DB
}

// NewCheckpointsHandler creates a new CheckpointsHandler
func NewCheckpointsHandler(db *sql.DB) *CheckpointsHandler {
	return &CheckpointsHandler{
		db: db,
	}
}

// CreateCheckpoint handles POST /v1/trips/:id/checkpoints (owner or contributor)
func (h *CheckpointsHandler) CreateCheckpoint(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	tripID := parts[3]

	acc, err := data.GetTripAccess(h.db, userID, tripID)
	if err != nil {
		log.Printf("Error checking trip access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !acc.Found || !acc.Role.CanEdit() {
		http.Error(w, "Trip not found", http.StatusNotFound)
		return
	}

	var c data.Checkpoint
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	c.ID = uuid.New().String()
	photosJSON, _ := json.Marshal(c.Photos)

	_, err = h.db.Exec(
		"INSERT INTO checkpoints (id, trip_id, name, location, timestamp, description, photos, journal, hero_photo, side_photo_1, side_photo_2, side_photo_3) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
		c.ID, tripID, c.Name, c.Location, c.Timestamp, c.Description, photosJSON, c.Journal, c.HeroPhoto, c.SidePhoto1, c.SidePhoto2, c.SidePhoto3,
	)
	if err != nil {
		log.Printf("Error inserting checkpoint: %v", err)
		http.Error(w, "Failed to create checkpoint", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

// UpdateCheckpoint handles PUT /v1/checkpoints/:id (owner or contributor of parent trip)
func (h *CheckpointsHandler) UpdateCheckpoint(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/checkpoints/")

	tripID, err := h.tripIDForCheckpoint(id)
	if err == sql.ErrNoRows {
		http.Error(w, "Checkpoint not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error looking up checkpoint trip: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	acc, err := data.GetTripAccess(h.db, userID, tripID)
	if err != nil {
		log.Printf("Error checking trip access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !acc.Found || !acc.Role.CanEdit() {
		http.Error(w, "Checkpoint not found", http.StatusNotFound)
		return
	}

	var c data.Checkpoint
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	photosJSON, _ := json.Marshal(c.Photos)

	_, err = h.db.Exec(
		"UPDATE checkpoints SET name = $1, location = $2, timestamp = $3, description = $4, photos = $5, journal = $6, hero_photo = $7, side_photo_1 = $8, side_photo_2 = $9, side_photo_3 = $10 WHERE id = $11",
		c.Name, c.Location, c.Timestamp, c.Description, photosJSON, c.Journal, c.HeroPhoto, c.SidePhoto1, c.SidePhoto2, c.SidePhoto3, id,
	)
	if err != nil {
		log.Printf("Error updating checkpoint: %v", err)
		http.Error(w, "Failed to update checkpoint", http.StatusInternalServerError)
		return
	}

	c.ID = id
	json.NewEncoder(w).Encode(c)
}

// DeleteCheckpoint handles DELETE /v1/checkpoints/:id (owner or contributor of parent trip)
func (h *CheckpointsHandler) DeleteCheckpoint(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/checkpoints/")

	tripID, err := h.tripIDForCheckpoint(id)
	if err == sql.ErrNoRows {
		http.Error(w, "Checkpoint not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error looking up checkpoint trip: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	acc, err := data.GetTripAccess(h.db, userID, tripID)
	if err != nil {
		log.Printf("Error checking trip access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !acc.Found || !acc.Role.CanEdit() {
		http.Error(w, "Checkpoint not found", http.StatusNotFound)
		return
	}

	_, err = h.db.Exec("DELETE FROM checkpoints WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting checkpoint: %v", err)
		http.Error(w, "Failed to delete checkpoint", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CheckpointsHandler) tripIDForCheckpoint(checkpointID string) (string, error) {
	var tripID string
	err := h.db.QueryRow("SELECT trip_id FROM checkpoints WHERE id = $1", checkpointID).Scan(&tripID)
	return tripID, err
}
