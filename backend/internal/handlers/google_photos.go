package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/oauth2"

	"beyond/backend/internal/data"
)

const (
	photosPickerAPIBase = "https://photospicker.googleapis.com/v1"
	pickerPollTimeout   = 5 * time.Minute
	importDownloadSize  = 50 << 20 // 50MB per photo cap
)

// GooglePhotosHandler owns picker session + import endpoints and the background worker.
type GooglePhotosHandler struct {
	cfg     *oauth2.Config
	tokens  *data.GoogleTokenStore
	imports *data.GoogleImportStore
	storage data.FileStore
}

func NewGooglePhotosHandler(cfg *oauth2.Config, tokens *data.GoogleTokenStore, imports *data.GoogleImportStore, storage data.FileStore) *GooglePhotosHandler {
	return &GooglePhotosHandler{
		cfg:     cfg,
		tokens:  tokens,
		imports: imports,
		storage: storage,
	}
}

// ─── Session endpoints ──────────────────────────────────────────────────

type pickerSession struct {
	ID            string `json:"id"`
	PickerURI     string `json:"pickerUri"`
	MediaItemsSet bool   `json:"mediaItemsSet"`
}

// CreateSession creates a new picking session with Google and returns the pickerUri
// the frontend should open in a popup.
func (h *GooglePhotosHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var sess pickerSession
	err := h.googleJSON(r.Context(), GetUserID(r.Context()), "POST", photosPickerAPIBase+"/sessions", []byte(`{}`), &sess)
	if err != nil {
		if errors.Is(err, data.ErrNoGoogleTokens) {
			http.Error(w, `{"error":"google_not_connected"}`, http.StatusPreconditionRequired)
			return
		}
		log.Printf("create picker session: %v", err)
		http.Error(w, "failed to create picker session", http.StatusBadGateway)
		return
	}
	writeJSON(w, map[string]string{"sessionId": sess.ID, "pickerUri": sess.PickerURI})
}

// PollSession reports picking progress. Returns `ready` once the user has picked.
func (h *GooglePhotosHandler) PollSession(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/google-photos/sessions/"), "/")
	if sessionID == "" {
		http.Error(w, "missing session id", http.StatusBadRequest)
		return
	}

	var sess pickerSession
	err := h.googleJSON(r.Context(), GetUserID(r.Context()), "GET", photosPickerAPIBase+"/sessions/"+sessionID, nil, &sess)
	if err != nil {
		log.Printf("poll picker session: %v", err)
		http.Error(w, "failed to poll session", http.StatusBadGateway)
		return
	}

	status := "pending"
	if sess.MediaItemsSet {
		status = "ready"
	}
	writeJSON(w, map[string]string{"status": status})
}

// StartImport kicks off an async import job for a session's picked items.
func (h *GooglePhotosHandler) StartImport(w http.ResponseWriter, r *http.Request) {
	// Path shape: /api/google-photos/sessions/{sessionID}/import
	path := strings.TrimPrefix(r.URL.Path, "/api/google-photos/sessions/")
	sessionID := strings.TrimSuffix(path, "/import")
	if sessionID == "" || sessionID == path {
		http.Error(w, "missing session id", http.StatusBadRequest)
		return
	}

	jobID, err := h.imports.CreateJob(r.Context(), GetUserID(r.Context()), sessionID)
	if err != nil {
		log.Printf("create import job: %v", err)
		http.Error(w, "failed to create import job", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"importJobId": jobID})
}

// GetImport reports job progress and, once complete, the resulting image URLs.
func (h *GooglePhotosHandler) GetImport(w http.ResponseWriter, r *http.Request) {
	jobID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/google-photos/imports/"), "/")
	if jobID == "" {
		http.Error(w, "missing job id", http.StatusBadRequest)
		return
	}

	job, err := h.imports.Get(r.Context(), GetUserID(r.Context()), jobID)
	if errors.Is(err, data.ErrImportNotFound) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("get import job: %v", err)
		http.Error(w, "failed to look up job", http.StatusInternalServerError)
		return
	}

	writeJSON(w, job)
}

// ─── Google API plumbing ────────────────────────────────────────────────

// googleRequest executes an authenticated request against a Google API and
// returns the (opened) response. Caller must Close the body.
// A non-2xx status is returned as an error along with a bounded body excerpt.
func (h *GooglePhotosHandler) googleRequest(ctx context.Context, userID, method, reqURL string, body []byte) (*http.Response, error) {
	access, err := h.tokens.AccessToken(ctx, userID, h.cfg)
	if err != nil {
		return nil, err
	}
	var rdr io.Reader
	if body != nil {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, reqURL, rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		excerpt, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		resp.Body.Close()
		return nil, fmt.Errorf("%s %s: %d: %s", method, reqURL, resp.StatusCode, excerpt)
	}
	return resp, nil
}

// googleJSON is the JSON-decoding variant of googleRequest. Pass out=nil to
// discard the response body (e.g. for DELETE).
func (h *GooglePhotosHandler) googleJSON(ctx context.Context, userID, method, reqURL string, body []byte, out interface{}) error {
	resp, err := h.googleRequest(ctx, userID, method, reqURL, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

type mediaItem struct {
	ID        string    `json:"id"`
	MediaFile mediaFile `json:"mediaFile"`
}

type mediaFile struct {
	BaseURL  string `json:"baseUrl"`
	MimeType string `json:"mimeType"`
	Filename string `json:"filename"`
}

type listMediaItemsResponse struct {
	MediaItems    []mediaItem `json:"mediaItems"`
	NextPageToken string      `json:"nextPageToken"`
}

func (h *GooglePhotosHandler) listSessionMediaItems(ctx context.Context, userID, sessionID string) ([]mediaItem, error) {
	var out []mediaItem
	pageToken := ""
	for {
		params := url.Values{"sessionId": {sessionID}, "pageSize": {"100"}}
		if pageToken != "" {
			params.Set("pageToken", pageToken)
		}
		var page listMediaItemsResponse
		if err := h.googleJSON(ctx, userID, "GET", photosPickerAPIBase+"/mediaItems?"+params.Encode(), nil, &page); err != nil {
			return nil, err
		}
		out = append(out, page.MediaItems...)
		if page.NextPageToken == "" {
			return out, nil
		}
		pageToken = page.NextPageToken
	}
}

func (h *GooglePhotosHandler) deletePickerSession(ctx context.Context, userID, sessionID string) {
	// Best-effort: ignore the error.
	_ = h.googleJSON(ctx, userID, "DELETE", photosPickerAPIBase+"/sessions/"+sessionID, nil, nil)
}

// ─── Worker ─────────────────────────────────────────────────────────────

// RunWorker processes import jobs from the queue until ctx is done.
// Claims use FOR UPDATE SKIP LOCKED so multiple backend replicas could run
// safely, though for now we run one.
func (h *GooglePhotosHandler) RunWorker(ctx context.Context) {
	t := time.NewTicker(2 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			h.drainPending(ctx)
		}
	}
}

func (h *GooglePhotosHandler) drainPending(ctx context.Context) {
	for {
		job, err := h.imports.ClaimNextPending(ctx)
		if err != nil {
			log.Printf("claim import job: %v", err)
			return
		}
		if job == nil {
			return
		}
		h.processJob(ctx, job)
	}
}

func (h *GooglePhotosHandler) processJob(ctx context.Context, job *data.ImportJob) {
	jobCtx, cancel := context.WithTimeout(ctx, pickerPollTimeout+30*time.Minute)
	defer cancel()

	items, err := h.listSessionMediaItems(jobCtx, job.UserID, job.SessionID)
	if err != nil {
		log.Printf("import %s: list media items: %v", job.ID, err)
		_ = h.imports.MarkFailed(jobCtx, job.ID, err.Error())
		return
	}

	if err := h.imports.SetTotal(jobCtx, job.ID, len(items)); err != nil {
		log.Printf("import %s: set total: %v", job.ID, err)
	}

	for _, item := range items {
		if err := h.importOne(jobCtx, job.UserID, job.ID, item); err != nil {
			log.Printf("import %s: item %s: %v", job.ID, item.ID, err)
			_ = h.imports.RecordItemFailure(jobCtx, job.ID)
			continue
		}
	}

	if err := h.imports.MarkComplete(jobCtx, job.ID); err != nil {
		log.Printf("import %s: mark complete: %v", job.ID, err)
	}
	h.deletePickerSession(jobCtx, job.UserID, job.SessionID)
}

func (h *GooglePhotosHandler) importOne(ctx context.Context, userID, jobID string, item mediaItem) error {
	// =d appended to baseUrl requests the original bytes.
	resp, err := h.googleRequest(ctx, userID, "GET", item.MediaFile.BaseURL+"=d", nil)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, importDownloadSize+1))
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}
	if len(body) > importDownloadSize {
		return fmt.Errorf("item exceeds %d bytes", importDownloadSize)
	}

	ext := filepath.Ext(item.MediaFile.Filename)
	if ext == "" {
		ext = extFromMime(item.MediaFile.MimeType)
	}
	filename := uuid.New().String() + ext
	contentType := item.MediaFile.MimeType
	if contentType == "" {
		contentType = "image/jpeg"
	}

	imageURL, err := h.storage.UploadFile(ctx, filename, bytes.NewReader(body), int64(len(body)), contentType)
	if err != nil {
		return fmt.Errorf("upload: %w", err)
	}

	return h.imports.RecordItemSuccess(ctx, jobID, imageURL)
}

func extFromMime(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/heic":
		return ".heic"
	default:
		return ""
	}
}
