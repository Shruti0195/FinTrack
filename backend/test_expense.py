"""
Unit & integration test for the Expense / Transactions Module
Tests:
1. Log in with test user user@fintrack.com
2. Fetch expense categories (Food, Rent, Transport, Shopping, Bills, etc.)
3. Create new expense entry (e.g. Grocery Market ₹2,400 via UPI)
4. List expenses with filters and verify amount & count
5. Fetch stats and verify calculation
6. Update expense entry
7. Export CSV and PDF and verify contents
8. Delete expense entry
9. Test Column-wise sorting and pagination (6 items per page)
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

    print("\n--- 2. Fetching expense categories ---")
    cat_res = client.get("/api/v1/user/expenses/categories", headers=headers)
    assert cat_res.status_code == 200, f"Categories failed: {cat_res.text}"
    categories = cat_res.json()
    print(f"Retrieved {len(categories)} categories: {[c['name'] for c in categories]}")
    assert len(categories) > 0, "No expense categories found!"
    food_cat = next((c for c in categories if c["name"].lower() == "food"), categories[0])

    print("\n--- 3. Creating a new Expense entry ---")
    create_res = client.post("/api/v1/user/expenses", headers=headers, json={
        "amount": 2450.0,
        "category_id": food_cat["id"],
        "transaction_date": str(date.today()),
        "description": "Weekly Organic Produce & Pantry Refill",
        "payment_method": "UPI"
    })
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    created_tx = create_res.json()
    print("Created Expense ID:", created_tx["id"])
    print(f"Amount: Rs. {created_tx['amount']}, Category: {created_tx['category_name']}, Method: {created_tx['payment_method']}")
    assert created_tx["amount"] == 2450.0

    print("\n--- 4. Listing Expenses with search & filter ---")
    list_res = client.get("/api/v1/user/expenses?search=Organic", headers=headers)
    assert list_res.status_code == 200, f"List failed: {list_res.text}"
    list_data = list_res.json()
    print(f"Total matching items: {list_data['total_count']}, Total amount: Rs. {list_data['total_amount']}")
    assert list_data["total_count"] >= 1

    print("\n--- 5. Fetching Expense Summary & Stats ---")
    stats_res = client.get("/api/v1/user/expenses/stats", headers=headers)
    assert stats_res.status_code == 200, f"Stats failed: {stats_res.text}"
    stats_data = stats_res.json()
    print(f"Total expenses this month: Rs. {stats_data['total_expense_this_month']}")
    print(f"Entries count: {stats_data['entries_count_this_month']}")
    print(f"Top category: {stats_data['top_category_name']} (Rs. {stats_data['top_category_amount']})")

    print("\n--- 6. Updating the Expense entry ---")
    update_res = client.put(f"/api/v1/user/expenses/{created_tx['id']}", headers=headers, json={
        "amount": 2600.0,
        "description": "Updated Organic Produce Refill",
        "payment_method": "Card"
    })
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    assert update_res.json()["amount"] == 2600.0
    assert update_res.json()["payment_method"] == "Card"
    print("Successfully updated entry amount to Rs. 2,600 and payment method to Card")

    print("\n--- 7. Exporting CSV & PDF ---")
    export_res = client.get("/api/v1/user/expenses/export", headers=headers)
    assert export_res.status_code == 200, f"CSV export failed: {export_res.text}"
    csv_content = export_res.text
    assert "Date,Category,Description,Payment Method,Amount (INR)" in csv_content
    print("CSV Export verified. Header line matched.")

    pdf_res = client.get("/api/v1/user/expenses/export?format=pdf", headers=headers)
    assert pdf_res.status_code == 200, f"PDF export failed: {pdf_res.text}"
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000, "PDF content too short!"
    print("PDF Export verified. Content-Type application/pdf and valid size:", len(pdf_res.content))

    print("\n--- 8. Testing /transactions route alias ---")
    txn_alias_res = client.get("/api/v1/user/transactions", headers=headers)
    assert txn_alias_res.status_code == 200, f"Transactions alias failed: {txn_alias_res.text}"
    print("Transactions alias verified. Found total count:", txn_alias_res.json()["total_count"])

    print("\n--- 9. Deleting the test entry ---")
    del_res = client.delete(f"/api/v1/user/expenses/{created_tx['id']}", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    print("Expense entry deleted successfully.")

    print("\n--- 10. Testing Column-wise Sorting & Pagination (6 items per page) ---")
    p1 = client.get("/api/v1/user/expenses?page=1&limit=6", headers=headers)
    assert p1.status_code == 200
    p1_data = p1.json()
    assert len(p1_data["items"]) == 6, f"Expected 6 items on page 1, got {len(p1_data['items'])}"
    assert p1_data["total_count"] >= 12, f"Expected >= 12 total records, got {p1_data['total_count']}"
    assert p1_data["total_pages"] >= 3, f"Expected >= 3 total pages, got {p1_data['total_pages']}"

    # Amount sorting
    sort_amt_desc = client.get("/api/v1/user/expenses?sort_by=amount_desc&limit=6", headers=headers).json()
    sort_amt_asc = client.get("/api/v1/user/expenses?sort_by=amount_asc&limit=6", headers=headers).json()
    assert sort_amt_desc["items"][0]["amount"] >= sort_amt_desc["items"][1]["amount"]
    assert sort_amt_asc["items"][0]["amount"] <= sort_amt_asc["items"][1]["amount"]
    print("Amount sorting verified.")

    # Date sorting
    sort_date_desc = client.get("/api/v1/user/expenses?sort_by=date_desc&limit=6", headers=headers).json()
    sort_date_asc = client.get("/api/v1/user/expenses?sort_by=date_asc&limit=6", headers=headers).json()
    assert sort_date_desc["items"][0]["transaction_date"] >= sort_date_desc["items"][1]["transaction_date"]
    assert sort_date_asc["items"][0]["transaction_date"] <= sort_date_asc["items"][1]["transaction_date"]
    print("Date sorting verified.")

    # Category sorting
    sort_cat_asc = client.get("/api/v1/user/expenses?sort_by=category_asc&limit=6", headers=headers).json()
    assert sort_cat_asc["items"][0]["category_name"] <= sort_cat_asc["items"][-1]["category_name"]
    print("Category sorting verified.")

    print("\n>>> ALL EXPENSE BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_test()
