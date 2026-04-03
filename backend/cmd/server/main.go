package main

import (
	"encoding/json"
	"log"
	"net/http"
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

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow GET requests
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract path info to generate unique images
	path := r.URL.Path

	// Generate unique SVG based on path
	imageData := generateImageSVG(path)

	w.Header().Set("Content-Type", "image/svg+xml")
	w.Write(imageData)
}

// generateImageSVG creates a unique SVG image based on the path
func generateImageSVG(path string) []byte {
	// Extract a simple identifier from the path
	pathID := strings.TrimPrefix(path, "/api/image/")
	if pathID == "" {
		pathID = "default"
	}

	// Create a colorful SVG with the path ID
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
	// Load hardcoded trip data
	trips := data.LoadTrips()

	// Create handler
	handler := handlers.NewTripsHandler(trips)

	// Create server with CORS middleware
	mux := http.NewServeMux()

	// Wrap all handlers with CORS middleware
	mux.HandleFunc("/api/trips", corsMiddleware(handler.ListTrips))
	mux.HandleFunc("/api/trips/", corsMiddleware(handler.GetTrip))

	// Image handler for placeholder images (with CORS) - handles /api/image/* paths
	mux.HandleFunc("/api/image/", imageHandler)

	// Also handle exact /api/image path
	mux.HandleFunc("/api/image", imageHandler)

	// Enable CORS for development - catch-all route
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
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
	log.Fatal(http.ListenAndServe(":8080", mux))
}
