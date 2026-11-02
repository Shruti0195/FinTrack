import os
import sys
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

print("Listing available models for your API key...")
try:
    for m in client.models.list():
        # Only show models that support text generation
        name = getattr(m, 'name', '') or str(m)
        print(f" - {name}")
except Exception as e:
    print(f"Error: {e}")
