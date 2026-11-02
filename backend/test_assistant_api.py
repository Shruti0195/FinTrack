import sys
import time
from fastapi.testclient import TestClient
from app.main import app

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

client = TestClient(app)

def test_assistant_api():
    print("=" * 70)
    print("Testing FinTrack AI Assistant Endpoint: POST /api/v1/user/assistant/chat")
    print("=" * 70)

    # 1. Authenticate as test user to get JWT token
    print("\n1. Logging in as user@fintrack.com...")
    login_res = client.post("/api/v1/auth/login", data={
        "username": "user@fintrack.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Successfully logged in! Bearer token obtained.")

    # 2. Test Single Question
    print("\n2. Sending First Question: 'How much did I spend this month?'")
    chat_payload = {
        "messages": [
            {"role": "user", "content": "How much did I spend this month?"}
        ]
    }
    res = client.post("/api/v1/user/assistant/chat", json=chat_payload, headers=headers)
    assert res.status_code == 200, f"Chat endpoint failed with status {res.status_code}: {res.text}"
    data = res.json()
    print("   Status Code: 200 OK")
    print(f"   Assistant Reply:\n   \"{data['reply']}\"")
    print(f"   Suggested Navigation Tab: {data.get('suggested_tab')}")

    # 3. Test Multi-Turn Follow-Up Question
    time.sleep(2)  # Polite pause for free tier rate limit
    print("\n3. Sending Multi-Turn Follow-Up Question: 'Which budgets should I watch out for?'")
    follow_up_payload = {
        "messages": [
            {"role": "user", "content": "How much did I spend this month?"},
            {"role": "assistant", "content": data["reply"]},
            {"role": "user", "content": "Which budgets should I watch out for?"}
        ]
    }
    res2 = client.post("/api/v1/user/assistant/chat", json=follow_up_payload, headers=headers)
    assert res2.status_code == 200, f"Follow-up failed: {res2.text}"
    data2 = res2.json()
    print("   Status Code: 200 OK")
    print(f"   Assistant Reply:\n   \"{data2['reply']}\"")
    print(f"   Suggested Navigation Tab: {data2.get('suggested_tab')}")

    print("\n" + "=" * 70)
    print(">>> ASSISTANT API ENDPOINT TEST PASSED COMPLETELY! <<<")
    print("=" * 70)

if __name__ == "__main__":
    test_assistant_api()
