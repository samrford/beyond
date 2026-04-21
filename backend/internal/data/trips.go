package data

import (
	"time"
)

// Trip represents a travel trip with checkpoints
type Trip struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	StartDate   time.Time    `json:"startDate"`
	EndDate     time.Time    `json:"endDate"`
	HeaderPhoto string       `json:"headerPhoto"`
	Summary     string       `json:"summary"`
	Checkpoints []Checkpoint `json:"checkpoints"`
}

// Checkpoint represents a checkpoint/event in a trip
type Checkpoint struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Location    string    `json:"location"`
	Timestamp   time.Time `json:"timestamp"`
	Description string    `json:"description"`
	Photos      []string  `json:"photos"`
	Journal     string    `json:"journal"`
	HeroPhoto   string    `json:"heroPhoto"`
}


