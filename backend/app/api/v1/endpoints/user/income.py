import csv
import io
import math
import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import func, extract, desc, asc, or_
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.income import (
    IncomeCategoryOut,
    CustomCategoryCreate,
    IncomeCreate,
    IncomeUpdate,
    IncomeOut,
    IncomeListResponse,
    IncomeStatsResponse,
    IncomeCategoryShare,
)
from app.schemas.user import MessageResponse

router = APIRouter()

@router.get("/categories", response_model=list[IncomeCategoryOut])
def get_income_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all active income categories (system defaults + custom categories for this user).
    """
    categories = (
        db.query(Category)
        .filter(
            Category.type == "income",
            Category.is_active == True,
            or_(Category.user_id.is_(None), Category.user_id == current_user.id),
        )
        .order_by(Category.is_default.desc(), Category.name.asc())
        .all()
    )
    return categories


@router.post("/categories", response_model=IncomeCategoryOut, status_code=status.HTTP_201_CREATED)
def create_custom_income_category(
    cat_in: CustomCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a custom income category scoped exclusively to the authenticated user.
    """
    cleaned_name = cat_in.name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name cannot be empty.",
        )

    # Check if category with same name already exists for this user or as a default
    existing = (
        db.query(Category)
        .filter(
            Category.type == "income",
            Category.is_active == True,
            func.lower(Category.name) == cleaned_name.lower(),
            or_(Category.user_id.is_(None), Category.user_id == current_user.id),
        )
        .first()
    )
    if existing:
        return existing

    new_cat = Category(
        name=cleaned_name,
        type="income",
        is_default=False,
        is_active=True,
        user_id=current_user.id,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    return new_cat



@router.get("/stats", response_model=IncomeStatsResponse)
def get_income_stats(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculates summary KPIs and breakdown for income:
    - Total income for selected month (defaults to current month)
    - Total income for previous month
    - Month-over-month growth percentage
    - Number of entries and average amount per entry
    - Top earning category/source
    - Distribution by category
    """
    today = date.today()
    target_month = month if month is not None else today.month
    target_year = year if year is not None else today.year

    if target_month == 1:
        prev_month = 12
        prev_year = target_year - 1
    else:
        prev_month = target_month - 1
        prev_year = target_year

    # Current month total and count
    curr_query = (
        db.query(
            func.coalesce(func.sum(Transaction.amount), 0.0).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            extract("month", Transaction.transaction_date) == target_month,
            extract("year", Transaction.transaction_date) == target_year,
        )
        .first()
    )
    total_this_month = float(curr_query.total) if curr_query else 0.0
    count_this_month = int(curr_query.count) if curr_query else 0

    # Previous month total
    prev_query = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0).label("total"))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            extract("month", Transaction.transaction_date) == prev_month,
            extract("year", Transaction.transaction_date) == prev_year,
        )
        .first()
    )
    total_last_month = float(prev_query.total) if prev_query else 0.0

    # Month over month %
    if total_last_month > 0:
        mom_change = round(((total_this_month - total_last_month) / total_last_month) * 100, 1)
    elif total_this_month > 0:
        mom_change = 100.0
    else:
        mom_change = 0.0

    avg_income = round(total_this_month / count_this_month, 2) if count_this_month > 0 else 0.0

    # Breakdown by category for current month
    cat_breakdown_raw = (
        db.query(
            Category.id.label("cat_id"),
            Category.name.label("cat_name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("cat_total"),
            func.count(Transaction.id).label("cat_count"),
        )
        .join(
            Transaction,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            extract("month", Transaction.transaction_date) == target_month,
            extract("year", Transaction.transaction_date) == target_year,
        )
        .group_by(Category.id, Category.name)
        .order_by(desc("cat_total"))
        .all()
    )

    category_breakdown: list[IncomeCategoryShare] = []
    top_source_name = None
    top_source_amount = 0.0
    top_source_pct = 0.0

    for idx, row in enumerate(cat_breakdown_raw):
        cat_amt = float(row.cat_total)
        cat_pct = round((cat_amt / total_this_month) * 100, 1) if total_this_month > 0 else 0.0
        if idx == 0:
            top_source_name = row.cat_name
            top_source_amount = cat_amt
            top_source_pct = cat_pct
        category_breakdown.append(
            IncomeCategoryShare(
                category_id=row.cat_id,
                category_name=row.cat_name,
                total_amount=cat_amt,
                percentage=cat_pct,
                count=int(row.cat_count),
            )
        )

    return IncomeStatsResponse(
        total_income_this_month=total_this_month,
        total_income_last_month=total_last_month,
        month_over_month_change_pct=mom_change,
        entries_count_this_month=count_this_month,
        avg_income_per_entry=avg_income,
        top_source_name=top_source_name,
        top_source_amount=top_source_amount,
        top_source_percentage=top_source_pct,
        category_breakdown=category_breakdown,
    )


def generate_income_pdf(
    user_name: str,
    user_email: str,
    period_label: str,
    total_amount: float,
    entries_count: int,
    top_source: str,
    transactions: list,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12,
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
    )
    kpi_title_style = ParagraphStyle(
        'KPITitle',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#64748B'),
    )
    kpi_val_style = ParagraphStyle(
        'KPIVal',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
    )
    kpi_accent_val_style = ParagraphStyle(
        'KPIAccentVal',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#10B981'),
    )
    table_header_style = ParagraphStyle(
        'TH',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )
    table_cell_style = ParagraphStyle(
        'TD',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )
    table_amount_style = ParagraphStyle(
        'TDAmount',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=colors.HexColor('#10B981'),
    )

    story = []

    # Title & Header
    story.append(Paragraph('FinTrack — Income Statement', title_style))
    story.append(Paragraph('Personal revenue streams & inflow audit report', subtitle_style))
    story.append(Spacer(1, 4))

    # Meta Section
    meta_data = [
        [
            Paragraph(f'<b>Account:</b> {user_name}<br/><b>Email:</b> {user_email}', meta_style),
            Paragraph(f'<b>Period:</b> {period_label}<br/><b>Date Generated:</b> {date.today().strftime("%d %B %Y")}', meta_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # KPI Summary Cards Table
    avg_amount = (total_amount / entries_count) if entries_count > 0 else 0.0
    kpi_data = [
        [
            [Paragraph('TOTAL INFLOW', kpi_title_style), Spacer(1, 3), Paragraph(f'Rs. {total_amount:,.2f}', kpi_accent_val_style)],
            [Paragraph('RECORDED INFLOWS', kpi_title_style), Spacer(1, 3), Paragraph(f'{entries_count} entries', kpi_val_style)],
            [Paragraph('AVERAGE INFLOW', kpi_title_style), Spacer(1, 3), Paragraph(f'Rs. {avg_amount:,.2f}', kpi_val_style)],
            [Paragraph('TOP STREAM', kpi_title_style), Spacer(1, 3), Paragraph(f'{top_source}', kpi_val_style)],
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # Transactions Table
    table_rows = [
        [
            Paragraph('Date', table_header_style),
            Paragraph('Source / Category', table_header_style),
            Paragraph('Description', table_header_style),
            Paragraph('Amount (INR)', ParagraphStyle('THRight', parent=table_header_style, alignment=2)),
        ]
    ]

    for tx, cat_name in transactions:
        table_rows.append([
            Paragraph(tx.transaction_date.strftime('%d %b %Y'), table_cell_style),
            Paragraph(cat_name, table_cell_style),
            Paragraph(tx.description or '—', table_cell_style),
            Paragraph(f'+Rs. {float(tx.amount):,.2f}', table_amount_style),
        ])

    if len(transactions) == 0:
        table_rows.append([
            Paragraph('No income transactions recorded for this period.', table_cell_style),
            Paragraph('—', table_cell_style),
            Paragraph('—', table_cell_style),
            Paragraph('Rs. 0.00', table_amount_style),
        ])

    txn_table = Table(table_rows, colWidths=[85, 115, 220, 120])
    table_style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ]
    for r in range(1, len(table_rows)):
        if r % 2 == 0:
            table_style_commands.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor('#F8FAFC')))
        else:
            table_style_commands.append(('BACKGROUND', (0, r), (-1, r), colors.white))

    txn_table.setStyle(TableStyle(table_style_commands))
    story.append(txn_table)

    story.append(Spacer(1, 18))
    footer_style = ParagraphStyle(
        'DocFooter',
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#94A3B8'),
    )
    story.append(Paragraph('FinTrack Personal Finance Management — System Generated Statement', footer_style))

    doc.build(story)
    return buffer.getvalue()


@router.get("/export")
def export_income(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered income transactions as either a downloadable CSV or PDF document.
    """
    query = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(
            Category,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
    )

    if month is not None:
        query = query.filter(extract("month", Transaction.transaction_date) == month)
    if year is not None:
        query = query.filter(extract("year", Transaction.transaction_date) == year)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    results = query.order_by(desc(Transaction.transaction_date)).all()

    # Determine period label
    month_names = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    if month and year:
        period_label = f"{month_names[month]} {year}"
    elif year:
        period_label = f"Full Year {year}"
    else:
        period_label = "All Time"

    if format.lower() == "pdf":
        total_amt = sum(float(tx.amount) for tx, _ in results)
        cat_counts: dict[str, float] = {}
        for tx, cat_name in results:
            cat_counts[cat_name] = cat_counts.get(cat_name, 0.0) + float(tx.amount)
        top_source = max(cat_counts, key=cat_counts.get) if cat_counts else "None"

        pdf_bytes = generate_income_pdf(
            user_name=current_user.name,
            user_email=current_user.email,
            period_label=period_label,
            total_amount=total_amt,
            entries_count=len(results),
            top_source=top_source,
            transactions=results,
        )

        filename = f"fintrack_income_{year or 'all'}_{month or 'all'}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # Otherwise CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Source/Category", "Description", "Amount (INR)", "Payment Method"])

    for tx, cat_name in results:
        writer.writerow([
            tx.transaction_date.strftime("%Y-%m-%d"),
            cat_name,
            tx.description or "",
            f"{float(tx.amount):.2f}",
            tx.payment_method or "N/A",
        ])

    output.seek(0)
    filename = f"fintrack_income_{year or 'all'}_{month or 'all'}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/pdf")
def export_income_pdf_direct(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Direct alias for PDF export."""
    return export_income(format="pdf", month=month, year=year, category_id=category_id, db=db, current_user=current_user)


@router.get("/export/csv")
def export_income_csv_direct(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Direct alias for CSV export."""
    return export_income(format="csv", month=month, year=year, category_id=category_id, db=db, current_user=current_user)


@router.get("", response_model=IncomeListResponse)
def list_income(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    date: Optional[str] = None,
    sort_by: Optional[str] = Query("date_desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List income transactions with filtering (month, year, category, search, min/max amount, date),
    sorting (date, amount), and pagination.
    """
    query = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(
            Category,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
    )

    if month is not None:
        query = query.filter(extract("month", Transaction.transaction_date) == month)
    if year is not None:
        query = query.filter(extract("year", Transaction.transaction_date) == year)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Transaction.description).like(s) | func.lower(Category.name).like(s)
        )
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if date:
        query = query.filter(cast(Transaction.transaction_date, String).like(f"{date}%"))

    # Calculate total matching count and sum
    total_count = query.count()

    total_amount_scalar = (
        query.with_entities(func.coalesce(func.sum(Transaction.amount), 0.0)).scalar()
    )
    total_amount = float(total_amount_scalar) if total_amount_scalar else 0.0

    # Sorting
    if sort_by == "date_asc":
        query = query.order_by(asc(Transaction.transaction_date), asc(Transaction.created_at))
    elif sort_by == "amount_desc":
        query = query.order_by(desc(Transaction.amount), desc(Transaction.transaction_date))
    elif sort_by == "amount_asc":
        query = query.order_by(asc(Transaction.amount), desc(Transaction.transaction_date))
    elif sort_by == "category_asc":
        query = query.order_by(asc(Category.name), desc(Transaction.transaction_date))
    elif sort_by == "category_desc":
        query = query.order_by(desc(Category.name), desc(Transaction.transaction_date))
    elif sort_by == "description_asc":
        query = query.order_by(asc(Transaction.description), desc(Transaction.transaction_date))
    elif sort_by == "description_desc":
        query = query.order_by(desc(Transaction.description), desc(Transaction.transaction_date))
    else:  # default date_desc
        query = query.order_by(desc(Transaction.transaction_date), desc(Transaction.created_at))

    # Pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    items = [
        IncomeOut(
            id=tx.id,
            amount=float(tx.amount),
            category_id=tx.category_id,
            category_name=cat_name,
            description=tx.description,
            transaction_date=tx.transaction_date,
            created_at=tx.created_at,
        )
        for tx, cat_name in results
    ]

    total_pages = max(1, math.ceil(total_count / limit))

    return IncomeListResponse(
        items=items,
        total_count=total_count,
        total_amount=total_amount,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log a new income transaction.
    Verifies that the category exists, is active, and is of type 'income'.
    """
    category = (
        db.query(Category)
        .filter(
            Category.id == income_in.category_id,
            Category.type == "income",
            Category.is_active == True,
            or_(Category.user_id.is_(None), Category.user_id == current_user.id),
        )
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category selected. Category must be an active income category for your account.",
        )

    tx = Transaction(
        user_id=current_user.id,
        category_id=income_in.category_id,
        type="income",
        amount=income_in.amount,
        description=income_in.description.strip() if income_in.description else None,
        transaction_date=income_in.transaction_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return IncomeOut(
        id=tx.id,
        amount=float(tx.amount),
        category_id=tx.category_id,
        category_name=category.name,
        description=tx.description,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


@router.get("/{income_id}", response_model=IncomeOut)
def get_income_entry(
    income_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve single income transaction by ID.
    """
    result = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(
            Category,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type),
        )
        .filter(
            Transaction.id == income_id,
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found.")

    tx, cat_name = result
    return IncomeOut(
        id=tx.id,
        amount=float(tx.amount),
        category_id=tx.category_id,
        category_name=cat_name,
        description=tx.description,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: uuid.UUID,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing income transaction.
    """
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == income_id,
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found.")

    if income_in.category_id is not None:
        cat = (
            db.query(Category)
            .filter(
                Category.id == income_in.category_id,
                Category.type == "income",
                Category.is_active == True,
                or_(Category.user_id.is_(None), Category.user_id == current_user.id),
            )
            .first()
        )
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected category must be an active income category.",
            )
        tx.category_id = income_in.category_id

    if income_in.amount is not None:
        tx.amount = income_in.amount
    if income_in.transaction_date is not None:
        tx.transaction_date = income_in.transaction_date
    if income_in.description is not None:
        tx.description = income_in.description.strip() or None

    db.add(tx)
    db.commit()
    db.refresh(tx)

    category = db.query(Category).filter(Category.id == tx.category_id).first()
    cat_name = category.name if category else "Income"

    return IncomeOut(
        id=tx.id,
        amount=float(tx.amount),
        category_id=tx.category_id,
        category_name=cat_name,
        description=tx.description,
        transaction_date=tx.transaction_date,
        created_at=tx.created_at,
    )


@router.delete("/{income_id}", response_model=MessageResponse)
def delete_income(
    income_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an income transaction.
    """
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == income_id,
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income entry not found.")

    db.delete(tx)
    db.commit()

    return MessageResponse(message="Income entry deleted successfully.", success=True)
