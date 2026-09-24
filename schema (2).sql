-- =====================================================================
-- Personal Finance Analytics App — PostgreSQL schema (FINAL, v2)
-- =====================================================================
-- Conventions:
--   * All money values use NUMERIC(12,2) — never FLOAT, to avoid rounding errors.
--   * Every table has a UUID primary key (swap for BIGSERIAL if you prefer ints).
--   * created_at / updated_at are kept on every table for auditing.
--   * updated_at is auto-maintained by trigger — see "TRIGGERS" section at the end.
--   * ON DELETE CASCADE means "if the user is deleted, delete their data too".
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- SHARED TRIGGER — keeps updated_at accurate without relying on app code
-- ---------------------------------------------------------------------
-- Attached below to every table that has an updated_at column: users,
-- transactions, budgets, goals, tips_articles.
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
CREATE TYPE user_role         AS ENUM ('USER', 'ADMIN');
CREATE TYPE txn_type          AS ENUM ('income', 'expense');
CREATE TYPE goal_status       AS ENUM ('active', 'completed');
CREATE TYPE issue_status      AS ENUM ('open', 'resolved');
CREATE TYPE article_status    AS ENUM ('draft', 'published');
CREATE TYPE insight_severity  AS ENUM ('positive', 'warning', 'negative');
CREATE TYPE notification_type AS ENUM ('budget_80', 'budget_100', 'goal_completed', 'system');

-- =====================================================================
-- MODULE 1 — AUTHENTICATION
-- =====================================================================

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(100)    NOT NULL,
    email                VARCHAR(255)    NOT NULL UNIQUE,
    password_hash        VARCHAR(255)    NOT NULL,          -- bcrypt hash, never plain text
    role                 user_role       NOT NULL DEFAULT 'USER',
    is_active            BOOLEAN         NOT NULL DEFAULT TRUE,   -- admin can disable a user
    email_alerts_enabled BOOLEAN         NOT NULL DEFAULT TRUE,   -- Settings page toggle
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT now()  -- auto-refreshed by trigger
);

-- Forgot-password flow: a short-lived, single-use token emailed to the user
CREATE TABLE password_resets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MODULE 2 — CATEGORIES (admin-managed, shared by income & expenses)
-- =====================================================================
-- is_active supports soft-delete: a category with existing transactions/
-- budgets can never be hard-deleted (ON DELETE RESTRICT below), but it can
-- be hidden from "add transaction" / "set budget" dropdowns by flipping
-- is_active to FALSE, without breaking any historical record that points
-- at it.

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(60)  NOT NULL,          -- e.g. "Food", "Salary", "Rent"
    type        txn_type     NOT NULL,          -- which side it belongs to
    is_default  BOOLEAN      NOT NULL DEFAULT TRUE,  -- seeded system category vs custom
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,  -- soft-delete flag; hides from new-entry pickers
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (name, type),
    UNIQUE (id, type)   -- lets transactions/budgets FK against (category_id, type) below
);

CREATE INDEX idx_categories_type_active ON categories (type, is_active);

-- =====================================================================
-- MODULE 3 — INCOME & EXPENSE TRANSACTIONS
-- =====================================================================
-- One unified table for both income and expenses; `type` tells them apart.
-- This keeps CRUD, search, filter, sort and CSV import identical for both.
--
-- Category-type enforcement: the composite foreign key on (category_id, type)
-- means Postgres itself rejects an income transaction pointing at an expense
-- category (or vice versa) — this is no longer left to application code.

CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id      UUID NOT NULL,
    type             txn_type NOT NULL,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description      VARCHAR(255),
    payment_method   VARCHAR(40),          -- e.g. UPI, Card, Cash — expenses only
    transaction_date DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),  -- auto-refreshed by trigger
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type) ON DELETE RESTRICT
);

-- Speeds up: dashboard totals, filtering by month, filtering by category
CREATE INDEX idx_txn_user_date     ON transactions (user_id, transaction_date);
CREATE INDEX idx_txn_user_category ON transactions (user_id, category_id);
CREATE INDEX idx_txn_user_type     ON transactions (user_id, type);

-- =====================================================================
-- MODULE 4 — BUDGETS
-- =====================================================================
-- One budget row per user, per expense category, per calendar month.
-- Budgets only ever apply to expense categories — `type` is fixed to
-- 'expense' by CHECK, and the composite FK re-uses the same enforcement
-- as transactions so a budget can never attach to an income category.

CREATE TABLE budgets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id   UUID NOT NULL,
    type          txn_type NOT NULL DEFAULT 'expense' CHECK (type = 'expense'),
    month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year          SMALLINT NOT NULL,
    limit_amount  NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),  -- auto-refreshed by trigger
    UNIQUE (user_id, category_id, month, year),        -- one limit per category per month
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type) ON DELETE RESTRICT
);

CREATE INDEX idx_budget_user_month ON budgets (user_id, year, month);

-- =====================================================================
-- MODULE 5 — SAVINGS GOALS
-- =====================================================================

CREATE TABLE goals (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title          VARCHAR(100) NOT NULL,        -- e.g. "New laptop"
    target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    deadline       DATE,
    status         goal_status NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()  -- auto-refreshed by trigger
);

-- Every time a user "adds money" to a goal, it's logged as one row here.
-- saved_amount for a goal = SUM(goal_contributions.amount) — never stored directly.
-- NOTE: this table is NOT optional in this schema — goals has no current_amount
-- column, so it is the only source of a goal's progress.
CREATE TABLE goal_contributions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id        UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    contributed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_user ON goals (user_id);
CREATE INDEX idx_contrib_goal ON goal_contributions (goal_id);

-- =====================================================================
-- MODULE 6 — FINANCIAL HEALTH SCORE
-- =====================================================================
-- One snapshot per user per month, so score history can be graphed later.
-- The five sub-scores summing to total_score is now enforced by a table
-- CHECK constraint, not just left to application code.

CREATE TABLE financial_health_scores (
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
-- MODULE 7 — AI ASSISTANT (insights + monthly report)
-- =====================================================================

CREATE TABLE ai_insights (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year         SMALLINT NOT NULL,
    severity     insight_severity NOT NULL,
    title        VARCHAR(150) NOT NULL,      -- e.g. "Entertainment went over budget"
    description  TEXT NOT NULL,              -- the plain-language explanation
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stores numeric monthly totals directly, so the Monthly Report / dashboard
-- doesn't need to recompute them from every transaction row on every page
-- load. summary_text and pdf_path are filled in later, once the AI report
-- generator runs.
CREATE TABLE ai_reports (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year          SMALLINT NOT NULL,
    total_income  NUMERIC(12,2) NOT NULL,
    total_expense NUMERIC(12,2) NOT NULL,
    total_savings NUMERIC(12,2) NOT NULL,
    health_score  SMALLINT,                  -- nullable until financial_health_scores exists for that month
    summary_text  TEXT,                      -- AI-written narrative — nullable until AI report generator runs
    pdf_path      VARCHAR(255),              -- where the generated PDF is stored
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month, year)
);

CREATE INDEX idx_insight_user_month ON ai_insights (user_id, year, month);

-- =====================================================================
-- MODULE 8 — NOTIFICATIONS (in-app center + email-alert dedup)
-- =====================================================================
-- Every row is both (a) something the in-app notification bell can show,
-- and (b) a record that an alert condition fired, so the email job never
-- sends the same alert twice for the same budget/goal.

CREATE TABLE notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    budget_id     UUID REFERENCES budgets(id) ON DELETE CASCADE,  -- set for budget_80 / budget_100
    goal_id       UUID REFERENCES goals(id) ON DELETE CASCADE,    -- set for goal_completed
    type          notification_type NOT NULL,
    message       VARCHAR(255) NOT NULL,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,      -- in-app read state
    email_sent_at TIMESTAMPTZ,                          -- NULL until the email job actually sends it
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One 80%-alert and one 100%-alert per budget, ever (not per month) — since
-- budgets already carry their own month/year, this stops duplicate emails
-- if the alert job runs more than once against the same budget.
CREATE UNIQUE INDEX idx_notif_budget_dedup
    ON notifications (user_id, budget_id, type)
    WHERE budget_id IS NOT NULL;

CREATE INDEX idx_notif_user_unread ON notifications (user_id, is_read);

-- =====================================================================
-- MODULE 9 — ADMIN PANEL (issues + tips/articles)
-- =====================================================================

CREATE TABLE reported_issues (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,  -- who reported it
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    status       issue_status NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE tips_articles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID REFERENCES users(id) ON DELETE SET NULL,   -- the admin who wrote it
    title       VARCHAR(150) NOT NULL,
    content     TEXT NOT NULL,
    status      article_status NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()  -- auto-refreshed by trigger
);

-- =====================================================================
-- TRIGGERS — auto-maintain updated_at on every table that has one
-- =====================================================================
-- Applies to: users, transactions, budgets, goals, tips_articles.
-- (financial_health_scores, ai_reports, ai_insights, categories,
--  password_resets, reported_issues, notifications, goal_contributions
--  do not carry an updated_at column, so no trigger is needed there.)
-- set_updated_at() itself is defined once, near the top of this file,
-- right after the extension is created.

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tips_articles_updated_at
    BEFORE UPDATE ON tips_articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- SEED DATA — default categories so the app isn't empty on first run
-- =====================================================================
INSERT INTO categories (name, type) VALUES
    ('Salary',        'income'),
    ('Freelancing',   'income'),
    ('Business',      'income'),
    ('Interest',      'income'),
    ('Other',         'income'),
    ('Food',          'expense'),
    ('Shopping',      'expense'),
    ('Transport',     'expense'),
    ('Education',     'expense'),
    ('Entertainment', 'expense'),
    ('Healthcare',    'expense'),
    ('Bills',         'expense'),
    ('Rent',          'expense'),
    ('Subscriptions', 'expense'),
    ('Other',         'expense');
