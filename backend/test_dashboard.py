from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_dashboard_tests():
    print("--- 1. Logging in as test user ---")
    login_res = client.post("/api/v1/auth/login", data={
        "username": "user@fintrack.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully!")

    print("\n--- 2. Testing Monthly Overview (April 2026) ---")
    res_month = client.get("/api/v1/user/dashboard/overview?period_type=monthly&year=2026&month=4", headers=headers)
    assert res_month.status_code == 200, f"Monthly failed: {res_month.text}"
    data_month = res_month.json()
    print("Monthly period_label:", data_month["period_label"])
    print(f"Income: {data_month['total_income']}, Expense: {data_month['total_expenses']}, Savings: {data_month['net_savings']}")
    print(f"Health score: {data_month['financial_health_score']} ({data_month['financial_health_label']})")
    print(f"Trends count: {len(data_month['monthly_trends'])}")
    assert len(data_month["monthly_trends"]) == 6, "Expected 6 trailing months"

    print("\n--- 3. Testing Quarterly Overview (Q2 2026) ---")
    res_q = client.get("/api/v1/user/dashboard/overview?period_type=quarterly&year=2026&quarter=2", headers=headers)
    assert res_q.status_code == 200, f"Quarterly failed: {res_q.text}"
    data_q = res_q.json()
    print("Quarterly period_label:", data_q["period_label"])
    assert len(data_q["monthly_trends"]) == 3, "Expected 3 months for quarter"

    print("\n--- 4. Testing Half Year Overview (H1 2026) ---")
    res_h = client.get("/api/v1/user/dashboard/overview?period_type=half_year&year=2026&half=1", headers=headers)
    assert res_h.status_code == 200, f"Half year failed: {res_h.text}"
    data_h = res_h.json()
    print("Half year period_label:", data_h["period_label"])
    assert len(data_h["monthly_trends"]) == 6, "Expected 6 months for half year"

    print("\n--- 5. Testing Yearly Overview (Year 2026) ---")
    res_y = client.get("/api/v1/user/dashboard/overview?period_type=yearly&year=2026", headers=headers)
    assert res_y.status_code == 200, f"Yearly failed: {res_y.text}"
    data_y = res_y.json()
    print("Yearly period_label:", data_y["period_label"])
    assert len(data_y["monthly_trends"]) == 12, "Expected 12 months for year"

    print("\n>>> ALL DASHBOARD BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_dashboard_tests()
