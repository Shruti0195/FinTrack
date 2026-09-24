# FinTrack — Developer Setup Guide

This guide contains the step-by-step instructions for developers to set up and run the FinTrack full-stack application locally.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:

* **Python**: 3.10+ (tested on Python 3.11, 3.12, 3.13)
* **Node.js**: 18+ (tested on Node 20+, with `npm`)
* **PostgreSQL**: 14+ (running locally on port `5432`)
* **Git**

---

## 2. PostgreSQL Database Setup

1. Start your local PostgreSQL service.
2. Open your terminal or `psql` shell:
   ```sql
   -- Log into postgres
   psql -U postgres

   -- Create the fintrack_db database
   CREATE DATABASE fintrack_db;

   -- Verify it exists
   \l
   \q
   ```

---

## 3. Backend Setup (FastAPI + SQLAlchemy)

### A. Navigate to backend and create a virtual environment
```bash
cd backend
python -m venv venv
```

**Activate the virtual environment**:
* **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```

### B. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### C. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your local settings:
```ini
PROJECT_NAME=FinTrack
API_V1_STR=/api/v1
SECRET_KEY=dev-secret-key-12345
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Replace with your PostgreSQL username, password, and port
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/fintrack_db

# Gmail SMTP Configuration (Optional in local dev)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_google_app_password
EMAILS_FROM_EMAIL=your_email@gmail.com
EMAILS_FROM_NAME="FinTrack Personal Finance"
FRONTEND_URL=http://localhost:5173
```
> **Note on Email**: If `SMTP_USER` or `SMTP_PASSWORD` are left empty, the application automatically runs in **Dev Fallback Mode** and prints email verification and password reset links directly to your console!

### D. Apply Database Schema & Seed Data
Run the schema setup and database seeder:
```bash
# 1. Creates 13 tables, custom ENUMs, triggers, and 15 default categories
python apply_schema.py

# 2. Seeds test accounts, transactions, budgets, and goals
python seed_db.py
```

### E. Run Automated Tests
Verify that auth, token generation, and email verification are passing:
```bash
python test_verification.py
python test_forgot_password.py
```
*(Both should exit with code 0).*

### F. Start the FastAPI Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
* **API root**: `http://localhost:8000`
* **Swagger Interactive Docs**: `http://localhost:8000/docs`
* **ReDoc**: `http://localhost:8000/redoc`

---

## 4. Frontend Setup (React 19 + TypeScript + Vite)

Open a **new terminal window**:

### A. Navigate to frontend & install packages
```bash
cd frontend
npm install
```

### B. Start the Vite Dev Server
```bash
npm run dev
```
* The frontend will be available at: **`http://localhost:5173`**

### C. Build Check
Ensure TypeScript and Vite build without errors:
```bash
npm run build
```

---

## 5. Default Test Accounts

| Role | Email | Password | Status | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Regular User** | `user@fintrack.com` | `password123` | Active & Verified | Personal Dashboard, Transactions, Budgets, Goals |
| **Admin** | `admin@fintrack.com` | `admin123` | Active & Verified | Admin Panel, Category Management, User Moderation |

---

## 6. Architecture & File Structure for Development

### Backend (`/backend/app/`)
* `core/config.py` — Application configuration & environment variables.
* `core/database.py` — SQLAlchemy DB session (`get_db`).
* `core/security.py` — Bcrypt password hashing & JWT generation.
* `api/deps.py` — Endpoint guards: `get_current_user` and `get_current_admin_user`.
* `api/v1/router.py` — Central routing tree separating `/auth`, `/user/*`, and `/admin/*`.
* `models/` — SQLAlchemy 2.0 ORM models for all tables.
* `schemas/` — Pydantic request/response validation schemas.

### Frontend (`/frontend/src/`)
* `index.css` — Design system CSS variables (Light/Dark themes, deep navy `#0F172A`, emerald `#10B981`).
* `context/ThemeContext.tsx` — Light/Dark mode state management.
* `api/client.ts` — Pre-configured Axios instance with authorization bearer token interceptor.
* `components/AuthModal.tsx` — Login / Register / Forgot Password modal with input auto-clearing.
* `pages/LandingPage.tsx` — Public marketing page.
* `pages/DashboardPage.tsx` — Authenticated user dashboard with charts & metrics.
* `pages/VerifyEmailPage.tsx` — Handles `/verify-email?token=...`.
* `pages/ResetPasswordPage.tsx` — Handles `/reset-password?token=...`.

---

## 7. Troubleshooting

* **PostgreSQL Connection Error**:
  Verify the PostgreSQL service is running and that the credentials in `backend/.env` match your local PostgreSQL configuration.
* **PowerShell Execution Policy Error**:
  Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in an elevated PowerShell terminal.
* **C++ Compiler Error on Windows (`psycopg2`)**:
  FinTrack uses `psycopg` (v3 with binary wheels). Do not install `psycopg2`.
