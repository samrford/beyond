package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"beyond/backend/internal/data"
)

// CollaboratorsHandler handles GET/PATCH/DELETE for collaborators on trips
// and plans. Adding a collaborator is done indirectly via an invite (see
// InvitesHandler) since direct adds require recipient acceptance.
type CollaboratorsHandler struct {
	db *sql.DB
}

func NewCollaboratorsHandler(db *sql.DB) *CollaboratorsHandler {
	return &CollaboratorsHandler{db: db}
}

// Collaborator is the JSON shape returned by list endpoints. The owner is
// returned as a synthetic row with role "owner".
type Collaborator struct {
	UserID      string `json:"userId"`
	Handle      string `json:"handle"`
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
	Role        string `json:"role"`
}

// ─── Trip dispatch ────────────────────────────────────────────────────────

// HandleTripCollaborators dispatches /v1/trips/:id/collaborators[/...]
// based on method and trailing path.
func (h *CollaboratorsHandler) HandleTripCollaborators(w http.ResponseWriter, r *http.Request) {
	// Path: /v1/trips/{id}/collaborators[/{userId}]
	rest := strings.TrimPrefix(r.URL.Path, "/v1/trips/")
	parts := strings.SplitN(rest, "/", 3)
	if len(parts) < 2 || parts[1] != "collaborators" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	tripID := parts[0]

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			h.listCollaborators(w, r, "trip", tripID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// /v1/trips/{id}/collaborators/{userId|me}
	target := parts[2]
	switch r.Method {
	case http.MethodPatch:
		h.updateRole(w, r, "trip", tripID, target)
	case http.MethodDelete:
		h.removeCollaborator(w, r, "trip", tripID, target)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandlePlanCollaborators mirrors HandleTripCollaborators for plans.
func (h *CollaboratorsHandler) HandlePlanCollaborators(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/v1/plans/")
	parts := strings.SplitN(rest, "/", 3)
	if len(parts) < 2 || parts[1] != "collaborators" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	planID := parts[0]

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			h.listCollaborators(w, r, "plan", planID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	target := parts[2]
	switch r.Method {
	case http.MethodPatch:
		h.updateRole(w, r, "plan", planID, target)
	case http.MethodDelete:
		h.removeCollaborator(w, r, "plan", planID, target)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ─── Implementation ──────────────────────────────────────────────────────

func (h *CollaboratorsHandler) resourceAccess(kind, id, userID string) (data.Role, string, bool, error) {
	switch kind {
	case "trip":
		acc, err := data.GetTripAccess(h.db, userID, id)
		return acc.Role, acc.OwnerID, acc.Found, err
	case "plan":
		acc, err := data.GetPlanAccess(h.db, userID, id)
		return acc.Role, acc.OwnerID, acc.Found, err
	}
	return data.RoleNone, "", false, errors.New("unknown kind")
}

func (h *CollaboratorsHandler) listCollaborators(w http.ResponseWriter, r *http.Request, kind, resourceID string) {
	userID := GetUserID(r.Context())
	role, ownerID, found, err := h.resourceAccess(kind, resourceID, userID)
	if err != nil {
		log.Printf("Error checking access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !found || !role.CanRead() {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	out := []Collaborator{}

	// Owner row first.
	var ownerHandle, ownerDisplay, ownerAvatar string
	_ = h.db.QueryRow(
		"SELECT handle, display_name, COALESCE(avatar_url, '') FROM user_profiles WHERE user_id = $1",
		ownerID,
	).Scan(&ownerHandle, &ownerDisplay, &ownerAvatar)
	out = append(out, Collaborator{
		UserID:      ownerID,
		Handle:      ownerHandle,
		DisplayName: ownerDisplay,
		AvatarURL:   ownerAvatar,
		Role:        string(data.RoleOwner),
	})

	q := `
		SELECT c.user_id, COALESCE(p.handle, ''), COALESCE(p.display_name, ''), COALESCE(p.avatar_url, ''), c.role
		FROM ` + collaboratorTable(kind) + ` c
		LEFT JOIN user_profiles p ON p.user_id = c.user_id
		WHERE c.` + resourceColumn(kind) + ` = $1
		ORDER BY c.created_at ASC
	`
	rows, err := h.db.Query(q, resourceID)
	if err != nil {
		log.Printf("Error listing collaborators: %v", err)
		http.Error(w, "Failed to list collaborators", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var c Collaborator
		if err := rows.Scan(&c.UserID, &c.Handle, &c.DisplayName, &c.AvatarURL, &c.Role); err != nil {
			log.Printf("Error scanning collaborator: %v", err)
			continue
		}
		out = append(out, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func (h *CollaboratorsHandler) updateRole(w http.ResponseWriter, r *http.Request, kind, resourceID, targetUserID string) {
	userID := GetUserID(r.Context())
	role, _, found, err := h.resourceAccess(kind, resourceID, userID)
	if err != nil {
		log.Printf("Error checking access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !found || !role.IsOwner() {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if body.Role != string(data.RoleViewer) && body.Role != string(data.RoleContributor) {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	res, err := h.db.Exec(
		`UPDATE `+collaboratorTable(kind)+` SET role = $1 WHERE `+resourceColumn(kind)+` = $2 AND user_id = $3`,
		body.Role, resourceID, targetUserID,
	)
	if err != nil {
		log.Printf("Error updating role: %v", err)
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "Collaborator not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CollaboratorsHandler) removeCollaborator(w http.ResponseWriter, r *http.Request, kind, resourceID, target string) {
	userID := GetUserID(r.Context())
	role, _, found, err := h.resourceAccess(kind, resourceID, userID)
	if err != nil {
		log.Printf("Error checking access: %v", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	if !found {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	// Resolve "me" to caller; only owner may remove other users.
	targetUserID := target
	if target == "me" {
		targetUserID = userID
	}
	if targetUserID == "" {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	if targetUserID != userID && !role.IsOwner() {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	_, err = h.db.Exec(
		`DELETE FROM `+collaboratorTable(kind)+` WHERE `+resourceColumn(kind)+` = $1 AND user_id = $2`,
		resourceID, targetUserID,
	)
	if err != nil {
		log.Printf("Error removing collaborator: %v", err)
		http.Error(w, "Failed to remove", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Helpers ─────────────────────────────────────────────────────────────

func collaboratorTable(kind string) string {
	if kind == "plan" {
		return "plan_collaborators"
	}
	return "trip_collaborators"
}

func resourceColumn(kind string) string {
	if kind == "plan" {
		return "plan_id"
	}
	return "trip_id"
}

