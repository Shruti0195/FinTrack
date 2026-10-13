"""
Comprehensive Seed Script for FinTrack Application.
Populates 20-30+ records in every table adhering strictly to relationship & foreign key constraints.

Run with: python seed_db.py
"""
from datetime import date, timedelta
import random
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution
from app.models.notification import Notification

def seed():
    db: Session = SessionLocal()
    try:
        print("Starting full database seeding process...")

        # 1. Clear existing dynamic tables to avoid duplicate key conflicts
        print("Cleaning existing transactions, budgets, notifications, contributions, and goals...")
        db.query(Notification).delete()
        db.query(GoalContribution).delete()
        db.query(Goal).delete()
        db.query(Budget).delete()
        db.query(Transaction).delete()
        db.commit()

        # 2. SEED USERS (20 Users)
        print("Seeding Users (20 records)...")
        existing_users = {u.email: u for u in db.query(User).all()}
        
        user_definitions = [
            ("Asha Patel", "user@fintrack.com", "USER"),
            ("System Admin", "admin@fintrack.com", "ADMIN"),
            ("Rahul Sharma", "rahul.sharma@example.com", "USER"),
            ("Priya Nair", "priya.nair@example.com", "USER"),
            ("Vikrant Singh", "vikrant.singh@example.com", "USER"),
            ("Ananya Deshmukh", "ananya.deshmukh@example.com", "USER"),
            ("Arjun Verma", "arjun.verma@example.com", "USER"),
            ("Sneha Reddy", "sneha.reddy@example.com", "USER"),
            ("Karan Mehta", "karan.mehta@example.com", "USER"),
            ("Divya Joshi", "divya.joshi@example.com", "USER"),
            ("Rohit Kumar", "rohit.kumar@example.com", "USER"),
            ("Pooja Agarwal", "pooja.agarwal@example.com", "USER"),
            ("Amit Shah", "amit.shah@example.com", "USER"),
            ("Neha Gupta", "neha.gupta@example.com", "USER"),
            ("Siddharth Rao", "siddharth.rao@example.com", "USER"),
            ("Kavya Iyer", "kavya.iyer@example.com", "USER"),
            ("Manish Tiwari", "manish.tiwari@example.com", "USER"),
            ("Ritika Kapoor", "ritika.kapoor@example.com", "USER"),
            ("Tarun Bhatia", "tarun.bhatia@example.com", "USER"),
            ("Meera Sen", "meera.sen@example.com", "USER"),
        ]

        users_map = {}
        for name, email, role in user_definitions:
            if email in existing_users:
                u = existing_users[email]
            else:
                pwd_hash = get_password_hash("admin123" if role == "ADMIN" else "password123")
                u = User(
                    name=name,
                    email=email,
                    password_hash=pwd_hash,
                    role=role,
                    is_active=True,
                    is_verified=True,
                    email_alerts_enabled=True,
                )
                db.add(u)
                db.flush()
            users_map[email] = u

        db.commit()
        main_user = users_map["user@fintrack.com"]
        print(f"Users ready. Primary test user ID: {main_user.id}")

        # 3. SEED CATEGORIES (Ensure active Income & Expense Categories)
        print("Ensuring Categories exist...")
        cats_by_type_name = {}
        for c in db.query(Category).all():
            cats_by_type_name[(c.type, c.name)] = c

        needed_categories = [
            # Income
            ("income", "Salary"),
            ("income", "Freelancing"),
            ("income", "Business"),
            ("income", "Interest"),
            ("income", "Dividends"),
            ("income", "Rental Income"),
            ("income", "Investments"),
            ("income", "Bonus"),
            ("income", "Consulting"),
            ("income", "Side Hustle"),
            ("income", "Other"),
            # Expense
            ("expense", "Rent"),
            ("expense", "Food"),
            ("expense", "Transport"),
            ("expense", "Shopping"),
            ("expense", "Entertainment"),
            ("expense", "Bills"),
            ("expense", "Healthcare"),
            ("expense", "Education"),
            ("expense", "Travel"),
            ("expense", "Utilities"),
            ("expense", "Subscriptions"),
            ("expense", "Fitness"),
            ("expense", "Gifts"),
            ("expense", "Miscellaneous")
        ]

        for c_type, c_name in needed_categories:
            if (c_type, c_name) not in cats_by_type_name:
                c_obj = Category(name=c_name, type=c_type, is_active=True)
                db.add(c_obj)
                db.flush()
                cats_by_type_name[(c_type, c_name)] = c_obj
        db.commit()

        income_cats = [c for (t, n), c in cats_by_type_name.items() if t == "income"]
        expense_cats = [c for (t, n), c in cats_by_type_name.items() if t == "expense"]

        print(f"Categories ready ({len(income_cats)} income, {len(expense_cats)} expense).")

        # 4. SEED TRANSACTIONS (30+ Income & 35+ Expense for user@fintrack.com)
        print("Seeding Transactions (65+ records)...")
        today = date.today()
        transactions = []

        # (A) Income Transactions
        income_samples = [
            ("Salary", 52000.0, "Monthly Salary Payment", 1),
            ("Salary", 52000.0, "Monthly Salary Payment", 31),
            ("Salary", 52000.0, "Monthly Salary Payment", 61),
            ("Salary", 50000.0, "Monthly Salary Payment", 92),
            ("Salary", 50000.0, "Monthly Salary Payment", 122),
            ("Salary", 50000.0, "Monthly Salary Payment", 153),
            ("Salary", 48000.0, "Monthly Salary Payment", 183),
            ("Salary", 48000.0, "Monthly Salary Payment", 214),
            ("Freelancing", 8500.0, "UI/UX Redesign Client Project", 5),
            ("Freelancing", 14000.0, "Fullstack Web App Milestone 1", 18),
            ("Freelancing", 6200.0, "Mobile App Bug Fixes", 42),
            ("Freelancing", 11500.0, "React Dashboard Development", 75),
            ("Freelancing", 9800.0, "E-commerce Website Setup", 105),
            ("Freelancing", 15000.0, "API Integration Contract", 140),
            ("Business", 18500.0, "SaaS Product Monthly Subscriptions", 10),
            ("Business", 22000.0, "Consulting Retainer Fee", 40),
            ("Business", 19200.0, "SaaS Product Monthly Subscriptions", 70),
            ("Business", 24500.0, "Enterprise Software Setup", 130),
            ("Bonus", 35000.0, "Mid-Year Performance Bonus", 90),
            ("Bonus", 15000.0, "Project Completion Award", 160),
            ("Dividends", 2400.0, "Quarterly Stock Dividend - TCS", 15),
            ("Dividends", 3100.0, "Quarterly Stock Dividend - Infosys", 100),
            ("Dividends", 1850.0, "Mutual Fund Dividend Payout", 170),
            ("Interest", 450.0, "Savings Account Interest Credit", 3),
            ("Interest", 520.0, "Fixed Deposit Quarterly Interest", 45),
            ("Interest", 380.0, "Savings Account Interest Credit", 95),
            ("Rental Income", 16000.0, "Studio Flat Monthly Rent", 8),
            ("Rental Income", 16000.0, "Studio Flat Monthly Rent", 38),
            ("Rental Income", 16000.0, "Studio Flat Monthly Rent", 68),
            ("Rental Income", 16000.0, "Studio Flat Monthly Rent", 98),
            ("Investments", 12500.0, "Mutual Fund Partial Gain Redemption", 25),
            ("Side Hustle", 4200.0, "Technical Blog Sponsorship", 14),
            ("Side Hustle", 5500.0, "YouTube AdSense Revenue", 55),
            ("Other", 3150.0, "Sold Old Smartphone Online", 28),
            ("Other", 7200.0, "Sold Ergonomic Office Chair", 115)
        ]

        for cat_name, amt, desc, days_ago in income_samples:
            cat = cats_by_type_name.get(("income", cat_name)) or income_cats[0]
            transactions.append(
                Transaction(
                    user_id=main_user.id,
                    category_id=cat.id,
                    type="income",
                    amount=amt,
                    description=desc,
                    payment_method=random.choice(["Bank transfer", "UPI", "Direct Deposit"]),
                    transaction_date=today - timedelta(days=days_ago)
                )
            )

        # (B) Expense Transactions
        expense_samples = [
            ("Rent", 11000.0, "Monthly Apartment Rent", "Bank transfer", 2),
            ("Rent", 11000.0, "Monthly Apartment Rent", "Bank transfer", 32),
            ("Rent", 11000.0, "Monthly Apartment Rent", "Bank transfer", 62),
            ("Rent", 11000.0, "Monthly Apartment Rent", "Bank transfer", 92),
            ("Food", 2450.0, "Weekly Grocery Shopping at Supermarket", "UPI", 1),
            ("Food", 1850.0, "Weekend Dinner Outing with Friends", "Card", 4),
            ("Food", 3200.0, "Monthly Organic Pantry Restock", "UPI", 9),
            ("Food", 1420.0, "Cafe Working Lunch & Coffee", "UPI", 13),
            ("Food", 2800.0, "Family Birthday Dinner", "Card", 22),
            ("Food", 1950.0, "Weekly Fresh Vegetables & Fruits", "UPI", 35),
            ("Food", 3100.0, "Gourmet Restaurant Dining", "Card", 50),
            ("Transport", 1900.0, "Monthly Metro Smart Card Recharge", "UPI", 3),
            ("Transport", 2500.0, "Car Fuel Refill at Shell", "Card", 7),
            ("Transport", 1200.0, "Cab Rides for Client Meetings", "UPI", 16),
            ("Transport", 2800.0, "Highway Toll & Car Fuel", "Card", 44),
            ("Shopping", 4500.0, "New Running Shoes & Activewear", "Card", 6),
            ("Shopping", 2100.0, "Amazon Home Office Accessories", "UPI", 11),
            ("Shopping", 8900.0, "Festival Apparel & Gifts", "Card", 25),
            ("Shopping", 1560.0, "Kindle E-books & Stationery", "UPI", 48),
            ("Entertainment", 1400.0, "IMAX Movie Tickets & Snacks", "UPI", 5),
            ("Entertainment", 2200.0, "Music Concert Event Entry", "Card", 19),
            ("Entertainment", 3500.0, "Weekend Resort Day Pass", "UPI", 39),
            ("Bills", 1850.0, "Electricity Utility Bill", "UPI", 2),
            ("Bills", 999.0, "High Speed Fiber Internet Bill", "UPI", 10),
            ("Bills", 1450.0, "Piped Gas & Water Bill", "UPI", 20),
            ("Bills", 1850.0, "Electricity Utility Bill", "UPI", 33),
            ("Healthcare", 3800.0, "Annual Preventive Health Checkup", "Card", 12),
            ("Healthcare", 1250.0, "Pharmacy Prescription Medicines", "UPI", 27),
            ("Healthcare", 2600.0, "Dental Cleaning & Consultation", "Card", 65),
            ("Fitness", 1500.0, "Gym Monthly Membership Fee", "UPI", 8),
            ("Fitness", 1500.0, "Gym Monthly Membership Fee", "UPI", 38),
            ("Subscriptions", 899.0, "Netflix Premium 4K Subscription", "Card", 15),
            ("Subscriptions", 499.0, "Spotify Family Plan", "UPI", 15),
            ("Subscriptions", 649.0, "Cloud Storage & Workspace Pro", "Card", 21),
            ("Travel", 12500.0, "Flight Tickets for Weekend Getaway", "Card", 29),
            ("Travel", 6400.0, "Hotel Accommodation Booking", "Card", 30),
            ("Gifts", 3500.0, "Friend's Wedding Gift Card", "UPI", 17),
            ("Miscellaneous", 1200.0, "Dry Cleaning & Laundry", "UPI", 14)
        ]

        for cat_name, amt, desc, p_method, days_ago in expense_samples:
            cat = cats_by_type_name.get(("expense", cat_name)) or expense_cats[0]
            transactions.append(
                Transaction(
                    user_id=main_user.id,
                    category_id=cat.id,
                    type="expense",
                    amount=amt,
                    description=desc,
                    payment_method=p_method,
                    transaction_date=today - timedelta(days=days_ago)
                )
            )

        db.add_all(transactions)
        db.commit()
        print(f"Transactions seeded ({len(transactions)} records).")

        # 5. SEED BUDGETS (25+ Entries)
        print("Seeding Budgets (25+ records)...")
        budgets = []
        budget_categories = [
            ("Food", 6000.0),
            ("Transport", 3500.0),
            ("Shopping", 5000.0),
            ("Entertainment", 3000.0),
            ("Bills", 3000.0),
            ("Healthcare", 4000.0),
            ("Travel", 15000.0),
            ("Subscriptions", 2000.0),
            ("Fitness", 2000.0),
            ("Gifts", 4000.0),
            ("Miscellaneous", 2000.0)
        ]

        curr_month = today.month
        curr_year = today.year

        # Seed budgets for current month, past 2 months, and future month
        months_to_seed = [
            (curr_month, curr_year),
            (curr_month - 1 if curr_month > 1 else 12, curr_year if curr_month > 1 else curr_year - 1),
            (curr_month - 2 if curr_month > 2 else 12 + curr_month - 2, curr_year if curr_month > 2 else curr_year - 1)
        ]

        for m, y in months_to_seed:
            for cat_name, limit in budget_categories:
                cat = cats_by_type_name.get(("expense", cat_name))
                if cat:
                    budgets.append(
                        Budget(
                            user_id=main_user.id,
                            category_id=cat.id,
                            type="expense",
                            month=m,
                            year=y,
                            limit_amount=limit
                        )
                    )

        db.add_all(budgets)
        db.commit()
        print(f"Budgets seeded ({len(budgets)} records).")

        # 6. SEED GOALS & GOAL CONTRIBUTIONS (20 Goals, 30+ Contributions)
        print("Seeding Goals and Goal Contributions...")
        goal_definitions = [
            ("Emergency Fund Reserve", 100000.0, today + timedelta(days=30), "completed", 100000.0),
            ("New Apple M3 MacBook Pro", 150000.0, today + timedelta(days=90), "active", 110000.0),
            ("Japan Spring Cherry Blossom Trip", 200000.0, today + timedelta(days=180), "active", 85000.0),
            ("Home Down Payment Fund", 500000.0, today + timedelta(days=365), "active", 240000.0),
            ("Electric Scooter Purchase", 85000.0, today + timedelta(days=60), "active", 62000.0),
            ("Professional Cloud Certification", 25000.0, today - timedelta(days=10), "completed", 25000.0),
            ("Home Office Ergonomic Setup", 60000.0, today - timedelta(days=20), "completed", 60000.0),
            ("Parents 30th Anniversary Gift", 45000.0, today + timedelta(days=45), "active", 32000.0),
            ("Higher Education & Masters Reserve", 300000.0, today + timedelta(days=500), "active", 120000.0),
            ("Medical Emergency Shield", 75000.0, today + timedelta(days=120), "active", 48000.0),
            ("Home Kitchen Renovation", 120000.0, today + timedelta(days=210), "active", 45000.0),
            ("Mutual Fund Lump Sum Investment", 100000.0, today + timedelta(days=150), "active", 70000.0),
            ("Sabbatical Trekking Expedition", 180000.0, today + timedelta(days=270), "active", 55000.0),
            ("Sister's Wedding Gift Fund", 250000.0, today + timedelta(days=300), "active", 130000.0),
            ("Solar Panel Rooftop Installation", 90000.0, today + timedelta(days=240), "active", 35000.0),
            ("Sony Mirrorless Camera Upgrade", 70000.0, today + timedelta(days=75), "active", 42000.0),
            ("Vehicle Insurance 3-Year Reserve", 22000.0, today - timedelta(days=5), "completed", 22000.0),
            ("Digital Art Tablet & Accessories", 35000.0, today + timedelta(days=40), "active", 28000.0),
            ("Gold ETF Savings Scheme", 60000.0, today + timedelta(days=130), "active", 36000.0),
            ("Year-End Community Charity Drive", 15000.0, today + timedelta(days=95), "active", 9000.0)
        ]

        goals = []
        contributions = []

        for title, target_amt, deadline_date, status_val, total_contrib in goal_definitions:
            g = Goal(
                user_id=main_user.id,
                title=title,
                target_amount=target_amt,
                deadline=deadline_date,
                status=status_val
            )
            db.add(g)
            db.flush()
            goals.append(g)

            # Split contributions into 2-3 installments per goal
            num_parts = random.choice([2, 3])
            part_amt = round(total_contrib / num_parts, 2)
            for i in range(num_parts):
                c_amt = part_amt if i < num_parts - 1 else round(total_contrib - (part_amt * (num_parts - 1)), 2)
                c_days = (num_parts - i) * 15 + random.randint(1, 5)
                contributions.append(
                    GoalContribution(
                        goal_id=g.id,
                        amount=c_amt,
                        contributed_at=today - timedelta(days=c_days)
                    )
                )

        db.add_all(contributions)
        db.commit()
        print(f"Goals ({len(goals)}) & Contributions ({len(contributions)}) seeded successfully.")

        # 7. SEED NOTIFICATIONS (25 Records)
        print("Seeding Notifications (25 records)...")
        notifications = []

        sample_notifs = [
            ("budget_80", "Alert: You have spent 85% of your Food budget for this month.", False, 1),
            ("budget_100", "Warning: You have reached 100% of your Shopping budget!", False, 2),
            ("goal_completed", "Congratulations! Your 'Emergency Fund Reserve' goal of Rs. 100,000 has been completed!", True, 3),
            ("goal_completed", "Achievement Unlocked: 'Home Office Ergonomic Setup' goal complete!", True, 5),
            ("budget_80", "Notice: Transport budget is at 82% threshold.", True, 6),
            ("system", "Security Alert: Successful login from new IP location.", True, 7),
            ("system", "Monthly Financial Summary: Your net savings increased by 14% last month.", True, 8),
            ("budget_100", "Critical Alert: Entertainment budget exceeded by Rs. 200.", False, 10),
            ("goal_completed", "Goal Completed: 'Professional Cloud Certification' funded 100%.", True, 12),
            ("budget_80", "Budget Alert: Healthcare category has reached 88% of limit.", False, 14),
            ("system", "System Update: FinTrack 2.0 theme enhancements are now live.", True, 15),
            ("system", "Statement Ready: Your September income & expense statement is available for download.", True, 18),
            ("budget_80", "Notice: Travel budget reaches 80% usage.", False, 20),
            ("goal_completed", "Goal Completed: 'Vehicle Insurance Reserve' funded!", True, 22),
            ("system", "Reminder: Review your monthly budget targets for next month.", False, 25)
        ]

        # Duplicate/expand to reach 25 records with different goals/budgets
        for i, (n_type, msg, is_read, days_ago) in enumerate(sample_notifs * 2):
            if len(notifications) >= 25:
                break
            bg_id = budgets[i % len(budgets)].id if n_type in ("budget_80", "budget_100") else None
            gl_id = goals[i % len(goals)].id if n_type == "goal_completed" else None

            notifications.append(
                Notification(
                    user_id=main_user.id,
                    budget_id=bg_id,
                    goal_id=gl_id,
                    type=n_type,
                    message=msg if i < 15 else f"{msg} (Ref #{i+1})",
                    is_read=is_read,
                    email_sent_at=today - timedelta(days=days_ago),
                    created_at=today - timedelta(days=days_ago)
                )
            )

        db.add_all(notifications)
        db.commit()
        print(f"Notifications seeded ({len(notifications)} records).")

        print("\n=======================================================")
        print(">>> ALL DATABASE TABLES SEEDED SUCCESSFULLY (20-30+ RECORDS PER TABLE)! <<<")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed with error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
