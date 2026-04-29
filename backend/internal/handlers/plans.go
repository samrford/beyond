package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"beyond/backend/internal/data"
)

type PlansHandler struct {
	db *sql.DB
}

func NewPlansHandler(db *sql.DB) *PlansHandler {
	return &PlansHandler{
		db: db,
	}
}

// ListPlans handles GET /v1/plans
func (h *PlansHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	rows, err := h.db.Query("SELECT id, name, start_date, end_date, summary, cover_photo, created_at, updated_at, is_public FROM plans WHERE user_id = $1 ORDER BY start_date ASC", userID)
	if err != nil {
		log.Printf("Error querying plans: %v", err)
		http.Error(w, "Failed to load plans", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var plans []data.Plan
	for rows.Next() {
		var p data.Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.Summary, &p.CoverPhoto, &p.CreatedAt, &p.UpdatedAt, &p.IsPublic); err != nil {
			log.Printf("Error scanning plan: %v", err)
			continue
		}
		// Initialize empty arrays so they don't marshal to null
		p.Days = []data.PlanDay{}
		p.Unassigned = []data.PlanItem{}
		p.IsOwner = true
		plans = append(plans, p)
	}

	w.Header().Set("Content-Type", "application/json")
	if plans == nil {
		plans = []data.Plan{}
	}
	json.NewEncoder(w).Encode(plans)
}

// GetPlan handles GET /v1/plans/:id
func (h *PlansHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/plans/")

	row := h.db.QueryRow("SELECT id, name, start_date, end_date, summary, cover_photo, created_at, updated_at, is_public, user_id FROM plans WHERE id = $1", id)

	var p data.Plan
	var ownerID string
	if err := row.Scan(&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.Summary, &p.CoverPhoto, &p.CreatedAt, &p.UpdatedAt, &p.IsPublic, &ownerID); err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Plan not found"})
			return
		}
		log.Printf("Error querying plan: %v", err)
		http.Error(w, "Failed to load plan", http.StatusInternalServerError)
		return
	}

	p.IsOwner = ownerID == userID
	if !p.IsOwner && !p.IsPublic {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Plan not found"})
		return
	}

	// 1. Fetch PlanDays
	dRows, err := h.db.Query("SELECT id, date, notes FROM plan_days WHERE plan_id = $1 ORDER BY date ASC", id)
	if err != nil {
		log.Printf("Error querying plan days: %v", err)
		http.Error(w, "Failed to load plan days", http.StatusInternalServerError)
		return
	}
	defer dRows.Close()

	daysMap := make(map[string]*data.PlanDay)
	var orderedDays []*data.PlanDay

	for dRows.Next() {
		var d data.PlanDay
		d.PlanID = id
		if err := dRows.Scan(&d.ID, &d.Date, &d.Notes); err != nil {
			log.Printf("Error scanning plan day: %v", err)
			continue
		}
		d.Items = []data.PlanItem{}
		daysMap[d.ID] = &d
		orderedDays = append(orderedDays, &d)
	}

	// 2. Fetch PlanItems
	iRows, err := h.db.Query("SELECT id, plan_day_id, name, description, location, latitude, longitude, order_index, estimated_time, start_time, duration FROM plan_items WHERE plan_id = $1 ORDER BY order_index ASC", id)
	if err != nil {
		log.Printf("Error querying plan items: %v", err)
		http.Error(w, "Failed to load plan items", http.StatusInternalServerError)
		return
	}
	defer iRows.Close()

	p.Unassigned = []data.PlanItem{}
	for iRows.Next() {
		var i data.PlanItem
		i.PlanID = id

		// Use sql.Null types for nullable fields
		var dayID sql.NullString
		var lat sql.NullFloat64
		var lon sql.NullFloat64
		var startTime sql.NullString

		if err := iRows.Scan(&i.ID, &dayID, &i.Name, &i.Description, &i.Location, &lat, &lon, &i.OrderIndex, &i.EstimatedTime, &startTime, &i.Duration); err != nil {
			log.Printf("Error scanning plan item: %v", err)
			continue
		}

		if dayID.Valid {
			str := dayID.String
			i.PlanDayID = &str
		}
		if lat.Valid {
			val := lat.Float64
			i.Latitude = &val
		}
		if lon.Valid {
			val := lon.Float64
			i.Longitude = &val
		}
		if startTime.Valid {
			str := startTime.String
			i.StartTime = &str
		}

		// Categorize item
		if i.PlanDayID == nil {
			p.Unassigned = append(p.Unassigned, i)
		} else {
			if day, exists := daysMap[*i.PlanDayID]; exists {
				day.Items = append(day.Items, i)
			} else {
				// Fallback if day is missing somehow
				p.Unassigned = append(p.Unassigned, i)
			}
		}
	}

	// Reconstruct the Days slice from the ordered slice of pointers
	p.Days = []data.PlanDay{}
	for _, dPtr := range orderedDays {
		p.Days = append(p.Days, *dPtr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// CreatePlan handles POST /v1/plans
func (h *PlansHandler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var p data.Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userID := GetUserID(r.Context())
	p.ID = uuid.New().String()
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now

	_, err := h.db.Exec(
		"INSERT INTO plans (id, name, start_date, end_date, summary, cover_photo, created_at, updated_at, user_id, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		p.ID, p.Name, p.StartDate, p.EndDate, p.Summary, p.CoverPhoto, p.CreatedAt, p.UpdatedAt, userID, p.IsPublic,
	)
	if err != nil {
		log.Printf("Error inserting plan: %v", err)
		http.Error(w, "Failed to create plan", http.StatusInternalServerError)
		return
	}

	p.IsOwner = true
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

// UpdatePlan handles PUT /v1/plans/:id
func (h *PlansHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/plans/")

	var p data.Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	now := time.Now()
	p.UpdatedAt = now

	_, err := h.db.Exec(
		"UPDATE plans SET name = $1, start_date = $2, end_date = $3, summary = $4, cover_photo = $5, updated_at = $6, is_public = $7 WHERE id = $8 AND user_id = $9",
		p.Name, p.StartDate, p.EndDate, p.Summary, p.CoverPhoto, p.UpdatedAt, p.IsPublic, id, userID,
	)
	if err != nil {
		log.Printf("Error updating plan: %v", err)
		http.Error(w, "Failed to update plan", http.StatusInternalServerError)
		return
	}

	p.ID = id
	p.IsOwner = true
	json.NewEncoder(w).Encode(p)
}

// DeletePlan handles DELETE /v1/plans/:id
func (h *PlansHandler) DeletePlan(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	id := strings.TrimPrefix(r.URL.Path, "/v1/plans/")

	_, err := h.db.Exec("DELETE FROM plans WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		log.Printf("Error deleting plan: %v", err)
		http.Error(w, "Failed to delete plan", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ImportPlan handles POST /v1/plans/import
func (h *PlansHandler) ImportPlan(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	var p data.Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Create new plan
	newPlanID := uuid.New().String()
	now := time.Now()
	_, err = tx.Exec(
		"INSERT INTO plans (id, name, start_date, end_date, summary, cover_photo, created_at, updated_at, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		newPlanID, p.Name, p.StartDate, p.EndDate, p.Summary, p.CoverPhoto, now, now, userID,
	)
	if err != nil {
		log.Printf("Error inserting plan: %v", err)
		http.Error(w, "Failed to create plan", http.StatusInternalServerError)
		return
	}

	// Insert unassigned items
	for _, item := range p.Unassigned {
		newItemID := uuid.New().String()
		st := sanitizeTime(item.StartTime)
		_, err = tx.Exec(
			"INSERT INTO plan_items (id, plan_id, plan_day_id, name, description, location, latitude, longitude, order_index, estimated_time, start_time, duration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
			newItemID, newPlanID, nil, item.Name, item.Description, item.Location, item.Latitude, item.Longitude, item.OrderIndex, item.EstimatedTime, st, item.Duration,
		)
		if err != nil {
			log.Printf("Error inserting unassigned item: %v", err)
			http.Error(w, "Failed to import plan items", http.StatusInternalServerError)
			return
		}
	}

	// Insert days and their items
	for _, day := range p.Days {
		newDayID := uuid.New().String()
		_, err = tx.Exec(
			"INSERT INTO plan_days (id, plan_id, date, notes) VALUES ($1, $2, $3, $4)",
			newDayID, newPlanID, day.Date, day.Notes,
		)
		if err != nil {
			log.Printf("Error inserting day: %v", err)
			http.Error(w, "Failed to import plan days", http.StatusInternalServerError)
			return
		}

		for _, item := range day.Items {
			newItemID := uuid.New().String()
			st := sanitizeTime(item.StartTime)
			_, err = tx.Exec(
				"INSERT INTO plan_items (id, plan_id, plan_day_id, name, description, location, latitude, longitude, order_index, estimated_time, start_time, duration) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
				newItemID, newPlanID, newDayID, item.Name, item.Description, item.Location, item.Latitude, item.Longitude, item.OrderIndex, item.EstimatedTime, st, item.Duration,
			)
			if err != nil {
				log.Printf("Error inserting day item: %v", err)
				http.Error(w, "Failed to import plan day items", http.StatusInternalServerError)
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	p.ID = newPlanID
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func sanitizeTime(t *string) *string {
	if t == nil {
		return nil
	}
	s := *t
	if strings.Contains(s, "T") {
		parts := strings.Split(s, "T")
		if len(parts) > 1 {
			timePart := parts[1]
			// Strip any Z or offset
			timePart = strings.TrimSuffix(timePart, "Z")
			// We only want HH:MM:SS or HH:MM
			if strings.Contains(timePart, ".") {
				timePart = strings.Split(timePart, ".")[0]
			}
			if len(timePart) > 8 {
				timePart = timePart[:8]
			}
			return &timePart
		}
	}
	return t
}

// ConvertPlanToTrip handles POST /v1/plans/:id/convert
func (h *PlansHandler) ConvertPlanToTrip(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Convert to Trip is not yet implemented", http.StatusNotImplemented)
}
