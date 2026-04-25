package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"path/filepath"

	"github.com/google/uuid"

	"beyond/backend/internal/data"
)

type UploadHandler struct {
	storage data.FileStore
}

func NewUploadHandler(storage data.FileStore) *UploadHandler {
	return &UploadHandler{
		storage: storage,
	}
}

func (h *UploadHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	if h.storage == nil {
		http.Error(w, "Storage not configured", http.StatusInternalServerError)
		return
	}

	r.ParseMultipartForm(10 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusBadRequest)
		return
	}

	sniffed := http.DetectContentType(raw)
	if sniffed != "image/jpeg" && sniffed != "image/png" {
		http.Error(w, "Only JPEG and PNG images are supported", http.StatusUnsupportedMediaType)
		return
	}

	ext := filepath.Ext(header.Filename)
	filename := uuid.New().String() + ext

	body := raw
	contentType := sniffed
	if compressed, ct, cerr := data.CompressOriginal(r.Context(), raw); cerr == nil {
		body = compressed
		contentType = ct
	} else {
		log.Printf("Storing original unchanged (compression failed: %v)", cerr)
	}

	url, err := h.storage.UploadFile(r.Context(), filename, bytes.NewReader(body), int64(len(body)), contentType)
	if err != nil {
		log.Printf("Error uploading to storage: %v", err)
		http.Error(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}
