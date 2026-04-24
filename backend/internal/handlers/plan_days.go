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

// CreatePlanDay handles POST /v1/plans/:plan_id/days
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

	// Verify plan belongs to user
	userID := GetUserID(r.Context())
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM plans WHERE id = $1 AND user_id = $2)", planID, userID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Plan not found", http.StatusNotFound)
		return
	}

	d.ID = uuid.New().String()
	d.PlanID = planID

	_, err = h.db.Exec(
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

// UpdatePlanDay handles PUT /v1/plans/days/:id (optional, maybe not needed yet)
func (h *PlanDaysHandler) UpdatePlanDay(w http.ResponseWriter, r *http.Request) {
	// Not implemented yet
	http.Error(w, "Not implemented", http.StatusNotImplemented)
}

// DeletePlanDay handles DELETE /v1/plans/days/:id
func (h *PlanDaysHandler) DeletePlanDay(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/plans/days/")

	// Verify plan day belongs to a plan owned by this user
	var exists bool
	if err := h.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM plan_days d JOIN plans p ON d.plan_id = p.id WHERE d.id = $1 AND p.user_id = $2)",
		id, userID,
	).Scan(&exists); err != nil || !exists {
		http.Error(w, "Plan day not found", http.StatusNotFound)
		return
	}

	_, err := h.db.Exec("DELETE FROM plan_days WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting plan day: %v", err)
		http.Error(w, "Failed to delete plan day", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
