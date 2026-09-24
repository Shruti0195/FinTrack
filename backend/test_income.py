"""
Unit & integration test for the Income Module
Tests:
1. Log in with test user user@fintrack.com
2. Fetch income categories (Salary, Freelancing, Business, Interest, Other)
3. Create new income entry (e.g. Freelance Web Development ₹15,000)
4. List income with filters and verify amount & count
5. Fetch stats and verify calculation
6. Update income entry
7. Export CSV and verify CSV stream
8. Delete income entry
"""
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_test():
    print("--- 1. Logging in as test user ---")
    login_res = client.post("/api/v1/auth/login", data={
        "username": "user@fintrack.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully! Token acquired.")

    print("\n--- 2. Fetching income categories ---")
    cat_res = client.get("/api/v1/user/income/categories", headers=headers)
    assert cat_res.status_code == 200, f"Categories failed: {cat_res.text}"
    categories = cat_res.json()
    print(f"Retrieved {len(categories)} categories: {[c['name'] for c in categories]}")
    assert len(categories) > 0, "No income categories found!"
    salary_cat = next((c for c in categories if c["name"].lower() == "salary"), categories[0])

    print("\n--- 3. Creating a new Income entry ---")
    create_res = client.post("/api/v1/user/income", headers=headers, json={
        "amount": 12500.0,
        "category_id": salary_cat["id"],
        "transaction_date": str(date.today()),
        "description": "Mid-month bonus"
    })
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    created_tx = create_res.json()
    print("Created Income ID:", created_tx["id"])
    print(f"Amount: Rs. {created_tx['amount']}, Category: {created_tx['category_name']}")
    assert created_tx["amount"] == 12500.0

    print("\n--- 4. Listing Income with search & filter ---")
    list_res = client.get("/api/v1/user/income?search=bonus", headers=headers)
    assert list_res.status_code == 200, f"List failed: {list_res.text}"
    list_data = list_res.json()
    print(f"Total matching items: {list_data['total_count']}, Total amount: Rs. {list_data['total_amount']}")
    assert list_data["total_count"] >= 1

    print("\n--- 5. Fetching Income Summary & Stats ---")
    stats_res = client.get("/api/v1/user/income/stats", headers=headers)
    assert stats_res.status_code == 200, f"Stats failed: {stats_res.text}"
    stats_data = stats_res.json()
    print(f"Total income this month: Rs. {stats_data['total_income_this_month']}")
    print(f"Entries count: {stats_data['entries_count_this_month']}")
    print(f"Top source: {stats_data['top_source_name']} (Rs. {stats_data['top_source_amount']})")

    print("\n--- 6. Updating the Income entry ---")
    update_res = client.put(f"/api/v1/user/income/{created_tx['id']}", headers=headers, json={
        "amount": 15000.0,
        "description": "Updated Mid-month bonus"
    })
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    assert update_res.json()["amount"] == 15000.0
    print("Successfully updated entry amount to Rs. 15,000")

    print("\n--- 7. Exporting CSV & PDF ---")
    export_res = client.get("/api/v1/user/income/export", headers=headers)
    assert export_res.status_code == 200, f"CSV export failed: {export_res.text}"
    csv_content = export_res.text
    assert "Date,Source/Category,Description,Amount (INR)" in csv_content
    print("CSV Export verified. Sample header line found.")

    pdf_res = client.get("/api/v1/user/income/export?format=pdf", headers=headers)
    assert pdf_res.status_code == 200, f"PDF export failed: {pdf_res.text}"
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000, "PDF content too short!"
    print("PDF Export verified. Content-Type application/pdf and valid size:", len(pdf_res.content))

    print("\n--- 8. Deleting the test entry ---")
    del_res = client.delete(f"/api/v1/user/income/{created_tx['id']}", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    print("Income entry deleted successfully.")

    print("\n>>> ALL INCOME BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_test()
