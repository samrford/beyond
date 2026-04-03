package data

import (
	"time"
)

// Trip represents a travel trip with checkpoints
type Trip struct {
	ID          string
	Name        string
	StartDate   time.Time
	EndDate     time.Time
	HeaderPhoto string
	Summary     string
	Checkpoints []Checkpoint
}

// Checkpoint represents a checkpoint/event in a trip
type Checkpoint struct {
	ID          string
	Name        string
	Location    string
	Timestamp   time.Time
	Description string
	Photos      []string
	Journal     string
}


