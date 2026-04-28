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
	BgMode      string       `json:"bgMode"`
	BgBlur      int          `json:"bgBlur"`
	BgOpacity   int          `json:"bgOpacity"`
	BgDarkness  int          `json:"bgDarkness"`
	Checkpoints []Checkpoint `json:"checkpoints"`
}

// Checkpoint represents a checkpoint/event in a trip
type Checkpoint struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Location     string     `json:"location"`
	Timestamp    time.Time  `json:"timestamp"`
	EndTimestamp *time.Time `json:"endTimestamp"`
	Description  string     `json:"description"`
	Photos       []string   `json:"photos"`
	Journal      string     `json:"journal"`
	HeroPhoto    string     `json:"heroPhoto"`
	SidePhoto1   string     `json:"sidePhoto1"`
	SidePhoto2   string     `json:"sidePhoto2"`
	SidePhoto3   string     `json:"sidePhoto3"`
}


