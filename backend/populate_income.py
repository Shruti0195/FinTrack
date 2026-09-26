"""
Populates at least 14 realistic income transactions for user@fintrack.com in fintrack_db.
"""
from datetime import date
from app.core.database import SessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction

def populate_income():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "user@fintrack.com").first()
        if not user:
            print("User user@fintrack.com not found!")
            return

        cats = {c.name: c for c in db.query(Category).filter(Category.type == "income").all()}
        if not cats:
            print("No income categories found!")
            return

        # Clear previous income transactions for user to ensure fresh, clean 14 records
        deleted_count = db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.type == "income"
        ).delete()
        print(f"Cleared {deleted_count} previous income records.")

        new_incomes = [
            Transaction(
                user_id=user.id,
                category_id=cats["Salary"].id,
                type="income",
                amount=52000.0,
                description="Monthly Software Engineering Salary",
                transaction_date=date(2026, 9, 1),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Freelancing"].id,
                type="income",
                amount=12500.0,
                description="E-commerce Website UI Redesign",
                transaction_date=date(2026, 9, 3),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Business"].id,
                type="income",
                amount=18000.0,
                description="Digital Products & Template Sales",
                transaction_date=date(2026, 9, 5),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Interest"].id,
                type="income",
                amount=1450.0,
                description="Quarterly High-Yield Savings Interest",
                transaction_date=date(2026, 9, 7),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Freelancing"].id,
                type="income",
                amount=8200.0,
                description="Brand Identity & Logo Suite",
                transaction_date=date(2026, 9, 9),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Other"].id,
                type="income",
                amount=4500.0,
                description="Sold Old Graphic Tablet",
                transaction_date=date(2026, 9, 11),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Business"].id,
                type="income",
                amount=9800.0,
                description="Consulting Workshop Honorarium",
                transaction_date=date(2026, 9, 13),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Freelancing"].id,
                type="income",
                amount=14000.0,
                description="Mobile App MVP Frontend Development",
                transaction_date=date(2026, 9, 16),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Interest"].id,
                type="income",
                amount=2100.0,
                description="Fixed Deposit Interest Credit",
                transaction_date=date(2026, 9, 18),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Other"].id,
                type="income",
                amount=3200.0,
                description="Cashback Rewards & Referral Bonus",
                transaction_date=date(2026, 9, 20),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Freelancing"].id,
                type="income",
                amount=7500.0,
                description="SEO Optimization & Technical Writing",
                transaction_date=date(2026, 9, 21),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Business"].id,
                type="income",
                amount=15500.0,
                description="SaaS Subscription Revenue Share",
                transaction_date=date(2026, 9, 22),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Salary"].id,
                type="income",
                amount=10000.0,
                description="Quarterly Performance Incentive",
                transaction_date=date(2026, 9, 23),
            ),
            Transaction(
                user_id=user.id,
                category_id=cats["Other"].id,
                type="income",
                amount=2800.0,
                description="Used Textbook & Gadget Resale",
                transaction_date=date(2026, 9, 24),
            ),
        ]

        db.add_all(new_incomes)
        db.commit()
        print(f"Successfully added {len(new_incomes)} income records for user@fintrack.com!")

    finally:
        db.close()

if __name__ == "__main__":
    populate_income()
