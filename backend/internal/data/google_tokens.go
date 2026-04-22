package data

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/lib/pq"
	"golang.org/x/oauth2"
)

var ErrNoGoogleTokens = errors.New("no google tokens for user")

// GoogleTokenStore persists Google OAuth tokens, encrypted at rest.
type GoogleTokenStore struct {
	db     *sql.DB
	cipher cipher.AEAD
}

// NewGoogleTokenStore builds a token store. encryptionKeyHex must be a 32-byte key
// encoded as hex (64 hex chars), used for AES-256-GCM.
func NewGoogleTokenStore(db *sql.DB, encryptionKeyHex string) (*GoogleTokenStore, error) {
	key, err := hex.DecodeString(encryptionKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key hex: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes (got %d)", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &GoogleTokenStore{db: db, cipher: aead}, nil
}

func (s *GoogleTokenStore) encrypt(plain string) ([]byte, error) {
	if plain == "" {
		return nil, nil
	}
	nonce := make([]byte, s.cipher.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return s.cipher.Seal(nonce, nonce, []byte(plain), nil), nil
}

func (s *GoogleTokenStore) decrypt(ct []byte) (string, error) {
	if len(ct) == 0 {
		return "", nil
	}
	ns := s.cipher.NonceSize()
	if len(ct) < ns {
		return "", errors.New("ciphertext too short")
	}
	nonce, body := ct[:ns], ct[ns:]
	plain, err := s.cipher.Open(nil, nonce, body, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// Save upserts a user's tokens.
func (s *GoogleTokenStore) Save(ctx context.Context, userID string, tok *oauth2.Token, scopes []string) error {
	refreshCT, err := s.encrypt(tok.RefreshToken)
	if err != nil {
		return err
	}
	accessCT, err := s.encrypt(tok.AccessToken)
	if err != nil {
		return err
	}

	// If no refresh token in this response (Google only returns one on first consent
	// unless prompt=consent), keep whatever we already have.
	var expiry interface{}
	if !tok.Expiry.IsZero() {
		expiry = tok.Expiry
	}

	if len(refreshCT) == 0 {
		_, err = s.db.ExecContext(ctx, `
			UPDATE google_oauth_tokens
			SET access_token = $2, expires_at = $3, scopes = $4, updated_at = NOW()
			WHERE user_id = $1
		`, userID, accessCT, expiry, pq.Array(scopes))
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO google_oauth_tokens (user_id, refresh_token, access_token, expires_at, scopes)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			refresh_token = EXCLUDED.refresh_token,
			access_token  = EXCLUDED.access_token,
			expires_at    = EXCLUDED.expires_at,
			scopes        = EXCLUDED.scopes,
			updated_at    = NOW()
	`, userID, refreshCT, accessCT, expiry, pq.Array(scopes))
	return err
}

// updateAccessOnly updates just the access_token/expiry after a silent refresh,
// leaving the refresh_token untouched.
func (s *GoogleTokenStore) updateAccessOnly(ctx context.Context, userID string, tok *oauth2.Token) error {
	accessCT, err := s.encrypt(tok.AccessToken)
	if err != nil {
		return err
	}
	var expiry interface{}
	if !tok.Expiry.IsZero() {
		expiry = tok.Expiry
	}
	_, err = s.db.ExecContext(ctx, `
		UPDATE google_oauth_tokens
		SET access_token = $2, expires_at = $3, updated_at = NOW()
		WHERE user_id = $1
	`, userID, accessCT, expiry)
	return err
}

type GoogleTokenStatus struct {
	Connected bool
	Scopes    []string
}

func (s *GoogleTokenStore) Status(ctx context.Context, userID string) (GoogleTokenStatus, error) {
	var scopes []string
	err := s.db.QueryRowContext(ctx, `
		SELECT scopes FROM google_oauth_tokens WHERE user_id = $1
	`, userID).Scan(pq.Array(&scopes))
	if errors.Is(err, sql.ErrNoRows) {
		return GoogleTokenStatus{Connected: false}, nil
	}
	if err != nil {
		return GoogleTokenStatus{}, err
	}
	return GoogleTokenStatus{Connected: true, Scopes: scopes}, nil
}

func (s *GoogleTokenStore) Delete(ctx context.Context, userID string) (refreshToken string, err error) {
	var refreshCT []byte
	err = s.db.QueryRowContext(ctx, `
		DELETE FROM google_oauth_tokens WHERE user_id = $1 RETURNING refresh_token
	`, userID).Scan(&refreshCT)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNoGoogleTokens
	}
	if err != nil {
		return "", err
	}
	return s.decrypt(refreshCT)
}

// AccessToken returns a valid, non-expired access token for the given user,
// refreshing it silently if needed.
func (s *GoogleTokenStore) AccessToken(ctx context.Context, userID string, cfg *oauth2.Config) (string, error) {
	var (
		refreshCT []byte
		accessCT  []byte
		expires   sql.NullTime
	)
	err := s.db.QueryRowContext(ctx, `
		SELECT refresh_token, access_token, expires_at
		FROM google_oauth_tokens WHERE user_id = $1
	`, userID).Scan(&refreshCT, &accessCT, &expires)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNoGoogleTokens
	}
	if err != nil {
		return "", err
	}

	access, err := s.decrypt(accessCT)
	if err != nil {
		return "", fmt.Errorf("decrypt access token: %w", err)
	}
	refresh, err := s.decrypt(refreshCT)
	if err != nil {
		return "", fmt.Errorf("decrypt refresh token: %w", err)
	}

	// Still valid? Return as-is. 60s safety margin.
	if access != "" && expires.Valid && time.Until(expires.Time) > 60*time.Second {
		return access, nil
	}

	// Refresh.
	tok := &oauth2.Token{RefreshToken: refresh}
	src := cfg.TokenSource(ctx, tok)
	fresh, err := src.Token()
	if err != nil {
		return "", fmt.Errorf("refresh token: %w", err)
	}
	if err := s.updateAccessOnly(ctx, userID, fresh); err != nil {
		return "", fmt.Errorf("persist refreshed token: %w", err)
	}
	return fresh.AccessToken, nil
}
