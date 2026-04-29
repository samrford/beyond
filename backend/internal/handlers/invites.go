package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"beyond/backend/internal/data"
)

// InvitesHandler manages outgoing invites per resource and the unified
// preview/accept/decline flow against a token.
type InvitesHandler struct {
	db *sql.DB
}

func NewInvitesHandler(db *sql.DB) *InvitesHandler {
	return &InvitesHandler{db: db}
}

// ─── Types ───────────────────────────────────────────────────────────────

type Invite struct {
	Token             string     `json:"token"`
	Kind              string     `json:"kind"` // "trip" | "plan"
	ResourceID        string     `json:"resourceId"`
	Role              string     `json:"role"`
	CreatedBy         string     `json:"createdBy"`
	RecipientUserID   *string    `json:"recipientUserId,omitempty"`
	RecipientHandle   string     `json:"recipientHandle,omitempty"`
	RecipientDisplay  string     `json:"recipientDisplayName,omitempty"`
	RecipientAvatar   string     `json:"recipientAvatarUrl,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	ExpiresAt         *time.Time `json:"expiresAt,omitempty"`
	MaxUses           *int       `json:"maxUses,omitempty"`
	UseCount          int        `json:"useCount"`
}

type IncomingInvite struct {
	Token             string `json:"token"`
	Kind              string `json:"kind"`
	ResourceID        string `json:"resourceId"`
	ResourceName      string `json:"resourceName"`
	OwnerUserID       string `json:"ownerUserId"`
	OwnerHandle       string `json:"ownerHandle"`
	OwnerDisplay      string `json:"ownerDisplayName"`
	OwnerAvatar       string `json:"ownerAvatarUrl"`
	Role              string `json:"role"`
	CreatedAt         time.Time `json:"createdAt"`
}

type InvitePreview struct {
	Kind          string  `json:"kind"`
	ResourceID    string  `json:"resourceId"`
	ResourceName  string  `json:"resourceName"`
	OwnerHandle   string  `json:"ownerHandle"`
	OwnerDisplay  string  `json:"ownerDisplayName"`
	Role          string  `json:"role"`
	IsDirect      bool    `json:"isDirect"`
	Expired       bool    `json:"expired"`
	Revoked       bool    `json:"revoked"`
	Exhausted     bool    `json:"exhausted"`
	AlreadyMember bool    `json:"alreadyMember"`
	WrongRecipient bool   `json:"wrongRecipient"`
}

// ─── Outgoing dispatch (per resource) ────────────────────────────────────

func (h *InvitesHandler) HandleTripInvites(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/v1/trips/")
	parts := strings.SplitN(rest, "/", 3)
	if len(parts) < 2 || parts[1] != "invites" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	tripID := parts[0]

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			h.listInvites(w, r, "trip", tripID)
		case http.MethodPost:
			h.createInvite(w, r, "trip", tripID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	token := parts[2]
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h.revokeInvite(w, r, "trip", tripID, token)
}

func (h *InvitesHandler) HandlePlanInvites(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/v1/plans/")
	parts := strings.SplitN(rest, "/", 3)
	if len(parts) < 2 || parts[1] != "invites" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	planID := parts[0]

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			h.listInvites(w, r, "plan", planID)
		case http.MethodPost:
			h.createInvite(w, r, "plan", planID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	token := parts[2]
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h.revokeInvite(w, r, "plan", planID, token)
}

func invitesTable(kind string) string {
	if kind == "plan" {
		return "plan_invites"
	}
	return "trip_invites"
}

func (h *InvitesHandler) ownerOnly(kind, resourceID, userID string) (bool, bool) {
	var role data.Role
	var found bool
	switch kind {
	case "trip":
		acc, err := data.GetTripAccess(h.db, userID, resourceID)
		if err != nil {
			return false, false
		}
		role, found = acc.Role, acc.Found
	case "plan":
		acc, err := data.GetPlanAccess(h.db, userID, resourceID)
		if err != nil {
			return false, false
		}
		role, found = acc.Role, acc.Found
	}
	return found, role.IsOwner()
}

func (h *InvitesHandler) listInvites(w http.ResponseWriter, r *http.Request, kind, resourceID string) {
	userID := GetUserID(r.Context())
	found, isOwner := h.ownerOnly(kind, resourceID, userID)
	if !found || !isOwner {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	q := `
		SELECT i.token, i.` + resourceColumnInvites(kind) + `, i.role, i.created_by, i.recipient_user_id,
		       COALESCE(p.handle, ''), COALESCE(p.display_name, ''), COALESCE(p.avatar_url, ''),
		       i.created_at, i.expires_at, i.max_uses, i.use_count
		FROM ` + invitesTable(kind) + ` i
		LEFT JOIN user_profiles p ON p.user_id = i.recipient_user_id
		WHERE i.` + resourceColumnInvites(kind) + ` = $1 AND i.revoked_at IS NULL
		ORDER BY i.created_at DESC
	`
	rows, err := h.db.Query(q, resourceID)
	if err != nil {
		log.Printf("Error listing invites: %v", err)
		http.Error(w, "Failed to list invites", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Invite{}
	for rows.Next() {
		var inv Invite
		var recipient sql.NullString
		var expiresAt sql.NullTime
		var maxUses sql.NullInt64
		if err := rows.Scan(&inv.Token, &inv.ResourceID, &inv.Role, &inv.CreatedBy, &recipient,
			&inv.RecipientHandle, &inv.RecipientDisplay, &inv.RecipientAvatar,
			&inv.CreatedAt, &expiresAt, &maxUses, &inv.UseCount); err != nil {
			log.Printf("Error scanning invite: %v", err)
			continue
		}
		inv.Kind = kind
		if recipient.Valid {
			s := recipient.String
			inv.RecipientUserID = &s
		}
		if expiresAt.Valid {
			t := expiresAt.Time
			inv.ExpiresAt = &t
		}
		if maxUses.Valid {
			n := int(maxUses.Int64)
			inv.MaxUses = &n
		}
		out = append(out, inv)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (h *InvitesHandler) createInvite(w http.ResponseWriter, r *http.Request, kind, resourceID string) {
	userID := GetUserID(r.Context())
	found, isOwner := h.ownerOnly(kind, resourceID, userID)
	if !found || !isOwner {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	var body struct {
		Role            string  `json:"role"`
		RecipientUserID *string `json:"recipientUserId,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if body.Role != string(data.RoleViewer) && body.Role != string(data.RoleContributor) {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	// Owner cannot invite themselves.
	if body.RecipientUserID != nil && *body.RecipientUserID == userID {
		http.Error(w, "Cannot invite yourself", http.StatusConflict)
		return
	}

	// Direct invite: target must already have a profile, and must not already be a collaborator.
	if body.RecipientUserID != nil {
		var hasProfile bool
		if err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = $1)", *body.RecipientUserID).Scan(&hasProfile); err != nil {
			log.Printf("Error checking recipient profile: %v", err)
			http.Error(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if !hasProfile {
			http.Error(w, "Recipient not found", http.StatusBadRequest)
			return
		}

		// Already a collaborator? — no need to invite again.
		var alreadyMember bool
		if err := h.db.QueryRow(
			"SELECT EXISTS(SELECT 1 FROM "+collaboratorTable(kind)+" WHERE "+resourceColumn(kind)+" = $1 AND user_id = $2)",
			resourceID, *body.RecipientUserID,
		).Scan(&alreadyMember); err != nil {
			log.Printf("Error checking existing membership: %v", err)
			http.Error(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if alreadyMember {
			http.Error(w, "User is already a collaborator", http.StatusConflict)
			return
		}

		// Pending direct invite already outstanding? — return 409 to avoid spam.
		var pending bool
		if err := h.db.QueryRow(
			"SELECT EXISTS(SELECT 1 FROM "+invitesTable(kind)+" WHERE "+resourceColumnInvites(kind)+" = $1 AND recipient_user_id = $2 AND revoked_at IS NULL)",
			resourceID, *body.RecipientUserID,
		).Scan(&pending); err != nil {
			log.Printf("Error checking pending invite: %v", err)
			http.Error(w, "Internal error", http.StatusInternalServerError)
			return
		}
		if pending {
			http.Error(w, "Invite already pending for this user", http.StatusConflict)
			return
		}
	}

	token, err := newInviteToken()
	if err != nil {
		log.Printf("Error generating token: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	var maxUses sql.NullInt64
	var recipient sql.NullString
	if body.RecipientUserID != nil {
		recipient = sql.NullString{String: *body.RecipientUserID, Valid: true}
		maxUses = sql.NullInt64{Int64: 1, Valid: true}
	}

	_, err = h.db.Exec(
		`INSERT INTO `+invitesTable(kind)+` (token, `+resourceColumnInvites(kind)+`, role, created_by, recipient_user_id, max_uses)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		token, resourceID, body.Role, userID, recipient, maxUses,
	)
	if err != nil {
		log.Printf("Error creating invite: %v", err)
		http.Error(w, "Failed to create invite", http.StatusInternalServerError)
		return
	}

	out := Invite{
		Token:      token,
		Kind:       kind,
		ResourceID: resourceID,
		Role:       body.Role,
		CreatedBy:  userID,
		CreatedAt:  time.Now(),
		UseCount:   0,
	}
	if body.RecipientUserID != nil {
		s := *body.RecipientUserID
		out.RecipientUserID = &s
		n := 1
		out.MaxUses = &n
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(out)
}

func (h *InvitesHandler) revokeInvite(w http.ResponseWriter, r *http.Request, kind, resourceID, token string) {
	userID := GetUserID(r.Context())
	found, isOwner := h.ownerOnly(kind, resourceID, userID)
	if !found || !isOwner {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	_, err := h.db.Exec(
		`UPDATE `+invitesTable(kind)+` SET revoked_at = NOW() WHERE token = $1 AND `+resourceColumnInvites(kind)+` = $2 AND revoked_at IS NULL`,
		token, resourceID,
	)
	if err != nil {
		log.Printf("Error revoking invite: %v", err)
		http.Error(w, "Failed to revoke", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Token-based handlers ────────────────────────────────────────────────

// HandleByToken dispatches /v1/invites/:token[/accept|/decline]
func (h *InvitesHandler) HandleByToken(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/v1/invites/")
	if rest == "" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	parts := strings.SplitN(rest, "/", 2)
	token := parts[0]
	if len(parts) == 1 {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.previewInvite(w, r, token)
		return
	}
	switch parts[1] {
	case "accept":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.acceptInvite(w, r, token)
	case "decline":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.declineInvite(w, r, token)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// ListIncoming returns pending direct invites for the calling user.
func (h *InvitesHandler) ListIncoming(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	out := []IncomingInvite{}

	tripQ := `
		SELECT i.token, i.trip_id, t.name, t.user_id,
		       COALESCE(op.handle, ''), COALESCE(op.display_name, ''), COALESCE(op.avatar_url, ''),
		       i.role, i.created_at
		FROM trip_invites i
		JOIN trips t ON t.id = i.trip_id
		LEFT JOIN user_profiles op ON op.user_id = t.user_id
		WHERE i.recipient_user_id = $1 AND i.revoked_at IS NULL
		  AND (i.expires_at IS NULL OR i.expires_at > NOW())
		  AND (i.max_uses IS NULL OR i.use_count < i.max_uses)
	`
	tripRows, err := h.db.Query(tripQ, userID)
	if err != nil {
		log.Printf("Error listing trip invites: %v", err)
		http.Error(w, "Failed", http.StatusInternalServerError)
		return
	}
	for tripRows.Next() {
		var inv IncomingInvite
		inv.Kind = "trip"
		if err := tripRows.Scan(&inv.Token, &inv.ResourceID, &inv.ResourceName, &inv.OwnerUserID,
			&inv.OwnerHandle, &inv.OwnerDisplay, &inv.OwnerAvatar, &inv.Role, &inv.CreatedAt); err != nil {
			log.Printf("Error scanning trip invite: %v", err)
			continue
		}
		out = append(out, inv)
	}
	tripRows.Close()

	planQ := `
		SELECT i.token, i.plan_id, p.name, p.user_id,
		       COALESCE(op.handle, ''), COALESCE(op.display_name, ''), COALESCE(op.avatar_url, ''),
		       i.role, i.created_at
		FROM plan_invites i
		JOIN plans p ON p.id = i.plan_id
		LEFT JOIN user_profiles op ON op.user_id = p.user_id
		WHERE i.recipient_user_id = $1 AND i.revoked_at IS NULL
		  AND (i.expires_at IS NULL OR i.expires_at > NOW())
		  AND (i.max_uses IS NULL OR i.use_count < i.max_uses)
	`
	planRows, err := h.db.Query(planQ, userID)
	if err != nil {
		log.Printf("Error listing plan invites: %v", err)
		http.Error(w, "Failed", http.StatusInternalServerError)
		return
	}
	for planRows.Next() {
		var inv IncomingInvite
		inv.Kind = "plan"
		if err := planRows.Scan(&inv.Token, &inv.ResourceID, &inv.ResourceName, &inv.OwnerUserID,
			&inv.OwnerHandle, &inv.OwnerDisplay, &inv.OwnerAvatar, &inv.Role, &inv.CreatedAt); err != nil {
			log.Printf("Error scanning plan invite: %v", err)
			continue
		}
		out = append(out, inv)
	}
	planRows.Close()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// ─── Token internals ──────────────────────────────────────────────────────

type loadedInvite struct {
	Kind            string
	ResourceID      string
	Role            data.Role
	CreatedBy       string
	RecipientUserID sql.NullString
	ExpiresAt       sql.NullTime
	MaxUses         sql.NullInt64
	UseCount        int
	RevokedAt       sql.NullTime
	Found           bool
}

func (h *InvitesHandler) loadInvite(token string) (loadedInvite, error) {
	var inv loadedInvite
	tripErr := h.db.QueryRow(
		`SELECT trip_id, role, created_by, recipient_user_id, expires_at, max_uses, use_count, revoked_at
		 FROM trip_invites WHERE token = $1`,
		token,
	).Scan(&inv.ResourceID, &inv.Role, &inv.CreatedBy, &inv.RecipientUserID, &inv.ExpiresAt, &inv.MaxUses, &inv.UseCount, &inv.RevokedAt)
	if tripErr == nil {
		inv.Kind = "trip"
		inv.Found = true
		return inv, nil
	}
	if tripErr != sql.ErrNoRows {
		return inv, tripErr
	}

	planErr := h.db.QueryRow(
		`SELECT plan_id, role, created_by, recipient_user_id, expires_at, max_uses, use_count, revoked_at
		 FROM plan_invites WHERE token = $1`,
		token,
	).Scan(&inv.ResourceID, &inv.Role, &inv.CreatedBy, &inv.RecipientUserID, &inv.ExpiresAt, &inv.MaxUses, &inv.UseCount, &inv.RevokedAt)
	if planErr == nil {
		inv.Kind = "plan"
		inv.Found = true
		return inv, nil
	}
	if planErr != sql.ErrNoRows {
		return inv, planErr
	}
	return inv, nil
}

func (h *InvitesHandler) previewInvite(w http.ResponseWriter, r *http.Request, token string) {
	userID := GetUserID(r.Context())
	inv, err := h.loadInvite(token)
	if err != nil {
		log.Printf("Error loading invite: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !inv.Found {
		http.Error(w, "Invite not found", http.StatusNotFound)
		return
	}

	var name, ownerID string
	switch inv.Kind {
	case "trip":
		_ = h.db.QueryRow("SELECT name, user_id FROM trips WHERE id = $1", inv.ResourceID).Scan(&name, &ownerID)
	case "plan":
		_ = h.db.QueryRow("SELECT name, user_id FROM plans WHERE id = $1", inv.ResourceID).Scan(&name, &ownerID)
	}
	var ownerHandle, ownerDisplay string
	_ = h.db.QueryRow(
		"SELECT handle, display_name FROM user_profiles WHERE user_id = $1",
		ownerID,
	).Scan(&ownerHandle, &ownerDisplay)

	preview := InvitePreview{
		Kind:         inv.Kind,
		ResourceID:   inv.ResourceID,
		ResourceName: name,
		OwnerHandle:  ownerHandle,
		OwnerDisplay: ownerDisplay,
		Role:         string(inv.Role),
		IsDirect:     inv.RecipientUserID.Valid,
		Revoked:      inv.RevokedAt.Valid,
		Expired:      inv.ExpiresAt.Valid && inv.ExpiresAt.Time.Before(time.Now()),
		Exhausted:    inv.MaxUses.Valid && int64(inv.UseCount) >= inv.MaxUses.Int64,
	}
	if inv.RecipientUserID.Valid && userID != "" && userID != inv.RecipientUserID.String {
		preview.WrongRecipient = true
	}
	if userID != "" {
		var alreadyMember bool
		_ = h.db.QueryRow(
			"SELECT EXISTS(SELECT 1 FROM "+collaboratorTable(inv.Kind)+" WHERE "+resourceColumn(inv.Kind)+" = $1 AND user_id = $2)",
			inv.ResourceID, userID,
		).Scan(&alreadyMember)
		if !alreadyMember && userID == ownerID {
			alreadyMember = true
		}
		preview.AlreadyMember = alreadyMember
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preview)
}

func (h *InvitesHandler) acceptInvite(w http.ResponseWriter, r *http.Request, token string) {
	userID := GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	inv, err := h.loadInvite(token)
	if err != nil {
		log.Printf("Error loading invite: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !inv.Found {
		http.Error(w, "Invite not found", http.StatusNotFound)
		return
	}
	if inv.RevokedAt.Valid {
		http.Error(w, "Invite has been revoked", http.StatusGone)
		return
	}
	if inv.ExpiresAt.Valid && inv.ExpiresAt.Time.Before(time.Now()) {
		http.Error(w, "Invite has expired", http.StatusGone)
		return
	}
	if inv.MaxUses.Valid && int64(inv.UseCount) >= inv.MaxUses.Int64 {
		http.Error(w, "Invite has been used up", http.StatusGone)
		return
	}
	if inv.RecipientUserID.Valid && inv.RecipientUserID.String != userID {
		http.Error(w, "This invite is for a different user", http.StatusForbidden)
		return
	}

	// Owner-of-self check.
	var ownerID string
	switch inv.Kind {
	case "trip":
		_ = h.db.QueryRow("SELECT user_id FROM trips WHERE id = $1", inv.ResourceID).Scan(&ownerID)
	case "plan":
		_ = h.db.QueryRow("SELECT user_id FROM plans WHERE id = $1", inv.ResourceID).Scan(&ownerID)
	}
	if ownerID == userID {
		// Owner doesn't need a collaborator row; respond success so the
		// frontend just navigates to the resource.
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"kind":       inv.Kind,
			"resourceId": inv.ResourceID,
		})
		return
	}

	// Atomic increment + idempotent insert/upgrade.
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Error beginning tx: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		`UPDATE `+invitesTable(inv.Kind)+`
		 SET use_count = use_count + 1
		 WHERE token = $1
		   AND revoked_at IS NULL
		   AND (max_uses IS NULL OR use_count < max_uses)
		   AND (expires_at IS NULL OR expires_at > NOW())`,
		token,
	)
	if err != nil {
		log.Printf("Error incrementing invite: %v", err)
		http.Error(w, "Failed to accept invite", http.StatusInternalServerError)
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "Invite is no longer valid", http.StatusGone)
		return
	}

	upsertQ := `
		INSERT INTO ` + collaboratorTable(inv.Kind) + ` (` + resourceColumn(inv.Kind) + `, user_id, role, added_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (` + resourceColumn(inv.Kind) + `, user_id) DO UPDATE
		  SET role = CASE
		    WHEN ` + collaboratorTable(inv.Kind) + `.role = 'contributor' THEN 'contributor'
		    ELSE EXCLUDED.role
		  END
	`
	if _, err := tx.Exec(upsertQ, inv.ResourceID, userID, string(inv.Role), inv.CreatedBy); err != nil {
		log.Printf("Error inserting collaborator: %v", err)
		http.Error(w, "Failed to accept invite", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error committing accept: %v", err)
		http.Error(w, "Failed to accept invite", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"kind":       inv.Kind,
		"resourceId": inv.ResourceID,
	})
}

func (h *InvitesHandler) declineInvite(w http.ResponseWriter, r *http.Request, token string) {
	userID := GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	inv, err := h.loadInvite(token)
	if err != nil {
		log.Printf("Error loading invite: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !inv.Found {
		http.Error(w, "Invite not found", http.StatusNotFound)
		return
	}
	// Only the recipient of a direct invite may decline.
	if !inv.RecipientUserID.Valid || inv.RecipientUserID.String != userID {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	_, err = h.db.Exec(
		`UPDATE `+invitesTable(inv.Kind)+` SET revoked_at = NOW() WHERE token = $1 AND revoked_at IS NULL`,
		token,
	)
	if err != nil {
		log.Printf("Error declining invite: %v", err)
		http.Error(w, "Failed to decline", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Helpers ─────────────────────────────────────────────────────────────

func resourceColumnInvites(kind string) string {
	if kind == "plan" {
		return "plan_id"
	}
	return "trip_id"
}

func newInviteToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

