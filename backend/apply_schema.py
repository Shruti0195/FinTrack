import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path regardless of execution working directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import psycopg
from app.core.config import settings

def apply_schema():
    # 1. Resolve schema file location (root or local)
    possible_paths = [
        Path(__file__).resolve().parent.parent / "schema.sql",
        Path(__file__).resolve().parent.parent / "schema (2).sql",
        Path(__file__).resolve().parent / "schema.sql",
        Path("schema.sql"),
        Path("schema (2).sql"),
    ]

    schema_file = None
    for p in possible_paths:
        if p.exists():
            schema_file = p
            break

    if not schema_file:
        raise FileNotFoundError(f"Could not find schema.sql in any of: {[str(p) for p in possible_paths]}")

    print(f"Reading schema from: {schema_file}")
    with open(schema_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    # 2. Connect to PostgreSQL
    conn_str = settings.DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')
    conn = psycopg.connect(conn_str, autocommit=True)
    cur = conn.cursor()

    print("Recreating public schema...")
    cur.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
    
    print(f"Executing {schema_file.name}...")
    cur.execute(sql)

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    tables = [row[0] for row in cur.fetchall()]
    print(f"\n[SUCCESS] Schema applied successfully! {len(tables)} tables created:")
    for t in tables:
        print(f"  - {t}")

    # Check seeded options
    cur.execute("SELECT count(*) FROM categories;")
    cat_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM goal_icons;")
    icon_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM goal_colors;")
    color_count = cur.fetchone()[0]

    print(f"\nInitial system data seeded:")
    print(f"  - Categories: {cat_count}")
    print(f"  - Goal Icons: {icon_count}")
    print(f"  - Goal Colors: {color_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    apply_schema()
