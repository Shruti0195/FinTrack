"""
Integration test for Goals and Goal Contributions endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User

client = TestClient(app)

def get_token(email: str = "user@fintrack.com", password: str = "password123"):
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]

def test_goals_crud_and_contributions():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a goal
    goal_payload = {
        "title": "Goa Summer Vacation 2026",
        "target_amount": 30000.0,
        "months": 3,
        "color": "#10B981",
        "icon": "plane"
    }
    create_res = client.post("/api/v1/user/goals", json=goal_payload, headers=headers)
    assert create_res.status_code == 201, f"Goal creation failed: {create_res.text}"
    goal_data = create_res.json()
    goal_id = goal_data["id"]
    print(f"Goal Created successfully! ID: {goal_id}, Suggested Monthly: Rs. {goal_data['suggested_monthly_savings']}")
    print(f"Cheering Message: {goal_data['cheering_message']}")

    # 2. Add Contribution (2-tap action: Rs. 10,000)
    contrib_payload = {
        "amount": 10000.0,
        "note": "First installment from freelance payout"
    }
    contrib_res = client.post(f"/api/v1/user/goals/{goal_id}/contributions", json=contrib_payload, headers=headers)
    assert contrib_res.status_code == 201, f"Contribution failed: {contrib_res.text}"
    updated_goal = contrib_res.json()
    assert updated_goal["saved_amount"] == 10000.0
    assert len(updated_goal["contributions"]) == 1
    contrib_id = updated_goal["contributions"][0]["id"]
    print(f"Contribution Added! Saved: Rs. {updated_goal['saved_amount']} ({updated_goal['percentage']}%)")
    print(f"Cheering Message: {updated_goal['cheering_message']}")

    # 3. Test Over-contribution validation (trying to add 25,000 when remaining is 20,000)
    over_contrib = client.post(f"/api/v1/user/goals/{goal_id}/contributions", json={"amount": 25000.0}, headers=headers)
    assert over_contrib.status_code == 400, "Should reject contribution exceeding target"
    print("Over-contribution blocked correctly: HTTP 400")

    # 4. Edit Contribution
    edit_contrib_payload = {
        "amount": 12000.0,
        "note": "Updated payout amount"
    }
    edit_res = client.put(f"/api/v1/user/goals/{goal_id}/contributions/{contrib_id}", json=edit_contrib_payload, headers=headers)
    assert edit_res.status_code == 200, f"Edit contribution failed: {edit_res.text}"
    edited_goal = edit_res.json()
    assert edited_goal["saved_amount"] == 12000.0
    print(f"Contribution Updated! Saved: Rs. {edited_goal['saved_amount']}")

    # 4. Summary KPIs
    summary_res = client.get("/api/v1/user/goals/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    print(f"Summary KPIs: Total Goals: {summary['total_goals']}, Active: {summary['active_goals']}, Saved: Rs. {summary['total_saved_amount']}")

    # 5. Delete Goal
    del_res = client.delete(f"/api/v1/user/goals/{goal_id}", headers=headers)
    assert del_res.status_code == 200
    print("Goal deleted cleanly.")

if __name__ == "__main__":
    test_goals_crud_and_contributions()
    print("ALL GOALS BACKEND TESTS PASSED SUCCESSFULLY!")
