"""
Populate comprehensive 2026 transaction data for user@fintrack.com
Ensures that Monthly (including Apr 2026), Quarterly, Half-Year, and Yearly filters
have realistic, dynamic data matching FinTrack templates.
"""
from datetime import date
from app.core.database import SessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction

def populate():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "user@fintrack.com").first()
        if not user:
            print("User user@fintrack.com not found!")
            return

        cats = {f"{c.type}_{c.name}": c for c in db.query(Category).all()}
        
        # Check if April 2026 transactions already exist
        apr_txs = db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.transaction_date >= date(2026, 4, 1),
            Transaction.transaction_date <= date(2026, 4, 30)
        ).count()

        if apr_txs > 0:
            print(f"April 2026 transactions already populated ({apr_txs} found).")
            return

        print("Populating realistic 2026 multi-month transactions...")

        txs = [
            # --- JANUARY 2026 ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=50000.0, description="Monthly Software Engineer Salary", payment_method="Bank transfer", transaction_date=date(2026, 1, 1)),
            Transaction(user_id=user.id, category_id=cats["income_Freelancing"].id, type="income", amount=18000.0, description="Brand Identity Design", payment_method="UPI", transaction_date=date(2026, 1, 15)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Apartment Rent", payment_method="Bank transfer", transaction_date=date(2026, 1, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=12000.0, description="Groceries & Dining", payment_method="UPI", transaction_date=date(2026, 1, 10)),
            Transaction(user_id=user.id, category_id=cats["expense_Transport"].id, type="expense", amount=4500.0, description="Metro Card & Fuel", payment_method="Card", transaction_date=date(2026, 1, 18)),

            # --- FEBRUARY 2026 ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=50000.0, description="Monthly Software Engineer Salary", payment_method="Bank transfer", transaction_date=date(2026, 2, 1)),
            Transaction(user_id=user.id, category_id=cats["income_Freelancing"].id, type="income", amount=22000.0, description="Mobile App UI Consultation", payment_method="UPI", transaction_date=date(2026, 2, 12)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Apartment Rent", payment_method="Bank transfer", transaction_date=date(2026, 2, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=12500.0, description="Supermarket & Cafes", payment_method="UPI", transaction_date=date(2026, 2, 14)),
            Transaction(user_id=user.id, category_id=cats["expense_Bills"].id, type="expense", amount=6200.0, description="Electricity & Water", payment_method="UPI", transaction_date=date(2026, 2, 20)),

            # --- MARCH 2026 ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=50000.0, description="Monthly Software Engineer Salary", payment_method="Bank transfer", transaction_date=date(2026, 3, 1)),
            Transaction(user_id=user.id, category_id=cats["income_Business"].id, type="income", amount=26000.0, description="Digital Product Sales", payment_method="Card", transaction_date=date(2026, 3, 16)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Apartment Rent", payment_method="Bank transfer", transaction_date=date(2026, 3, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=13000.0, description="Groceries & Weekend Outing", payment_method="UPI", transaction_date=date(2026, 3, 12)),
            Transaction(user_id=user.id, category_id=cats["expense_Shopping"].id, type="expense", amount=5500.0, description="Spring Wardrobe Refresh", payment_method="Card", transaction_date=date(2026, 3, 22)),

            # --- APRIL 2026 (Exact Template Numbers: ~₹85,000 Income, ~₹42,000 Expense, ~₹43,000 Savings) ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=50000.0, description="Salary", payment_method="Bank transfer", transaction_date=date(2026, 4, 25)),
            Transaction(user_id=user.id, category_id=cats["income_Freelancing"].id, type="income", amount=25000.0, description="Freelance Work", payment_method="Card", transaction_date=date(2026, 4, 20)),
            Transaction(user_id=user.id, category_id=cats["income_Business"].id, type="income", amount=10000.0, description="Client Consulting Honorarium", payment_method="Bank transfer", transaction_date=date(2026, 4, 15)),
            
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=13440.0, description="Food & Dining", payment_method="UPI", transaction_date=date(2026, 4, 24)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Rent Payment", payment_method="Bank transfer", transaction_date=date(2026, 4, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Bills"].id, type="expense", amount=7560.0, description="Electricity & Utilities", payment_method="UPI", transaction_date=date(2026, 4, 22)),
            Transaction(user_id=user.id, category_id=cats["expense_Transport"].id, type="expense", amount=5040.0, description="Transport & Commute", payment_method="Card", transaction_date=date(2026, 4, 18)),
            Transaction(user_id=user.id, category_id=cats["expense_Shopping"].id, type="expense", amount=4200.0, description="Shopping & Household Supplies", payment_method="Card", transaction_date=date(2026, 4, 14)),

            # --- MAY 2026 ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=52000.0, description="Monthly Software Engineer Salary", payment_method="Bank transfer", transaction_date=date(2026, 5, 1)),
            Transaction(user_id=user.id, category_id=cats["income_Freelancing"].id, type="income", amount=30000.0, description="Web Portal Development", payment_method="UPI", transaction_date=date(2026, 5, 18)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Apartment Rent", payment_method="Bank transfer", transaction_date=date(2026, 5, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=14000.0, description="Dining Out & Weekly Groceries", payment_method="UPI", transaction_date=date(2026, 5, 15)),
            Transaction(user_id=user.id, category_id=cats["expense_Entertainment"].id, type="expense", amount=4800.0, description="Concert & Movies", payment_method="Card", transaction_date=date(2026, 5, 23)),

            # --- JUNE 2026 ---
            Transaction(user_id=user.id, category_id=cats["income_Salary"].id, type="income", amount=52000.0, description="Monthly Software Engineer Salary", payment_method="Bank transfer", transaction_date=date(2026, 6, 1)),
            Transaction(user_id=user.id, category_id=cats["income_Business"].id, type="income", amount=35000.0, description="Mid-Year Royalty & Licensing", payment_method="Bank transfer", transaction_date=date(2026, 6, 25)),
            Transaction(user_id=user.id, category_id=cats["expense_Rent"].id, type="expense", amount=11760.0, description="Apartment Rent", payment_method="Bank transfer", transaction_date=date(2026, 6, 5)),
            Transaction(user_id=user.id, category_id=cats["expense_Food"].id, type="expense", amount=14500.0, description="Dining & Groceries", payment_method="UPI", transaction_date=date(2026, 6, 12)),
            Transaction(user_id=user.id, category_id=cats["expense_Bills"].id, type="expense", amount=7200.0, description="Annual Insurance Installment", payment_method="Card", transaction_date=date(2026, 6, 20)),
        ]

        db.add_all(txs)
        db.commit()
        print(f"Successfully added {len(txs)} multi-month transactions across Jan-Jun 2026!")

    finally:
        db.close()

if __name__ == "__main__":
    populate()
