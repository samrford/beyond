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

func TestCreateCheckpoint(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewCheckpointsHandler(db)

	newCheckpoint := data.Checkpoint{
		Name:        "New Checkpoint",
		Location:    "Some Place",
		Timestamp:   time.Now(),
		Description: "A great view",
		Photos:      []string{"pic1.png"},
		Journal:     "It was a nice hike.",
	}
	body, _ := json.Marshal(newCheckpoint)

	// Since photosJSON is marshaled from slice
	photosJSON, _ := json.Marshal(newCheckpoint.Photos)

	mock.ExpectExec("INSERT INTO checkpoints").
		WithArgs(sqlmock.AnyArg(), "trip-1", newCheckpoint.Name, newCheckpoint.Location, sqlmock.AnyArg(), newCheckpoint.Description, photosJSON, newCheckpoint.Journal).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := httptest.NewRequest("POST", "/api/trips/trip-1/checkpoints", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	h.CreateCheckpoint(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedCp data.Checkpoint
	err = json.NewDecoder(rr.Body).Decode(&returnedCp)
	assert.NoError(t, err)

	assert.NotEmpty(t, returnedCp.ID)
	assert.Equal(t, "New Checkpoint", returnedCp.Name)
	assert.Equal(t, "Some Place", returnedCp.Location)
	assert.Equal(t, []string{"pic1.png"}, returnedCp.Photos)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateCheckpoint(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewCheckpointsHandler(db)

	updatedCp := data.Checkpoint{
		Name:        "Updated Checkpoint",
		Location:    "Updated Place",
		Timestamp:   time.Now(),
		Description: "Updated desc",
		Photos:      []string{"updated.png"},
		Journal:     "Updated journal",
	}
	body, _ := json.Marshal(updatedCp)
	photosJSON, _ := json.Marshal(updatedCp.Photos)

	mock.ExpectExec("UPDATE checkpoints SET name = \\$1, location = \\$2, timestamp = \\$3, description = \\$4, photos = \\$5, journal = \\$6 WHERE id = \\$7").
		WithArgs(updatedCp.Name, updatedCp.Location, sqlmock.AnyArg(), updatedCp.Description, photosJSON, updatedCp.Journal, "cp-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := httptest.NewRequest("PUT", "/api/checkpoints/cp-1", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()
	h.UpdateCheckpoint(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returnedCp data.Checkpoint
	err = json.NewDecoder(rr.Body).Decode(&returnedCp)
	assert.NoError(t, err)

	assert.Equal(t, "cp-1", returnedCp.ID)
	assert.Equal(t, "Updated Checkpoint", returnedCp.Name)
	assert.Equal(t, "Updated Place", returnedCp.Location)
	assert.Equal(t, []string{"updated.png"}, returnedCp.Photos)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteCheckpoint(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewCheckpointsHandler(db)

	mock.ExpectExec("DELETE FROM checkpoints WHERE id = \\$1").
		WithArgs("cp-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := httptest.NewRequest("DELETE", "/api/checkpoints/cp-1", nil)
	rr := httptest.NewRecorder()
	h.DeleteCheckpoint(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Empty(t, rr.Body.String())

	assert.NoError(t, mock.ExpectationsWereMet())
}
