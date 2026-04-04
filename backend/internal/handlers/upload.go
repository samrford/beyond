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
	if h.storage == nil {
		http.Error(w, "Storage not configured", http.StatusInternalServerError)
		return
	}

	// Limit upload size to 10MB
	r.ParseMultipartForm(10 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := uuid.New().String() + ext

	url, err := h.storage.UploadFile(r.Context(), filename, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		log.Printf("Error uploading to storage: %v", err)
		http.Error(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}
