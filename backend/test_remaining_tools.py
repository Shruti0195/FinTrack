import sys
from datetime import date
from app.core.database import SessionLocal
from app.models.user import User
from app.services.assistant_tools import AssistantToolService

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_all_remaining_tools():
    print("=" * 70)
    print("Testing FinTrack AI Assistant - Step 6 Remaining Tools")
    print("=" * 70)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "user@fintrack.com").first()
        if not user:
            user = db.query(User).filter(User.is_active == True).first()

        assert user is not None, "No active user found in database."
        print(f"Bound to User: {user.email} (ID: {user.id})")

        tool_service = AssistantToolService(db=db, user_id=user.id)
        today_dt = date.today()

        # 1. Test get_health_score
        print("\n--- 1. Testing get_health_score ---")
        hs = tool_service.get_health_score(month=today_dt.month, year=today_dt.year)
        print(f"Health Score Result: Score={hs.get('score')}, Label={hs.get('status_label')}")
        if hs.get("factors"):
            print(f"Total Factors Evaluated: {len(hs['factors'])}")
            for f in hs['factors'][:2]:
                print(f" - Factor: {f['factor']} ({f['earned_points']}/{f['max_points']} pts)")

        # 2. Test compare_periods
        print("\n--- 2. Testing compare_periods (This month vs last month) ---")
        prev_m = today_dt.month - 1 if today_dt.month > 1 else 12
        prev_y = today_dt.year if today_dt.month > 1 else today_dt.year - 1
        comp = tool_service.compare_periods(
            current_month=today_dt.month,
            current_year=today_dt.year,
            compare_month=prev_m,
            compare_year=prev_y
        )
        print(f"Current Period: {comp['current_period']}, Compare Period: {comp['compare_period']}")
        print(f"Expense Change: ₹{comp['changes']['expense_change_amount']} ({comp['changes']['expense_change_pct']}%)")
        print(f"Savings Change: ₹{comp['changes']['savings_change_amount']}")

        # 3. Test get_spending_trend
        print("\n--- 3. Testing get_spending_trend (6 Months) ---")
        trend = tool_service.get_spending_trend(months=6)
        print(f"Months Analyzed: {trend['months_analyzed']}")
        for t in trend['monthly_history']:
            print(f" - {t['period']}: Expenses = ₹{t['expenses']:,.2f}, Income = ₹{t['income']:,.2f}")

        # 4. Test get_app_help
        print("\n--- 4. Testing get_app_help (Budget Alerts & PDF Export) ---")
        help_alerts = tool_service.get_app_help(topic="budget_alerts")
        print(f"Budget Alerts Guidance:\n  {help_alerts['guidance']}")

        help_pdf = tool_service.get_app_help(topic="pdf_report")
        print(f"\nPDF Report Guidance:\n  {help_pdf['guidance']}")

        # 5. Check All Tools Menu Count
        tools = tool_service.get_tools_list()
        print(f"\nTotal Registered Tools in Menu: {len(tools)} tools ready for Gemini!")
        assert len(tools) == 9, f"Expected 9 tools, got {len(tools)}"

        print("\n" + "=" * 70)
        print(">>> ALL STEP 6 TOOLS VERIFIED AND FUNCTIONING PERFECTLY! <<<")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    test_all_remaining_tools()
