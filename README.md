# FinTrack — Personal Finance Application

FinTrack is an intelligent personal finance tracking app featuring income and expense categorization, monthly budget guardrails, goal planning, financial health analytics, and downloadable monthly PDF reports.

---

> [!IMPORTANT]
> **Developer Note on Tour Sample Data:**
> If you change what an API returns, update the matching file in `tour/sampleData`.
> 
> You can verify the integrity of the tour sample data by running:
> ```bash
> npm --prefix frontend run test:sample-data
> ```

---

## Getting Started

Refer to [SETUP.md](file:///d:/Fintrack/SETUP.md) for detailed local developer environment configuration, backend FastAPI startup, and frontend Vite setup.

---

## 🤖 FinTrack AI Assistant (Read-Only)

FinTrack features an integrated, read-only conversational financial assistant powered by Google Gemini and backed by strict user-authenticated database tools.

### Key Features
- **Strictly Read-Only**: The AI can query and explain real financial numbers, but cannot create, alter, or delete any data.
- **Privacy by Design**: Conversations are held ephemerally in browser `sessionStorage` (cleared on logout or tab close) and never logged or stored in server databases.
- **Smart Actions**: Automatically suggests navigation pills (`Open Budgets`, `Open Goals`) to jump straight to the relevant feature.
- **Fail-Safe Cascade**: Automatic fallback routing across models (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-flash-lite-latest`) prevents downtime during provider demand spikes.

### Tool Registry (9 Read-Only Tools)
1. `get_dashboard_summary`: Monthly income, expense, savings, and savings rate.
2. `get_budget_status`: Limits vs. actual spending, warning/exceeded alert levels.
3. `get_goals_summary`: Active savings goals, saved amounts, progress %, and deadlines.
4. `list_recent_transactions`: Recent user transactions with date, category, and amounts.
5. `get_spending_by_category`: Expense breakdown by category with percentage share.
6. `get_health_score`: 4-factor financial health score (0–100) and personalized tips.
7. `compare_periods`: Month-over-month delta amounts and percentage changes.
8. `get_spending_trend`: Trailing 6-month aggregate spending history.
9. `get_app_help`: Curated, verified navigation instructions for app features.

### Configuration (`backend/.env`)
```env
GEMINI_API_KEY="your-google-ai-studio-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
DAILY_ASSISTANT_LIMIT=50
```

### Verification & Automated Testing
```powershell
cd backend
python test_assistant_api.py        # Verifies authenticated REST endpoint & multi-turn chat
python test_remaining_tools.py      # Verifies all 9 database tools
python test_safety_guardrails.py    # Verifies Section 11 safety rules & injection defense
```
