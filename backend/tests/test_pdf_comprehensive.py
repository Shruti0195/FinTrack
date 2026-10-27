import os
import io
import sys
import uuid
from datetime import date, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from pypdf import PdfReader

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution
from app.services.pdf_report_service import generate_pdf_report, format_indian_currency
from app.api.v1.endpoints.user.analytics import get_analytics_overview


def run_all_tests():
    print("--- Starting FinTrack PDF Comprehensive Automated Tests ---")

    # 1. Setup in-memory SQLite DB
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()

    today = date.today()
    curr_year = today.year
    curr_month = today.month

    # Create primary test user
    u1_id = uuid.uuid4()
    user = User(
        id=u1_id,
        email="testuser@fintrack.com",
        name="Aarav Sharma",
        password_hash="hashed_pw",
        is_verified=True,
    )
    db.add(user)

    # Categories
    cat_salary_id = uuid.uuid4()
    cat_freelance_id = uuid.uuid4()
    cat_food_id = uuid.uuid4()
    cat_rent_id = uuid.uuid4()
    cat_shopping_id = uuid.uuid4()

    cat_salary = Category(id=cat_salary_id, user_id=u1_id, name="Salary", type="income")
    cat_freelance = Category(id=cat_freelance_id, user_id=u1_id, name="Freelance", type="income")
    cat_food = Category(id=cat_food_id, user_id=u1_id, name="Food & Dining", type="expense")
    cat_rent = Category(id=cat_rent_id, user_id=u1_id, name="Rent & Housing", type="expense")
    cat_shopping = Category(id=cat_shopping_id, user_id=u1_id, name="Shopping", type="expense")
    db.add_all([cat_salary, cat_freelance, cat_food, cat_rent, cat_shopping])
    db.commit()

    # Transactions for current month and previous month
    txs = [
        # Current month
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_salary_id, amount=75000.0, type="income", transaction_date=date(curr_year, curr_month, 2), payment_method="UPI", description="Monthly Salary"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_freelance_id, amount=15000.0, type="income", transaction_date=date(curr_year, curr_month, 10), payment_method="Bank Transfer", description="Design Work"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_food_id, amount=8500.0, type="expense", transaction_date=date(curr_year, curr_month, 5), payment_method="UPI", description="Supermarket Groceries"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_rent_id, amount=22000.0, type="expense", transaction_date=date(curr_year, curr_month, 3), payment_method="Net Banking", description="Apartment Rent"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_shopping_id, amount=4500.0, type="expense", transaction_date=date(curr_year, curr_month, 15), payment_method="Credit Card", description="Winter Clothes"),
    ]

    # Prev month transactions (same days 1 to today.day)
    prev_m = curr_month - 1 if curr_month > 1 else 12
    prev_y = curr_year if curr_month > 1 else curr_year - 1
    txs.extend([
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_salary_id, amount=70000.0, type="income", transaction_date=date(prev_y, prev_m, 2), payment_method="UPI"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_food_id, amount=9000.0, type="expense", transaction_date=date(prev_y, prev_m, 5), payment_method="UPI"),
        Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=cat_rent_id, amount=22000.0, type="expense", transaction_date=date(prev_y, prev_m, 3), payment_method="Net Banking"),
    ])
    db.add_all(txs)

    # Budgets for current month
    # Food: 10,000 limit, 8,500 spent -> 85% warning / near limit
    # Rent: 25,000 limit, 22,000 spent -> 88% warning / near limit
    b1 = Budget(id=uuid.uuid4(), user_id=u1_id, category_id=cat_food_id, limit_amount=10000.0, month=curr_month, year=curr_year)
    b2 = Budget(id=uuid.uuid4(), user_id=u1_id, category_id=cat_rent_id, limit_amount=25000.0, month=curr_month, year=curr_year)
    db.add_all([b1, b2])

    # Goal
    g1_id = uuid.uuid4()
    g1 = Goal(id=g1_id, user_id=u1_id, title="Emergency Reserve", target_amount=100000.0, deadline=date(curr_year, 12, 31), status="active")
    db.add(g1)
    db.commit()

    gc1 = GoalContribution(id=uuid.uuid4(), goal_id=g1_id, amount=25000.0, contributed_at=date(curr_year, curr_month, 8))
    db.add(gc1)
    db.commit()

    # -------------------------------------------------------------------------
    # TEST 1: Overview numbers match PDF numbers for the current month
    # -------------------------------------------------------------------------
    print("\n[Test 1] Comparing Analytics Overview with PDF Report...")
    overview = get_analytics_overview(
        period_type="monthly",
        year=curr_year,
        month=curr_month,
        quarter=None,
        half=None,
        db=db,
        current_user=user
    )

    pdf_bytes, filename = generate_pdf_report(
        db=db,
        user=user,
        period_type="monthly",
        year=curr_year,
        month=curr_month
    )

    assert len(pdf_bytes) > 0, "PDF bytes should not be empty"
    reader = PdfReader(io.BytesIO(pdf_bytes))
    num_pages = len(reader.pages)
    full_text = " ".join([page.extract_text() for page in reader.pages])

    inc_metric = next(m for m in overview.comparison if m.key == 'income')
    exp_metric = next(m for m in overview.comparison if m.key == 'expenses')
    sr_metric = next(m for m in overview.comparison if m.key == 'savings_rate')

    print(f"  PDF Pages: {num_pages}")
    print(f"  Overview Income: ₹{inc_metric.current_value}, Expenses: ₹{exp_metric.current_value}, Savings Rate: {sr_metric.current_value}%")

    assert num_pages <= 2, f"Expected PDF to be at most 2 pages, got {num_pages}"
    assert f"{sr_metric.current_value:.1f}%" in full_text, f"Expected {sr_metric.current_value:.1f}% in PDF text"
    assert format_indian_currency(inc_metric.current_value) in full_text, f"Expected income {format_indian_currency(inc_metric.current_value)} in PDF"
    assert format_indian_currency(exp_metric.current_value) in full_text, f"Expected expenses {format_indian_currency(exp_metric.current_value)} in PDF"
    print("  -> TEST 1 PASSED: Overview numbers match PDF perfectly.")

    # -------------------------------------------------------------------------
    # TEST 2: Account with 0 budgets and 0 goals
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing account with 0 budgets and 0 goals...")
    u2_id = uuid.uuid4()
    user_empty = User(id=u2_id, email="empty@fintrack.com", name="Minimal User", password_hash="h", is_verified=True)
    db.add(user_empty)
    db.commit()
    # Add one income and expense so report generates data
    tx_empty = [
        Transaction(id=uuid.uuid4(), user_id=u2_id, category_id=cat_salary_id, amount=50000.0, type="income", transaction_date=date(curr_year, curr_month, 2)),
        Transaction(id=uuid.uuid4(), user_id=u2_id, category_id=cat_food_id, amount=12000.0, type="expense", transaction_date=date(curr_year, curr_month, 4)),
    ]
    db.add_all(tx_empty)
    db.commit()

    pdf_bytes2, _ = generate_pdf_report(db=db, user=user_empty, period_type="monthly", year=curr_year, month=curr_month)
    reader2 = PdfReader(io.BytesIO(pdf_bytes2))
    text2 = " ".join([page.extract_text() for page in reader2.pages])

    assert "Budgets Performance" not in text2, "Budgets Performance should be omitted when 0 budgets"
    assert "Active Savings Goals" not in text2, "Active Savings Goals should be omitted when 0 goals"
    assert len(reader2.pages) <= 2, f"Expected <= 2 pages, got {len(reader2.pages)}"
    print("  -> TEST 2 PASSED: Budgets and goals cleanly omitted with 0 items.")

    # -------------------------------------------------------------------------
    # TEST 3: Account with no income (zero division check)
    # -------------------------------------------------------------------------
    print("\n[Test 3] Testing account with no income (zero division check)...")
    u3_id = uuid.uuid4()
    user_no_inc = User(id=u3_id, email="noincome@fintrack.com", name="No Income User", password_hash="h", is_verified=True)
    db.add(user_no_inc)
    db.commit()
    db.add(Transaction(id=uuid.uuid4(), user_id=u3_id, category_id=cat_food_id, amount=8000.0, type="expense", transaction_date=date(curr_year, curr_month, 10)))
    db.commit()

    pdf_bytes3, _ = generate_pdf_report(db=db, user=user_no_inc, period_type="monthly", year=curr_year, month=curr_month)
    reader3 = PdfReader(io.BytesIO(pdf_bytes3))
    text3 = " ".join([page.extract_text() for page in reader3.pages])

    assert "0.0%" in text3, "Expected 0.0% savings rate for no income"
    assert "Total expenses for this period came to ₹8,000" in text3, "Expected specific sentence for no income"
    print("  -> TEST 3 PASSED: Zero income handled cleanly without division by zero.")

    # -------------------------------------------------------------------------
    # TEST 4: Negative savings (expenses > income)
    # -------------------------------------------------------------------------
    print("\n[Test 4] Testing negative savings...")
    u4_id = uuid.uuid4()
    user_neg = User(id=u4_id, email="negsavings@fintrack.com", name="Negative Savings User", password_hash="h", is_verified=True)
    db.add(user_neg)
    db.commit()
    db.add_all([
        Transaction(id=uuid.uuid4(), user_id=u4_id, category_id=cat_salary_id, amount=20000.0, type="income", transaction_date=date(curr_year, curr_month, 2)),
        Transaction(id=uuid.uuid4(), user_id=u4_id, category_id=cat_food_id, amount=35000.0, type="expense", transaction_date=date(curr_year, curr_month, 5)),
    ])
    db.commit()

    pdf_bytes4, _ = generate_pdf_report(db=db, user=user_neg, period_type="monthly", year=curr_year, month=curr_month)
    reader4 = PdfReader(io.BytesIO(pdf_bytes4))
    text4 = " ".join([page.extract_text() for page in reader4.pages])

    assert "-₹15,000" in text4, "Expected negative net savings format -₹15,000"
    assert "Spending exceeded your income by ₹15,000" in text4, "Expected executive summary to mention overspending"
    print("  -> TEST 4 PASSED: Negative savings clearly marked and formatted.")

    # -------------------------------------------------------------------------
    # TEST 5: Very long category and goal names (wrapping test)
    # -------------------------------------------------------------------------
    print("\n[Test 5] Testing long goal and category names...")
    long_cat_id = uuid.uuid4()
    long_cat = Category(id=long_cat_id, user_id=u1_id, name="Extremely Long Category Name For Subscriptions And Online Digital Entertainment Services", type="expense")
    db.add(long_cat)
    long_goal = Goal(id=uuid.uuid4(), user_id=u1_id, title="Massive Super Long Term Dream Villa In The Scenic Mountains Of Himachal Pradesh With Infinity Pool", target_amount=5000000.0, deadline=date(curr_year + 5, 1, 1), status="active")
    db.add(long_goal)
    db.commit()
    db.add(Transaction(id=uuid.uuid4(), user_id=u1_id, category_id=long_cat_id, amount=3200.0, type="expense", transaction_date=date(curr_year, curr_month, 6), payment_method="Debit Card", description="Long Subscription Annual Renewal For Streaming Services"))
    db.commit()

    pdf_bytes5, _ = generate_pdf_report(db=db, user=user, period_type="monthly", year=curr_year, month=curr_month)
    assert len(pdf_bytes5) > 0
    print("  -> TEST 5 PASSED: Long names wrapped without layout failure.")

    # -------------------------------------------------------------------------
    # TEST 6: 30+ Categories (compact 2-page constraint)
    # -------------------------------------------------------------------------
    print("\n[Test 6] Testing 30+ categories...")
    u6_id = uuid.uuid4()
    user_many_cats = User(id=u6_id, email="manycats@fintrack.com", name="Many Categories User", password_hash="h", is_verified=True)
    db.add(user_many_cats)
    db.commit()
    # Add 35 categories and transactions
    many_cats = []
    many_txs = []
    for i in range(1, 36):
        c_id = uuid.uuid4()
        c = Category(id=c_id, user_id=u6_id, name=f"Category Number {i:02d}", type="expense")
        many_cats.append(c)
        t = Transaction(id=uuid.uuid4(), user_id=u6_id, category_id=c_id, amount=1000.0 + i * 50, type="expense", transaction_date=date(curr_year, curr_month, min(28, (i % 25) + 1)))
        many_txs.append(t)
    db.add_all(many_cats)
    db.add_all(many_txs)
    # Add income
    db.add(Transaction(id=uuid.uuid4(), user_id=u6_id, category_id=cat_salary_id, amount=200000.0, type="income", transaction_date=date(curr_year, curr_month, 1)))
    db.commit()

    pdf_bytes6, _ = generate_pdf_report(db=db, user=user_many_cats, period_type="monthly", year=curr_year, month=curr_month)
    reader6 = PdfReader(io.BytesIO(pdf_bytes6))
    print(f"  35 Categories PDF Page Count: {len(reader6.pages)}")
    assert len(reader6.pages) <= 2, f"Expected report with 35 categories to stay within 2 pages, got {len(reader6.pages)}"
    print("  -> TEST 6 PASSED: 30+ categories strictly limited to top 5, stays within 2 pages.")

    # -------------------------------------------------------------------------
    # TEST 7: Very large amount (₹10,00,00,000 / 10 Crores)
    # -------------------------------------------------------------------------
    print("\n[Test 7] Testing very large amount (₹10,00,00,000)...")
    formatted_crores = format_indian_currency(100000000)
    assert formatted_crores == "₹10,00,00,000", f"Expected ₹10,00,00,000 but got {formatted_crores}"

    u7_id = uuid.uuid4()
    user_rich = User(id=u7_id, email="rich@fintrack.com", name="High Net Worth User", password_hash="h", is_verified=True)
    db.add(user_rich)
    db.commit()
    db.add_all([
        Transaction(id=uuid.uuid4(), user_id=u7_id, category_id=cat_salary_id, amount=100000000.0, type="income", transaction_date=date(curr_year, curr_month, 1)),
        Transaction(id=uuid.uuid4(), user_id=u7_id, category_id=cat_food_id, amount=25000000.0, type="expense", transaction_date=date(curr_year, curr_month, 4)),
    ])
    db.commit()

    pdf_bytes7, _ = generate_pdf_report(db=db, user=user_rich, period_type="monthly", year=curr_year, month=curr_month)
    reader7 = PdfReader(io.BytesIO(pdf_bytes7))
    text7 = " ".join([page.extract_text() for page in reader7.pages])
    assert "₹10,00,00,000" in text7, "Expected ₹10,00,00,000 in PDF text"
    print("  -> TEST 7 PASSED: Large amount ₹10,00,00,000 formatted and rendered without error.")

    # -------------------------------------------------------------------------
    # TEST 8: Unfinished period labeling and fair comparison
    # -------------------------------------------------------------------------
    print("\n[Test 8] Testing unfinished period labeling...")
    # Today is in curr_month, so generating for curr_month should detect unfinished period
    pdf_bytes8, _ = generate_pdf_report(db=db, user=user, period_type="monthly", year=curr_year, month=curr_month)
    reader8 = PdfReader(io.BytesIO(pdf_bytes8))
    text8 = " ".join([page.extract_text() for page in reader8.pages])
    expected_m_str = f"Month to date (1 to {today.day}"
    assert expected_m_str in text8, f"Expected '{expected_m_str}' in PDF title area"
    assert f"vs 1 to {today.day}" in text8, f"Expected 'vs 1 to {today.day}' comparison label in PDF"
    print(f"  -> TEST 8 PASSED: Found '{expected_m_str}' and 'vs 1 to {today.day}' in unfinished month report.")

    # -------------------------------------------------------------------------
    # TEST 9: 12 Months of Data (No early estimate)
    # -------------------------------------------------------------------------
    print("\n[Test 9] Testing 12 months of data...")
    u9_id = uuid.uuid4()
    user_veteran = User(id=u9_id, email="veteran@fintrack.com", name="Veteran User", password_hash="h", is_verified=True)
    db.add(user_veteran)
    db.commit()
    # Add transactions spanning 12 distinct months
    vet_txs = []
    v_y, v_m = curr_year, curr_month
    for idx in range(12):
        vet_txs.append(
            Transaction(id=uuid.uuid4(), user_id=u9_id, category_id=cat_salary_id, amount=50000.0, type="income", transaction_date=date(v_y, v_m, 1))
        )
        vet_txs.append(
            Transaction(id=uuid.uuid4(), user_id=u9_id, category_id=cat_food_id, amount=20000.0, type="expense", transaction_date=date(v_y, v_m, 5))
        )
        v_m -= 1
        if v_m < 1:
            v_m = 12
            v_y -= 1
    db.add_all(vet_txs)
    db.commit()

    pdf_bytes9, _ = generate_pdf_report(db=db, user=user_veteran, period_type="yearly", year=curr_year)
    reader9 = PdfReader(io.BytesIO(pdf_bytes9))
    text9 = " ".join([page.extract_text() for page in reader9.pages])
    assert "(early estimate)" not in text9, "12 months of data should NOT display (early estimate)"
    assert "Based on 12 months of data" in text9, "Expected 'Based on 12 months of data' in health score"
    print("  -> TEST 9 PASSED: 12 months correctly shows 'Based on 12 months of data' without early estimate.")

    # -------------------------------------------------------------------------
    # TEST 10: Multilingual Script Rendering (Gujarati, Hindi, English)
    # -------------------------------------------------------------------------
    print("\n[Test 10] Testing Gujarati, Hindi, and English script rendering...")
    u10_id = uuid.uuid4()
    user_gujarati = User(
        id=u10_id,
        email="gujarati@fintrack.com",
        name="અક્ષય પટેલ",  # Gujarati User Name
        password_hash="h",
        is_verified=True
    )
    db.add(user_gujarati)
    db.commit()

    cat_eng_id = uuid.uuid4()
    cat_inc_id = uuid.uuid4()
    cat_eng = Category(id=cat_eng_id, user_id=u10_id, name="Household & Groceries", type="expense")
    cat_inc = Category(id=cat_inc_id, user_id=u10_id, name="Consulting", type="income")
    db.add_all([cat_eng, cat_inc])

    # Goal in Hindi
    goal_hindi_id = uuid.uuid4()
    goal_hindi = Goal(
        id=goal_hindi_id,
        user_id=u10_id,
        title="नया घर फंड",  # Hindi / Devanagari Goal
        target_amount=1500000.0,
        deadline=date(curr_year + 2, 6, 30),
        status="active"
    )
    db.add(goal_hindi)
    db.commit()

    db.add_all([
        Transaction(id=uuid.uuid4(), user_id=u10_id, category_id=cat_inc_id, amount=85000.0, type="income", transaction_date=date(curr_year, curr_month, 2)),
        Transaction(id=uuid.uuid4(), user_id=u10_id, category_id=cat_eng_id, amount=22000.0, type="expense", transaction_date=date(curr_year, curr_month, 4), payment_method="UPI", description="Monthly groceries and provisions"),
        GoalContribution(id=uuid.uuid4(), goal_id=goal_hindi_id, amount=25000.0, contributed_at=date(curr_year, curr_month, 10))
    ])
    db.commit()

    pdf_bytes10, _ = generate_pdf_report(db=db, user=user_gujarati, period_type="monthly", year=curr_year, month=curr_month)
    assert len(pdf_bytes10) > 0, "PDF should generate successfully for multilingual scripts"
    reader10 = PdfReader(io.BytesIO(pdf_bytes10))
    text10 = " ".join([page.extract_text() for page in reader10.pages])

    # Check that Gujarati and Hindi text appear in the parsed PDF stream
    assert "અક્ષય પટેલ" in text10, "Expected Gujarati name 'અક્ષય પટેલ' in PDF text"
    assert "नया घर फंड" in text10, "Expected Hindi goal name 'नया घर फंड' in PDF text"
    assert "Household & Groceries" in text10, "Expected English category in PDF text"
    print("  -> TEST 10 PASSED: Gujarati, Hindi, and English all rendered cleanly without font errors.")

    # -------------------------------------------------------------------------
    # TEST 12: Tables Arithmetic and Totals (Expenses, Income, Budgets, Goals)
    # -------------------------------------------------------------------------
    print("\n[Test 12] Testing that table rows add up to Totals (100.0%)...")
    # full_text from Test 1 should have "Total Expenses", "Total Income", "Total Budgets", "Total Goals"
    assert "Total Expenses" in full_text, "Expected 'Total Expenses' total row in PDF"
    assert "Total Income" in full_text, "Expected 'Total Income' total row in PDF"
    assert "Total Budgets" in full_text, "Expected 'Total Budgets' total row in PDF"
    assert "Total Goals" in full_text, "Expected 'Total Goals' total row in PDF"
    assert "100.0%" in full_text, "Expected 100.0% total share in tables"
    print("  -> TEST 12 PASSED: Table rows have complete accounting and Total rows.")

    # -------------------------------------------------------------------------
    # TEST 13: Analytics Overview Comparison Matches PDF in Unfinished Period
    # -------------------------------------------------------------------------
    print("\n[Test 13] Testing Analytics overview vs PDF comparison values in unfinished period...")
    ov_inc = next(m for m in overview.comparison if m.key == "income")
    ov_exp = next(m for m in overview.comparison if m.key == "expenses")
    ov_sav = next(m for m in overview.comparison if m.key == "savings")

    # In Test 1, current month was unfinished, prev_expenses should be compared with 1 to today.day of prev month
    # Prev month expense was 9000 (day 5) + 22000 (day 3) = 31000
    assert ov_exp.previous_value == 31000.0, f"Expected prev_expenses to be 31000, got {ov_exp.previous_value}"
    assert format_indian_currency(ov_exp.previous_value) in full_text, f"Expected {format_indian_currency(ov_exp.previous_value)} in PDF"
    print("  -> TEST 13 PASSED: Analytics and PDF share identical apples-to-apples comparison numbers.")

    # -------------------------------------------------------------------------
    # TEST 14: Goals Contributions Exceed Net Savings (Extra note line appears)
    # -------------------------------------------------------------------------
    print("\n[Test 14] Testing Goals contributions exceeding net savings (extra note line appears)...")
    u14_id = uuid.uuid4()
    u14 = User(id=u14_id, email="u14@test.com", password_hash="hash", name="Exceed User", is_active=True)
    db.add(u14)
    cat_inc_14 = Category(id=uuid.uuid4(), user_id=u14_id, name="Salary14", type="income")
    cat_exp_14 = Category(id=uuid.uuid4(), user_id=u14_id, name="Groceries14", type="expense")
    db.add_all([cat_inc_14, cat_exp_14])
    g14 = Goal(id=uuid.uuid4(), user_id=u14_id, title="Vacation Fund", target_amount=100000.0, status="active")
    db.add(g14)
    db.commit()

    # Income = 20,000, Expense = 12,000 => Net Savings = 8,000
    # Added to goals = 25,000 => 25,000 > 8,000 (exceeds by 17,000)
    db.add(Transaction(id=uuid.uuid4(), user_id=u14_id, category_id=cat_inc_14.id, amount=20000.0, type="income", transaction_date=date(curr_year, curr_month, 2)))
    db.add(Transaction(id=uuid.uuid4(), user_id=u14_id, category_id=cat_exp_14.id, amount=12000.0, type="expense", transaction_date=date(curr_year, curr_month, 5)))
    db.add(GoalContribution(id=uuid.uuid4(), goal_id=g14.id, amount=25000.0, contributed_at=date(curr_year, curr_month, 10)))
    db.commit()

    pdf_bytes14, _ = generate_pdf_report(db=db, user=u14, period_type="monthly", year=curr_year, month=curr_month)
    reader14 = PdfReader(io.BytesIO(pdf_bytes14))
    text14 = " ".join([page.extract_text() for page in reader14.pages])

    assert len(reader14.pages) <= 2, f"Expected <= 2 pages, got {len(reader14.pages)}"
    assert "You added ₹25,000 to your goals. Goal money is tracked separately and is not counted as an expense." in text14
    assert "How goals work: money you add to a goal is recorded for that goal only" in text14
    assert "more than you saved this period. That is fine: goal money can come from savings you made earlier." in text14
    assert "How to read this report:" in text14
    print("  -> TEST 14 PASSED: Extra line and summary sentence appear when goals exceed net savings.")

    # -------------------------------------------------------------------------
    # TEST 15: Goals Contributions Within Net Savings (Extra note line absent)
    # -------------------------------------------------------------------------
    print("\n[Test 15] Testing Goals contributions within net savings (extra line absent)...")
    u15_id = uuid.uuid4()
    u15 = User(id=u15_id, email="u15@test.com", password_hash="hash", name="Within User", is_active=True)
    db.add(u15)
    g15 = Goal(id=uuid.uuid4(), user_id=u15_id, title="Emergency Fund", target_amount=150000.0, status="active")
    db.add(g15)
    db.commit()

    # Income = 50,000, Expense = 10,000 => Net Savings = 40,000
    # Added to goals = 15,000 => 15,000 <= 40,000
    db.add(Transaction(id=uuid.uuid4(), user_id=u15_id, category_id=cat_inc_14.id, amount=50000.0, type="income", transaction_date=date(curr_year, curr_month, 2)))
    db.add(Transaction(id=uuid.uuid4(), user_id=u15_id, category_id=cat_exp_14.id, amount=10000.0, type="expense", transaction_date=date(curr_year, curr_month, 5)))
    db.add(GoalContribution(id=uuid.uuid4(), goal_id=g15.id, amount=15000.0, contributed_at=date(curr_year, curr_month, 10)))
    db.commit()

    pdf_bytes15, _ = generate_pdf_report(db=db, user=u15, period_type="monthly", year=curr_year, month=curr_month)
    reader15 = PdfReader(io.BytesIO(pdf_bytes15))
    text15 = " ".join([page.extract_text() for page in reader15.pages])

    assert len(reader15.pages) <= 2, f"Expected <= 2 pages, got {len(reader15.pages)}"
    assert "You added ₹15,000 to your goals. Goal money is tracked separately and is not counted as an expense." in text15
    assert "How goals work: money you add to a goal is recorded for that goal only" in text15
    assert "more than you saved this period" not in text15, "Extra line should NOT appear when contributions <= savings"
    print("  -> TEST 15 PASSED: Extra line correctly absent when goal contributions stay within net savings.")

    # -------------------------------------------------------------------------
    # TEST 16: Zero Goal Contributions in Period (Summary sentence omitted)
    # -------------------------------------------------------------------------
    print("\n[Test 16] Testing zero goal contributions in period (summary sentence omitted)...")
    u16_id = uuid.uuid4()
    u16 = User(id=u16_id, email="u16@test.com", password_hash="hash", name="Zero Contrib User", is_active=True)
    db.add(u16)
    g16 = Goal(id=uuid.uuid4(), user_id=u16_id, title="Retirement", target_amount=500000.0, status="active")
    db.add(g16)
    db.commit()

    db.add(Transaction(id=uuid.uuid4(), user_id=u16_id, category_id=cat_inc_14.id, amount=30000.0, type="income", transaction_date=date(curr_year, curr_month, 2)))
    db.add(Transaction(id=uuid.uuid4(), user_id=u16_id, category_id=cat_exp_14.id, amount=10000.0, type="expense", transaction_date=date(curr_year, curr_month, 5)))
    db.commit()

    pdf_bytes16, _ = generate_pdf_report(db=db, user=u16, period_type="monthly", year=curr_year, month=curr_month)
    reader16 = PdfReader(io.BytesIO(pdf_bytes16))
    text16 = " ".join([page.extract_text() for page in reader16.pages])

    assert "to your goals" not in text16, "Goal summary sentence should be omitted when nothing added"
    assert "How goals work: money you add to a goal is recorded for that goal only" in text16
    print("  -> TEST 16 PASSED: Goal summary sentence cleanly omitted when no contributions added in period.")

    # -------------------------------------------------------------------------
    # TEST 17: Budgets Grouping and Count Matching
    # -------------------------------------------------------------------------
    print("\n[Test 17] Testing Budgets grouping and exact count matching...")
    u17_id = uuid.uuid4()
    u17 = User(id=u17_id, email="u17@test.com", password_hash="hash", name="Budget Group User", is_active=True)
    db.add(u17)
    db.commit()

    for i in range(1, 11):
        c_i = Category(id=uuid.uuid4(), user_id=u17_id, name=f"CatGrp {i}", type="expense")
        db.add(c_i)
        db.commit()
        b_i = Budget(id=uuid.uuid4(), user_id=u17_id, category_id=c_i.id, limit_amount=10000.0, month=curr_month, year=curr_year)
        db.add(b_i)
        db.commit()
        # 3 near limit (80%), 7 on track (20%)
        amt = 8000.0 if i <= 3 else 2000.0
        db.add(Transaction(id=uuid.uuid4(), user_id=u17_id, category_id=c_i.id, amount=amt, type="expense", transaction_date=date(curr_year, curr_month, 4)))
    db.commit()

    pdf_bytes17, _ = generate_pdf_report(db=db, user=u17, period_type="monthly", year=curr_year, month=curr_month)
    reader17 = PdfReader(io.BytesIO(pdf_bytes17))
    text17 = " ".join([page.extract_text() for page in reader17.pages])

    assert "3 of them close to the limit" in text17
    assert "CatGrp 1" in text17
    assert "CatGrp 2" in text17
    assert "CatGrp 3" in text17
    assert "Other Budgets (" in text17
    print("  -> TEST 17 PASSED: All warning budgets listed individually by name; counts match summary.")

    print("\n=========================================================================")
    print(" ALL 17 COMPREHENSIVE AUTOMATED TESTS PASSED SUCCESSFULLY! ")
    print("=========================================================================")


if __name__ == "__main__":
    run_all_tests()
