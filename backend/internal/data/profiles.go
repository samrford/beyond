package data

import "time"

// UserProfile is the app-DB profile keyed by Supabase sub.
type UserProfile struct {
	UserID      string    `json:"userId"`
	Handle      string    `json:"handle"`
	DisplayName string    `json:"displayName"`
	Bio         string    `json:"bio"`
	AvatarURL   string    `json:"avatarUrl"`
	IsPublic    bool      `json:"isPublic"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// TripSummary is the small shape returned in profile pages and search.
type TripSummary struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	StartDate   time.Time `json:"startDate"`
	EndDate     time.Time `json:"endDate"`
	HeaderPhoto string    `json:"headerPhoto"`
	Summary     string    `json:"summary"`
	IsPublic    bool      `json:"isPublic"`
}

// PlanSummary mirrors TripSummary for plans.
type PlanSummary struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	StartDate  time.Time `json:"startDate"`
	EndDate    time.Time `json:"endDate"`
	Summary    string    `json:"summary"`
	CoverPhoto string    `json:"coverPhoto"`
	IsPublic   bool      `json:"isPublic"`
}

// SearchHit is a single result row for user search.
type SearchHit struct {
	UserID      string `json:"userId"`
	Handle      string `json:"handle"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
}
