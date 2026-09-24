"""
Automated test script for Email Verification Flow
Tests:
1. Registration creates user with is_active=False and is_verified=False
2. Attempting to log in while inactive/unverified is blocked (HTTP 403)
3. Calling GET /verify-email with valid token sets is_active=True and is_verified=True
4. User can now successfully log in!
"""
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import create_email_verification_token

client = TestClient(app)

def run_test():
    test_email = "sweni_verify_test@fintrack.com"
    
    # 0. Cleanup previous test run
    db = SessionLocal()
    db.query(User).filter(User.email == test_email).delete()
    # Also ensure seed test users are verified
    for u in db.query(User).filter(User.email.in_(["user@fintrack.com", "admin@fintrack.com"])).all():
        u.is_verified = True
        u.is_active = True
    db.commit()
    db.close()

    print("--- 1. Testing Registration ---")
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "Sweni Shah",
        "email": test_email,
        "password": "Password123!",
        "email_alerts_enabled": True
    })
    print("Registration HTTP Status:", reg_res.status_code)
    reg_data = reg_res.json()
    print("User is_active:", reg_data.get("is_active"))
    print("User is_verified:", reg_data.get("is_verified"))
    assert reg_data.get("is_active") is False, "User should be inactive upon registration!"
    assert reg_data.get("is_verified") is False, "User should be unverified upon registration!"

    print("\n--- 2. Attempting Login Before Verification (Must Fail) ---")
    login_res = client.post("/api/v1/auth/login", data={
        "username": test_email,
        "password": "Password123!"
    })
    print("Login HTTP Status:", login_res.status_code)
    print("Login Error Detail:", login_res.json().get("detail"))
    assert login_res.status_code == 403, "Login should be forbidden (403) for unverified users!"

    print("\n--- 3. Verifying Email via Token ---")
    user_id = reg_data["id"]
    token = create_email_verification_token(user_id)
    
    verify_res = client.get(f"/api/v1/auth/verify-email?token={token}")
    print("Verify HTTP Status:", verify_res.status_code)
    print("Verify Message:", verify_res.json().get("message"))
    assert verify_res.status_code == 200, "Verification should return 200 OK!"

    print("\n--- 4. Attempting Login After Verification (Must Succeed) ---")
    login_after_res = client.post("/api/v1/auth/login", data={
        "username": test_email,
        "password": "Password123!"
    })
    print("Login HTTP Status:", login_after_res.status_code)
    assert login_after_res.status_code == 200, "Login must succeed after email verification!"
    token_data = login_after_res.json()
    print("Access Token received:", token_data.get("access_token")[:30] + "...")

    print("\n[SUCCESS] ALL EMAIL VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
