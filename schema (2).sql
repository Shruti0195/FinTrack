-- =====================================================================
-- FinTrack: Personal Finance Analytics — PostgreSQL Database Schema
-- Version: 2.1 (Full Production Schema)
-- =====================================================================
-- Conventions:
--   * All monetary values use NUMERIC(12,2) for exact decimal math.
--   * Tables use UUID primary keys (via uuid-ossp).
--   * created_at and updated_at are maintained for auditing.
--   * Automatic set_updated_at() trigger refreshes updated_at on record changes.
--   * ON DELETE CASCADE ensures clean user data lifecycle management.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- SHARED TRIGGER: Auto-updates updated_at timestamp
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_type') THEN
        CREATE TYPE txn_type AS ENUM ('income', 'expense');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
        CREATE TYPE goal_status AS ENUM ('active', 'completed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
        CREATE TYPE issue_status AS ENUM ('open', 'resolved');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
        CREATE TYPE article_status AS ENUM ('draft', 'published');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insight_severity') THEN
        CREATE TYPE insight_severity AS ENUM ('positive', 'warning', 'negative');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('budget_80', 'budget_100', 'goal_completed', 'system');
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- SEQUENCES
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS support_report_num_seq START WITH 101 INCREMENT BY 1;

-- =====================================================================
-- 1. AUTHENTICATION & USERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                          VARCHAR(100) NOT NULL,
    email                         VARCHAR(255) NOT NULL UNIQUE,
    password_hash                 VARCHAR(255) NOT NULL,
    role                          user_role NOT NULL DEFAULT 'USER',
    is_active                     BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified                   BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at             TIMESTAMPTZ,
    email_alerts_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    email_budget_alerts           BOOLEAN NOT NULL DEFAULT TRUE,
    goal_milestone_notifs         BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_report_notifs         BOOLEAN NOT NULL DEFAULT TRUE,

    -- Global budget alert preferences
    budget_alert_thresholds       JSONB DEFAULT '[80, 100]'::jsonb,
    budget_alert_in_app           BOOLEAN NOT NULL DEFAULT TRUE,
    budget_alert_email            BOOLEAN NOT NULL DEFAULT TRUE,

    -- Global goal alert preferences
    goal_milestone_thresholds     JSONB DEFAULT '[25, 50, 75, 100]'::jsonb,
    goal_deadline_reminder_days   INTEGER DEFAULT 7,
    goal_inactivity_nudge_days    INTEGER DEFAULT 30,
    goal_alert_in_app             BOOLEAN NOT NULL DEFAULT TRUE,
    goal_alert_email              BOOLEAN NOT NULL DEFAULT TRUE,

    -- Alert pause states
    budget_alerts_paused          BOOLEAN NOT NULL DEFAULT FALSE,
    budget_alerts_paused_until    TIMESTAMPTZ,
    goal_alerts_paused            BOOLEAN NOT NULL DEFAULT FALSE,
    goal_alerts_paused_until      TIMESTAMPTZ,

    -- Onboarding & Tour
    viewed_analytics              BOOLEAN NOT NULL DEFAULT FALSE,
    help_checklist_dismissed      BOOLEAN NOT NULL DEFAULT FALSE,
    tour_completed_version        INTEGER NOT NULL DEFAULT 0,

    -- Security & session invalidation
    token_version                 INTEGER NOT NULL DEFAULT 1,
    failed_password_attempts      INTEGER NOT NULL DEFAULT 0,
    password_attempt_locked_until TIMESTAMPTZ,

    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. CATEGORIES (System-wide & Custom User Categories)
-- =====================================================================

CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(60) NOT NULL,
    type        txn_type NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT TRUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_system_name_type 
    ON categories (name, type) 
    WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_type 
    ON categories (user_id, name, type) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_type_active 
    ON categories (type, is_active);

-- =====================================================================
-- 3. TRANSACTIONS (Income & Expenses)
-- =====================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id      UUID NOT NULL,
    type             txn_type NOT NULL,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description      VARCHAR(255),
    payment_method   VARCHAR(40),
    transaction_date DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_txn_user_date     ON transactions (user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_txn_user_category ON transactions (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_txn_user_type     ON transactions (user_id, type);

-- =====================================================================
-- 4. BUDGETS
-- =====================================================================

CREATE TABLE IF NOT EXISTS budgets (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id             UUID NOT NULL,
    type                    txn_type NOT NULL DEFAULT 'expense' CHECK (type = 'expense'),
    month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT NOT NULL,
    limit_amount            NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
    has_custom_alerts       BOOLEAN NOT NULL DEFAULT FALSE,
    custom_alert_thresholds JSONB,
    custom_alert_in_app     BOOLEAN,
    custom_alert_email      BOOLEAN,
    alert_baseline_pct      NUMERIC(6, 2) DEFAULT 0.0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, category_id, month, year),
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_budget_user_month ON budgets (user_id, year, month);

-- =====================================================================
-- 5. SAVINGS GOALS & CUSTOMIZATIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS goals (
    id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                         VARCHAR(100) NOT NULL,
    target_amount                 NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    deadline                      DATE,
    color                         VARCHAR(30) DEFAULT '#10B981',
    icon                          VARCHAR(50) DEFAULT 'target',
    status                        goal_status NOT NULL DEFAULT 'active',
    has_custom_alerts             BOOLEAN NOT NULL DEFAULT FALSE,
    custom_milestone_thresholds   JSONB,
    custom_deadline_reminder_days INTEGER,
    custom_inactivity_nudge_days  INTEGER,
    custom_alert_in_app           BOOLEAN,
    custom_alert_email            BOOLEAN,
    alert_baseline_pct            NUMERIC(6, 2) DEFAULT 0.0,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_contributions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id        UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    note           VARCHAR(200),
    contributed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_icons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(60) NOT NULL UNIQUE,
    icon_key    VARCHAR(50) NOT NULL UNIQUE,
    is_default  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_colors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(60) NOT NULL UNIQUE,
    hex         VARCHAR(10) NOT NULL UNIQUE,
    is_default  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_user      ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_contrib_goal   ON goal_contributions (goal_id);

-- =====================================================================
-- 6. FINANCIAL HEALTH SCORES
-- =====================================================================

CREATE TABLE IF NOT EXISTS financial_health_scores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT NOT NULL,
    savings_rate_score      SMALLINT NOT NULL CHECK (savings_rate_score BETWEEN 0 AND 30),
    budget_adherence_score  SMALLINT NOT NULL CHECK (budget_adherence_score BETWEEN 0 AND 25),
    expense_stability_score SMALLINT NOT NULL CHECK (expense_stability_score BETWEEN 0 AND 20),
    essential_mix_score     SMALLINT NOT NULL CHECK (essential_mix_score BETWEEN 0 AND 15),
    debt_behavior_score     SMALLINT NOT NULL CHECK (debt_behavior_score BETWEEN 0 AND 10),
    total_score             SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month, year),
    CHECK (
        savings_rate_score + budget_adherence_score + expense_stability_score
        + essential_mix_score + debt_behavior_score = total_score
    )
);

-- =====================================================================
-- 7. AI INSIGHTS & REPORTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_insights (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year         SMALLINT NOT NULL,
    severity     insight_severity NOT NULL,
    title        VARCHAR(150) NOT NULL,
    description  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_reports (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year          SMALLINT NOT NULL,
    total_income  NUMERIC(12,2) NOT NULL,
    total_expense NUMERIC(12,2) NOT NULL,
    total_savings NUMERIC(12,2) NOT NULL,
    health_score  SMALLINT,
    summary_text  TEXT,
    pdf_path      VARCHAR(255),
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_insight_user_month ON ai_insights (user_id, year, month);

-- =====================================================================
-- 8. NOTIFICATIONS & ALERT AUDIT RECORDS
-- =====================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    budget_id     UUID REFERENCES budgets(id) ON DELETE CASCADE,
    goal_id       UUID REFERENCES goals(id) ON DELETE CASCADE,
    type          VARCHAR(50) NOT NULL,
    title         VARCHAR(100),
    message       VARCHAR(500) NOT NULL,
    target_tab    VARCHAR(50) DEFAULT 'dashboard',
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_records (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type        VARCHAR(50) NOT NULL,
    budget_id         UUID REFERENCES budgets(id) ON DELETE CASCADE,
    goal_id           UUID REFERENCES goals(id) ON DELETE CASCADE,
    threshold         INTEGER,
    period_identifier VARCHAR(50),
    alert_key         VARCHAR(160) NOT NULL,
    in_app_sent_at    TIMESTAMPTZ,
    email_sent_at     TIMESTAMPTZ,
    skipped_reason    VARCHAR(100),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_alert_record_user_key UNIQUE (user_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread   ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_user_created  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_alert_record_user_type ON alert_records (user_id, alert_type);
CREATE INDEX IF NOT EXISTS ix_alert_record_budget    ON alert_records (budget_id);
CREATE INDEX IF NOT EXISTS ix_alert_record_goal      ON alert_records (goal_id);

-- =====================================================================
-- 9. ADMIN & REPORTED ISSUES
-- =====================================================================

CREATE TABLE IF NOT EXISTS reported_issues (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    page         VARCHAR(100),
    admin_note   TEXT,
    status       issue_status NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tips_articles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    title       VARCHAR(150) NOT NULL,
    content     TEXT NOT NULL,
    status      article_status NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 10. SUPPORT TICKETING SYSTEM (User Help & Admin Review)
-- =====================================================================

CREATE TABLE IF NOT EXISTS support_reports (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number  INTEGER NOT NULL DEFAULT nextval('support_report_num_seq') UNIQUE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type    VARCHAR(50) NOT NULL,
    title          VARCHAR(150) NOT NULL,
    description    TEXT NOT NULL,
    page           VARCHAR(50),
    status         VARCHAR(30) NOT NULL DEFAULT 'Open',
    closed_reason  VARCHAR(50),
    admin_reply    TEXT,
    admin_reply_at TIMESTAMPTZ,
    resolved_at    TIMESTAMPTZ,
    closed_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_report_notes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id   UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
    admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_name  VARCHAR(150) NOT NULL DEFAULT 'Admin',
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_report_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id   UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
    actor_type  VARCHAR(20) NOT NULL,
    actor_name  VARCHAR(150) NOT NULL,
    event_type  VARCHAR(50) NOT NULL,
    old_status  VARCHAR(30),
    new_status  VARCHAR(30),
    message     TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_reports_user    ON support_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_support_reports_status  ON support_reports (status);
CREATE INDEX IF NOT EXISTS idx_support_reports_created ON support_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_report_notes    ON support_report_notes (report_id);
CREATE INDEX IF NOT EXISTS idx_support_report_history  ON support_report_history (report_id);

-- =====================================================================
-- 11. TRIGGERS
-- =====================================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_goals_updated_at ON goals;
CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_goal_icons_updated_at ON goal_icons;
CREATE TRIGGER trg_goal_icons_updated_at
    BEFORE UPDATE ON goal_icons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_goal_colors_updated_at ON goal_colors;
CREATE TRIGGER trg_goal_colors_updated_at
    BEFORE UPDATE ON goal_colors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tips_articles_updated_at ON tips_articles;
CREATE TRIGGER trg_tips_articles_updated_at
    BEFORE UPDATE ON tips_articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_support_reports_updated_at ON support_reports;
CREATE TRIGGER trg_support_reports_updated_at
    BEFORE UPDATE ON support_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 12. INITIAL SYSTEM SEED DATA
-- =====================================================================

-- Default Categories (Income & Expense)
INSERT INTO categories (name, type, is_default, is_active) VALUES
    ('Salary',          'income',  TRUE, TRUE),
    ('Freelancing',     'income',  TRUE, TRUE),
    ('Business',        'income',  TRUE, TRUE),
    ('Interest',        'income',  TRUE, TRUE),
    ('Dividends',       'income',  TRUE, TRUE),
    ('Rental Income',   'income',  TRUE, TRUE),
    ('Investments',     'income',  TRUE, TRUE),
    ('Bonus',           'income',  TRUE, TRUE),
    ('Consulting',      'income',  TRUE, TRUE),
    ('Side Hustle',     'income',  TRUE, TRUE),
    ('Other',           'income',  TRUE, TRUE),
    ('Food',            'expense', TRUE, TRUE),
    ('Shopping',        'expense', TRUE, TRUE),
    ('Transport',       'expense', TRUE, TRUE),
    ('Education',       'expense', TRUE, TRUE),
    ('Entertainment',   'expense', TRUE, TRUE),
    ('Healthcare',      'expense', TRUE, TRUE),
    ('Bills',           'expense', TRUE, TRUE),
    ('Rent',            'expense', TRUE, TRUE),
    ('Subscriptions',   'expense', TRUE, TRUE),
    ('Fitness',         'expense', TRUE, TRUE),
    ('Travel',          'expense', TRUE, TRUE),
    ('Gifts',           'expense', TRUE, TRUE),
    ('Utilities',       'expense', TRUE, TRUE),
    ('Miscellaneous',   'expense', TRUE, TRUE),
    ('Other',           'expense', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Default Goal Icons
INSERT INTO goal_icons (name, icon_key, is_default) VALUES
    ('Target',          'target',         TRUE),
    ('Phone',           'phone',          TRUE),
    ('Travel',          'plane',          TRUE),
    ('Emergency',       'shield',         TRUE),
    ('Home',            'home',           TRUE),
    ('Vehicle',         'car',            TRUE),
    ('Gadget',          'laptop',         TRUE),
    ('Gift',            'gift',           TRUE),
    ('Dream',           'sparkles',       TRUE),
    ('Personal',        'heart',          TRUE),
    ('Savings',         'piggy-bank',     TRUE),
    ('Wallet',          'wallet',         TRUE),
    ('Education',       'graduation-cap', TRUE),
    ('Career',          'briefcase',      TRUE),
    ('Investment',      'trending-up',    TRUE),
    ('Achievement',     'trophy',         TRUE),
    ('Award',           'award',          TRUE),
    ('Milestone',       'star',           TRUE),
    ('Luxury',          'gem',            TRUE),
    ('Creative',        'camera',         TRUE),
    ('Lifestyle',       'coffee',         TRUE),
    ('Shopping',        'shopping-bag',   TRUE),
    ('Learning',        'book-open',      TRUE),
    ('Fitness',         'dumbbell',       TRUE),
    ('Cycling',         'bike',           TRUE),
    ('Music',           'music',          TRUE),
    ('Happiness',       'smile',          TRUE)
ON CONFLICT (icon_key) DO NOTHING;

-- Default Goal Colors
INSERT INTO goal_colors (name, hex, is_default) VALUES
    ('Emerald Green',   '#10B981', TRUE),
    ('Deep Navy',       '#0F172A', TRUE),
    ('Royal Blue',      '#3B82F6', TRUE),
    ('Violet',          '#8B5CF6', TRUE),
    ('Rose Pink',       '#EC4899', TRUE),
    ('Amber Gold',      '#F59E0B', TRUE),
    ('Cyan',            '#06B6D4', TRUE),
    ('Red',             '#EF4444', TRUE),
    ('Indigo',          '#6366F1', TRUE),
    ('Orange',          '#F97316', TRUE)
ON CONFLICT (hex) DO NOTHING;
