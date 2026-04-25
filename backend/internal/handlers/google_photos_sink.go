package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/google/uuid"
	photopicker "github.com/samrford/google-photos-picker"

	"beyond/backend/internal/data"
)

type beyondSink struct {
	fs data.FileStore
	db *sql.DB
}

// NewBeyondSink returns a photopicker.PhotoSink that uploads photos to MinIO
// and records their ownership in the uploads manifest.
func NewBeyondSink(fs data.FileStore, db *sql.DB) photopicker.PhotoSink {
	return &beyondSink{fs: fs, db: db}
}

func (s *beyondSink) SavePhoto(ctx context.Context, userID, _ string, p photopicker.DownloadedPhoto) (string, error) {
	raw, err := io.ReadAll(p.Bytes)
	if err != nil {
		return "", fmt.Errorf("read photo: %w", err)
	}

	sniffed := http.DetectContentType(raw)
	if sniffed != "image/jpeg" && sniffed != "image/png" {
		return "", fmt.Errorf("unsupported format %q (only JPEG and PNG accepted)", sniffed)
	}

	body := raw
	ct := sniffed
	if compressed, c, cerr := data.CompressOriginal(ctx, raw); cerr == nil {
		body = compressed
		ct = c
	} else {
		log.Printf("Storing Google Photos original unchanged (compression failed: %v)", cerr)
	}

	ext := ".jpg"
	if sniffed == "image/png" {
		ext = ".png"
	}

	filename, err := s.fs.UploadFile(ctx, uuid.New().String()+ext, bytes.NewReader(body), int64(len(body)), ct)
	if err != nil {
		return "", err
	}

	if s.db != nil {
		_, dbErr := s.db.ExecContext(ctx,
			`INSERT INTO uploads (key, user_id) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
			filename, userID,
		)
		if dbErr != nil {
			// If we fail to record ownership, clean up the file from storage so it doesn't sit orphaned
			_ = s.fs.DeleteFile(ctx, filename)
			return "", fmt.Errorf("failed to record upload manifest: %w", dbErr)
		}
	}

	return filename, nil
}
