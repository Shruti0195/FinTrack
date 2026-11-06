import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path regardless of execution working directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    print("Starting database schema migration...")
    with engine.connect() as conn:
        # 1. Update 'users' table
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS email_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_milestone_notifs BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS monthly_report_notifs BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS budget_alert_thresholds JSONB DEFAULT '[80, 100]'::jsonb,
            ADD COLUMN IF NOT EXISTS budget_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS budget_alert_email BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_milestone_thresholds JSONB DEFAULT '[25, 50, 75, 100]'::jsonb,
            ADD COLUMN IF NOT EXISTS goal_deadline_reminder_days INTEGER DEFAULT 7,
            ADD COLUMN IF NOT EXISTS goal_inactivity_nudge_days INTEGER DEFAULT 30,
            ADD COLUMN IF NOT EXISTS goal_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS goal_alert_email BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS session_token_version INTEGER NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS is_budget_paused BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS budget_paused_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS budget_pause_reason VARCHAR(255),
            ADD COLUMN IF NOT EXISTS checklist_status JSONB DEFAULT '{"dismissed": false, "completed_steps": []}'::jsonb;

            -- Preserve legacy email preferences
            UPDATE users SET budget_alert_email = email_budget_alerts WHERE email_budget_alerts IS NOT NULL;
            UPDATE users SET goal_alert_email = goal_milestone_notifs WHERE goal_milestone_notifs IS NOT NULL;
        """))
        print("[SUCCESS] 'users' table updated with all missing columns.")

        # 2. Update 'categories' table
        conn.execute(text("""
            ALTER TABLE categories
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

            -- Ensure composite uniqueness for (id, type)
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_categories_id_type'
                ) THEN
                    ALTER TABLE categories ADD CONSTRAINT uq_categories_id_type UNIQUE (id, type);
                END IF;
            END $$;
        """))
        print("[SUCCESS] 'categories' table updated.")

        # 3. Update 'budgets' table
        conn.execute(text("""
            ALTER TABLE budgets
            ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS custom_alert_thresholds JSONB,
            ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN,
            ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN,
            ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;
        """))
        print("[SUCCESS] 'budgets' table updated.")

        # 4. Update 'goals' table & 'goal_contributions'
        conn.execute(text("""
            ALTER TABLE goals
            ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'target',
            ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT 'emerald',
            ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(255),
            ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS custom_milestone_thresholds JSONB,
            ADD COLUMN IF NOT EXISTS custom_deadline_reminder_days INTEGER,
            ADD COLUMN IF NOT EXISTS custom_inactivity_nudge_days INTEGER,
            ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN,
            ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN,
            ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;

            ALTER TABLE goal_contributions
            ADD COLUMN IF NOT EXISTS note VARCHAR(255);
        """))
        print("[SUCCESS] 'goals' and 'goal_contributions' updated.")

        # 5. Create 'goal_icons' and 'goal_colors' lookup tables if missing
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS goal_icons (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL DEFAULT 'General',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS goal_colors (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                hex_code VARCHAR(20) NOT NULL,
                bg_color VARCHAR(100) NOT NULL,
                text_color VARCHAR(100) NOT NULL,
                border_color VARCHAR(100) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("[SUCCESS] 'goal_icons' and 'goal_colors' tables verified.")

        # 6. Update 'notifications' table
        conn.execute(text("""
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS title VARCHAR(100),
            ADD COLUMN IF NOT EXISTS target_tab VARCHAR(50) DEFAULT 'dashboard';
        """))
        try:
            conn.execute(text("""
                ALTER TABLE notifications 
                ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);
            """))
            print("[SUCCESS] 'notifications.type' column altered to VARCHAR(50).")
        except Exception as e:
            print(f"[NOTE] 'notifications.type' alter note: {e}")

        # 7. Create 'alert_records' table if missing
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alert_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alert_type VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                threshold_pct NUMERIC(6, 2),
                channel VARCHAR(20) NOT NULL,
                month_year VARCHAR(7),
                triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_record ON alert_records (user_id, alert_type, entity_type, entity_id, threshold_pct, channel, month_year);
        """))
        print("[SUCCESS] 'alert_records' verified.")

        # 8. Create Support Reports tables & sequence
        conn.execute(text("""
            CREATE SEQUENCE IF NOT EXISTS support_report_num_seq START WITH 101 INCREMENT BY 1;

            CREATE TABLE IF NOT EXISTS support_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_number VARCHAR(20) UNIQUE NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL,
                severity VARCHAR(20) NOT NULL DEFAULT 'medium',
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                subject VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                steps_to_reproduce TEXT,
                device_info JSONB,
                admin_notes TEXT,
                resolution_summary TEXT,
                resolved_at TIMESTAMP WITH TIME ZONE,
                resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
                assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
                reopen_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS support_report_notes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_id UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                note TEXT NOT NULL,
                is_internal BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS support_report_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                report_id UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
                actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(50) NOT NULL,
                field_changed VARCHAR(50),
                old_value TEXT,
                new_value TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("[SUCCESS] Support ticket tables verified.")

        # 9. Verify analytics tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS financial_health_scores (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                month VARCHAR(7) NOT NULL,
                savings_rate_score NUMERIC(5, 2) NOT NULL,
                budget_adherence_score NUMERIC(5, 2) NOT NULL,
                expense_stability_score NUMERIC(5, 2) NOT NULL,
                essential_mix_score NUMERIC(5, 2) NOT NULL,
                debt_behavior_score NUMERIC(5, 2) NOT NULL,
                total_score NUMERIC(5, 2) NOT NULL,
                savings_rate_pct NUMERIC(6, 2) NOT NULL,
                budget_adherence_pct NUMERIC(6, 2) NOT NULL,
                essential_ratio_pct NUMERIC(6, 2) NOT NULL,
                discretionary_ratio_pct NUMERIC(6, 2) NOT NULL,
                month_income NUMERIC(14, 2) NOT NULL,
                month_expenses NUMERIC(14, 2) NOT NULL,
                net_savings NUMERIC(14, 2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_user_month UNIQUE(user_id, month)
            );

            CREATE TABLE IF NOT EXISTS ai_insights (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL,
                title VARCHAR(150) NOT NULL,
                message TEXT NOT NULL,
                action_text VARCHAR(100),
                action_route VARCHAR(100),
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ai_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                month VARCHAR(7) NOT NULL,
                summary TEXT NOT NULL,
                highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
                recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
                spending_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_user_report_month UNIQUE(user_id, month)
            );
        """))
        print("[SUCCESS] Analytics & AI tables verified.")

        # 10. Admin tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reported_issues (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                page VARCHAR(100),
                status VARCHAR(20) DEFAULT 'open',
                admin_note TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tip_articles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                is_published BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("[SUCCESS] Admin tables verified.")

        conn.commit()
    print("[SUCCESS] All migrations completed successfully!")

if __name__ == "__main__":
    migrate()
