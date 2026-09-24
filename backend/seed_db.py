"""
Seed script to populate PostgreSQL (fintrack_db) with initial test users and transactions.
Matches schema (2).sql
Run with: python seed_db.py
"""
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution

def seed():
    db = SessionLocal()
    try:
        # 1. Ensure test users exist
        user = db.query(User).filter(User.email == "user@fintrack.com").first()
        if not user:
            print("Creating test users...")
            user = User(
                name="Asha Patel",
                email="user@fintrack.com",
                password_hash=get_password_hash("password123"),
                role="USER",
                is_active=True,
                email_alerts_enabled=True,
            )
            admin = User(
                name="System Admin",
                email="admin@fintrack.com",
                password_hash=get_password_hash("admin123"),
                role="ADMIN",
                is_active=True,
                email_alerts_enabled=True,
            )
            db.add_all([user, admin])
            db.commit()
            db.refresh(user)
            print("Users created: user@fintrack.com / admin@fintrack.com")

        # 2. Check categories
        cats = {c.name: c for c in db.query(Category).all()}
        if not cats:
            print("No categories found in database! Please run apply_schema.py first.")
            return

        # 3. Add sample transactions if none exist
        tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        if tx_count == 0:
            print("Seeding sample transactions...")
            today = date.today()
            sample_txs = [
                # Income
                Transaction(user_id=user.id, category_id=cats["Salary"].id, type="income", amount=45000.0, description="September Salary", transaction_date=today - timedelta(days=20)),
                Transaction(user_id=user.id, category_id=cats["Freelancing"].id, type="income", amount=6500.0, description="Logo Design Project", transaction_date=today - timedelta(days=12)),
                # Expenses
                Transaction(user_id=user.id, category_id=cats["Rent"].id, type="expense", amount=9000.0, payment_method="Bank transfer", description="September Rent", transaction_date=today - timedelta(days=18)),
                Transaction(user_id=user.id, category_id=cats["Food"].id, type="expense", amount=2100.0, payment_method="UPI", description="Grocery Market", transaction_date=today - timedelta(days=15)),
                Transaction(user_id=user.id, category_id=cats["Food"].id, type="expense", amount=2100.0, payment_method="UPI", description="Weekend Restaurant Dinner", transaction_date=today - timedelta(days=5)),
                Transaction(user_id=user.id, category_id=cats["Transport"].id, type="expense", amount=1900.0, payment_method="Card", description="Monthly Metro Pass", transaction_date=today - timedelta(days=10)),
                Transaction(user_id=user.id, category_id=cats["Shopping"].id, type="expense", amount=1560.0, payment_method="Card", description="Online Order", transaction_date=today - timedelta(days=7)),
                Transaction(user_id=user.id, category_id=cats["Entertainment"].id, type="expense", amount=2200.0, payment_method="UPI", description="Movie & Outing", transaction_date=today - timedelta(days=3)),
                Transaction(user_id=user.id, category_id=cats["Bills"].id, type="expense", amount=1400.0, payment_method="UPI", description="Electricity Bill", transaction_date=today - timedelta(days=2)),
            ]
            db.add_all(sample_txs)

            # Sample Budgets (Month 9, Year 2026)
            budgets = [
                Budget(user_id=user.id, category_id=cats["Food"].id, type="expense", month=9, year=2026, limit_amount=5000.0),
                Budget(user_id=user.id, category_id=cats["Shopping"].id, type="expense", month=9, year=2026, limit_amount=3000.0),
                Budget(user_id=user.id, category_id=cats["Transport"].id, type="expense", month=9, year=2026, limit_amount=2000.0),
                Budget(user_id=user.id, category_id=cats["Entertainment"].id, type="expense", month=9, year=2026, limit_amount=2000.0),
            ]
            db.add_all(budgets)

            # Sample Goals + Goal Contributions
            laptop_goal = Goal(user_id=user.id, title="New Laptop", target_amount=50000.0, deadline=date(2026, 12, 31), status="active")
            emergency_goal = Goal(user_id=user.id, title="Emergency Fund", target_amount=100000.0, deadline=date(2026, 9, 30), status="completed")
            db.add_all([laptop_goal, emergency_goal])
            db.flush()

            # Add contributions
            c1 = GoalContribution(goal_id=laptop_goal.id, amount=31000.0, contributed_at=today - timedelta(days=10))
            c2 = GoalContribution(goal_id=emergency_goal.id, amount=100000.0, contributed_at=today - timedelta(days=30))
            db.add_all([c1, c2])

            db.commit()
            print("Successfully seeded sample transactions, budgets, goals & contributions!")
        else:
            print(f"Transactions already exist ({tx_count} records).")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
