package data

import "database/sql"

// Role describes a user's permission level on a single resource (trip or plan).
type Role string

const (
	RoleNone        Role = ""
	RoleViewer      Role = "viewer"
	RoleContributor Role = "contributor"
	RoleOwner       Role = "owner"
)

// CanRead returns true for viewer/contributor/owner.
func (r Role) CanRead() bool { return r != RoleNone }

// CanEdit returns true for contributor/owner.
func (r Role) CanEdit() bool { return r == RoleContributor || r == RoleOwner }

// IsOwner returns true only for owner.
func (r Role) IsOwner() bool { return r == RoleOwner }

// TripAccess holds an authorization snapshot for a single trip.
type TripAccess struct {
	OwnerID  string
	Role     Role
	IsPublic bool
	Found    bool
}

// GetTripAccess returns the calling user's role on the given trip in a single
// query. An empty userID is allowed (anonymous viewer); only public trips are
// then readable.
func GetTripAccess(db *sql.DB, userID, tripID string) (TripAccess, error) {
	var a TripAccess
	var role sql.NullString
	err := db.QueryRow(`
		SELECT t.user_id, t.is_public, c.role
		FROM trips t
		LEFT JOIN trip_collaborators c
		  ON c.trip_id = t.id AND c.user_id = $2
		WHERE t.id = $1
	`, tripID, userID).Scan(&a.OwnerID, &a.IsPublic, &role)
	if err == sql.ErrNoRows {
		return a, nil
	}
	if err != nil {
		return a, err
	}
	a.Found = true
	switch {
	case userID != "" && a.OwnerID == userID:
		a.Role = RoleOwner
	case role.Valid:
		a.Role = Role(role.String)
	case a.IsPublic:
		a.Role = RoleViewer
	default:
		a.Role = RoleNone
	}
	return a, nil
}

// PlanAccess holds an authorization snapshot for a single plan.
type PlanAccess struct {
	OwnerID  string
	Role     Role
	IsPublic bool
	Found    bool
}

// GetPlanAccess mirrors GetTripAccess for plans.
func GetPlanAccess(db *sql.DB, userID, planID string) (PlanAccess, error) {
	var a PlanAccess
	var role sql.NullString
	err := db.QueryRow(`
		SELECT p.user_id, p.is_public, c.role
		FROM plans p
		LEFT JOIN plan_collaborators c
		  ON c.plan_id = p.id AND c.user_id = $2
		WHERE p.id = $1
	`, planID, userID).Scan(&a.OwnerID, &a.IsPublic, &role)
	if err == sql.ErrNoRows {
		return a, nil
	}
	if err != nil {
		return a, err
	}
	a.Found = true
	switch {
	case userID != "" && a.OwnerID == userID:
		a.Role = RoleOwner
	case role.Valid:
		a.Role = Role(role.String)
	case a.IsPublic:
		a.Role = RoleViewer
	default:
		a.Role = RoleNone
	}
	return a, nil
}
