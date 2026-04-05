package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"beyond/backend/internal/data"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

func TestCreatePlanItem(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanItemsHandler(db)

	newItem := data.PlanItem{
		Name:        "Item 1",
		Description: "Desc 1",
		Location:    "Loc 1",
		OrderIndex:  0,
	}
	body, _ := json.Marshal(newItem)

	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plans WHERE id = \\$1 AND user_id = \\$2\\)").
		WithArgs("plan-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("INSERT INTO plan_items").
		WithArgs(sqlmock.AnyArg(), "plan-1", sqlmock.AnyArg(), newItem.Name, newItem.Description, newItem.Location, sqlmock.AnyArg(), sqlmock.AnyArg(), newItem.OrderIndex, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("POST", "/api/plans/plan-1/items", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.CreatePlanItem(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var returnedItem data.PlanItem
	err = json.NewDecoder(rr.Body).Decode(&returnedItem)
	assert.NoError(t, err)
	assert.NotEmpty(t, returnedItem.ID)
	assert.Equal(t, "plan-1", returnedItem.PlanID)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePlanItem(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanItemsHandler(db)

	updatedItem := data.PlanItem{
		Name:        "Updated Item 1",
		Description: "Updated Desc 1",
		Location:    "Updated Loc 1",
		OrderIndex:  1,
	}
	body, _ := json.Marshal(updatedItem)

	// Expect ownership check
	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plan_items i JOIN plans p ON i.plan_id = p.id WHERE i.id = \\$1 AND p.user_id = \\$2\\)").
		WithArgs("item-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("UPDATE plan_items SET plan_day_id = \\$1, name = \\$2, description = \\$3, location = \\$4, latitude = \\$5, longitude = \\$6, order_index = \\$7, estimated_time = \\$8, start_time = \\$9, duration = \\$10 WHERE id = \\$11").
		WithArgs(sqlmock.AnyArg(), updatedItem.Name, updatedItem.Description, updatedItem.Location, sqlmock.AnyArg(), sqlmock.AnyArg(), updatedItem.OrderIndex, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), "item-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("PUT", "/api/plans/items/item-1", bytes.NewBuffer(body)))
	rr := httptest.NewRecorder()
	h.UpdatePlanItem(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var returnedItem data.PlanItem
	err = json.NewDecoder(rr.Body).Decode(&returnedItem)
	assert.NoError(t, err)
	assert.Equal(t, "item-1", returnedItem.ID)
	assert.Equal(t, "Updated Item 1", returnedItem.Name)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeletePlanItem(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	h := NewPlanItemsHandler(db)

	// Expect ownership check
	mock.ExpectQuery("SELECT EXISTS\\(SELECT 1 FROM plan_items i JOIN plans p ON i.plan_id = p.id WHERE i.id = \\$1 AND p.user_id = \\$2\\)").
		WithArgs("item-1", testUserID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("DELETE FROM plan_items WHERE id = \\$1").
		WithArgs("item-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	req := reqWithAuth(httptest.NewRequest("DELETE", "/api/plans/items/item-1", nil))
	rr := httptest.NewRecorder()
	h.DeletePlanItem(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}
