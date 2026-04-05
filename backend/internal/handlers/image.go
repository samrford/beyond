package handlers

import (
	"fmt"
	"net/http"
	"strings"
)

// ImageHandler handles image requests with proper CORS
func ImageHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers FIRST, before any headers are written
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract image path from URL
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/image/") {
		http.Error(w, "Invalid image path", http.StatusBadRequest)
		return
	}

	// Extract the image identifier from the path
	imageID := strings.TrimPrefix(path, "/api/image/")

	// Generate a unique image based on the ID
	imageData := fmt.Sprintf("Beyond Travel Image: %s", imageID)
	imageBytes := []byte(imageData)

	// Set content type and length
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(imageBytes)))

	// Write the image data
	w.Write(imageBytes)
}
