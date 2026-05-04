package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"beyond/backend/internal/data"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

// accessRows builds the row shape returned by data.GetTripAccess /
// data.GetPlanAccess: (owner_id, is_public, collaborator_role).
func accessRows(ownerID string, isPublic bool, role any) *sqlmock.Rows {
	return sqlmock.NewRows([]string{"user_id", "is_public", "role"}).AddRow(ownerID, isPublic, role)
}

func TestListTrips(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "header_photo", "summary", "is_public", "role"}).
		AddRow("1", "Trip 1", now, now.AddDate(0, 0, 7), "photo.jpg", "Summary 1", false, "owner").
		AddRow("2", "Trip 2", now.AddDate(0, 1, 0), now.AddDate(0, 1, 7), "photo2.jpg", "Summary 2", true, "owner")

	mock.ExpectQuery("SELECT id, name, start_date, end_date, header_photo, summary, is_public, role").
		WithArgs(testUserID).
		WillReturnRows(rows)

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips", nil))
	rr := httptest.NewRecorder()
	h.ListTrips(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var trips []data.Trip
	err = json.NewDecoder(rr.Body).Decode(&trips)
	assert.NoError(t, err)
	assert.Len(t, trips, 2)

	assert.Equal(t, "1", trips[0].ID)
	assert.Equal(t, "Trip 1", trips[0].Name)
	assert.Equal(t, "photo.jpg", trips[0].HeaderPhoto)
	assert.Equal(t, "Summary 1", trips[0].Summary)
	assert.Equal(t, "owner", trips[0].Role)
	assert.True(t, trips[0].IsOwner)
	assert.Equal(t, now.Format(time.RFC3339Nano), trips[0].StartDate.Format(time.RFC3339Nano))

	assert.Equal(t, "2", trips[1].ID)
	assert.Equal(t, "Trip 2", trips[1].Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTrip(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	now := time.Now()

	// Access check returns owner
	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows(testUserID, false, nil))

	// Then the trip detail SELECT (no user_id column)
	tripRows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "header_photo", "summary", "bg_mode", "bg_blur", "bg_opacity", "bg_darkness", "is_public"}).
		AddRow("1", "Trip 1", now, now.AddDate(0, 0, 7), "photo.jpg", "Summary 1", "default", 180, 100, 56, false)
	mock.ExpectQuery("SELECT id, name, start_date, end_date, header_photo, summary, bg_mode, bg_blur, bg_opacity, bg_darkness, is_public FROM trips WHERE id = \\$1").
		WithArgs("1").
		WillReturnRows(tripRows)

	checkpointRows := sqlmock.NewRows([]string{"id", "name", "location", "timestamp", "end_timestamp", "description", "photos", "journal", "hero_photo", "side_photo_1", "side_photo_2", "side_photo_3"}).
		AddRow("c1", "Checkpoint 1", "Location 1", now, nil, "Description 1", []byte(`["img1.jpg"]`), "Journal 1", "", "", "", "").
		AddRow("c2", "Checkpoint 2", "Location 2", now.Add(time.Hour), nil, "Description 2", []byte(`[]`), "Journal 2", "", "", "", "")

	mock.ExpectQuery("SELECT id, name, location, timestamp, end_timestamp, description, photos, journal, COALESCE\\(hero_photo, ''\\), COALESCE\\(side_photo_1, ''\\), COALESCE\\(side_photo_2, ''\\), COALESCE\\(side_photo_3, ''\\) FROM checkpoints WHERE trip_id = \\$1").
		WithArgs("1").
		WillReturnRows(checkpointRows)

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips/1", nil))
	rr := httptest.NewRecorder()
	h.GetTrip(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var trip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&trip)
	assert.NoError(t, err)

	assert.Equal(t, "1", trip.ID)
	assert.Equal(t, "Trip 1", trip.Name)
	assert.True(t, trip.IsOwner)
	assert.Equal(t, "owner", trip.Role)
	assert.Len(t, trip.Checkpoints, 2)
	assert.Equal(t, "c1", trip.Checkpoints[0].ID)
	assert.Equal(t, "Checkpoint 1", trip.Checkpoints[0].Name)
	assert.Equal(t, []string{"img1.jpg"}, trip.Checkpoints[0].Photos)

	assert.Equal(t, "c2", trip.Checkpoints[1].ID)
	assert.Equal(t, "Checkpoint 2", trip.Checkpoints[1].Name)
	assert.Equal(t, []string{}, trip.Checkpoints[1].Photos)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateTrip(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	newTrip := data.Trip{
		Name:        "New Trip",
		StartDate:   time.Now(),
		EndDate:     time.Now().AddDate(0, 0, 10),
		HeaderPhoto: "newphoto.jpg",
		Summary:     "New trip summary",
	}
	body, _ := json.Marshal(newTrip)

	mock.ExpectExec("INSERT INTO trips").
		WithArgs(sqlmock.AnyArg(), newTrip.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), newTrip.HeaderPhoto, newTrip.Summary, testUserID, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("POST", "/v1/trips", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.CreateTrip(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedTrip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&returnedTrip)
	assert.NoError(t, err)

	assert.NotEmpty(t, returnedTrip.ID)
	assert.Equal(t, "New Trip", returnedTrip.Name)
	assert.Equal(t, "newphoto.jpg", returnedTrip.HeaderPhoto)
	assert.Equal(t, "owner", returnedTrip.Role)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateTrip(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	updatedTrip := data.Trip{
		Name:        "Updated Trip",
		StartDate:   time.Now(),
		EndDate:     time.Now().AddDate(0, 0, 10),
		HeaderPhoto: "updatedphoto.jpg",
		Summary:     "Updated summary",
	}
	body, _ := json.Marshal(updatedTrip)

	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows(testUserID, false, nil))

	mock.ExpectExec("UPDATE trips SET name = \\$1, start_date = \\$2, end_date = \\$3, header_photo = \\$4, summary = \\$5, bg_mode = \\$6, bg_blur = \\$7, bg_opacity = \\$8, bg_darkness = \\$9, is_public = \\$10 WHERE id = \\$11").
		WithArgs(updatedTrip.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), updatedTrip.HeaderPhoto, updatedTrip.Summary, updatedTrip.BgMode, updatedTrip.BgBlur, updatedTrip.BgOpacity, updatedTrip.BgDarkness, sqlmock.AnyArg(), "1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("PUT", "/v1/trips/1", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.UpdateTrip(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returnedTrip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&returnedTrip)
	assert.NoError(t, err)

	assert.Equal(t, "1", returnedTrip.ID)
	assert.Equal(t, "Updated Trip", returnedTrip.Name)
	assert.Equal(t, "updatedphoto.jpg", returnedTrip.HeaderPhoto)
	assert.Equal(t, "owner", returnedTrip.Role)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateTrip_ContributorPreservesIsPublic(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	// Contributor tries to make the trip public; the existing row is private.
	body, _ := json.Marshal(data.Trip{Name: "X", IsPublic: true})

	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows("other-owner", false, "contributor"))

	// Updated row stores is_public = false (preserved from acc.IsPublic).
	mock.ExpectExec("UPDATE trips SET").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), false, "1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("PUT", "/v1/trips/1", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.UpdateTrip(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returned data.Trip
	json.NewDecoder(rr.Body).Decode(&returned)
	assert.False(t, returned.IsPublic)
	assert.Equal(t, "contributor", returned.Role)
	assert.False(t, returned.IsOwner)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateTrip_ViewerForbidden(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows("other-owner", false, "viewer"))

	req := reqWithAuth(httptest.NewRequest("PUT", "/v1/trips/1", bytes.NewBuffer([]byte(`{"name":"x"}`))))
	rr := httptest.NewRecorder()
	h.UpdateTrip(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteTrip(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectExec("DELETE FROM trips WHERE id = \\$1 AND user_id = \\$2").
		WithArgs("1", testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("DELETE", "/v1/trips/1", nil))
	rr := httptest.NewRecorder()
	h.DeleteTrip(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Empty(t, rr.Body.String())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTrip_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "is_public", "role"}))

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips/1", nil))
	rr := httptest.NewRecorder()
	h.GetTrip(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetTrip_PrivateNonOwnerNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows("other-owner", false, nil))

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips/1", nil))
	rr := httptest.NewRecorder()
	h.GetTrip(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetTrip_CheckpointsError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	now := time.Now()
	mock.ExpectQuery("SELECT t.user_id, t.is_public, c.role FROM trips t").
		WithArgs("1", testUserID).
		WillReturnRows(accessRows(testUserID, false, nil))

	tripRows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "header_photo", "summary", "bg_mode", "bg_blur", "bg_opacity", "bg_darkness", "is_public"}).
		AddRow("1", "Trip 1", now, now.AddDate(0, 0, 7), "photo.jpg", "Summary 1", "default", 180, 100, 56, false)

	mock.ExpectQuery("SELECT .* FROM trips WHERE id = \\$1").
		WithArgs("1").
		WillReturnRows(tripRows)

	mock.ExpectQuery("SELECT .* FROM checkpoints WHERE trip_id = \\$1").
		WithArgs("1").
		WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips/1", nil))
	rr := httptest.NewRecorder()
	h.GetTrip(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestCreateTrip_InvalidJSON(t *testing.T) {
	db, _, _ := sqlmock.New()
	defer db.Close()

	h := NewTripsHandler(db)

	req := reqWithAuth(httptest.NewRequest("POST", "/v1/trips", bytes.NewBuffer([]byte(`{invalid`))))
	rr := httptest.NewRecorder()
	h.CreateTrip(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateTrip_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectExec("INSERT INTO trips").
		WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("POST", "/v1/trips", bytes.NewBuffer([]byte(`{"name":"test"}`))))
	rr := httptest.NewRecorder()
	h.CreateTrip(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListTrips_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	mock.ExpectQuery("SELECT .* FROM").WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("GET", "/v1/trips", nil))
	rr := httptest.NewRecorder()
	h.ListTrips(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}
