package types

// Trip represents a travel trip with checkpoints
type Trip struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	StartDate   string       `json:"startDate"`
	EndDate     string       `json:"endDate"`
	HeaderPhoto string       `json:"headerPhoto"`
	Summary     string       `json:"summary"`
	Checkpoints []Checkpoint `json:"checkpoints"`
}

// Checkpoint represents a checkpoint/event in a trip
type Checkpoint struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Location    string   `json:"location"`
	Timestamp   string   `json:"timestamp"`
	Description string   `json:"description"`
	Photos      []string `json:"photos"`
	Journal     string   `json:"journal"`
}
