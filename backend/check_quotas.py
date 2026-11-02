import os
from pathlib import Path
from google import genai

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

other_models = [
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
]

print("Checking available quotas for other models...")
for m in other_models:
    try:
        res = client.models.generate_content(
            model=m,
            contents="Hello"
        )
        print(f"[OK] {m}: SUCCESS! Quota available!")
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            print(f"[EXHAUSTED] {m}: Quota exceeded")
        elif "404" in err:
            print(f"[NOT FOUND] {m}")
        else:
            print(f"[ERR] {m}: {err[:60]}")
