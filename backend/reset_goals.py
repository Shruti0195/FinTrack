"""
Script to clear existing goals and populate exactly 7 goals of random type and distinct colors (5 Active, 2 Completed).
"""
import uuid
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.models.user import User
from app.models.goal import Goal, GoalContribution

def reset_user_goals():
    db = SessionLocal()
    try:
        # Get users
        users = db.query(User).all()
        if not users:
            print("No users found in database.")
            return

        for user in users:
            print(f"Cleaning goals for user: {user.email} (ID: {user.id})")
            
            # Delete existing goals and contributions for user
            existing_goals = db.query(Goal).filter(Goal.user_id == user.id).all()
            for g in existing_goals:
                db.query(GoalContribution).filter(GoalContribution.goal_id == g.id).delete()
                db.delete(g)
            db.commit()

            today = date.today()

            goals_data = [
                {
                    "title": "New iPhone 17 Pro",
                    "target_amount": 130000.0,
                    "deadline": today + timedelta(days=180),
                    "color": "#3B82F6",  # Royal Blue
                    "icon": "phone",
                    "status": "active",
                    "contributions": [
                        {"amount": 25000.0, "note": "Initial savings allocation", "days_ago": 45},
                        {"amount": 15000.0, "note": "Monthly savings deposit", "days_ago": 15}
                    ]
                },
                {
                    "title": "Goa Trip with College Friends",
                    "target_amount": 45000.0,
                    "deadline": today + timedelta(days=90),
                    "color": "#06B6D4",  # Cyan
                    "icon": "plane",
                    "status": "active",
                    "contributions": [
                        {"amount": 15000.0, "note": "Flight booking fund", "days_ago": 30},
                        {"amount": 10000.0, "note": "Hotel advance deposit", "days_ago": 10}
                    ]
                },
                {
                    "title": "Emergency Rainy Day Fund",
                    "target_amount": 200000.0,
                    "deadline": today + timedelta(days=365),
                    "color": "#10B981",  # Emerald Green
                    "icon": "shield",
                    "status": "active",
                    "contributions": [
                        {"amount": 50000.0, "note": "Yearly bonus allocation", "days_ago": 90},
                        {"amount": 50000.0, "note": "FD maturity transfer", "days_ago": 60},
                        {"amount": 50000.0, "note": "Quarterly savings", "days_ago": 20}
                    ]
                },
                {
                    "title": "MacBook Pro M3 Workstation",
                    "target_amount": 250000.0,
                    "deadline": today + timedelta(days=240),
                    "color": "#0F172A",  # Deep Navy
                    "icon": "laptop",
                    "status": "active",
                    "contributions": [
                        {"amount": 60000.0, "note": "Project milestone payout", "days_ago": 50},
                        {"amount": 40000.0, "note": "Side gig income", "days_ago": 12}
                    ]
                },
                {
                    "title": "Parents 30th Anniversary Gift",
                    "target_amount": 25000.0,
                    "deadline": today + timedelta(days=60),
                    "color": "#EC4899",  # Rose Pink
                    "icon": "gift",
                    "status": "active",
                    "contributions": [
                        {"amount": 10000.0, "note": "Gift fund deposit", "days_ago": 14}
                    ]
                },
                {
                    "title": "Electric Scooter Booking",
                    "target_amount": 90000.0,
                    "deadline": today - timedelta(days=5),
                    "color": "#8B5CF6",  # Purple
                    "icon": "car",
                    "status": "completed",
                    "contributions": [
                        {"amount": 40000.0, "note": "First installment", "days_ago": 80},
                        {"amount": 50000.0, "note": "Final payment achieved!", "days_ago": 10}
                    ]
                },
                {
                    "title": "Home Gym Setup",
                    "target_amount": 35000.0,
                    "deadline": today - timedelta(days=15),
                    "color": "#F59E0B",  # Amber
                    "icon": "home",
                    "status": "completed",
                    "contributions": [
                        {"amount": 20000.0, "note": "Dumbbells & Bench fund", "days_ago": 60},
                        {"amount": 15000.0, "note": "Treadmill deposit - Achieved!", "days_ago": 25}
                    ]
                }
            ]

            for g_data in goals_data:
                goal = Goal(
                    user_id=user.id,
                    title=g_data["title"],
                    target_amount=g_data["target_amount"],
                    deadline=g_data["deadline"],
                    color=g_data["color"],
                    icon=g_data["icon"],
                    status=g_data["status"]
                )
                db.add(goal)
                db.commit()
                db.refresh(goal)

                for c_data in g_data["contributions"]:
                    c_date = today - timedelta(days=c_data["days_ago"])
                    contrib = GoalContribution(
                        goal_id=goal.id,
                        amount=c_data["amount"],
                        note=c_data["note"],
                        contributed_at=c_date
                    )
                    db.add(contrib)
                db.commit()

            print(f"Successfully created 7 goals (5 Active, 2 Completed) for user {user.email}")

    finally:
        db.close()

if __name__ == "__main__":
    reset_user_goals()
