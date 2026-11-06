"""
Comprehensive Seed Script for FinTrack Application (Production Ready).
Populates complete, realistic, multi-month datasets across all 19 database tables.
Strictly adheres to foreign key constraints, composite constraints, and enum types.

Run with:
    cd backend
    python seed_db.py
"""
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path regardless of execution working directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uuid
import random
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash

# Models
from app.models.user import User, PasswordReset
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution, GoalIcon, GoalColor
from app.models.notification import Notification
from app.models.alert_record import AlertRecord
from app.models.analytics import FinancialHealthScore, AIInsight, AIReport
from app.models.admin import ReportedIssue, TipArticle
from app.models.support_report import SupportReport, SupportReportNote, SupportReportHistory


def seed():
    db: Session = SessionLocal()
    try:
        print("=================================================================")
        print(">>> STARTING FULL FINTRACK DATABASE SEEDING PROCESS <<<")
        print("=================================================================")

        # -----------------------------------------------------------------
        # 1. CLEAN EXISTING DYNAMIC DATA (Reverse Dependency Order)
        # -----------------------------------------------------------------
        print("1. Cleaning existing dynamic data...")
        db.query(SupportReportHistory).delete()
        db.query(SupportReportNote).delete()
        db.query(SupportReport).delete()
        db.query(AlertRecord).delete()
        db.query(Notification).delete()
        db.query(AIReport).delete()
        db.query(AIInsight).delete()
        db.query(FinancialHealthScore).delete()
        db.query(GoalContribution).delete()
        db.query(Goal).delete()
        db.query(Budget).delete()
        db.query(Transaction).delete()
        db.query(ReportedIssue).delete()
        db.query(TipArticle).delete()
        db.query(PasswordReset).delete()
        db.commit()

        # -----------------------------------------------------------------
        # 2. SEED USERS (20 Users: 1 Admin, 1 Main Test User, 18 Standard Users)
        # -----------------------------------------------------------------
        print("2. Seeding Users (20 accounts)...")
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
                u.name = name
                u.role = role
                u.is_active = True
                u.is_verified = True
            else:
                pwd_hash = get_password_hash("admin123" if role == "ADMIN" else "password123")
                u = User(
                    id=uuid.uuid4(),
                    name=name,
                    email=email,
                    password_hash=pwd_hash,
                    role=role,
                    is_active=True,
                    is_verified=True,
                    email_verified_at=datetime.now(timezone.utc),
                    email_alerts_enabled=True,
                    email_budget_alerts=True,
                    goal_milestone_notifs=True,
                    monthly_report_notifs=True,
                    budget_alert_thresholds=[80, 100],
                    budget_alert_in_app=True,
                    budget_alert_email=True,
                    goal_milestone_thresholds=[25, 50, 75, 100],
                    goal_deadline_reminder_days=7,
                    goal_inactivity_nudge_days=30,
                    goal_alert_in_app=True,
                    goal_alert_email=True,
                    budget_alerts_paused=False,
                    goal_alerts_paused=False,
                    viewed_analytics=True,
                    help_checklist_dismissed=False,
                    tour_completed_version=1,
                    token_version=1,
                    failed_password_attempts=0
                )
                db.add(u)
                db.flush()
            users_map[email] = u

        db.commit()
        main_user = users_map["user@fintrack.com"]
        admin_user = users_map["admin@fintrack.com"]
        print(f"   [OK] Users ready. Primary test user: {main_user.email} (ID: {main_user.id})")

        # -----------------------------------------------------------------
        # 3. SEED GOAL ICONS & GOAL COLORS
        # -----------------------------------------------------------------
        print("3. Ensuring Goal Icons and Goal Colors exist...")
        existing_icons = {i.icon_key: i for i in db.query(GoalIcon).all()}
        default_icons_data = [
            ("Target", "target"),
            ("Phone", "phone"),
            ("Travel", "plane"),
            ("Emergency", "shield"),
            ("Home", "home"),
            ("Vehicle", "car"),
            ("Gadget", "laptop"),
            ("Gift", "gift"),
            ("Dream", "sparkles"),
            ("Personal", "heart"),
            ("Savings", "piggy-bank"),
            ("Wallet", "wallet"),
            ("Education", "graduation-cap"),
            ("Career", "briefcase"),
            ("Investment", "trending-up"),
            ("Achievement", "trophy"),
            ("Award", "award"),
            ("Milestone", "star"),
            ("Luxury", "gem"),
            ("Creative", "camera"),
            ("Lifestyle", "coffee"),
            ("Shopping", "shopping-bag"),
            ("Learning", "book-open"),
            ("Fitness", "dumbbell"),
            ("Cycling", "bike"),
            ("Music", "music"),
            ("Happiness", "smile")
        ]
        for name, key in default_icons_data:
            if key not in existing_icons:
                db.add(GoalIcon(id=uuid.uuid4(), name=name, icon_key=key, is_default=True))
        db.commit()

        existing_colors = {c.hex.lower(): c for c in db.query(GoalColor).all()}
        default_colors_data = [
            ("Emerald Green", "#10B981"),
            ("Deep Navy", "#0F172A"),
            ("Royal Blue", "#3B82F6"),
            ("Violet", "#8B5CF6"),
            ("Rose Pink", "#EC4899"),
            ("Amber Gold", "#F59E0B"),
            ("Cyan", "#06B6D4"),
            ("Red", "#EF4444"),
            ("Indigo", "#6366F1"),
            ("Orange", "#F97316")
        ]
        for name, hex_val in default_colors_data:
            if hex_val.lower() not in existing_colors:
                db.add(GoalColor(id=uuid.uuid4(), name=name, hex=hex_val, is_default=True))
        db.commit()
        print("   [OK] Goal icons & colors ready.")

        # -----------------------------------------------------------------
        # 4. SEED CATEGORIES (System & User-custom)
        # -----------------------------------------------------------------
        print("4. Ensuring Categories exist...")
        cats_by_type_name = {}
        for c in db.query(Category).all():
            if c.user_id is None:
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
            ("expense", "Miscellaneous"),
            ("expense", "Other")
        ]

        for c_type, c_name in needed_categories:
            if (c_type, c_name) not in cats_by_type_name:
                c_obj = Category(id=uuid.uuid4(), name=c_name, type=c_type, is_default=True, is_active=True, user_id=None)
                db.add(c_obj)
                db.flush()
                cats_by_type_name[(c_type, c_name)] = c_obj
        db.commit()

        # Add 2 custom user categories for test user
        custom_cats = [
            ("income", "Crypto Staking"),
            ("expense", "Photography Equipment")
        ]
        for c_type, c_name in custom_cats:
            existing_custom = db.query(Category).filter(
                Category.user_id == main_user.id,
                Category.name == c_name,
                Category.type == c_type
            ).first()
            if not existing_custom:
                c_custom = Category(id=uuid.uuid4(), name=c_name, type=c_type, is_default=False, is_active=True, user_id=main_user.id)
                db.add(c_custom)
                db.flush()
                cats_by_type_name[(c_type, c_name)] = c_custom
        db.commit()

        income_cats = [c for (t, n), c in cats_by_type_name.items() if t == "income"]
        expense_cats = [c for (t, n), c in cats_by_type_name.items() if t == "expense"]
        print(f"   [OK] Categories ready ({len(income_cats)} income, {len(expense_cats)} expense).")

        # -----------------------------------------------------------------
        # 5. SEED TRANSACTIONS (Multi-Month 2026 Realistic Data)
        # -----------------------------------------------------------------
        print("5. Seeding multi-month Transactions (80+ records)...")
        today = date.today()
        transactions = []

        # (A) Income Samples
        income_samples = [
            ("Salary", 52000.0, "Monthly Software Engineering Salary", 1),
            ("Salary", 52000.0, "Monthly Software Engineering Salary", 31),
            ("Salary", 52000.0, "Monthly Software Engineering Salary", 61),
            ("Salary", 50000.0, "Monthly Software Engineering Salary", 92),
            ("Salary", 50000.0, "Monthly Software Engineering Salary", 122),
            ("Salary", 50000.0, "Monthly Software Engineering Salary", 153),
            ("Salary", 48000.0, "Monthly Software Engineering Salary", 183),
            ("Salary", 48000.0, "Monthly Software Engineering Salary", 214),
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
                    id=uuid.uuid4(),
                    user_id=main_user.id,
                    category_id=cat.id,
                    type="income",
                    amount=amt,
                    description=desc,
                    payment_method=random.choice(["Bank transfer", "UPI", "Direct Deposit"]),
                    transaction_date=today - timedelta(days=days_ago)
                )
            )

        # (B) Expense Samples
        expense_samples = [
            ("Rent", 11760.0, "Monthly Apartment Rent", "Bank transfer", 2),
            ("Rent", 11760.0, "Monthly Apartment Rent", "Bank transfer", 32),
            ("Rent", 11760.0, "Monthly Apartment Rent", "Bank transfer", 62),
            ("Rent", 11760.0, "Monthly Apartment Rent", "Bank transfer", 92),
            ("Rent", 11760.0, "Monthly Apartment Rent", "Bank transfer", 122),
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
                    id=uuid.uuid4(),
                    user_id=main_user.id,
                    category_id=cat.id,
                    type="expense",
                    amount=amt,
                    description=desc,
                    payment_method=p_method,
                    transaction_date=today - timedelta(days=days_ago)
                )
            )

        # Add transactions for a few secondary users so admin stats reflect multiple users
        other_user = users_map["rahul.sharma@example.com"]
        for cat_name, amt, desc, days_ago in income_samples[:5]:
            cat = cats_by_type_name.get(("income", cat_name)) or income_cats[0]
            transactions.append(
                Transaction(
                    id=uuid.uuid4(),
                    user_id=other_user.id,
                    category_id=cat.id,
                    type="income",
                    amount=amt,
                    description=desc,
                    payment_method="UPI",
                    transaction_date=today - timedelta(days=days_ago)
                )
            )

        db.add_all(transactions)
        db.commit()
        print(f"   [OK] Transactions seeded ({len(transactions)} records).")

        # -----------------------------------------------------------------
        # 6. SEED BUDGETS (Multi-Month with Alert Overrides)
        # -----------------------------------------------------------------
        print("6. Seeding Budgets (30+ records)...")
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
            ("Rent", 12000.0)
        ]

        curr_month = today.month
        curr_year = today.year

        months_to_seed = [
            (curr_month, curr_year),
            (curr_month - 1 if curr_month > 1 else 12, curr_year if curr_month > 1 else curr_year - 1),
            (curr_month - 2 if curr_month > 2 else 12 + curr_month - 2, curr_year if curr_month > 2 else curr_year - 1),
            (curr_month + 1 if curr_month < 12 else 1, curr_year if curr_month < 12 else curr_year + 1)
        ]

        for m, y in months_to_seed:
            for cat_name, limit in budget_categories:
                cat = cats_by_type_name.get(("expense", cat_name))
                if cat:
                    has_custom = cat_name in ("Food", "Shopping")
                    budgets.append(
                        Budget(
                            id=uuid.uuid4(),
                            user_id=main_user.id,
                            category_id=cat.id,
                            type="expense",
                            month=m,
                            year=y,
                            limit_amount=limit,
                            has_custom_alerts=has_custom,
                            custom_alert_thresholds=[75, 90, 100] if has_custom else None,
                            custom_alert_in_app=True if has_custom else None,
                            custom_alert_email=True if has_custom else None,
                            alert_baseline_pct=0.0
                        )
                    )

        db.add_all(budgets)
        db.commit()
        print(f"   [OK] Budgets seeded ({len(budgets)} records).")

        # -----------------------------------------------------------------
        # 7. SEED GOALS & CONTRIBUTIONS
        # -----------------------------------------------------------------
        print("7. Seeding Goals & Goal Contributions (20 goals, 45+ contributions)...")
        goal_definitions = [
            ("Emergency Fund Reserve", 100000.0, today + timedelta(days=30), "completed", 100000.0, "#10B981", "shield"),
            ("New Apple M3 MacBook Pro", 150000.0, today + timedelta(days=90), "active", 110000.0, "#3B82F6", "laptop"),
            ("Japan Spring Cherry Blossom Trip", 200000.0, today + timedelta(days=180), "active", 85000.0, "#EC4899", "plane"),
            ("Home Down Payment Fund", 500000.0, today + timedelta(days=365), "active", 240000.0, "#F59E0B", "home"),
            ("Electric Scooter Purchase", 85000.0, today + timedelta(days=60), "active", 62000.0, "#06B6D4", "car"),
            ("Professional Cloud Certification", 25000.0, today - timedelta(days=10), "completed", 25000.0, "#8B5CF6", "graduation-cap"),
            ("Home Office Ergonomic Setup", 60000.0, today - timedelta(days=20), "completed", 60000.0, "#10B981", "laptop"),
            ("Parents 30th Anniversary Gift", 45000.0, today + timedelta(days=45), "active", 32000.0, "#EC4899", "gift"),
            ("Higher Education & Masters Reserve", 300000.0, today + timedelta(days=500), "active", 120000.0, "#6366F1", "graduation-cap"),
            ("Medical Emergency Shield", 75000.0, today + timedelta(days=120), "active", 48000.0, "#EF4444", "heart"),
            ("Home Kitchen Renovation", 120000.0, today + timedelta(days=210), "active", 45000.0, "#F97316", "home"),
            ("Mutual Fund Lump Sum Investment", 100000.0, today + timedelta(days=150), "active", 70000.0, "#10B981", "trending-up"),
            ("Sabbatical Trekking Expedition", 180000.0, today + timedelta(days=270), "active", 55000.0, "#06B6D4", "plane"),
            ("Sister's Wedding Gift Fund", 250000.0, today + timedelta(days=300), "active", 130000.0, "#EC4899", "gift"),
            ("Solar Panel Rooftop Installation", 90000.0, today + timedelta(days=240), "active", 35000.0, "#F59E0B", "sparkles"),
            ("Sony Mirrorless Camera Upgrade", 70000.0, today + timedelta(days=75), "active", 42000.0, "#3B82F6", "camera"),
            ("Vehicle Insurance 3-Year Reserve", 22000.0, today - timedelta(days=5), "completed", 22000.0, "#0F172A", "shield"),
            ("Digital Art Tablet & Accessories", 35000.0, today + timedelta(days=40), "active", 28000.0, "#8B5CF6", "laptop"),
            ("Gold ETF Savings Scheme", 60000.0, today + timedelta(days=130), "active", 36000.0, "#F59E0B", "gem"),
            ("Year-End Community Charity Drive", 15000.0, today + timedelta(days=95), "active", 9000.0, "#10B981", "heart")
        ]

        goals = []
        contributions = []

        for title, target_amt, deadline_date, status_val, total_contrib, color_hex, icon_key in goal_definitions:
            has_custom = "Trip" in title or "Down Payment" in title
            g = Goal(
                id=uuid.uuid4(),
                user_id=main_user.id,
                title=title,
                target_amount=target_amt,
                deadline=deadline_date,
                color=color_hex,
                icon=icon_key,
                status=status_val,
                has_custom_alerts=has_custom,
                custom_milestone_thresholds=[25, 50, 75, 100] if has_custom else None,
                custom_deadline_reminder_days=14 if has_custom else None,
                custom_inactivity_nudge_days=30 if has_custom else None,
                custom_alert_in_app=True if has_custom else None,
                custom_alert_email=True if has_custom else None,
                alert_baseline_pct=0.0
            )
            db.add(g)
            db.flush()
            goals.append(g)

            # Split contributions
            num_parts = random.choice([2, 3])
            part_amt = round(total_contrib / num_parts, 2)
            for i in range(num_parts):
                c_amt = part_amt if i < num_parts - 1 else round(total_contrib - (part_amt * (num_parts - 1)), 2)
                c_days = (num_parts - i) * 15 + random.randint(1, 5)
                note_text = random.choice([
                    "Monthly automatic savings transfer",
                    "Freelance milestone bonus deposit",
                    "Quarterly dividend re-allocation",
                    "Festival savings contribution",
                    "Side gig earnings deposit"
                ])
                contributions.append(
                    GoalContribution(
                        id=uuid.uuid4(),
                        goal_id=g.id,
                        amount=c_amt,
                        note=note_text,
                        contributed_at=today - timedelta(days=c_days)
                    )
                )

        db.add_all(contributions)
        db.commit()
        print(f"   [OK] Goals ({len(goals)}) & Contributions ({len(contributions)}) seeded.")

        # -----------------------------------------------------------------
        # 8. SEED FINANCIAL HEALTH SCORES (Historical Monthly Snapshots)
        # -----------------------------------------------------------------
        print("8. Seeding Financial Health Scores...")
        scores = []
        score_history = [
            (curr_year, curr_month, 28, 24, 18, 14, 10, 94),
            (curr_year, curr_month - 1 if curr_month > 1 else 12, 27, 23, 17, 14, 10, 91),
            (curr_year, curr_month - 2 if curr_month > 2 else 12 + curr_month - 2, 25, 22, 17, 14, 10, 88),
            (curr_year, curr_month - 3 if curr_month > 3 else 12 + curr_month - 3, 26, 21, 16, 14, 9, 86),
            (curr_year, curr_month - 4 if curr_month > 4 else 12 + curr_month - 4, 24, 20, 16, 13, 9, 82),
            (curr_year, curr_month - 5 if curr_month > 5 else 12 + curr_month - 5, 23, 19, 15, 13, 8, 78)
        ]

        for y, m, s_rate, b_adh, e_stab, e_mix, d_beh, tot in score_history:
            scores.append(
                FinancialHealthScore(
                    id=uuid.uuid4(),
                    user_id=main_user.id,
                    year=y,
                    month=m,
                    savings_rate_score=s_rate,
                    budget_adherence_score=b_adh,
                    expense_stability_score=e_stab,
                    essential_mix_score=e_mix,
                    debt_behavior_score=d_beh,
                    total_score=tot
                )
            )

        db.add_all(scores)
        db.commit()
        print(f"   [OK] Financial Health Scores seeded ({len(scores)} monthly records).")

        # -----------------------------------------------------------------
        # 9. SEED AI INSIGHTS & AI REPORTS
        # -----------------------------------------------------------------
        print("9. Seeding AI Insights & Reports...")
        insights = [
            AIInsight(
                id=uuid.uuid4(),
                user_id=main_user.id,
                year=curr_year,
                month=curr_month,
                severity="positive",
                title="Strong Monthly Savings Rate",
                description="Your current monthly savings rate is 27.0%, well above the recommended 20% benchmark."
            ),
            AIInsight(
                id=uuid.uuid4(),
                user_id=main_user.id,
                year=curr_year,
                month=curr_month,
                severity="warning",
                title="Food & Dining Trending High",
                description="Food spending has reached 82% of budget limit with 18 days remaining in the current cycle."
            ),
            AIInsight(
                id=uuid.uuid4(),
                user_id=main_user.id,
                year=curr_year,
                month=curr_month,
                severity="positive",
                title="Goal Milestone Unlocked",
                description="Your 'New Apple M3 MacBook Pro' goal has reached 73.3% completion. You are on track for your deadline."
            )
        ]
        db.add_all(insights)

        # Monthly summary reports
        prev_m = curr_month - 1 if curr_month > 1 else 12
        prev_y = curr_year if curr_month > 1 else curr_year - 1
        report = AIReport(
            id=uuid.uuid4(),
            user_id=main_user.id,
            year=prev_y,
            month=prev_m,
            total_income=50000.0,
            total_expense=36499.0,
            total_savings=13501.0,
            health_score=94,
            summary_text="FinTrack Monthly Financial Summary: In October 2026, you earned Rs. 50,000 and spent Rs. 36,499, resulting in a net surplus of Rs. 13,501 (27% savings rate). Your financial health remains Excellent at 94/100."
        )
        db.add(report)
        db.commit()
        print("   [OK] AI Insights and Monthly Report seeded.")

        # -----------------------------------------------------------------
        # 10. SEED NOTIFICATIONS & ALERT AUDIT RECORDS
        # -----------------------------------------------------------------
        print("10. Seeding Notifications & Alert Records (25+ records)...")
        notifications = []
        alert_records = []

        notif_templates = [
            ("budget_80", "Budget Threshold Alert", "Notice: You have spent 82% of your Food budget for this month.", "budgets", False, 1),
            ("budget_100", "Critical Budget Exceeded", "Warning: You have reached 100% of your Shopping budget!", "budgets", False, 2),
            ("goal_milestone_100", "Goal Achieved! 🎉", "Congratulations! Your 'Emergency Fund Reserve' goal of Rs. 100,000 is 100% completed!", "goals", True, 3),
            ("goal_milestone_75", "Goal Milestone Reached", "Great job! 'New Apple M3 MacBook Pro' goal has crossed the 70% threshold.", "goals", True, 5),
            ("budget_80", "Budget Notice", "Notice: Transport budget is at 82% threshold.", "budgets", True, 6),
            ("monthly_report", "Financial Report Ready", "Your financial summary report for October 2026 is ready to view.", "dashboard", True, 8),
            ("system", "Security Notification", "Successful login from Chrome on Windows.", "dashboard", True, 10),
            ("goal_deadline_7", "Goal Deadline Approaching", "Reminder: 'Parents 30th Anniversary Gift' deadline is in 7 days.", "goals", False, 12),
            ("budget_100", "Budget Limit Alert", "Critical Alert: Entertainment budget exceeded limit by Rs. 200.", "budgets", False, 14),
            ("system", "FinTrack Update", "FinTrack 2.0 theme enhancements and responsive views are now active.", "dashboard", True, 16),
            ("monthly_report", "Monthly Report Ready", "Your financial summary report for September 2026 is ready to view.", "dashboard", True, 35)
        ]

        for i, (n_type, title, msg, target_tab, is_read, days_ago) in enumerate(notif_templates):
            bg_id = budgets[i % len(budgets)].id if "budget" in n_type else None
            gl_id = goals[i % len(goals)].id if "goal" in n_type else None
            notif_date = today - timedelta(days=days_ago)

            notifications.append(
                Notification(
                    id=uuid.uuid4(),
                    user_id=main_user.id,
                    budget_id=bg_id,
                    goal_id=gl_id,
                    type=n_type,
                    title=title,
                    message=msg,
                    target_tab=target_tab,
                    is_read=is_read,
                    email_sent_at=notif_date,
                    created_at=datetime.combine(notif_date, datetime.min.time(), tzinfo=timezone.utc)
                )
            )

            # Corresponding AlertRecord to maintain deduplication integrity
            if bg_id:
                alert_key = f"budget:{bg_id}:80:{curr_year}-{curr_month:02d}"
                alert_records.append(
                    AlertRecord(
                        id=uuid.uuid4(),
                        user_id=main_user.id,
                        alert_type="budget_threshold",
                        budget_id=bg_id,
                        threshold=80,
                        period_identifier=f"{curr_year}-{curr_month:02d}",
                        alert_key=alert_key,
                        in_app_sent_at=datetime.combine(notif_date, datetime.min.time(), tzinfo=timezone.utc),
                        email_sent_at=datetime.combine(notif_date, datetime.min.time(), tzinfo=timezone.utc)
                    )
                )
            elif gl_id:
                alert_key = f"goal_milestone:{gl_id}:75"
                alert_records.append(
                    AlertRecord(
                        id=uuid.uuid4(),
                        user_id=main_user.id,
                        alert_type="goal_milestone",
                        goal_id=gl_id,
                        threshold=75,
                        period_identifier="all_time",
                        alert_key=alert_key,
                        in_app_sent_at=datetime.combine(notif_date, datetime.min.time(), tzinfo=timezone.utc),
                        email_sent_at=datetime.combine(notif_date, datetime.min.time(), tzinfo=timezone.utc)
                    )
                )

        db.add_all(notifications)
        # Add deduplicated alert records
        seen_keys = set()
        for ar in alert_records:
            if ar.alert_key not in seen_keys:
                seen_keys.add(ar.alert_key)
                db.add(ar)

        db.commit()
        print(f"   [OK] Notifications ({len(notifications)}) & Alert Records ({len(seen_keys)}) seeded.")

        # -----------------------------------------------------------------
        # 11. SEED SUPPORT REPORTS & TICKETS (Help Page & Admin Issues)
        # -----------------------------------------------------------------
        print("11. Seeding Support Reports & Audit Trail...")
        reports_data = [
            (
                "Something is broken",
                "CSV Export button does not trigger download on Safari mobile",
                "income",
                "Open",
                None,
                None,
                5
            ),
            (
                "Feature Request",
                "Add option to set custom bi-weekly budget cycles instead of calendar month",
                "budgets",
                "In Progress",
                "Under review by product engineering team for FinTrack v2.2 release.",
                None,
                12
            ),
            (
                "Feedback",
                "The new responsive drawer and dark theme look wonderful!",
                "dashboard",
                "Resolved",
                "Thank you for the warm feedback, Asha! Glad you are enjoying the update.",
                None,
                18
            ),
            (
                "Something is broken",
                "Category total on Analytics overview discrepancy for Oct 2026",
                "analytics",
                "Closed",
                "Fixed in database query patch applied on Nov 2nd.",
                "Resolved by team",
                25
            )
        ]

        for r_type, title, page_name, status_val, admin_reply_text, closed_reason, days_ago in reports_data:
            r_created = datetime.now(timezone.utc) - timedelta(days=days_ago)
            rep = SupportReport(
                id=uuid.uuid4(),
                user_id=main_user.id,
                report_type=r_type,
                title=title,
                description=f"Detailed user ticket: {title}. Encountered on {page_name} page during testing.",
                page=page_name,
                status=status_val,
                closed_reason=closed_reason,
                admin_reply=admin_reply_text,
                admin_reply_at=r_created + timedelta(hours=4) if admin_reply_text else None,
                resolved_at=r_created + timedelta(days=1) if status_val in ("Resolved", "Closed") else None,
                closed_at=r_created + timedelta(days=2) if status_val == "Closed" else None,
                created_at=r_created,
                updated_at=r_created + timedelta(hours=5)
            )
            db.add(rep)
            db.flush()

            # Note
            if admin_reply_text:
                note = SupportReportNote(
                    id=uuid.uuid4(),
                    report_id=rep.id,
                    admin_id=admin_user.id,
                    admin_name="System Admin",
                    note=f"Internal Note: Verified report #{rep.report_number}. Applied test response.",
                    created_at=r_created + timedelta(hours=3)
                )
                db.add(note)

            # History events
            h_created = SupportReportHistory(
                id=uuid.uuid4(),
                report_id=rep.id,
                actor_type="USER",
                actor_name=main_user.name,
                event_type="created",
                old_status=None,
                new_status="Open",
                message="Report submitted by user via Help page",
                created_at=r_created
            )
            db.add(h_created)

            if status_val != "Open":
                h_status = SupportReportHistory(
                    id=uuid.uuid4(),
                    report_id=rep.id,
                    actor_type="ADMIN",
                    actor_name="System Admin",
                    event_type="status_changed",
                    old_status="Open",
                    new_status=status_val,
                    message=f"Status changed to {status_val}",
                    created_at=r_created + timedelta(hours=4)
                )
                db.add(h_status)

        db.commit()
        print("   [OK] Support Reports & History seeded.")

        # -----------------------------------------------------------------
        # 12. SEED ADMIN REPORTED ISSUES & TIPS ARTICLES
        # -----------------------------------------------------------------
        print("12. Seeding Admin Reported Issues and Tips Articles...")
        admin_issues = [
            ReportedIssue(
                id=uuid.uuid4(),
                user_id=main_user.id,
                title="Mobile sidebar gesture sensitivity",
                description="Swipe gesture closes drawer too quickly on low-end devices.",
                page="shell",
                status="open"
            ),
            ReportedIssue(
                id=uuid.uuid4(),
                user_id=users_map["rahul.sharma@example.com"].id,
                title="PDF monthly report font size in Gujarati locale",
                description="Rupee symbol rendering in exported PDF report.",
                page="analytics",
                status="resolved",
                resolved_at=datetime.now(timezone.utc) - timedelta(days=2)
            )
        ]
        db.add_all(admin_issues)

        articles = [
            TipArticle(
                id=uuid.uuid4(),
                author_id=admin_user.id,
                title="How to Build a 6-Month Emergency Buffer",
                content="Building an emergency fund starts with consistent, automated monthly savings allocations. Discover our step-by-step roadmap.",
                status="published"
            ),
            TipArticle(
                id=uuid.uuid4(),
                author_id=admin_user.id,
                title="The 50/30/20 Budgeting Rule Explained",
                content="Learn how allocating 50% to needs, 30% to wants, and 20% to savings provides sustainable long-term financial resilience.",
                status="published"
            ),
            TipArticle(
                id=uuid.uuid4(),
                author_id=admin_user.id,
                title="Smart Strategies for Reducing High-Interest Debt",
                content="Explore the Avalanche vs Snowball debt elimination strategies and how to model them in FinTrack.",
                status="published"
            )
        ]
        db.add_all(articles)
        db.commit()
        print("   [OK] Admin Reported Issues and Tips Articles seeded.")

        print("\n=================================================================")
        print(">>> ALL 19 DATABASE TABLES SEEDED SUCCESSFULLY (PRODUCTION READY)! <<<")
        print("=================================================================")
        print("Test Accounts for Developers:")
        print("  * Standard User: user@fintrack.com   / password123")
        print("  * Admin User:    admin@fintrack.com  / admin123")
        print("=================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
