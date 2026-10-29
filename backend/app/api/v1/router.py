from fastapi import APIRouter
from app.api.v1.endpoints import auth
from app.api.v1.endpoints.user import (
    settings as user_settings,
    income as user_income,
    expense as user_expense,
    budgets as user_budgets,
    dashboard as user_dashboard,
    goals as user_goals,
    notifications as user_notifications,
    analytics as user_analytics,
    help as user_help,
    tour as user_tour,
    issues as user_issues,
)
from app.api.v1.endpoints.admin import (
    overview as admin_overview,
    users as admin_users,
    categories as admin_categories,
    issues as admin_issues,
    goal_options as admin_goal_options,
)

api_router = APIRouter()

# -------------------------------------------------------------
# 1. PUBLIC AUTH ROUTES
# -------------------------------------------------------------
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# -------------------------------------------------------------
# 2. USER PANEL ROUTES (Protected by get_current_user)
# -------------------------------------------------------------
user_router = APIRouter(prefix="/user")
user_router.include_router(user_dashboard.router, prefix="/dashboard", tags=["User - Dashboard"])
user_router.include_router(user_analytics.router, prefix="/analytics", tags=["User - Analytics"])
user_router.include_router(user_settings.router, prefix="/settings", tags=["User - Settings"])
user_router.include_router(user_income.router, prefix="/income", tags=["User - Income"])
user_router.include_router(user_expense.router, prefix="/expenses", tags=["User - Expenses"])
user_router.include_router(user_expense.router, prefix="/transactions", tags=["User - Transactions"])
user_router.include_router(user_budgets.router, prefix="/budgets", tags=["User - Budgets"])
user_router.include_router(user_goals.router, prefix="/goals", tags=["User - Goals"])
user_router.include_router(user_notifications.router, prefix="/notifications", tags=["User - Notifications"])
user_router.include_router(user_help.router, prefix="/help", tags=["User - Help"])
user_router.include_router(user_issues.router, prefix="/issues", tags=["User - Issues"])
user_router.include_router(user_tour.router, prefix="/tour", tags=["User - Tour"])

api_router.include_router(user_router)

# -------------------------------------------------------------
# 3. ADMIN PANEL ROUTES (Protected by get_current_admin_user)
# -------------------------------------------------------------
admin_router = APIRouter(prefix="/admin")
admin_router.include_router(admin_overview.router, prefix="/overview", tags=["Admin - Overview"])
admin_router.include_router(admin_users.router, prefix="/users", tags=["Admin - Users"])
admin_router.include_router(admin_categories.router, prefix="/categories", tags=["Admin - Categories"])
admin_router.include_router(admin_issues.router, prefix="/issues", tags=["Admin - Issues"])
admin_router.include_router(admin_goal_options.router, prefix="/goals", tags=["Admin - Goals"])

api_router.include_router(admin_router)
