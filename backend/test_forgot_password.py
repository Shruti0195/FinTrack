from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, PasswordReset

client = TestClient(app)

def run_test():
    test_email = "user@fintrack.com"
    print("--- 1. Testing Forgot Password Request ---")
    res = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    print("Forgot Password HTTP Status:", res.status_code)
    print("Forgot Password Message:", res.json().get("message"))
    assert res.status_code == 200

    # Retrieve generated reset token from database
    db = SessionLocal()
    reset_entry = db.query(PasswordReset).order_by(PasswordReset.created_at.desc()).first()
    reset_token = reset_entry.token
    db.close()
    print("Reset Token from DB:", reset_token[:20] + "...")

    print("\n--- 2. Setting New Password via Token ---")
    new_pwd = "BrandNewSecretPassword123!"
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": new_pwd
    })
    print("Reset Password HTTP Status:", reset_res.status_code)
    print("Reset Password Message:", reset_res.json().get("message"))
    assert reset_res.status_code == 200

    print("\n--- 3. Attempting Login with Old Password (Must Fail) ---")
    login_old = client.post("/api/v1/auth/login", data={
        "username": test_email,
        "password": "password123"
    })
    print("Old Password Login Status:", login_old.status_code)
    assert login_old.status_code == 401, "Old password must be rejected!"

    print("\n--- 4. Attempting Login with New Password (Must Succeed) ---")
    login_new = client.post("/api/v1/auth/login", data={
        "username": test_email,
        "password": new_pwd
    })
    print("New Password Login Status:", login_new.status_code)
    assert login_new.status_code == 200, "New password must be accepted!"

    print("\n--- 5. Attempting to Reuse Token (Must Fail) ---")
    reuse_res = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "YetAnotherPassword!"
    })
    print("Token Reuse Status:", reuse_res.status_code)
    assert reuse_res.status_code == 400, "Token reuse must be blocked!"

    # Restore original password for ongoing tests
    client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    db = SessionLocal()
    r2 = db.query(PasswordReset).order_by(PasswordReset.created_at.desc()).first()
    token2 = r2.token
    db.close()
    client.post("/api/v1/auth/reset-password", json={"token": token2, "new_password": "password123"})
    print("\n[SUCCESS] ALL FORGOT/RESET PASSWORD TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
