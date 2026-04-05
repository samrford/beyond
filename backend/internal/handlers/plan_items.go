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

type PlanItemsHandler struct {
	db *sql.DB
}

func NewPlanItemsHandler(db *sql.DB) *PlanItemsHandler {
	return &PlanItemsHandler{
		db: db,
	}
}

// CreatePlanItem handles POST /api/plans/:plan_id/items
func (h *PlanItemsHandler) CreatePlanItem(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	planID := parts[3]

	var i data.PlanItem
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify plan exists
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM plans WHERE id = $1)", planID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Plan not found", http.StatusNotFound)
		return
	}

	i.ID = uuid.New().String()
	i.PlanID = planID

	_, err = h.db.Exec(
		"INSERT INTO plan_items (id, plan_id, plan_day_id, name, description, location, latitude, longitude, order_index, estimated_time, start_time, duration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
		i.ID, i.PlanID, i.PlanDayID, i.Name, i.Description, i.Location, i.Latitude, i.Longitude, i.OrderIndex, i.EstimatedTime, i.StartTime, i.Duration,
	)
	if err != nil {
		log.Printf("Error inserting plan item: %v", err)
		http.Error(w, "Failed to create plan item", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(i)
}

// UpdatePlanItem handles PUT /api/plans/items/:id
func (h *PlanItemsHandler) UpdatePlanItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/plans/items/")

	var i data.PlanItem
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(
		"UPDATE plan_items SET plan_day_id = $1, name = $2, description = $3, location = $4, latitude = $5, longitude = $6, order_index = $7, estimated_time = $8, start_time = $9, duration = $10 WHERE id = $11",
		i.PlanDayID, i.Name, i.Description, i.Location, i.Latitude, i.Longitude, i.OrderIndex, i.EstimatedTime, i.StartTime, i.Duration, id,
	)
	if err != nil {
		log.Printf("Error updating plan item: %v", err)
		http.Error(w, "Failed to update plan item", http.StatusInternalServerError)
		return
	}

	i.ID = id
	json.NewEncoder(w).Encode(i)
}

// DeletePlanItem handles DELETE /api/plans/items/:id
func (h *PlanItemsHandler) DeletePlanItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/plans/items/")

	_, err := h.db.Exec("DELETE FROM plan_items WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting plan item: %v", err)
		http.Error(w, "Failed to delete plan item", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
