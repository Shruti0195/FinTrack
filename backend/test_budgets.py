from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_budgets_api():
    print("=== TESTING BUDGETS API ===")

    # 1. Login as standard user
    print("\n--- 1. Logging in as user@fintrack.com ---")
    login_res = client.post("/api/v1/auth/login", data={
        "username": "user@fintrack.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[SUCCESS] Logged in. Token received.")

    # 2. Get budgets for September 2026
    print("\n--- 2. Fetching Budgets for Month 9, Year 2026 ---")
    budgets_res = client.get("/api/v1/user/budgets?month=9&year=2026", headers=headers)
    assert budgets_res.status_code == 200, f"Fetch budgets failed: {budgets_res.text}"
    budgets = budgets_res.json()
    print(f"[SUCCESS] Retrieved {len(budgets)} budgets:")
    for b in budgets:
        print(f"  - {b['category_name']}: Limit = Rs.{b['limit_amount']}, Spent = Rs.{b['spent_amount']}, Left = Rs.{b['remaining_amount']} ({b['percentage_used']}%) [{b['status'].upper()}]")

    # 3. Fetch summary metrics
    print("\n--- 3. Fetching Budget Summary Metrics ---")
    summary_res = client.get("/api/v1/user/budgets/summary?month=9&year=2026", headers=headers)
    assert summary_res.status_code == 200, f"Summary failed: {summary_res.text}"
    summary = summary_res.json()
    print(f"[SUCCESS] Summary:")
    print(f"  - Total Budget: Rs.{summary['total_budget']}")
    print(f"  - Total Spent: Rs.{summary['total_spent']}")
    print(f"  - Total Remaining: Rs.{summary['total_remaining']}")
    print(f"  - Overall Used: {summary['overall_percentage']}%")
    print(f"  - Safe: {summary['safe_count']}, Warning: {summary['warning_count']}, Exceeded: {summary['exceeded_count']}")

    # 4. Get eligible categories for budget dropdown
    print("\n--- 4. Fetching Budget-Eligible Categories ---")
    cats_res = client.get("/api/v1/user/budgets/categories", headers=headers)
    assert cats_res.status_code == 200
    categories = cats_res.json()
    print(f"[SUCCESS] Available expense categories ({len(categories)}): {[c['name'] for c in categories]}")

    # Find a category not yet budgeted in Month 9 (e.g., 'Bills' or 'Rent')
    budgeted_cat_ids = {b['category_id'] for b in budgets}
    unbudgeted_cat = next((c for c in categories if c['id'] not in budgeted_cat_ids), None)

    if unbudgeted_cat:
        # 5. Create new budget
        print(f"\n--- 5. Creating new budget for '{unbudgeted_cat['name']}' ---")
        create_res = client.post("/api/v1/user/budgets", headers=headers, json={
            "category_id": unbudgeted_cat['id'],
            "month": 9,
            "year": 2026,
            "limit_amount": 4000.0
        })
        assert create_res.status_code == 201, f"Create budget failed: {create_res.text}"
        new_budget = create_res.json()
        print(f"[SUCCESS] Created budget ID: {new_budget['id']} for {new_budget['category_name']} (Limit: Rs.{new_budget['limit_amount']})")

        # 6. Test duplicate prevention
        print("\n--- 6. Testing duplicate budget prevention ---")
        dup_res = client.post("/api/v1/user/budgets", headers=headers, json={
            "category_id": unbudgeted_cat['id'],
            "month": 9,
            "year": 2026,
            "limit_amount": 4000.0
        })
        assert dup_res.status_code == 409, f"Duplicate was allowed! Status: {dup_res.status_code}"
        print(f"[SUCCESS] Correctly rejected duplicate with HTTP 409: {dup_res.json()['detail']}")

        # 7. Update budget
        print(f"\n--- 7. Updating budget limit to Rs.6500.0 ---")
        update_res = client.put(f"/api/v1/user/budgets/{new_budget['id']}", headers=headers, json={
            "limit_amount": 6500.0
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated['limit_amount'] == 6500.0
        print(f"[SUCCESS] Updated limit: Rs.{updated['limit_amount']}")

        # 8. Delete budget
        print(f"\n--- 8. Deleting test budget ---")
        del_res = client.delete(f"/api/v1/user/budgets/{new_budget['id']}", headers=headers)
        assert del_res.status_code == 200
        print(f"[SUCCESS] Deleted budget successfully: {del_res.json()}")

    print("\n[SUCCESS] ALL BUDGET API TESTS COMPLETED PERFECTLY!")

if __name__ == "__main__":
    test_budgets_api()
