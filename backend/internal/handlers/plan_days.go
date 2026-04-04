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

type PlanDaysHandler struct {
	db *sql.DB
}

func NewPlanDaysHandler(db *sql.DB) *PlanDaysHandler {
	return &PlanDaysHandler{
		db: db,
	}
}

// CreatePlanDay handles POST /api/plans/:plan_id/days
func (h *PlanDaysHandler) CreatePlanDay(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	planID := parts[3]

	var d data.PlanDay
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	d.ID = uuid.New().String()
	d.PlanID = planID

	_, err := h.db.Exec(
		"INSERT INTO plan_days (id, plan_id, date, notes) VALUES ($1, $2, $3, $4)",
		d.ID, d.PlanID, d.Date, d.Notes,
	)
	if err != nil {
		log.Printf("Error inserting plan day: %v", err)
		http.Error(w, "Failed to create plan day", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(d)
}

// UpdatePlanDay handles PUT /api/plans/days/:id (optional, maybe not needed yet)
func (h *PlanDaysHandler) UpdatePlanDay(w http.ResponseWriter, r *http.Request) {
	// Not implemented yet
	http.Error(w, "Not implemented", http.StatusNotImplemented)
}

// DeletePlanDay handles DELETE /api/plans/days/:id
func (h *PlanDaysHandler) DeletePlanDay(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/plans/days/")

	_, err := h.db.Exec("DELETE FROM plan_days WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting plan day: %v", err)
		http.Error(w, "Failed to delete plan day", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
