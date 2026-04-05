package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"beyond/backend/internal/data"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

func TestListTrips(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewTripsHandler(db)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "header_photo", "summary"}).
		AddRow("1", "Trip 1", now, now.AddDate(0, 0, 7), "photo.jpg", "Summary 1").
		AddRow("2", "Trip 2", now.AddDate(0, 1, 0), now.AddDate(0, 1, 7), "photo2.jpg", "Summary 2")

	mock.ExpectQuery("SELECT id, name, start_date, end_date, header_photo, summary FROM trips WHERE user_id = \\$1 ORDER BY start_date ASC").
		WithArgs(testUserID).
		WillReturnRows(rows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/trips", nil))
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
	tripRows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "header_photo", "summary"}).
		AddRow("1", "Trip 1", now, now.AddDate(0, 0, 7), "photo.jpg", "Summary 1")

	mock.ExpectQuery("SELECT id, name, start_date, end_date, header_photo, summary FROM trips WHERE id = \\$1 AND user_id = \\$2").
		WithArgs("1", testUserID).
		WillReturnRows(tripRows)

	checkpointRows := sqlmock.NewRows([]string{"id", "name", "location", "timestamp", "description", "photos", "journal"}).
		AddRow("c1", "Checkpoint 1", "Location 1", now, "Description 1", []byte(`["img1.jpg"]`), "Journal 1").
		AddRow("c2", "Checkpoint 2", "Location 2", now.Add(time.Hour), "Description 2", []byte(`[]`), "Journal 2")

	mock.ExpectQuery("SELECT id, name, location, timestamp, description, photos, journal FROM checkpoints WHERE trip_id = \\$1").
		WithArgs("1").
		WillReturnRows(checkpointRows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/trips/1", nil))
	rr := httptest.NewRecorder()
	h.GetTrip(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var trip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&trip)
	assert.NoError(t, err)

	assert.Equal(t, "1", trip.ID)
	assert.Equal(t, "Trip 1", trip.Name)
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
		WithArgs(sqlmock.AnyArg(), newTrip.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), newTrip.HeaderPhoto, newTrip.Summary, testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("POST", "/api/trips", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.CreateTrip(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedTrip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&returnedTrip)
	assert.NoError(t, err)
	
	assert.NotEmpty(t, returnedTrip.ID)
	assert.Equal(t, "New Trip", returnedTrip.Name)
	assert.Equal(t, "newphoto.jpg", returnedTrip.HeaderPhoto)

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

	mock.ExpectExec("UPDATE trips SET name = \\$1, start_date = \\$2, end_date = \\$3, header_photo = \\$4, summary = \\$5 WHERE id = \\$6 AND user_id = \\$7").
		WithArgs(updatedTrip.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), updatedTrip.HeaderPhoto, updatedTrip.Summary, "1", testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("PUT", "/api/trips/1", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.UpdateTrip(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returnedTrip data.Trip
	err = json.NewDecoder(rr.Body).Decode(&returnedTrip)
	assert.NoError(t, err)

	assert.Equal(t, "1", returnedTrip.ID)
	assert.Equal(t, "Updated Trip", returnedTrip.Name)
	assert.Equal(t, "updatedphoto.jpg", returnedTrip.HeaderPhoto)

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

	req := reqWithAuth(httptest.NewRequest("DELETE", "/api/trips/1", nil))
	rr := httptest.NewRecorder()
	h.DeleteTrip(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Empty(t, rr.Body.String())

	assert.NoError(t, mock.ExpectationsWereMet())
}
