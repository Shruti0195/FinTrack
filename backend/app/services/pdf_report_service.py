import os
import io
import re
import calendar
from datetime import date, datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Flowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.graphics.shapes import Drawing, Rect, String, Line

from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution
from app.services.health_score_service import calculate_financial_health_score
from app.api.v1.endpoints.user.budgets import get_budget_status_info


# ----------------------------------------------------------------------
# 1. Open-Source Font Registration & Script Fallbacks (Noto Sans, Devanagari, Gujarati)
# ----------------------------------------------------------------------
_FONTS_REGISTERED = False

def register_fintrack_fonts():
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return

    # Bundled open-source fonts in app/assets/fonts/
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "fonts"))
    regular_path = os.path.join(base_dir, "NotoSans-Regular.ttf")
    bold_path = os.path.join(base_dir, "NotoSans-Bold.ttf")
    devanagari_path = os.path.join(base_dir, "NotoSansDevanagari-Regular.ttf")
    gujarati_path = os.path.join(base_dir, "NotoSansGujarati-Regular.ttf")

    # Fallback to system fonts if not in assets
    if not os.path.exists(regular_path):
        for candidate in ["/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "C:/Windows/Fonts/arial.ttf"]:
            if os.path.exists(candidate):
                regular_path = candidate
                break
    if not os.path.exists(bold_path):
        for candidate in ["/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
            if os.path.exists(candidate):
                bold_path = candidate
                break

    if os.path.exists(regular_path) and os.path.exists(bold_path):
        pdfmetrics.registerFont(TTFont("NotoSans", regular_path))
        pdfmetrics.registerFont(TTFont("NotoSans-Bold", bold_path))
        registerFontFamily(
            "NotoSans",
            normal="NotoSans",
            bold="NotoSans-Bold",
            italic="NotoSans",
            boldItalic="NotoSans-Bold"
        )

    if os.path.exists(devanagari_path):
        pdfmetrics.registerFont(TTFont("NotoSansDevanagari", devanagari_path))

    if os.path.exists(gujarati_path):
        pdfmetrics.registerFont(TTFont("NotoSansGujarati", gujarati_path))

    _FONTS_REGISTERED = True


def format_script_html(text: Optional[str]) -> str:
    """
    Safely escapes HTML and wraps Gujarati and Devanagari (Hindi) character runs
    in their respective font tags so they render without blank boxes.
    """
    if not text:
        return ""
    # XML entity escaping
    escaped = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    # Wrap Gujarati character runs (\u0A80-\u0AFF)
    def repl_guj(m):
        return f'<font name="NotoSansGujarati">{m.group(0)}</font>'
    escaped = re.sub(r'[\u0A80-\u0AFF]+(?:[\s\.,\-\/]+[\u0A80-\u0AFF]+)*', repl_guj, escaped)

    # Wrap Devanagari character runs (\u0900-\u097F)
    def repl_dev(m):
        return f'<font name="NotoSansDevanagari">{m.group(0)}</font>'
    escaped = re.sub(r'[\u0900-\u097F]+(?:[\s\.,\-\/]+[\u0900-\u097F]+)*', repl_dev, escaped)

    return escaped


# ----------------------------------------------------------------------
# 2. Number Formatting Helpers (Indian Numbering Format & Dates)
# ----------------------------------------------------------------------
MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

MONTH_SHORT = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

def format_indian_currency(val: float, include_symbol: bool = True) -> str:
    sign = "-" if val < 0 else ""
    abs_v = round(abs(val))
    s = str(abs_v)
    if len(s) <= 3:
        formatted = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted = ",".join(groups) + "," + last3
    prefix = "₹" if include_symbol else ""
    return f"{sign}{prefix}{formatted}"

def format_readable_date(d: date) -> str:
    return d.strftime("%d %b %Y")


# ----------------------------------------------------------------------
# 3. Custom Flowable: Vector Progress Bar
# ----------------------------------------------------------------------
class ProgressBar(Flowable):
    def __init__(self, pct: float, width: float = 75, height: float = 6, fill_hex: str = "#10B981", bg_hex: str = "#E2E8F0"):
        super().__init__()
        self.pct = max(0.0, min(100.0, pct))
        self.width = width
        self.height = height
        self.fill_color = colors.HexColor(fill_hex)
        self.bg_color = colors.HexColor(bg_hex)

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        self.canv.saveState()
        self.canv.setFillColor(self.bg_color)
        self.canv.roundRect(0, 0, self.width, self.height, 2, fill=1, stroke=0)
        fill_w = (self.pct / 100.0) * self.width
        if fill_w > 0:
            self.canv.setFillColor(self.fill_color)
            self.canv.roundRect(0, 0, max(fill_w, 2), self.height, 2, fill=1, stroke=0)
        self.canv.restoreState()


# ----------------------------------------------------------------------
# 4. Numbered Canvas (Two-pass Footer with Page Count and PDF Metadata)
# ----------------------------------------------------------------------
class FinTrackNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        font_name = "NotoSans" if _FONTS_REGISTERED else "Helvetica"
        self.setFont(font_name, 8.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.6)
        self.line(36, 26, self._pagesize[0] - 36, 26)

        # Footer left: FinTrack watermark & privacy notice
        self.drawString(36, 15, "Generated by FinTrack • Private & Confidential")

        # Footer right: Page X of Y
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(self._pagesize[0] - 36, 15, page_str)
        self.restoreState()


# ----------------------------------------------------------------------
# 5. Six-Month Cash Flow Mini Bar Chart Flowable
# ----------------------------------------------------------------------
def build_six_month_chart_drawing(trends: List[dict]) -> Drawing:
    """
    Renders a clean, compact 6-month vector Income vs Expenses bar chart.
    """
    drawing = Drawing(540, 76)
    # Background card
    drawing.add(Rect(0, 0, 540, 76, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=0.5, rx=6, ry=6))

    font_main = "NotoSans" if _FONTS_REGISTERED else "Helvetica"
    font_bold = "NotoSans-Bold" if _FONTS_REGISTERED else "Helvetica-Bold"

    # Title
    drawing.add(String(12, 60, "Six-Month Cash Flow Trend", fontName=font_bold, fontSize=8.5, fillColor=colors.HexColor("#0F172A")))

    # Legend
    drawing.add(Rect(390, 59, 8, 8, fillColor=colors.HexColor("#10B981"), strokeColor=None, rx=1, ry=1))
    drawing.add(String(402, 60, "Income", fontName=font_main, fontSize=8, fillColor=colors.HexColor("#475569")))
    drawing.add(Rect(455, 59, 8, 8, fillColor=colors.HexColor("#EF4444"), strokeColor=None, rx=1, ry=1))
    drawing.add(String(467, 60, "Expenses", fontName=font_main, fontSize=8, fillColor=colors.HexColor("#475569")))

    # Baseline
    base_y = 18
    drawing.add(Line(16, base_y, 524, base_y, strokeColor=colors.HexColor("#CBD5E1"), strokeWidth=0.6))

    if not trends:
        drawing.add(String(270, 36, "No monthly trend data available", fontName=font_main, fontSize=9, fillColor=colors.HexColor("#94A3B8"), textAnchor="middle"))
        return drawing

    max_val = max(max(t["income"], t["expenses"], 1000) for t in trends)
    max_bar_h = 34.0
    slot_w = 508.0 / max(1, len(trends))

    for idx, t in enumerate(trends):
        center_x = 16 + idx * slot_w + slot_w / 2.0
        bar_w = 11.0

        inc_h = max(2.0, (t["income"] / max_val) * max_bar_h) if t["income"] > 0 else 0.0
        exp_h = max(2.0, (t["expenses"] / max_val) * max_bar_h) if t["expenses"] > 0 else 0.0

        # Income bar (green)
        if inc_h > 0:
            drawing.add(Rect(center_x - bar_w - 1.5, base_y, bar_w, inc_h, fillColor=colors.HexColor("#10B981"), strokeColor=None, rx=2, ry=2))
        # Expense bar (red)
        if exp_h > 0:
            drawing.add(Rect(center_x + 1.5, base_y, bar_w, exp_h, fillColor=colors.HexColor("#EF4444"), strokeColor=None, rx=2, ry=2))

        # Month text
        drawing.add(String(center_x, 7, t["month_name"], fontName=font_main, fontSize=8, fillColor=colors.HexColor("#64748B"), textAnchor="middle"))

    return drawing


# ----------------------------------------------------------------------
# 6. Main Report Generator Service
# ----------------------------------------------------------------------
def generate_pdf_report(
    db: Session,
    user: User,
    period_type: str = "monthly",
    year: Optional[int] = None,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    half: Optional[int] = None,
) -> Tuple[bytes, str]:
    """
    Creates an exact, pixel-perfect 2-page PDF report matching FinTrack's
    budget warnings, unfinished period fair comparisons, and script fallbacks.
    """
    register_fintrack_fonts()
    font_main = "NotoSans" if _FONTS_REGISTERED else "Helvetica"
    font_bold = "NotoSans-Bold" if _FONTS_REGISTERED else "Helvetica-Bold"

    today_dt = date.today()
    cur_year = year or today_dt.year
    cur_month = month or today_dt.month
    cur_quarter = quarter or ((today_dt.month - 1) // 3 + 1)
    cur_half = half or (1 if today_dt.month <= 6 else 2)

    # -------------------------------------------------------------
    # 6.1 Date Ranges & Unfinished Period Detection (Part 1, Item 2)
    # -------------------------------------------------------------
    period_months: List[Tuple[int, int]] = []
    is_unfinished = False

    if period_type == "monthly":
        m = cur_month
        y = cur_year
        start_date = date(y, m, 1)
        full_last_day = calendar.monthrange(y, m)[1]
        full_end_date = date(y, m, full_last_day)
        period_months = [(y, m)]

        prev_m = m - 1 if m > 1 else 12
        prev_y = y if m > 1 else y - 1
        prev_start = date(prev_y, prev_m, 1)
        prev_last_day = calendar.monthrange(prev_y, prev_m)[1]

        if start_date <= today_dt < full_end_date:
            is_unfinished = True
            effective_end = today_dt
            period_subtitle = f"Month to date (1 to {today_dt.day} {MONTH_SHORT[m]} {y})"
            filename = f"FinTrack-Report-{MONTH_SHORT[m]}-{y}.pdf"
            prev_compare_day = min(today_dt.day, prev_last_day)
            prev_compare_end = date(prev_y, prev_m, prev_compare_day)
            comparison_label = f"vs 1 to {prev_compare_day} {MONTH_SHORT[prev_m]}"
            prev_period_name = f"1 to {prev_compare_day} {MONTH_SHORT[prev_m]}"
        else:
            effective_end = full_end_date
            period_subtitle = f"{MONTH_NAMES[m]} {y}"
            filename = f"FinTrack-Report-{MONTH_SHORT[m]}-{y}.pdf"
            prev_compare_end = date(prev_y, prev_m, prev_last_day)
            comparison_label = f"vs {MONTH_NAMES[prev_m]}"
            prev_period_name = MONTH_NAMES[prev_m]

    elif period_type == "quarterly":
        q = cur_quarter
        y = cur_year
        start_m = (q - 1) * 3 + 1
        end_m = start_m + 2
        start_date = date(y, start_m, 1)
        full_end_date = date(y, end_m, calendar.monthrange(y, end_m)[1])
        period_months = [(y, mm) for mm in range(start_m, end_m + 1)]

        prev_q = q - 1 if q > 1 else 4
        prev_y = y if q > 1 else y - 1
        prev_start_m = (prev_q - 1) * 3 + 1
        prev_start = date(prev_y, prev_start_m, 1)

        if start_date <= today_dt < full_end_date:
            is_unfinished = True
            effective_end = today_dt
            days_elapsed = (today_dt - start_date).days + 1
            period_subtitle = f"Quarter to date (1 {MONTH_SHORT[start_m]} to {today_dt.day} {MONTH_SHORT[today_dt.month]} {y})"
            filename = f"FinTrack-Report-Q{q}-{y}.pdf"
            prev_compare_end = prev_start + timedelta(days=days_elapsed - 1)
            comparison_label = f"vs 1 {MONTH_SHORT[prev_start_m]} to {prev_compare_end.day} {MONTH_SHORT[prev_compare_end.month]}"
            prev_period_name = f"prior quarter ({days_elapsed} days)"
        else:
            effective_end = full_end_date
            period_subtitle = f"Q{q} {y} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"
            filename = f"FinTrack-Report-Q{q}-{y}.pdf"
            prev_end_m = prev_start_m + 2
            prev_compare_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])
            comparison_label = f"vs Q{prev_q} {prev_y}"
            prev_period_name = f"Q{prev_q} {prev_y}"

    elif period_type == "half_year":
        h = cur_half
        y = cur_year
        start_m = 1 if h == 1 else 7
        end_m = 6 if h == 1 else 12
        start_date = date(y, start_m, 1)
        full_end_date = date(y, end_m, calendar.monthrange(y, end_m)[1])
        period_months = [(y, mm) for mm in range(start_m, end_m + 1)]

        prev_h = 2 if h == 1 else 1
        prev_y = y - 1 if h == 1 else y
        prev_start_m = 1 if prev_h == 1 else 7
        prev_start = date(prev_y, prev_start_m, 1)

        if start_date <= today_dt < full_end_date:
            is_unfinished = True
            effective_end = today_dt
            days_elapsed = (today_dt - start_date).days + 1
            period_subtitle = f"Half-year to date (1 {MONTH_SHORT[start_m]} to {today_dt.day} {MONTH_SHORT[today_dt.month]} {y})"
            filename = f"FinTrack-Report-H{h}-{y}.pdf"
            prev_compare_end = prev_start + timedelta(days=days_elapsed - 1)
            comparison_label = f"vs 1 {MONTH_SHORT[prev_start_m]} to {prev_compare_end.day} {MONTH_SHORT[prev_compare_end.month]}"
            prev_period_name = f"prior half ({days_elapsed} days)"
        else:
            effective_end = full_end_date
            period_subtitle = f"H{h} {y} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"
            filename = f"FinTrack-Report-H{h}-{y}.pdf"
            prev_end_m = 6 if prev_h == 1 else 12
            prev_compare_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])
            comparison_label = f"vs H{prev_h} {prev_y}"
            prev_period_name = f"H{prev_h} {prev_y}"

    else:  # 'yearly'
        y = cur_year
        start_date = date(y, 1, 1)
        full_end_date = date(y, 12, 31)
        period_months = [(y, mm) for mm in range(1, 13)]
        prev_y = y - 1
        prev_start = date(prev_y, 1, 1)

        if y == today_dt.year and today_dt < full_end_date:
            is_unfinished = True
            effective_end = today_dt
            period_subtitle = f"Year to date (1 Jan to {today_dt.day} {MONTH_SHORT[today_dt.month]} {y})"
            filename = f"FinTrack-Report-{y}.pdf"
            prev_compare_end = date(prev_y, today_dt.month, min(today_dt.day, calendar.monthrange(prev_y, today_dt.month)[1]))
            comparison_label = f"vs 1 Jan to {prev_compare_end.day} {MONTH_SHORT[prev_compare_end.month]} {prev_y}"
            prev_period_name = f"same period {prev_y}"
        else:
            effective_end = full_end_date
            period_subtitle = f"Year {y}"
            filename = f"FinTrack-Report-{y}.pdf"
            prev_compare_end = date(prev_y, 12, 31)
            comparison_label = f"vs {prev_y}"
            prev_period_name = f"Year {prev_y}"

    # -------------------------------------------------------------
    # 6.2 Financial Totals Query (Current vs Apples-to-Apples Previous)
    # -------------------------------------------------------------
    def get_totals(s_date: date, e_date: date) -> Tuple[float, float]:
        rows = (
            db.query(
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total")
            )
            .filter(
                Transaction.user_id == user.id,
                Transaction.transaction_date >= s_date,
                Transaction.transaction_date <= e_date
            )
            .group_by(Transaction.type)
            .all()
        )
        inc, exp = 0.0, 0.0
        for r in rows:
            if r.type == "income":
                inc = float(r.total)
            elif r.type == "expense":
                exp = float(r.total)
        return inc, exp

    total_income, total_expenses = get_totals(start_date, effective_end)
    prev_income, prev_expenses = get_totals(prev_start, prev_compare_end)

    net_savings = total_income - total_expenses
    prev_savings = prev_income - prev_expenses

    # Single identical savings rate formatting everywhere (Part 1, Item 3)
    savings_rate_pct = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0
    prev_sr_pct = round((prev_savings / prev_income * 100), 1) if prev_income > 0 else 0.0
    sr_formatted_str = f"{savings_rate_pct:.1f}%"

    # -------------------------------------------------------------
    # 6.3 Financial Health Score (Part 1, Item 4)
    # -------------------------------------------------------------
    health_score_data = calculate_financial_health_score(
        db=db,
        user_id=user.id,
        period_type=period_type,
        year=cur_year,
        month=cur_month,
        start_date=start_date,
        end_date=effective_end,
        period_months=period_months,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate_pct=savings_rate_pct,
    )

    # Check how many months of data the user has
    distinct_months_query = (
        db.query(
            extract("year", Transaction.transaction_date),
            extract("month", Transaction.transaction_date)
        )
        .filter(Transaction.user_id == user.id)
        .distinct()
        .all()
    )
    user_months_count = len(distinct_months_query)
    is_early_estimate = user_months_count < 2

    # Status word with (early estimate) when < 2 months of data
    base_status_word = health_score_data.status_label
    if is_early_estimate and health_score_data.score is not None:
        status_word = f"{base_status_word} (early estimate)"
    else:
        status_word = base_status_word

    data_basis_line = f"Based on {user_months_count} {'month' if user_months_count == 1 else 'months'} of data."

    # -------------------------------------------------------------
    # 6.4 Trailing 6 Months Trends for Mini Bar Chart (Part 3, Item 11)
    # -------------------------------------------------------------
    trend_months_list = []
    tm_m, tm_y = cur_month, cur_year
    for _ in range(6):
        trend_months_list.append((tm_y, tm_m))
        tm_m -= 1
        if tm_m < 1:
            tm_m = 12
            tm_y -= 1
    trend_months_list = list(reversed(trend_months_list))

    six_month_trends = []
    for ty, tm in trend_months_list:
        m_start = date(ty, tm, 1)
        m_end = date(ty, tm, calendar.monthrange(ty, tm)[1])
        if m_start <= today_dt < m_end and tm == today_dt.month and ty == today_dt.year:
            m_end = today_dt
        m_inc, m_exp = get_totals(m_start, m_end)
        six_month_trends.append({
            "month": tm,
            "month_name": MONTH_SHORT[tm],
            "year": ty,
            "income": m_inc,
            "expenses": m_exp,
        })

    # -------------------------------------------------------------
    # 6.5 Where the Money Went (Expenses by Category)
    # -------------------------------------------------------------
    cat_expense_rows = (
        db.query(
            func.coalesce(Category.name, "Uncategorized").label("name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
            func.count(Transaction.id).label("cnt")
        )
        .select_from(Transaction)
        .outerjoin(Category, (Transaction.category_id == Category.id))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= effective_end
        )
        .group_by(Category.name)
        .order_by(desc(func.sum(Transaction.amount)))
        .all()
    )

    expense_categories = []
    top_cat_name = None
    top_cat_amt = 0.0
    top_cat_pct = 0.0

    for i, r in enumerate(cat_expense_rows):
        amt = float(r.amount)
        pct = (amt / total_expenses * 100) if total_expenses > 0 else 0.0
        if i == 0:
            top_cat_name = r.name
            top_cat_amt = amt
            top_cat_pct = pct
        expense_categories.append({
            "name": r.name or "General",
            "amount": amt,
            "percentage": pct,
            "count": int(r.cnt)
        })

    # -------------------------------------------------------------
    # 6.6 Income Sources
    # -------------------------------------------------------------
    cat_income_rows = (
        db.query(
            func.coalesce(Category.name, "Other Income").label("name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
            func.count(Transaction.id).label("cnt")
        )
        .select_from(Transaction)
        .outerjoin(Category, (Transaction.category_id == Category.id))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == "income",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= effective_end
        )
        .group_by(Category.name)
        .order_by(desc(func.sum(Transaction.amount)))
        .all()
    )

    income_sources = []
    for r in cat_income_rows:
        amt = float(r.amount)
        pct = (amt / total_income * 100) if total_income > 0 else 0.0
        income_sources.append({
            "name": r.name or "General",
            "amount": amt,
            "percentage": pct,
            "count": int(r.cnt)
        })

    # -------------------------------------------------------------
    # 6.7 Budgets Performance (Part 1, Item 1 & Part 2, Item 8)
    # -------------------------------------------------------------
    month_numbers = [m for _, m in period_months]
    budget_records = (
        db.query(Budget, Category.name.label("category_name"))
        .join(Category, Category.id == Budget.category_id)
        .filter(
            Budget.user_id == user.id,
            Budget.year == cur_year,
            Budget.month.in_(month_numbers)
        )
        .all()
    )

    budgets_summary = None
    if budget_records:
        cat_budgets: dict[str, dict] = {}
        for b, c_name in budget_records:
            if c_name not in cat_budgets:
                cat_budgets[c_name] = {
                    "category_name": c_name,
                    "limit_amount": 0.0,
                    "category_id": b.category_id
                }
            cat_budgets[c_name]["limit_amount"] += float(b.limit_amount)

        budget_list = []
        kept_count = 0
        near_limit_count = 0
        over_count = 0

        for c_name, b_data in cat_budgets.items():
            spent = (
                db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
                .filter(
                    Transaction.user_id == user.id,
                    Transaction.type == "expense",
                    Transaction.category_id == b_data["category_id"],
                    Transaction.transaction_date >= start_date,
                    Transaction.transaction_date <= effective_end
                )
                .scalar()
            )
            spent_amt = float(spent)
            limit_amt = b_data["limit_amount"]
            pct_used = (spent_amt / limit_amt * 100) if limit_amt > 0 else 0.0
            remaining_amt = limit_amt - spent_amt

            # Shared budget status logic from budgets.py
            status_key, status_label, status_color = get_budget_status_info(spent_amt, limit_amt)

            if status_key == "exceeded":
                over_count += 1
            else:
                kept_count += 1
                if status_key == "warning":
                    near_limit_count += 1

            budget_list.append({
                "category": c_name,
                "spent": spent_amt,
                "limit": limit_amt,
                "remaining": remaining_amt,
                "percentage_used": pct_used,
                "status_key": status_key,
                "status_label": status_label,
                "status_color": status_color
            })

        budget_list.sort(key=lambda x: x["percentage_used"], reverse=True)
        budgets_summary = {
            "total_count": len(budget_list),
            "kept_count": kept_count,
            "near_limit_count": near_limit_count,
            "over_count": over_count,
            "budgets": budget_list
        }

    # -------------------------------------------------------------
    # 6.8 Active Goals (Part 2, Item 8)
    # -------------------------------------------------------------
    active_goals_records = (
        db.query(Goal)
        .filter(Goal.user_id == user.id, Goal.status == "active")
        .order_by(Goal.created_at.desc())
        .all()
    )

    goals_summary = None
    if active_goals_records:
        goal_items = []
        total_goal_contributions_period = 0.0

        for g in active_goals_records:
            saved_total = (
                db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0))
                .filter(GoalContribution.goal_id == g.id)
                .scalar()
            )
            saved_amt = float(saved_total)
            target_amt = float(g.target_amount)
            pct = min(100.0, (saved_amt / target_amt * 100)) if target_amt > 0 else 0.0

            added_period = (
                db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0))
                .filter(
                    GoalContribution.goal_id == g.id,
                    GoalContribution.contributed_at >= start_date,
                    GoalContribution.contributed_at <= effective_end
                )
                .scalar()
            )
            added_period_amt = float(added_period)
            total_goal_contributions_period += added_period_amt

            # On track vs Behind calculation
            if saved_amt >= target_amt:
                goal_status_label = "Completed"
                goal_status_color = "#10B981"
            elif g.deadline:
                if g.deadline < today_dt:
                    goal_status_label = "Behind"
                    goal_status_color = "#EF4444"
                else:
                    g_start = g.created_at.date() if g.created_at else start_date
                    total_days = max(1, (g.deadline - g_start).days)
                    days_gone = max(0, (today_dt - g_start).days)
                    expected_pct = min(100.0, (days_gone / total_days * 100))
                    if pct >= (expected_pct - 5.0):
                        goal_status_label = "On track"
                        goal_status_color = "#10B981"
                    else:
                        goal_status_label = "Behind"
                        goal_status_color = "#F59E0B"
            else:
                goal_status_label = "On track"
                goal_status_color = "#10B981"

            deadline_str = format_readable_date(g.deadline) if g.deadline else "No deadline"

            goal_items.append({
                "title": g.title,
                "target": target_amt,
                "saved": saved_amt,
                "percentage": pct,
                "added_period": added_period_amt,
                "deadline": deadline_str,
                "status_label": goal_status_label,
                "status_color": goal_status_color
            })

        goals_summary = {
            "goals": goal_items,
            "total_added_period": total_goal_contributions_period
        }

    # -------------------------------------------------------------
    # 6.9 Top 5 Single Expenses (Part 2, Item 6)
    # -------------------------------------------------------------
    top_single_rows = (
        db.query(
            Transaction.description,
            Category.name.label("category_name"),
            Transaction.payment_method,
            Transaction.amount,
            Transaction.transaction_date
        )
        .join(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= effective_end
        )
        .order_by(desc(Transaction.amount))
        .limit(5)
        .all()
    )

    top_expenses = [
        {
            "description": r.description.strip() if r.description and r.description.strip() else "-",
            "category": r.category_name or "General",
            "payment_method": r.payment_method.strip() if r.payment_method and r.payment_method.strip() else "-",
            "date": format_readable_date(r.transaction_date),
            "amount": float(r.amount)
        }
        for r in top_single_rows
    ]

    # -------------------------------------------------------------
    # 6.10 Deterministic Written Summary (3 to 5 Plain Sentences, No AI)
    # -------------------------------------------------------------
    summary_sentences = []

    # Sentence 1: Savings (Always matching the single identical savings rate)
    if total_income > 0:
        if net_savings >= 0:
            summary_sentences.append(
                f"You saved {sr_formatted_str} of your income, with a net savings of {format_indian_currency(net_savings)}."
            )
        else:
            summary_sentences.append(
                f"Spending exceeded your income by {format_indian_currency(abs(net_savings))} this period."
            )
    else:
        summary_sentences.append(
            f"Total expenses for this period came to {format_indian_currency(total_expenses)}."
        )

    # Sentence 2: Top Expense
    if top_cat_name and top_cat_amt > 0:
        summary_sentences.append(
            f"{top_cat_name} was your biggest expense at {format_indian_currency(top_cat_amt)} ({top_cat_pct:.1f}% of total spending)."
        )

    # Sentence 3: Health Score
    if health_score_data.score is not None:
        summary_sentences.append(
            f"Your Financial Health Score is {health_score_data.score}/100 ({status_word})."
        )
    else:
        summary_sentences.append(
            "Your Financial Health Score will unlock after recording at least 10 entries across 2 weeks."
        )

    # Sentence 4: Budgets (Part 1, Item 1)
    if budgets_summary and budgets_summary["total_count"] > 0:
        tot_b = budgets_summary["total_count"]
        kept_b = budgets_summary["kept_count"]
        near_b = budgets_summary["near_limit_count"]
        over_b = budgets_summary["over_count"]

        if over_b == 0:
            if near_b > 0:
                summary_sentences.append(f"You stayed within {kept_b} of {tot_b} budgets, {near_b} of them close to the limit.")
            else:
                summary_sentences.append(f"You stayed within all {tot_b} of your budgets.")
        else:
            if near_b > 0:
                summary_sentences.append(f"You stayed within {kept_b} of {tot_b} budgets ({over_b} over limit, {near_b} close to limit).")
            else:
                summary_sentences.append(f"You stayed within {kept_b} of {tot_b} budgets ({over_b} over limit).")

    # Sentence 5: Goals
    if goals_summary and len(goals_summary["goals"]) > 0:
        num_goals = len(goals_summary["goals"])
        g_contrib = goals_summary["total_added_period"]
        if g_contrib > 0:
            summary_sentences.append(
                f"You contributed {format_indian_currency(g_contrib)} toward your active goals."
            )
        else:
            summary_sentences.append(
                f"You have {num_goals} active savings {'goal' if num_goals == 1 else 'goals'} in progress."
            )

    summary_text = " ".join(summary_sentences[:5])

    # -------------------------------------------------------------
    # 6.11 Build PDF Document (Part 3, Items 9 & 10, Part 4, Item 14)
    # -------------------------------------------------------------
    buffer = io.BytesIO()
    doc_title = f"FinTrack Financial Report, {period_subtitle}"
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=28,
        bottomMargin=32,
        title=doc_title,
        author="FinTrack",
        subject=period_subtitle,
    )

    styles = getSampleStyleSheet()

    # Typography Styles
    style_main_title = ParagraphStyle(
        "FTMainTitle",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#10B981")
    )
    style_period_line = ParagraphStyle(
        "FTPeriodLine",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0F172A")
    )
    style_meta_right = ParagraphStyle(
        "FTMetaRight",
        parent=styles["Normal"],
        fontName=font_main,
        fontSize=9,
        leading=13,
        alignment=2,  # Right aligned
        textColor=colors.HexColor("#475569")
    )
    style_section_title = ParagraphStyle(
        "FTSectionTitle",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True  # Never leave heading alone at bottom
    )
    style_summary_text = ParagraphStyle(
        "FTSummaryText",
        parent=styles["Normal"],
        fontName=font_main,
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#1E293B")
    )
    style_kpi_th = ParagraphStyle(
        "FTKpiTh",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748B")
    )
    style_kpi_val = ParagraphStyle(
        "FTKpiVal",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A")
    )
    style_kpi_sub = ParagraphStyle(
        "FTKpiSub",
        parent=styles["Normal"],
        fontName=font_main,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#475569")
    )
    style_th = ParagraphStyle(
        "FTTh",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569")
    )
    style_td = ParagraphStyle(
        "FTTd",
        parent=styles["Normal"],
        fontName=font_main,
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B")
    )
    style_td_bold = ParagraphStyle(
        "FTTdBold",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0F172A")
    )
    style_td_muted = ParagraphStyle(
        "FTTdMuted",
        parent=styles["Normal"],
        fontName=font_main,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748B")
    )

    story = []

    # 1. Header (Part 2, Item 5 & Part 3, Item 10)
    user_display_name = user.name or "FinTrack User"
    generated_date_str = format_readable_date(today_dt)

    header_left = [
        Paragraph("FinTrack Financial Report", style_main_title),
        Paragraph(period_subtitle, style_period_line),
    ]
    header_right = [
        Paragraph(f"<b>Prepared for:</b> {format_script_html(user_display_name)}", style_meta_right),
        Paragraph(f"<b>Date generated:</b> {generated_date_str}", style_meta_right),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[330, 210])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.75, colors.HexColor("#E2E8F0")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # 2. Executive Written Summary Callout Box
    summary_box = Table(
        [[Paragraph(f"<b>Executive Summary:</b> {format_script_html(summary_text)}", style_summary_text)]],
        colWidths=[540]
    )
    summary_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("LINELEFT", (0, 0), (0, -1), 3.5, colors.HexColor("#10B981")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_box)
    story.append(Spacer(1, 7))

    # 3. Comparison Cards (Part 1, Item 3 & Part 2, Item 7)
    # Income Subtitle
    if prev_income == 0:
        inc_sub_html = f"vs {prev_period_name}: ₹0, New"
    else:
        inc_diff = total_income - prev_income
        inc_pct = abs((inc_diff / prev_income) * 100.0)
        if inc_diff > 0:
            inc_sub_html = f'<font color="#10B981"><b>▲ up {inc_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_income)}'
        elif inc_diff < 0:
            inc_sub_html = f'<font color="#EF4444"><b>▼ down {inc_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_income)}'
        else:
            inc_sub_html = f'<font color="#64748B"><b>0.0% (no change)</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_income)}'

    # Expenses Subtitle (Expenses DOWN is GOOD/GREEN, Expenses UP is BAD/RED)
    if prev_expenses == 0:
        exp_sub_html = f"vs {prev_period_name}: ₹0, New"
    else:
        exp_diff = total_expenses - prev_expenses
        exp_pct = abs((exp_diff / prev_expenses) * 100.0)
        if exp_diff > 0:
            exp_sub_html = f'<font color="#EF4444"><b>▲ up {exp_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_expenses)}'
        elif exp_diff < 0:
            exp_sub_html = f'<font color="#10B981"><b>▼ down {exp_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_expenses)}'
        else:
            exp_sub_html = f'<font color="#64748B"><b>0.0% (no change)</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_expenses)}'

    # Savings Subtitle
    if prev_income == 0 and prev_expenses == 0:
        sav_sub_html = f"vs {prev_period_name}: ₹0, New"
    else:
        sav_diff = net_savings - prev_savings
        if prev_savings != 0:
            sav_pct = abs((sav_diff / abs(prev_savings)) * 100.0)
            if sav_diff > 0:
                sav_sub_html = f'<font color="#10B981"><b>▲ up {sav_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'
            elif sav_diff < 0:
                sav_sub_html = f'<font color="#EF4444"><b>▼ down {sav_pct:.1f}%</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'
            else:
                sav_sub_html = f'<font color="#64748B"><b>0.0% (no change)</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'
        else:
            if sav_diff > 0:
                sav_sub_html = f'<font color="#10B981"><b>▲ up</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'
            elif sav_diff < 0:
                sav_sub_html = f'<font color="#EF4444"><b>▼ down</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'
            else:
                sav_sub_html = f'<font color="#64748B"><b>0.0% (no change)</b></font><br/>vs {prev_period_name}: {format_indian_currency(prev_savings)}'

    # Savings Rate Subtitle
    if prev_income > 0:
        sr_diff = savings_rate_pct - prev_sr_pct
        if sr_diff > 0:
            sr_sub_html = f'<font color="#10B981"><b>▲ +{abs(sr_diff):.1f}% pts</b></font><br/>vs {prev_period_name} ({prev_sr_pct:.1f}%)'
        elif sr_diff < 0:
            sr_sub_html = f'<font color="#EF4444"><b>▼ -{abs(sr_diff):.1f}% pts</b></font><br/>vs {prev_period_name} ({prev_sr_pct:.1f}%)'
        else:
            sr_sub_html = f'<font color="#64748B"><b>0.0% pts (no change)</b></font><br/>vs {prev_period_name} ({prev_sr_pct:.1f}%)'
    else:
        sr_sub_html = f"vs {prev_period_name}: New"

    kpi_col_w = 135
    kpi_card_data = [
        [
            Paragraph("TOTAL INCOME", style_kpi_th),
            Paragraph("TOTAL EXPENSES", style_kpi_th),
            Paragraph("NET SAVINGS", style_kpi_th),
            Paragraph("SAVINGS RATE", style_kpi_th),
        ],
        [
            Paragraph(format_indian_currency(total_income), style_kpi_val),
            Paragraph(format_indian_currency(total_expenses), style_kpi_val),
            Paragraph(format_indian_currency(net_savings), style_kpi_val),
            Paragraph(sr_formatted_str, style_kpi_val),
        ],
        [
            Paragraph(inc_sub_html, style_kpi_sub),
            Paragraph(exp_sub_html, style_kpi_sub),
            Paragraph(sav_sub_html, style_kpi_sub),
            Paragraph(sr_sub_html, style_kpi_sub),
        ]
    ]

    kpi_table = Table(kpi_card_data, colWidths=[kpi_col_w, kpi_col_w, kpi_col_w, kpi_col_w])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 6))

    # 4. Six-Month Mini Bar Chart (Part 3, Item 11)
    chart_drawing = build_six_month_chart_drawing(six_month_trends)
    story.append(chart_drawing)
    story.append(Spacer(1, 7))

    # 5. Financial Health Score Section (Part 1, Item 4)
    score_display = f"{health_score_data.score}/100" if health_score_data.score is not None else "-- / 100"

    score_left = [
        Paragraph("Financial Health Score", style_section_title),
        Paragraph(f'<font size="14" color="#10B981"><b>{score_display}</b></font> • <b>{status_word}</b>', style_period_line),
        Spacer(1, 2),
    ]
    if health_score_data.factors_calculated_count < 4 and health_score_data.score is not None:
        score_left.append(Paragraph(f"Based on {health_score_data.factors_calculated_count} of 4 factors (scaled to 100).", style_td_muted))
    score_left.append(Paragraph(data_basis_line, style_td_muted))

    factor_rows = []
    if health_score_data.factors:
        for f in health_score_data.factors:
            if f.is_calculated:
                pts_str = f"<b>{f.earned_points:.0f}</b> / {f.max_points:.0f} pts"
            else:
                pts_str = f"<font color='#94A3B8'>Not calculated ({f.not_calculated_reason or 'No data'})</font>"
            factor_rows.append([
                Paragraph(f.name, style_td),
                Paragraph(pts_str, style_td)
            ])
    else:
        factor_rows = [
            [Paragraph("Savings Rate (35 max)", style_td), Paragraph("Pending data", style_td_muted)],
            [Paragraph("Budget Adherence (30 max)", style_td), Paragraph("Pending data", style_td_muted)],
            [Paragraph("Expense Stability (20 max)", style_td), Paragraph("Pending data", style_td_muted)],
            [Paragraph("Essential vs Non-essential (15 max)", style_td), Paragraph("Pending data", style_td_muted)],
        ]

    factors_subtable = Table(factor_rows, colWidths=[175, 145])
    factors_subtable.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))

    health_card_table = Table([[score_left, factors_subtable]], colWidths=[210, 330])
    health_card_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(health_card_table)
    story.append(Spacer(1, 6))

    # 6. Where the Money Went (Top Expense Categories)
    story.append(Paragraph("Where the Money Went (Expense Allocations)", style_section_title))

    cat_table_data = [
        [
            Paragraph("Category", style_th),
            Paragraph("Amount", style_th),
            Paragraph("Share", style_th),
            Paragraph("Distribution", style_th),
        ]
    ]

    if expense_categories:
        if len(expense_categories) <= 6:
            display_cats = expense_categories
            other_cat_amt = 0.0
            other_cat_pct = 0.0
        else:
            display_cats = expense_categories[:5]
            other_cat_amt = sum(c["amount"] for c in expense_categories[5:])
            other_cat_pct = sum(c["percentage"] for c in expense_categories[5:])

        for cat in display_cats:
            cat_table_data.append([
                Paragraph(format_script_html(cat["name"]), style_td_bold),
                Paragraph(format_indian_currency(cat["amount"]), style_td),
                Paragraph(f"{cat['percentage']:.1f}%", style_td),
                ProgressBar(cat["percentage"], width=130, height=5.5, fill_hex="#10B981", bg_hex="#E2E8F0"),
            ])

        if other_cat_amt > 0:
            cat_table_data.append([
                Paragraph("Other Categories", style_td_bold),
                Paragraph(format_indian_currency(other_cat_amt), style_td),
                Paragraph(f"{other_cat_pct:.1f}%", style_td),
                ProgressBar(min(100.0, other_cat_pct), width=130, height=5.5, fill_hex="#94A3B8", bg_hex="#E2E8F0"),
            ])

        # Bottom Total Row so numbers mathematically add up to total_expenses and 100%
        cat_table_data.append([
            Paragraph("<b>Total Expenses</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(total_expenses)}</b>", style_td_bold),
            Paragraph("<b>100.0%</b>", style_td_bold),
            ProgressBar(100.0, width=130, height=5.5, fill_hex="#10B981", bg_hex="#E2E8F0"),
        ])
    else:
        cat_table_data.append([
            Paragraph("No expense entries in this period", style_td_muted),
            Paragraph("₹0", style_td),
            Paragraph("0.0%", style_td),
            ProgressBar(0, width=130, height=5.5),
        ])

    cat_table = Table(cat_table_data, colWidths=[160, 110, 70, 200])
    cat_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(cat_table)
    story.append(Spacer(1, 6))

    # 7. Income Sources Table (Flows naturally without awkward page gap!)
    story.append(Paragraph("Income Sources", style_section_title))
    inc_table_data = [
        [
            Paragraph("Source / Category", style_th),
            Paragraph("Amount", style_th),
            Paragraph("Share of Income", style_th),
        ]
    ]
    if income_sources:
        if len(income_sources) <= 6:
            display_inc = income_sources
            other_inc_amt = 0.0
            other_inc_pct = 0.0
        else:
            display_inc = income_sources[:5]
            other_inc_amt = sum(c["amount"] for c in income_sources[5:])
            other_inc_pct = sum(c["percentage"] for c in income_sources[5:])

        for inc in display_inc:
            inc_table_data.append([
                Paragraph(format_script_html(inc["name"]), style_td_bold),
                Paragraph(format_indian_currency(inc["amount"]), style_td),
                Paragraph(f"{inc['percentage']:.1f}%", style_td),
            ])

        if other_inc_amt > 0:
            inc_table_data.append([
                Paragraph("Other Income Sources", style_td_bold),
                Paragraph(format_indian_currency(other_inc_amt), style_td),
                Paragraph(f"{other_inc_pct:.1f}%", style_td),
            ])

        # Bottom Total Row so numbers mathematically add up to total_income and 100%
        inc_table_data.append([
            Paragraph("<b>Total Income</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(total_income)}</b>", style_td_bold),
            Paragraph("<b>100.0%</b>", style_td_bold),
        ])
    else:
        inc_table_data.append([
            Paragraph("No income entries recorded for this period", style_td_muted),
            Paragraph("₹0", style_td),
            Paragraph("0.0%", style_td),
        ])

    inc_table = Table(inc_table_data, colWidths=[240, 150, 150])
    inc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(inc_table)
    story.append(Spacer(1, 6))

    # 8. Budgets Performance (Part 1, Item 1 & Part 2, Item 8 - Omitted if no budgets)
    if budgets_summary and budgets_summary["total_count"] > 0:
        budget_block = []
        budget_block.append(Paragraph("Budgets Performance", style_section_title))

        tot_b = budgets_summary["total_count"]
        kept_b = budgets_summary["kept_count"]
        near_b = budgets_summary["near_limit_count"]
        if near_b > 0:
            budget_sub = f"Stayed within {kept_b} of {tot_b} budgets, {near_b} of them close to the limit."
        else:
            budget_sub = f"Stayed within {kept_b} of {tot_b} budgets."
        budget_block.append(Paragraph(budget_sub, style_td_muted))
        budget_block.append(Spacer(1, 3))

        bud_table_data = [
            [
                Paragraph("Category", style_th),
                Paragraph("Limit", style_th),
                Paragraph("Spent", style_th),
                Paragraph("Remaining", style_th),
                Paragraph("Progress", style_th),
                Paragraph("Status", style_th),
            ]
        ]

        if len(budgets_summary["budgets"]) <= 8:
            display_budgets = budgets_summary["budgets"]
            other_b_limit = 0.0
            other_b_spent = 0.0
            other_b_count = 0
        else:
            display_budgets = budgets_summary["budgets"][:7]
            other_b_limit = sum(b["limit"] for b in budgets_summary["budgets"][7:])
            other_b_spent = sum(b["spent"] for b in budgets_summary["budgets"][7:])
            other_b_count = len(budgets_summary["budgets"]) - 7

        for b in display_budgets:
            status_html = f'<font color="{b["status_color"]}"><b>{b["status_label"]}</b></font>'
            rem_str = format_indian_currency(b["remaining"])

            progress_flow = Table([
                [
                    ProgressBar(min(100.0, b["percentage_used"]), width=55, height=5.5, fill_hex=b["status_color"]),
                    Paragraph(f"{b['percentage_used']:.0f}%", style_td_muted)
                ]
            ], colWidths=[60, 30])
            progress_flow.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))

            bud_table_data.append([
                Paragraph(format_script_html(b["category"]), style_td_bold),
                Paragraph(format_indian_currency(b["limit"]), style_td),
                Paragraph(format_indian_currency(b["spent"]), style_td),
                Paragraph(rem_str, style_td),
                progress_flow,
                Paragraph(status_html, style_td),
            ])

        if other_b_count > 0:
            other_rem = other_b_limit - other_b_spent
            other_pct = (other_b_spent / other_b_limit * 100) if other_b_limit > 0 else 0.0
            _, other_lbl, other_col = get_budget_status_info(other_b_spent, other_b_limit)
            other_prog = Table([
                [
                    ProgressBar(min(100.0, other_pct), width=55, height=5.5, fill_hex=other_col),
                    Paragraph(f"{other_pct:.0f}%", style_td_muted)
                ]
            ], colWidths=[60, 30])
            other_prog.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            bud_table_data.append([
                Paragraph(f"Other Budgets ({other_b_count})", style_td_bold),
                Paragraph(format_indian_currency(other_b_limit), style_td),
                Paragraph(format_indian_currency(other_b_spent), style_td),
                Paragraph(format_indian_currency(other_rem), style_td),
                other_prog,
                Paragraph(f'<font color="{other_col}"><b>{other_lbl}</b></font>', style_td),
            ])

        # Bottom Total Budgets Row
        tot_limit = sum(b["limit"] for b in budgets_summary["budgets"])
        tot_spent = sum(b["spent"] for b in budgets_summary["budgets"])
        tot_rem = tot_limit - tot_spent
        tot_pct = (tot_spent / tot_limit * 100) if tot_limit > 0 else 0.0
        _, tot_lbl, tot_col = get_budget_status_info(tot_spent, tot_limit)
        tot_prog = Table([
            [
                ProgressBar(min(100.0, tot_pct), width=55, height=5.5, fill_hex=tot_col),
                Paragraph(f"<b>{tot_pct:.0f}%</b>", style_td)
            ]
        ], colWidths=[60, 30])
        tot_prog.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        bud_table_data.append([
            Paragraph("<b>Total Budgets</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(tot_limit)}</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(tot_spent)}</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(tot_rem)}</b>", style_td_bold),
            tot_prog,
            Paragraph(f'<font color="{tot_col}"><b>{tot_lbl}</b></font>', style_td_bold),
        ])

        bud_table = Table(bud_table_data, colWidths=[120, 80, 80, 80, 95, 85])
        bud_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        budget_block.append(bud_table)
        story.append(KeepTogether(budget_block))
        story.append(Spacer(1, 6))

    # 9. Active Savings Goals (Part 2, Item 8 - Omitted if no goals)
    if goals_summary and len(goals_summary["goals"]) > 0:
        goals_block = []
        goals_block.append(Paragraph("Active Savings Goals", style_section_title))

        goals_table_data = [
            [
                Paragraph("Goal Name", style_th),
                Paragraph("Target", style_th),
                Paragraph("Saved", style_th),
                Paragraph("Progress", style_th),
                Paragraph("Deadline", style_th),
                Paragraph("Added", style_th),
                Paragraph("Status", style_th),
            ]
        ]

        if len(goals_summary["goals"]) <= 6:
            display_goals = goals_summary["goals"]
            other_g_target = 0.0
            other_g_saved = 0.0
            other_g_added = 0.0
            other_g_count = 0
        else:
            display_goals = goals_summary["goals"][:5]
            other_g_target = sum(g["target"] for g in goals_summary["goals"][5:])
            other_g_saved = sum(g["saved"] for g in goals_summary["goals"][5:])
            other_g_added = sum(g["added_period"] for g in goals_summary["goals"][5:])
            other_g_count = len(goals_summary["goals"]) - 5

        for g in display_goals:
            status_html = f'<font color="{g["status_color"]}"><b>{g["status_label"]}</b></font>'
            goal_prog = Table([
                [
                    ProgressBar(min(100.0, g["percentage"]), width=55, height=5.5, fill_hex=g["status_color"]),
                    Paragraph(f"{g['percentage']:.0f}%", style_td_muted)
                ]
            ], colWidths=[60, 30])
            goal_prog.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))

            goals_table_data.append([
                Paragraph(format_script_html(g["title"]), style_td_bold),
                Paragraph(format_indian_currency(g["target"]), style_td),
                Paragraph(format_indian_currency(g["saved"]), style_td),
                goal_prog,
                Paragraph(g["deadline"], style_td_muted),
                Paragraph(format_indian_currency(g["added_period"]), style_td),
                Paragraph(status_html, style_td),
            ])

        if other_g_count > 0:
            other_g_pct = (other_g_saved / other_g_target * 100) if other_g_target > 0 else 0.0
            other_g_prog = Table([
                [
                    ProgressBar(min(100.0, other_g_pct), width=55, height=5.5, fill_hex="#10B981"),
                    Paragraph(f"{other_g_pct:.0f}%", style_td_muted)
                ]
            ], colWidths=[60, 30])
            other_g_prog.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]))
            goals_table_data.append([
                Paragraph(f"Other Goals ({other_g_count})", style_td_bold),
                Paragraph(format_indian_currency(other_g_target), style_td),
                Paragraph(format_indian_currency(other_g_saved), style_td),
                other_g_prog,
                Paragraph("-", style_td_muted),
                Paragraph(format_indian_currency(other_g_added), style_td),
                Paragraph("In progress", style_td),
            ])

        # Bottom Total Goals Row
        tot_target = sum(g["target"] for g in goals_summary["goals"])
        tot_saved = sum(g["saved"] for g in goals_summary["goals"])
        tot_pct = (tot_saved / tot_target * 100) if tot_target > 0 else 0.0
        tot_added = goals_summary["total_added_period"]
        tot_g_prog = Table([
            [
                ProgressBar(min(100.0, tot_pct), width=55, height=5.5, fill_hex="#10B981"),
                Paragraph(f"<b>{tot_pct:.0f}%</b>", style_td)
            ]
        ], colWidths=[60, 30])
        tot_g_prog.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        goals_table_data.append([
            Paragraph("<b>Total Goals</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(tot_target)}</b>", style_td_bold),
            Paragraph(f"<b>{format_indian_currency(tot_saved)}</b>", style_td_bold),
            tot_g_prog,
            Paragraph("-", style_td_muted),
            Paragraph(f"<b>{format_indian_currency(tot_added)}</b>", style_td_bold),
            Paragraph(f"<b>{len(goals_summary['goals'])} Active</b>", style_td_bold),
        ])

        goals_table = Table(goals_table_data, colWidths=[120, 75, 75, 95, 75, 55, 45])
        goals_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        goals_block.append(goals_table)
        story.append(KeepTogether(goals_block))
        story.append(Spacer(1, 6))

    # 10. Top 5 Single Expenses in Period (Part 2, Item 6)
    expenses_block = []
    expenses_block.append(Paragraph("Top Single Expenses", style_section_title))
    top_exp_table_data = [
        [
            Paragraph("Description", style_th),
            Paragraph("Category", style_th),
            Paragraph("Method", style_th),
            Paragraph("Date", style_th),
            Paragraph("Amount", style_th),
        ]
    ]
    if top_expenses:
        for te in top_expenses:
            top_exp_table_data.append([
                Paragraph(format_script_html(te["description"]), style_td_bold),
                Paragraph(format_script_html(te["category"]), style_td),
                Paragraph(te["payment_method"], style_td_muted),
                Paragraph(te["date"], style_td_muted),
                Paragraph(format_indian_currency(te["amount"]), style_td_bold),
            ])
    else:
        top_exp_table_data.append([
            Paragraph("No single expenses logged in this period", style_td_muted),
            Paragraph("-", style_td),
            Paragraph("-", style_td),
            Paragraph("-", style_td),
            Paragraph("₹0", style_td),
        ])

    top_exp_table = Table(top_exp_table_data, colWidths=[160, 110, 85, 85, 100])
    top_exp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    expenses_block.append(top_exp_table)
    story.append(KeepTogether(expenses_block))

    # -------------------------------------------------------------
    # 6.12 Build Document into Memory via FinTrackNumberedCanvas
    # -------------------------------------------------------------
    doc.build(story, canvasmaker=FinTrackNumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes, filename
