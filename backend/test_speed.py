import os
import sys
import time
from pathlib import Path
from google import genai

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Candidate models from your account's list
candidates = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
]

print("Testing candidates to find the fastest active free model...\n" + "="*60)
for model_name in candidates:
    print(f"Testing: {model_name} ...", end=" ", flush=True)
    t0 = time.time()
    try:
        res = client.models.generate_content(
            model=model_name,
            contents="Say 'hello' in one word."
        )
        duration = round(time.time() - t0, 2)
        print(f"SUCCESS! (took {duration}s) -> {res.text.strip()}")
    except Exception as e:
        print(f"FAILED ({e})")
print("="*60)
