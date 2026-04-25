package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/google/uuid"
	photopicker "github.com/samrford/google-photos-picker"

	"beyond/backend/internal/data"
)

type beyondSink struct{ fs data.FileStore }

// NewBeyondSink returns a photopicker.PhotoSink that uploads photos to MinIO.
func NewBeyondSink(fs data.FileStore) photopicker.PhotoSink {
	return &beyondSink{fs: fs}
}

func (s *beyondSink) SavePhoto(ctx context.Context, _, _ string, p photopicker.DownloadedPhoto) (string, error) {
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

	return s.fs.UploadFile(ctx, uuid.New().String()+ext, bytes.NewReader(body), int64(len(body)), ct)
}
