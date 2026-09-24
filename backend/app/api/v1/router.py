from fastapi import APIRouter
from app.api.v1.endpoints import auth
from app.api.v1.endpoints.user import settings as user_settings
from app.api.v1.endpoints.admin import overview as admin_overview, users as admin_users

api_router = APIRouter()

# -------------------------------------------------------------
# 1. PUBLIC AUTH ROUTES
# -------------------------------------------------------------
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# -------------------------------------------------------------
# 2. USER PANEL ROUTES (Protected by get_current_user)
# -------------------------------------------------------------
user_router = APIRouter(prefix="/user")
user_router.include_router(user_settings.router, prefix="/settings", tags=["User - Settings"])
# Future teammate endpoints attach here:
# user_router.include_router(transactions.router, prefix="/transactions", tags=["User - Transactions"])
# user_router.include_router(budgets.router, prefix="/budgets", tags=["User - Budgets"])
# user_router.include_router(goals.router, prefix="/goals", tags=["User - Goals"])
# user_router.include_router(analytics.router, prefix="/analytics", tags=["User - Analytics"])

api_router.include_router(user_router)

# -------------------------------------------------------------
# 3. ADMIN PANEL ROUTES (Protected by get_current_admin_user)
# -------------------------------------------------------------
admin_router = APIRouter(prefix="/admin")
admin_router.include_router(admin_overview.router, prefix="/overview", tags=["Admin - Overview"])
admin_router.include_router(admin_users.router, prefix="/users", tags=["Admin - Users"])
# Future admin endpoints attach here:
# admin_router.include_router(categories.router, prefix="/categories", tags=["Admin - Categories"])
# admin_router.include_router(issues.router, prefix="/issues", tags=["Admin - Issues"])
# admin_router.include_router(articles.router, prefix="/articles", tags=["Admin - Articles"])

api_router.include_router(admin_router)
