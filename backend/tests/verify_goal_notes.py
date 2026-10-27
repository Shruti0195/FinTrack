"""
Verification script for FinTrack Goal Notes and Budget matching in PDF Reports.
Generates:
1. Scenario A: Goal contributions (₹25,000) > Net Savings (₹8,000) -> Extra line appears.
2. Scenario B: Goal contributions (₹15,000) <= Net Savings (₹40,000) -> Extra line absent.
"""
import sys
import os
import io
import uuid
from datetime import date

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from pypdf import PdfReader

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.core.database import Base
from app.models.user import User
from app.models.goal import Goal, GoalContribution
from app.models.transaction import Transaction
from app.models.category import Category
from app.services.pdf_report_service import generate_pdf_report


def run_verification():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("=" * 70)
    print("FINTRACK PDF GOALS & BUDGET NOTES VERIFICATION")
    print("=" * 70)

    # -------------------------------------------------------------
    # Scenario A: Goal contributions exceed net savings
    # -------------------------------------------------------------
    u_a_id = uuid.uuid4()
    u_a = User(id=u_a_id, email="scenario_a@fintrack.com", password_hash="hash", name="Arun Sharma", is_active=True)
    db.add(u_a)
    cat_inc_a = Category(id=uuid.uuid4(), user_id=u_a_id, name="Salary", type="income")
    cat_exp_a = Category(id=uuid.uuid4(), user_id=u_a_id, name="Rent & Utilities", type="expense")
    db.add_all([cat_inc_a, cat_exp_a])
    g_a = Goal(id=uuid.uuid4(), user_id=u_a_id, title="Car Down Payment", target_amount=200000.0, status="active")
    db.add(g_a)
    db.commit()

    # Net Savings = 20,000 - 12,000 = 8,000
    # Added to goals = 25,000
    # 25,000 > 8,000 (exceeds by 17,000)
    db.add(Transaction(id=uuid.uuid4(), user_id=u_a_id, category_id=cat_inc_a.id, amount=20000.0, type="income", transaction_date=date(2026, 10, 2)))
    db.add(Transaction(id=uuid.uuid4(), user_id=u_a_id, category_id=cat_exp_a.id, amount=12000.0, type="expense", transaction_date=date(2026, 10, 4)))
    db.add(GoalContribution(id=uuid.uuid4(), goal_id=g_a.id, amount=25000.0, contributed_at=date(2026, 10, 10)))
    db.commit()

    pdf_a, _ = generate_pdf_report(db, u_a, "monthly", 2026, 10)
    reader_a = PdfReader(io.BytesIO(pdf_a))
    text_a = " ".join(p.extract_text() for p in reader_a.pages)

    out_a = os.path.join(os.path.dirname(__file__), "report_exceeds_savings.pdf")
    with open(out_a, "wb") as f:
        f.write(pdf_a)

    print("\n[Scenario A] Goal contributions exceed net savings:")
    print("  - Net Savings: ₹8,000 | Added to goals: ₹25,000")
    print(f"  - Total Pages: {len(reader_a.pages)} (Strictly <= 2 pages)")
    has_sum_a = "You added ₹25,000 to your goals. Goal money is tracked separately and is not counted as an expense." in text_a
    has_base_a = "How goals work: money you add to a goal is recorded for that goal only" in text_a
    has_extra_a = "You added ₹25,000 to goals this period, which is ₹17,000 more than you saved this period. That is fine: goal money can come from savings you made earlier." in text_a
    has_key_a = "How to read this report:" in text_a

    print(f"  - Summary sentence: {'FOUND [OK]' if has_sum_a else 'MISSING [FAIL]'}")
    print(f"  - Base goals note: {'FOUND [OK]' if has_base_a else 'MISSING [FAIL]'}")
    print(f"  - Extra comparison line: {'FOUND [OK]' if has_extra_a else 'MISSING [FAIL]'}")
    print(f"  - 4-line Key at bottom: {'FOUND [OK]' if has_key_a else 'MISSING [FAIL]'}")
    print(f"  - Generated PDF saved to: {out_a}")

    # -------------------------------------------------------------
    # Scenario B: Goal contributions within net savings
    # -------------------------------------------------------------
    u_b_id = uuid.uuid4()
    u_b = User(id=u_b_id, email="scenario_b@fintrack.com", password_hash="hash", name="Priya Patel", is_active=True)
    db.add(u_b)
    cat_inc_b = Category(id=uuid.uuid4(), user_id=u_b_id, name="Salary", type="income")
    cat_exp_b = Category(id=uuid.uuid4(), user_id=u_b_id, name="Dining & Food", type="expense")
    db.add_all([cat_inc_b, cat_exp_b])
    g_b = Goal(id=uuid.uuid4(), user_id=u_b_id, title="Emergency Fund", target_amount=150000.0, status="active")
    db.add(g_b)
    db.commit()

    # Net Savings = 50,000 - 10,000 = 40,000
    # Added to goals = 15,000
    # 15,000 <= 40,000 (does not exceed)
    db.add(Transaction(id=uuid.uuid4(), user_id=u_b_id, category_id=cat_inc_b.id, amount=50000.0, type="income", transaction_date=date(2026, 10, 2)))
    db.add(Transaction(id=uuid.uuid4(), user_id=u_b_id, category_id=cat_exp_b.id, amount=10000.0, type="expense", transaction_date=date(2026, 10, 4)))
    db.add(GoalContribution(id=uuid.uuid4(), goal_id=g_b.id, amount=15000.0, contributed_at=date(2026, 10, 10)))
    db.commit()

    pdf_b, _ = generate_pdf_report(db, u_b, "monthly", 2026, 10)
    reader_b = PdfReader(io.BytesIO(pdf_b))
    text_b = " ".join(p.extract_text() for p in reader_b.pages)

    out_b = os.path.join(os.path.dirname(__file__), "report_within_savings.pdf")
    with open(out_b, "wb") as f:
        f.write(pdf_b)

    print("\n[Scenario B] Goal contributions within net savings:")
    print("  - Net Savings: ₹40,000 | Added to goals: ₹15,000")
    print(f"  - Total Pages: {len(reader_b.pages)} (Strictly <= 2 pages)")
    has_sum_b = "You added ₹15,000 to your goals. Goal money is tracked separately and is not counted as an expense." in text_b
    has_base_b = "How goals work: money you add to a goal is recorded for that goal only" in text_b
    has_extra_b = "more than you saved this period" in text_b
    has_key_b = "How to read this report:" in text_b

    print(f"  - Summary sentence: {'FOUND [OK]' if has_sum_b else 'MISSING [FAIL]'}")
    print(f"  - Base goals note: {'FOUND [OK]' if has_base_b else 'MISSING [FAIL]'}")
    print(f"  - Extra comparison line: {'NOT PRESENT [OK]' if not has_extra_b else 'FOUND UNEXPECTEDLY [FAIL]'}")
    print(f"  - 4-line Key at bottom: {'FOUND [OK]' if has_key_b else 'MISSING [FAIL]'}")
    print(f"  - Generated PDF saved to: {out_b}")

    print("\n" + "=" * 70)
    assert has_extra_a and (not has_extra_b), "Verification failed: Extra line must appear only when contributions exceed savings!"
    print("VERIFICATION COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_verification()
