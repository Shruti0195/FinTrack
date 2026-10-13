import sys
from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Starting database schema migration...")
    with engine.connect() as conn:
        # 1. Add missing columns to 'users' table
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_milestone_notifs BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS monthly_report_notifs BOOLEAN NOT NULL DEFAULT TRUE;
        """))
        print("[SUCCESS] 'users' table updated with notification setting columns.")

        # 2. Add missing columns / update 'notifications' table
        conn.execute(text("""
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS title VARCHAR(100),
            ADD COLUMN IF NOT EXISTS target_tab VARCHAR(50) DEFAULT 'dashboard';
        """))

        # Convert type column from enum to varchar if necessary
        try:
            conn.execute(text("""
                ALTER TABLE notifications 
                ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);
            """))
            print("[SUCCESS] 'notifications.type' column altered to VARCHAR(50).")
        except Exception as e:
            print(f"[NOTE] 'notifications.type' alter note: {e}")

        conn.commit()
    print("[SUCCESS] All migrations completed successfully!")

if __name__ == "__main__":
    migrate()
