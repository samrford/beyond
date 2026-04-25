package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"beyond/backend/internal/data"
)

type UploadHandler struct {
	storage data.FileStore
	db      *sql.DB
}

func NewUploadHandler(storage data.FileStore, db *sql.DB) *UploadHandler {
	return &UploadHandler{
		storage: storage,
		db:      db,
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

	// Record the upload in the manifest table so it can be tracked and cleaned up.
	if h.db != nil {
		userID := GetUserID(r.Context())
		if _, dbErr := h.db.ExecContext(r.Context(),
			`INSERT INTO uploads (key, user_id) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
			filename, userID,
		); dbErr != nil {
			log.Printf("Error: failed to record upload %s in manifest: %v", filename, dbErr)
			// Cleanup the orphaned file in storage since the DB insert failed
			_ = h.storage.DeleteFile(r.Context(), filename)
			http.Error(w, "Failed to record upload", http.StatusInternalServerError)
			return
		}
	}

	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}

// HandleDelete deletes an uploaded file if it is owned by the requesting user
// and is not currently referenced by any trip, plan, or checkpoint.
func (h *UploadHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/v1/upload/")
	if filename == "" {
		http.Error(w, "No filename specified", http.StatusBadRequest)
		return
	}

	if h.storage == nil || h.db == nil {
		http.Error(w, "Storage not configured", http.StatusInternalServerError)
		return
	}

	userID := GetUserID(r.Context())

	// Verify the file exists and is owned by the requesting user.
	var ownerID string
	err := h.db.QueryRowContext(r.Context(),
		`SELECT user_id FROM uploads WHERE key = $1`, filename,
	).Scan(&ownerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Error querying uploads: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if ownerID != userID {
		// Return 404 to avoid leaking whether the filename exists.
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	// Safety check: refuse to delete a file that is currently referenced.
	var referenced bool
	err = h.db.QueryRowContext(r.Context(), `
		SELECT EXISTS(
			SELECT 1 FROM trips       WHERE header_photo = $1
			UNION ALL
			SELECT 1 FROM plans       WHERE cover_photo  = $1
			UNION ALL
			SELECT 1 FROM checkpoints WHERE hero_photo   = $1
			UNION ALL
			SELECT 1 FROM checkpoints WHERE photos @> to_jsonb($1::text)
		)`, filename,
	).Scan(&referenced)
	if err != nil {
		log.Printf("Error checking file references: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if referenced {
		log.Printf("Info: ignoring delete request for %s; file is referenced by an active record", filename)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Delete from storage first, then remove the manifest row.
	if err := h.storage.DeleteFile(r.Context(), filename); err != nil {
		log.Printf("Error deleting file from storage: %v", err)
		http.Error(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	if _, err := h.db.ExecContext(r.Context(),
		`DELETE FROM uploads WHERE key = $1`, filename,
	); err != nil {
		log.Printf("Warning: file deleted from storage but failed to remove manifest row: %v", err)
	}

	w.WriteHeader(http.StatusNoContent)
}
