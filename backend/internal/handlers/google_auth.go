package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"beyond/backend/internal/data"
)

// NewGoogleOAuthConfig returns the shared oauth2.Config for Beyond's Google integration.
func NewGoogleOAuthConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{GooglePhotosScope},
		Endpoint:     google.Endpoint,
	}
}

// GooglePhotosScope is the only scope we request.
const GooglePhotosScope = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly"

// GoogleAuthHandler owns the OAuth connect/callback/status/disconnect flow.
type GoogleAuthHandler struct {
	cfg    *oauth2.Config
	tokens *data.GoogleTokenStore
	state  *stateStore
}

func NewGoogleAuthHandler(cfg *oauth2.Config, tokens *data.GoogleTokenStore) *GoogleAuthHandler {
	return &GoogleAuthHandler{
		cfg:    cfg,
		tokens: tokens,
		state:  newStateStore(),
	}
}

// Connect returns an OAuth consent URL the frontend can open in a popup.
func (h *GoogleAuthHandler) Connect(w http.ResponseWriter, r *http.Request) {
	state, err := h.state.create(GetUserID(r.Context()))
	if err != nil {
		http.Error(w, "failed to create state", http.StatusInternalServerError)
		return
	}
	consentURL := h.cfg.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
	)
	writeJSON(w, map[string]string{"consentUrl": consentURL})
}

// Callback completes the OAuth dance. This endpoint is hit directly by the user's
// browser after Google redirects back — no Bearer token is present. CSRF protection
// comes from the state parameter; the state itself is bound to a user ID server-side.
func (h *GoogleAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	if errParam := q.Get("error"); errParam != "" {
		renderCallback(w, false, "Google consent was cancelled or failed: "+errParam)
		return
	}

	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		renderCallback(w, false, "Missing code or state in callback.")
		return
	}

	userID, ok := h.state.consume(state)
	if !ok {
		renderCallback(w, false, "Invalid or expired state.")
		return
	}

	tok, err := h.cfg.Exchange(r.Context(), code)
	if err != nil {
		log.Printf("google oauth exchange failed: %v", err)
		renderCallback(w, false, "Token exchange failed.")
		return
	}

	if err := h.tokens.Save(r.Context(), userID, tok, h.cfg.Scopes); err != nil {
		log.Printf("persist google tokens failed: %v", err)
		renderCallback(w, false, "Could not save credentials.")
		return
	}

	renderCallback(w, true, "")
}

// Status tells the frontend whether the current user has connected Google Photos.
func (h *GoogleAuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	st, err := h.tokens.Status(r.Context(), GetUserID(r.Context()))
	if err != nil {
		log.Printf("google status lookup failed: %v", err)
		http.Error(w, "failed to look up status", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]interface{}{
		"connected": st.Connected,
		"scopes":    st.Scopes,
	})
}

// Disconnect revokes tokens with Google then deletes them from our DB.
func (h *GoogleAuthHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := h.tokens.Delete(r.Context(), GetUserID(r.Context()))
	if errors.Is(err, data.ErrNoGoogleTokens) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		log.Printf("delete google tokens failed: %v", err)
		http.Error(w, "failed to disconnect", http.StatusInternalServerError)
		return
	}

	// Best-effort revoke — don't fail the whole operation if Google is grumpy.
	if refreshToken != "" {
		go revokeAtGoogle(refreshToken)
	}

	w.WriteHeader(http.StatusNoContent)
}

func revokeAtGoogle(token string) {
	resp, err := http.PostForm("https://oauth2.googleapis.com/revoke",
		url.Values{"token": {token}})
	if err != nil {
		log.Printf("google revoke request failed: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		log.Printf("google revoke returned %d", resp.StatusCode)
	}
}

// renderCallback writes a minimal HTML page that signals the opener window and closes itself.
func renderCallback(w http.ResponseWriter, success bool, message string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	status := "error"
	if success {
		status = "success"
	}
	msgJSON, _ := json.Marshal(message)
	fmt.Fprintf(w, `<!doctype html>
<html><body>
<p>You can close this window.</p>
<script>
(function() {
  var payload = { type: "beyond:google-oauth", status: %q, message: %s };
  try {
    if (window.opener) {
      window.opener.postMessage(payload, "*");
    }
  } catch (e) {}
  setTimeout(function(){ window.close(); }, 300);
})();
</script>
</body></html>`, status, string(msgJSON))
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

// ─── state store ────────────────────────────────────────────────────────
// Short-lived, in-memory CSRF state parameter -> userID mapping. States expire
// after 10 minutes and are single-use.

type stateEntry struct {
	userID    string
	expiresAt time.Time
}

type stateStore struct {
	mu      sync.Mutex
	entries map[string]stateEntry
}

func newStateStore() *stateStore {
	s := &stateStore{entries: make(map[string]stateEntry)}
	go s.gcLoop()
	return s
}

func (s *stateStore) create(userID string) (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	state := base64.RawURLEncoding.EncodeToString(buf)
	s.mu.Lock()
	s.entries[state] = stateEntry{userID: userID, expiresAt: time.Now().Add(10 * time.Minute)}
	s.mu.Unlock()
	return state, nil
}

func (s *stateStore) consume(state string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[state]
	if !ok {
		return "", false
	}
	delete(s.entries, state)
	if time.Now().After(e.expiresAt) {
		return "", false
	}
	return e.userID, true
}

func (s *stateStore) gcLoop() {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for range t.C {
		s.mu.Lock()
		now := time.Now()
		for k, e := range s.entries {
			if now.After(e.expiresAt) {
				delete(s.entries, k)
			}
		}
		s.mu.Unlock()
	}
}

