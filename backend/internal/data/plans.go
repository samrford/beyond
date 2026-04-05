package data

import (
	"time"
)

// Plan represents a planned trip
type Plan struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	StartDate   time.Time  `json:"startDate"`
	EndDate     time.Time  `json:"endDate"`
	Summary     string     `json:"summary"`
	CoverPhoto  string     `json:"coverPhoto"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Days        []PlanDay  `json:"days"`
	Unassigned  []PlanItem `json:"unassigned"`
}

// PlanDay represents a specific day within a plan
type PlanDay struct {
	ID        string     `json:"id"`
	PlanID    string     `json:"planId"`
	Date      time.Time  `json:"date"`
	Notes     string     `json:"notes"`
	Items     []PlanItem `json:"items"`
}

// PlanItem represents a place to visit or thing to do in a plan
type PlanItem struct {
	ID            string  `json:"id"`
	PlanID        string  `json:"planId"`
	PlanDayID     *string `json:"planDayId"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Location      string  `json:"location"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	OrderIndex    int      `json:"orderIndex"`
	EstimatedTime string   `json:"estimatedTime"`
	StartTime     *string  `json:"startTime"` // TIME in Postgres maps to hh:mm:ss string
	Duration      int      `json:"duration"`  // Minutes
}
