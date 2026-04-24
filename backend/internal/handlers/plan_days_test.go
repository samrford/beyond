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

func TestCreatePlanDay(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanDaysHandler(db)

	newDay := data.PlanDay{
		Date:  time.Now(),
		Notes: "New Notes",
	}
	body, _ := json.Marshal(newDay)

	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plans WHERE id = \\$1 AND user_id = \\$2\\)").
		WithArgs("plan-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("INSERT INTO plan_days").
		WithArgs(sqlmock.AnyArg(), "plan-1", sqlmock.AnyArg(), newDay.Notes).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("POST", "/v1/plans/plan-1/days", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.CreatePlanDay(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedDay data.PlanDay
	err = json.NewDecoder(rr.Body).Decode(&returnedDay)
	assert.NoError(t, err)
	assert.NotEmpty(t, returnedDay.ID)
	assert.Equal(t, "plan-1", returnedDay.PlanID)
	assert.Equal(t, "New Notes", returnedDay.Notes)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeletePlanDay(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanDaysHandler(db)

	// Expect ownership check
	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plan_days d JOIN plans p ON d.plan_id = p.id WHERE d.id = \\$1 AND p.user_id = \\$2\\)").
		WithArgs("day-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("DELETE FROM plan_days WHERE id = \\$1").
		WithArgs("day-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("DELETE", "/v1/plans/days/day-1", nil))
	rr := httptest.NewRecorder()
	h.DeletePlanDay(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePlanDay(t *testing.T) {
	db, _, _ := sqlmock.New()
	defer db.Close()

	h := NewPlanDaysHandler(db)

	req := reqWithAuth(httptest.NewRequest("PUT", "/v1/plans/days/1", nil))
	rr := httptest.NewRecorder()
	h.UpdatePlanDay(rr, req)

	assert.Equal(t, http.StatusNotImplemented, rr.Code)
}

func TestCreatePlanDay_PlanNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanDaysHandler(db)

	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plans WHERE id = \\$1 AND user_id = \\$2\\)").
		WithArgs("plan-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	req := reqWithAuth(httptest.NewRequest("POST", "/v1/plans/plan-1/days", bytes.NewBuffer([]byte(`{}`))))
	rr := httptest.NewRecorder()
	h.CreatePlanDay(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestDeletePlanDay_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanDaysHandler(db)

	mock.ExpectQuery("SELECT EXISTS").WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	req := reqWithAuth(httptest.NewRequest("DELETE", "/v1/plans/days/none", nil))
	rr := httptest.NewRecorder()
	h.DeletePlanDay(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}
