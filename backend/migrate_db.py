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

        # 3. Add default alert settings to 'users' table
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS budget_alert_thresholds JSONB DEFAULT '[80, 100]'::jsonb,
            ADD COLUMN IF NOT EXISTS budget_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS budget_alert_email BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_milestone_thresholds JSONB DEFAULT '[25, 50, 75, 100]'::jsonb,
            ADD COLUMN IF NOT EXISTS goal_deadline_reminder_days INTEGER DEFAULT 7,
            ADD COLUMN IF NOT EXISTS goal_inactivity_nudge_days INTEGER DEFAULT 30,
            ADD COLUMN IF NOT EXISTS goal_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_alert_email BOOLEAN NOT NULL DEFAULT TRUE;

            -- Preserve existing email preferences
            UPDATE users SET budget_alert_email = email_budget_alerts WHERE email_budget_alerts IS NOT NULL;
            UPDATE users SET goal_alert_email = goal_milestone_notifs WHERE goal_milestone_notifs IS NOT NULL;
        """))
        print("[SUCCESS] 'users' table updated with default alert settings columns.")

        # 4. Add per-budget override alert columns to 'budgets' table
        conn.execute(text("""
            ALTER TABLE budgets
            ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS custom_alert_thresholds JSONB,
            ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN,
            ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN,
            ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;
        """))
        print("[SUCCESS] 'budgets' table updated with custom alert override columns.")

        # 5. Add per-goal override alert columns to 'goals' table
        conn.execute(text("""
            ALTER TABLE goals
            ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS custom_milestone_thresholds JSONB,
            ADD COLUMN IF NOT EXISTS custom_deadline_reminder_days INTEGER,
            ADD COLUMN IF NOT EXISTS custom_inactivity_nudge_days INTEGER,
            ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN,
            ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN,
            ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;
        """))
        print("[SUCCESS] 'goals' table updated with custom alert override columns.")

        conn.commit()
    print("[SUCCESS] All migrations completed successfully!")

if __name__ == "__main__":
    migrate()
