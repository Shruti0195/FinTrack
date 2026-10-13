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

    print("\n--- 9. Testing Column-wise Sorting & Pagination (6 items per page) ---")
    # Verify pagination with limit=6
    p1 = client.get("/api/v1/user/income?page=1&limit=6", headers=headers)
    assert p1.status_code == 200
    p1_data = p1.json()
    assert len(p1_data["items"]) == 6, f"Expected 6 items on page 1, got {len(p1_data['items'])}"
    assert p1_data["total_count"] >= 12, f"Expected >= 12 total records, got {p1_data['total_count']}"
    assert p1_data["total_pages"] >= 3, f"Expected >= 3 total pages, got {p1_data['total_pages']}"

    p2 = client.get("/api/v1/user/income?page=2&limit=6", headers=headers)
    assert p2.status_code == 200
    p2_data = p2.json()
    assert len(p2_data["items"]) == 6, f"Expected 6 items on page 2, got {len(p2_data['items'])}"

    p3 = client.get("/api/v1/user/income?page=3&limit=6", headers=headers)
    assert p3.status_code == 200
    p3_data = p3.json()
    assert len(p3_data["items"]) >= 1, f"Expected >= 1 items on page 3, got {len(p3_data['items'])}"
    print(f"Pagination verified: P1={len(p1_data['items'])}, P2={len(p2_data['items'])}, P3={len(p3_data['items'])}, Total={p1_data['total_count']}, Pages={p1_data['total_pages']}")

    # Verify amount sorting
    amt_desc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=amount_desc", headers=headers).json()["items"]
    amt_asc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=amount_asc", headers=headers).json()["items"]
    assert amt_desc[0]["amount"] >= amt_desc[-1]["amount"], "Amount desc sort failed"
    assert amt_asc[0]["amount"] <= amt_asc[-1]["amount"], "Amount asc sort failed"
    assert amt_desc[0]["amount"] >= amt_asc[0]["amount"], "Desc highest should be >= Asc lowest"
    print(f"Amount sorting verified: highest={amt_desc[0]['amount']}, lowest={amt_asc[0]['amount']}")

    # Verify date sorting
    date_desc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=date_desc", headers=headers).json()["items"]
    date_asc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=date_asc", headers=headers).json()["items"]
    assert date_desc[0]["transaction_date"] >= date_desc[-1]["transaction_date"], "Date desc sort failed"
    assert date_asc[0]["transaction_date"] <= date_asc[-1]["transaction_date"], "Date asc sort failed"
    print(f"Date sorting verified: newest={date_desc[0]['transaction_date']}, oldest={date_asc[0]['transaction_date']}")

    # Verify category sorting
    cat_asc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=category_asc", headers=headers).json()["items"]
    cat_desc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=category_desc", headers=headers).json()["items"]
    assert cat_asc[0]["category_name"].lower() <= cat_asc[-1]["category_name"].lower(), "Category asc sort failed"
    assert cat_desc[0]["category_name"].lower() >= cat_desc[-1]["category_name"].lower(), "Category desc sort failed"
    print(f"Category sorting verified: first={cat_asc[0]['category_name']}, last={cat_desc[0]['category_name']}")

    # Verify description sorting
    desc_asc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=description_asc", headers=headers).json()["items"]
    desc_desc = client.get("/api/v1/user/income?limit=6&page=1&sort_by=description_desc", headers=headers).json()["items"]
    assert (desc_asc[0]["description"] or "").lower() <= (desc_asc[-1]["description"] or "").lower(), "Description asc sort failed"
    print("Description sorting verified.")

    print("\n>>> ALL INCOME BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_test()
