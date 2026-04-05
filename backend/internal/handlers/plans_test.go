package handlers

import (
	"bytes"
	"database/sql"
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

func TestListPlans(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "summary", "cover_photo", "created_at", "updated_at"}).
		AddRow("1", "Plan 1", now, now.AddDate(0, 0, 7), "Summary 1", "photo.jpg", now, now).
		AddRow("2", "Plan 2", now.AddDate(0, 1, 0), now.AddDate(0, 1, 7), "Summary 2", "photo2.jpg", now, now)

	mock.ExpectQuery("SELECT id, name, start_date, end_date, summary, cover_photo, created_at, updated_at FROM plans WHERE user_id = \\$1 ORDER BY start_date ASC").
		WithArgs(testUserID).
		WillReturnRows(rows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans", nil))
	rr := httptest.NewRecorder()
	h.ListPlans(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var plans []data.Plan
	err = json.NewDecoder(rr.Body).Decode(&plans)
	assert.NoError(t, err)
	assert.Len(t, plans, 2)

	assert.Equal(t, "1", plans[0].ID)
	assert.Equal(t, "Plan 1", plans[0].Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPlan(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	now := time.Now()
	planRows := sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "summary", "cover_photo", "created_at", "updated_at"}).
		AddRow("1", "Plan 1", now, now.AddDate(0, 0, 7), "Summary 1", "photo.jpg", now, now)

	mock.ExpectQuery("SELECT id, name, start_date, end_date, summary, cover_photo, created_at, updated_at FROM plans WHERE id = \\$1 AND user_id = \\$2").
		WithArgs("1", testUserID).
		WillReturnRows(planRows)

	dayRows := sqlmock.NewRows([]string{"id", "date", "notes"}).
		AddRow("d1", now, "Notes 1")

	mock.ExpectQuery("SELECT id, date, notes FROM plan_days WHERE plan_id = \\$1").
		WithArgs("1").
		WillReturnRows(dayRows)

	itemRows := sqlmock.NewRows([]string{"id", "plan_day_id", "name", "description", "location", "latitude", "longitude", "order_index", "estimated_time", "start_time", "duration"}).
		AddRow("i1", "d1", "Item 1", "Desc 1", "Loc 1", 1.0, 2.0, 0, "1h", "10:00", 60)

	mock.ExpectQuery("SELECT id, plan_day_id, name, description, location, latitude, longitude, order_index, estimated_time, start_time, duration FROM plan_items WHERE plan_id = \\$1").
		WithArgs("1").
		WillReturnRows(itemRows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.GetPlan(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var plan data.Plan
	err = json.NewDecoder(rr.Body).Decode(&plan)
	assert.NoError(t, err)

	assert.Equal(t, "1", plan.ID)
	assert.Len(t, plan.Days, 1)
	assert.Equal(t, "d1", plan.Days[0].ID)
	assert.Len(t, plan.Days[0].Items, 1)
	assert.Equal(t, "i1", plan.Days[0].Items[0].ID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreatePlan(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	newPlan := data.Plan{
		Name:       "New Plan",
		StartDate:  time.Now(),
		EndDate:    time.Now().AddDate(0, 0, 5),
		Summary:    "Summary",
		CoverPhoto: "photo.jpg",
	}
	body, _ := json.Marshal(newPlan)

	mock.ExpectExec("INSERT INTO plans").
		WithArgs(sqlmock.AnyArg(), newPlan.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), newPlan.Summary, newPlan.CoverPhoto, sqlmock.AnyArg(), sqlmock.AnyArg(), testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("POST", "/api/plans", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.CreatePlan(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedPlan data.Plan
	err = json.NewDecoder(rr.Body).Decode(&returnedPlan)
	assert.NoError(t, err)
	assert.NotEmpty(t, returnedPlan.ID)
	assert.Equal(t, "New Plan", returnedPlan.Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePlan(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	updatedPlan := data.Plan{
		Name:       "Updated Plan",
		StartDate:  time.Now(),
		EndDate:    time.Now().AddDate(0, 0, 5),
		Summary:    "Updated Summary",
		CoverPhoto: "updated.jpg",
	}
	body, _ := json.Marshal(updatedPlan)

	mock.ExpectExec("UPDATE plans SET name = \\$1, start_date = \\$2, end_date = \\$3, summary = \\$4, cover_photo = \\$5, updated_at = \\$6 WHERE id = \\$7 AND user_id = \\$8").
		WithArgs(updatedPlan.Name, sqlmock.AnyArg(), sqlmock.AnyArg(), updatedPlan.Summary, updatedPlan.CoverPhoto, sqlmock.AnyArg(), "1", testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("PUT", "/api/plans/1", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.UpdatePlan(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returnedPlan data.Plan
	err = json.NewDecoder(rr.Body).Decode(&returnedPlan)
	assert.NoError(t, err)
	assert.Equal(t, "1", returnedPlan.ID)
	assert.Equal(t, "Updated Plan", returnedPlan.Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeletePlan(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	mock.ExpectExec("DELETE FROM plans WHERE id = \\$1 AND user_id = \\$2").
		WithArgs("1", testUserID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("DELETE", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.DeletePlan(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConvertPlanToTrip(t *testing.T) {
	db, _, _ := sqlmock.New()
	defer db.Close()

	h := NewPlansHandler(db)

	req := reqWithAuth(httptest.NewRequest("POST", "/api/plans/1/convert", nil))
	rr := httptest.NewRecorder()
	h.ConvertPlanToTrip(rr, req)

	assert.Equal(t, http.StatusNotImplemented, rr.Code)
}

func TestGetPlan_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	mock.ExpectQuery("SELECT .* FROM plans WHERE id = \\$1 AND user_id = \\$2").
		WithArgs("1", testUserID).
		WillReturnError(sql.ErrNoRows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.GetPlan(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestListPlans_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	mock.ExpectQuery("SELECT .* FROM plans").WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans", nil))
	rr := httptest.NewRecorder()
	h.ListPlans(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetPlan_DaysError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	now := time.Now()
	mock.ExpectQuery("SELECT .* FROM plans").WillReturnRows(sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "summary", "cover_photo", "created_at", "updated_at"}).AddRow("1", "P1", now, now, "S1", "C1", now, now))
	mock.ExpectQuery("SELECT .* FROM plan_days").WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.GetPlan(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetPlan_ItemsError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	now := time.Now()
	mock.ExpectQuery("SELECT .* FROM plans").WillReturnRows(sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "summary", "cover_photo", "created_at", "updated_at"}).AddRow("1", "P1", now, now, "S1", "C1", now, now))
	mock.ExpectQuery("SELECT .* FROM plan_days").WillReturnRows(sqlmock.NewRows([]string{"id", "date", "notes"}))
	mock.ExpectQuery("SELECT .* FROM plan_items").WillReturnError(errors.New("db error"))

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.GetPlan(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetPlan_UnassignedAndFallback(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlansHandler(db)

	now := time.Now()
	mock.ExpectQuery("SELECT .* FROM plans").WillReturnRows(sqlmock.NewRows([]string{"id", "name", "start_date", "end_date", "summary", "cover_photo", "created_at", "updated_at"}).AddRow("1", "P1", now, now, "S1", "C1", now, now))
	mock.ExpectQuery("SELECT .* FROM plan_days").WillReturnRows(sqlmock.NewRows([]string{"id", "date", "notes"}).AddRow("d1", now, "N1"))
	
	// i1 is unassigned (PlanDayID is null)
	// i2 has invalid day ID (PlanDayID is "d2" but only "d1" exists)
	itemRows := sqlmock.NewRows([]string{"id", "plan_day_id", "name", "description", "location", "latitude", "longitude", "order_index", "estimated_time", "start_time", "duration"}).
		AddRow("i1", nil, "Item 1", "D1", "L1", 1.0, 2.0, 0, "1h", "10:00", 60).
		AddRow("i2", "d2", "Item 2", "D2", "L2", 3.0, 4.0, 1, "1h", "11:00", 60)

	mock.ExpectQuery("SELECT .* FROM plan_items").WillReturnRows(itemRows)

	req := reqWithAuth(httptest.NewRequest("GET", "/api/plans/1", nil))
	rr := httptest.NewRecorder()
	h.GetPlan(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var p data.Plan
	json.NewDecoder(rr.Body).Decode(&p)
	assert.Len(t, p.Unassigned, 2) // Both i1 and i2 (fallback) should be in Unassigned
}
