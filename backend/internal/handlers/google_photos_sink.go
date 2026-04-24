package handlers

import (
	"context"
	"path/filepath"
	"strings"

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
	ext := filepath.Ext(p.Filename)
	if ext == "" {
		ext = extFromMime(p.MimeType)
	}
	ct := p.MimeType
	if ct == "" {
		ct = "image/jpeg"
	}
	return s.fs.UploadFile(ctx, uuid.New().String()+ext, p.Bytes, p.Size, ct)
}

func extFromMime(mime string) string {
	switch {
	case strings.Contains(mime, "jpeg"), strings.Contains(mime, "jpg"):
		return ".jpg"
	case strings.Contains(mime, "png"):
		return ".png"
	case strings.Contains(mime, "gif"):
		return ".gif"
	case strings.Contains(mime, "webp"):
		return ".webp"
	case strings.Contains(mime, "heic"):
		return ".heic"
	default:
		return ".jpg"
	}
}
