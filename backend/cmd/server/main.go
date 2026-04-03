package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"beyond/backend/internal/data"
	"beyond/backend/internal/handlers"
)

// corsMiddleware adds CORS headers to all responses
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers FIRST, before any headers are written
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next(w, r)
	}
}

// imageHandler handles image requests with unique SVG placeholders based on path
func imageHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers FIRST, before any headers are written
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Path
	imageData := generateImageSVG(path)

	w.Header().Set("Content-Type", "image/svg+xml")
	w.Write(imageData)
}

func generateImageSVG(path string) []byte {
	pathID := strings.TrimPrefix(path, "/api/image/")
	if pathID == "" {
		pathID = "default"
	}

	svg := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f0f0f0"/>
  <circle cx="400" cy="200" r="100" fill="#e0e0e0"/>
  <text x="400" y="300" font-family="Arial" font-size="48" text-anchor="middle" fill="#666">` + pathID + `</text>
  <text x="400" y="360" font-family="Arial" font-size="24" text-anchor="middle" fill="#999">Beyond Travel</text>
</svg>`)

	return svg
}

func main() {
	// Read database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://beyond:password@localhost:5432/beyond?sslmode=disable"
	}

	// Initialize database
	db, err := data.InitDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Create handlers
	tripsHandler := handlers.NewTripsHandler(db)
	checkpointsHandler := handlers.NewCheckpointsHandler(db)

	// Create server with CORS middleware
	mux := http.NewServeMux()

	mux.HandleFunc("/api/trips", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			tripsHandler.ListTrips(w, r)
		} else if r.Method == "POST" {
			tripsHandler.CreateTrip(w, r)
		}
	}))

	mux.HandleFunc("/api/trips/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/trips/")
		if strings.HasSuffix(path, "/checkpoints") {
			if r.Method == "POST" {
				checkpointsHandler.CreateCheckpoint(w, r)
			}
			return
		}

		if r.Method == "GET" {
			tripsHandler.GetTrip(w, r)
		} else if r.Method == "PUT" {
			tripsHandler.UpdateTrip(w, r)
		} else if r.Method == "DELETE" {
			tripsHandler.DeleteTrip(w, r)
		}
	}))

	mux.HandleFunc("/api/checkpoints/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			checkpointsHandler.UpdateCheckpoint(w, r)
		} else if r.Method == "DELETE" {
			checkpointsHandler.DeleteCheckpoint(w, r)
		}
	}))

	mux.HandleFunc("/api/image/", imageHandler)
	mux.HandleFunc("/api/image", imageHandler)

	// Enable CORS for development - catch-all route
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS, POST, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not found"})
	})

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe("0.0.0.0:8080", mux))
}
