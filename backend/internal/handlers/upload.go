package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"

	"beyond/backend/internal/data"
)

type UploadHandler struct {
	storage *data.Storage
}

func NewUploadHandler(storage *data.Storage) *UploadHandler {
	return &UploadHandler{
		storage: storage,
	}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	// 1. Max 10MB
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		log.Printf("ParseMultipartForm error: %v", err)
		http.Error(w, "File too large or invalid", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("FormFile error: %v", err)
		http.Error(w, "Failed to get file from form", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 2. Generate unique filename
	ext := filepath.Ext(header.Filename)
	uniqueFilename := uuid.New().String() + ext
	
	// 3. Upload
	url, err := h.storage.UploadFile(r.Context(), uniqueFilename, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		log.Printf("UploadFile error: %v", err)
		http.Error(w, "Failed to upload file to storage", http.StatusInternalServerError)
		return
	}

	// 4. Return URL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}
