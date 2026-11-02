import os
import sys
import time
from datetime import date
from pathlib import Path
from google import genai
from google.genai import types

from app.core.database import SessionLocal
from app.models.user import User
from app.services.assistant_tools import AssistantToolService

# ---------------------------------------------------------------------------
# CHANGE THIS EMAIL TO TEST ANY USER IN YOUR DATABASE
# ---------------------------------------------------------------------------
TARGET_USER_EMAIL = "user@fintrack.com"
# ---------------------------------------------------------------------------

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load .env
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY=") and not os.getenv("GEMINI_API_KEY"):
                os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("GEMINI_MODEL=") and not os.getenv("GEMINI_MODEL"):
                os.environ["GEMINI_MODEL"] = line.split("=", 1)[1].strip().strip('"').strip("'")

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").replace("models/", "")
client = genai.Client(api_key=api_key)

db = SessionLocal()
try:
    # 1. Grab target user
    user = db.query(User).filter(User.email == TARGET_USER_EMAIL).first()
    if not user:
        user = db.query(User).filter(User.is_active == True).first()

    if not user:
        print(f"Error: No user found with email '{TARGET_USER_EMAIL}'.")
        sys.exit(1)

    print(f"Testing Real Tools with User: {user.email} (ID: {user.id})")
    print("=" * 70)

    # 2. Instantiate tool service with authenticated user session
    tool_service = AssistantToolService(db=db, user_id=user.id)
    tools = tool_service.get_tools_list()

    # 3. Direct Tool Sanity Check
    print("\n--- 1. Direct Python Tool Execution Test ---")
    today_dt = date.today()
    dashboard_res = tool_service.get_dashboard_summary(month=today_dt.month, year=today_dt.year)
    print("get_dashboard_summary:", dashboard_res)

    goals_res = tool_service.get_goals_summary()
    print("get_goals_summary:", goals_res)

    txns_res = tool_service.list_recent_transactions(limit=3)
    print("list_recent_transactions:", txns_res)

    # 4. Live Gemini Function Calling with Real DB Tools
    print("\n--- 2. Live Gemini Call with Real DB Tools ---")
    today_str = today_dt.strftime("%B %d, %Y")
    system_instruction = f"""
You are FinTrack Assistant, a read-only helper inside the FinTrack personal finance app.
Current Reference Date: {today_str}
Timezone: Asia/Kolkata

SCOPE:
- Answer questions solely about the authenticated user's own FinTrack financial data using the provided tools.
- Never invent figures; all numbers must originate from tool results.
- Strict read-only: decline any requests to add/edit/delete data and guide the user to the app's UI.
- Format all currency in INR with ₹ symbol and Indian grouping.
"""

    chat = client.chats.create(
        model=model_name,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=tools
        )
    )

    questions = [
        "How are my savings goals looking right now?",
        "What are my last 3 transactions?",
        "How did I do financially this month?"
    ]

    for q in questions:
        print(f"\nUser: \"{q}\"")
        for attempt in range(3):
            try:
                res = chat.send_message(q)
                print(f"Assistant: {res.text.strip()}")
                break
            except Exception as e:
                if "503" in str(e) and attempt < 2:
                    print(f"   [Model busy (503), retrying in 3s... (attempt {attempt+1}/3)]")
                    time.sleep(3)
                else:
                    print(f"Error during call: {e}")
                    break
        time.sleep(2)

finally:
    db.close()

print("\n" + "=" * 70 + "\nReal database tool test complete!")
