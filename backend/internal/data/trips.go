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

// LoadTrips returns sample trip data
func LoadTrips() []Trip {
	return []Trip{
		{
			ID:          "1",
			Name:        "European Adventure",
			StartDate:   time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndDate:     time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC),
			HeaderPhoto: "/api/image",
			Summary:     "An amazing journey through Paris, Rome, and Florence!",
			Checkpoints: []Checkpoint{
				{
					ID:          "1-1",
					Name:        "Arrival in Paris",
					Location:    "Paris, France",
					Timestamp:   time.Date(2024, 6, 1, 14, 30, 0, 0, time.UTC),
					Description: "Landed at CDG airport and took the RER to the city center.",
					Photos:      []string{"/api/image", "/api/image"},
					Journal:     "The flight was long but worth it! The city lights of Paris were breathtaking.",
				},
				{
					ID:          "1-2",
					Name:        "Eiffel Tower",
					Location:    "Paris, France",
					Timestamp:   time.Date(2024, 6, 2, 10, 0, 0, 0, time.UTC),
					Description: "Visited the iconic Eiffel Tower and enjoyed the view from the top.",
					Photos:      []string{"/api/image", "/api/image"},
					Journal:     "The Eiffel Tower is even more beautiful in person! The view from the top was incredible.",
				},
				{
					ID:          "1-3",
					Name:        "Louvre Museum",
					Location:    "Paris, France",
					Timestamp:   time.Date(2024, 6, 3, 9, 0, 0, 0, time.UTC),
					Description: "Spent the day exploring the Louvre Museum and seeing the Mona Lisa.",
					Photos:      []string{"/api/image"},
					Journal:     "The Louvre is massive! We spent hours there and still didn't see everything.",
				},
				{
					ID:          "1-4",
					Name:        "Departure to Rome",
					Location:    "Paris, France",
					Timestamp:   time.Date(2024, 6, 5, 18, 0, 0, 0, time.UTC),
					Description: "Flight to Rome, Italy.",
					Photos:      []string{},
					Journal:     "Can't wait to see Rome! Heard it's one of the most beautiful cities in the world.",
				},
				{
					ID:          "1-5",
					Name:        "Arrival in Rome",
					Location:    "Rome, Italy",
					Timestamp:   time.Date(2024, 6, 6, 10, 0, 0, 0, time.UTC),
					Description: "Landed in Rome and headed straight to the Colosseum.",
					Photos:      []string{"/api/image"},
					Journal:     "Rome is absolutely stunning! The history is everywhere you look.",
				},
				{
					ID:          "1-6",
					Name:        "Colosseum",
					Location:    "Rome, Italy",
					Timestamp:   time.Date(2024, 6, 6, 11, 30, 0, 0, time.UTC),
					Description: "Visited the Colosseum and Roman Forum.",
					Photos:      []string{"/api/image", "/api/image"},
					Journal:     "Standing in the Colosseum was a dream come true! The history is palpable.",
				},
				{
					ID:          "1-7",
					Name:        "Vatican City",
					Location:    "Vatican City",
					Timestamp:   time.Date(2024, 6, 7, 9, 0, 0, 0, time.UTC),
					Description: "Toured St. Peter's Basilica and the Vatican Museums.",
					Photos:      []string{"/api/image"},
					Journal:     "The Vatican is smaller than expected but incredibly beautiful. Michelangelo's Sistine Chapel was breathtaking.",
				},
				{
					ID:          "1-8",
					Name:        "Departure to Florence",
					Location:    "Rome, Italy",
					Timestamp:   time.Date(2024, 6, 10, 16, 0, 0, 0, time.UTC),
					Description: "Flight to Florence.",
					Photos:      []string{},
					Journal:     "Florence is the birthplace of the Renaissance! Can't wait to explore.",
				},
				{
					ID:          "1-9",
					Name:        "Arrival in Florence",
					Location:    "Florence, Italy",
					Timestamp:   time.Date(2024, 6, 11, 9, 0, 0, 0, time.UTC),
					Description: "Landed in Florence and walked across the Ponte Vecchio.",
					Photos:      []string{"/api/image"},
					Journal:     "Florence is so romantic! The architecture is stunning.",
				},
				{
					ID:          "1-10",
					Name:        "Uffizi Gallery",
					Location:    "Florence, Italy",
					Timestamp:   time.Date(2024, 6, 12, 10, 0, 0, 0, time.UTC),
					Description: "Visited the Uffizi Gallery to see masterpieces by Botticelli and Da Vinci.",
					Photos:      []string{"/api/image"},
					Journal:     "The Uffizi is a treasure trove of art! Botticelli's Birth of Venus was even more beautiful than I imagined.",
				},
				{
					ID:          "1-11",
					Name:        "Departure",
					Location:    "Florence, Italy",
					Timestamp:   time.Date(2024, 6, 15, 14, 0, 0, 0, time.UTC),
					Description: "Final day in Italy, heading home.",
					Photos:      []string{"/api/image"},
					Journal:     "What an incredible trip! I'll never forget these memories.",
				},
			},
		},
	}
}
