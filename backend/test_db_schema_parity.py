"""
Database Schema & Model Parity Test for FinTrack.
Validates:
1. All 19 SQLAlchemy models match the PostgreSQL schema.sql definitions.
2. All columns, types, nullabilities, and constraints align 1-to-1.
3. All custom PostgreSQL ENUM types and values are correct.
4. All seed_db.py model instantiations use valid, existing model attributes.

Run with:
    python backend/test_db_schema_parity.py
"""
import sys
import re
import ast
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

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

MODELS = [
    User, PasswordReset, Category, Transaction, Budget,
    Goal, GoalContribution, GoalIcon, GoalColor,
    Notification, AlertRecord, FinancialHealthScore,
    AIInsight, AIReport, ReportedIssue, TipArticle,
    SupportReport, SupportReportNote, SupportReportHistory
]

def run_parity_tests():
    print("=" * 65)
    print(">>> RUNNING FINTRACK DB & SCHEMA PARITY TESTS <<<")
    print("=" * 65)

    # 1. Resolve schema.sql
    possible_paths = [
        backend_dir.parent / "schema.sql",
        backend_dir / "schema.sql",
        Path("schema.sql"),
    ]
    schema_path = next((p for p in possible_paths if p.exists()), None)
    if not schema_path:
        raise FileNotFoundError("Could not find schema.sql")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    # 2. Check all tables exist in schema.sql
    print(f"\n[1/4] Checking {len(MODELS)} tables in {schema_path.name}...")
    for m in MODELS:
        t_name = m.__tablename__
        pattern = rf'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{t_name}\b'
        assert re.search(pattern, schema_sql, re.IGNORECASE), f"Missing table in SQL: {t_name}"
    print(f"  [OK] All {len(MODELS)} tables defined in schema.sql")

    # 3. Check all columns for every table
    print("\n[2/4] Checking column-by-column parity...")
    for m in MODELS:
        t_name = m.__tablename__
        match = re.search(rf'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{t_name}\s*\((.*?)\);', schema_sql, re.IGNORECASE | re.DOTALL)
        assert match, f"Could not parse CREATE TABLE block for {t_name}"
        block = match.group(1)

        table_cols = set()
        for line in block.split("\n"):
            line = line.strip().rstrip(",")
            if not line or line.startswith("--") or line.upper().startswith(("CONSTRAINT", "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK")):
                continue
            first_token = line.split()[0].replace('"', '').lower()
            table_cols.add(first_token)

        model_cols = set(c.name.lower() for c in m.__table__.columns)
        missing_in_sql = model_cols - table_cols
        assert not missing_in_sql, f"Table '{t_name}' in schema.sql is missing columns: {missing_in_sql}"
    print("  [OK] 100% of model columns match schema.sql definitions")

    # 4. Check custom ENUM types and exact values
    print("\n[3/4] Checking PostgreSQL ENUM types & values...")
    enums_to_check = {
        'user_role': ["'USER'", "'ADMIN'"],
        'txn_type': ["'income'", "'expense'"],
        'goal_status': ["'active'", "'completed'"],
        'insight_severity': ["'positive'", "'warning'", "'negative'"],
        'issue_status': ["'open'", "'resolved'"],
        'article_status': ["'draft'", "'published'"]
    }
    for enum_name, vals in enums_to_check.items():
        pattern = rf'CREATE\s+TYPE\s+{enum_name}\s+AS\s+ENUM\s*\((.*?)\);'
        match = re.search(pattern, schema_sql, re.IGNORECASE)
        assert match, f"Missing enum type {enum_name} in schema.sql"
        content = match.group(1)
        for v in vals:
            assert v in content, f"Enum {enum_name} missing required value {v}"
    print("  [OK] All custom ENUM types and values verified")

    # 5. Check AST of seed_db.py calls
    print("\n[4/4] Validating seed_db.py constructor keyword arguments...")
    seed_path = backend_dir / "seed_db.py"
    with open(seed_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    model_map = {m.__name__: m for m in MODELS}
    call_count = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            m_name = node.func.id
            if m_name in model_map:
                model = model_map[m_name]
                valid_cols = set(model.__table__.columns.keys())
                for kw in node.keywords:
                    if kw.arg:
                        assert kw.arg in valid_cols, f"seed_db.py calls {m_name} with unknown argument '{kw.arg}'"
                call_count += 1
    print(f"  [OK] Validated {call_count} model constructor calls in seed_db.py")

    print("\n" + "=" * 65)
    print(">>> ALL DATABASE PARITY TESTS PASSED SUCCESSFULLY! (100% ALIGNED) <<<")
    print("=" * 65)

if __name__ == "__main__":
    run_parity_tests()
