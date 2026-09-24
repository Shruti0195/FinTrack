import psycopg
from app.core.config import settings

def apply_schema():
    with open('../schema (2).sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    conn_str = settings.DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')
    conn = psycopg.connect(conn_str, autocommit=True)
    cur = conn.cursor()

    print("Recreating public schema...")
    cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    
    print("Executing schema (2).sql...")
    cur.execute(sql)

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    tables = [row[0] for row in cur.fetchall()]
    print(f"Schema applied! {len(tables)} tables created:")
    for t in tables:
        print(f"  - {t}")

    cur.execute("SELECT count(*) FROM categories;")
    cat_count = cur.fetchone()[0]
    print(f"Categories seeded: {cat_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    apply_schema()
