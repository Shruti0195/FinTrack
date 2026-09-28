import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Download,
  ArrowUpDown,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  CreditCard,
  PieChart,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Wallet
} from 'lucide-react';
import api from '../api/client';
import { CustomSelect } from '../components/CustomSelect';
import { PeriodFilterDropdown, type PeriodType } from '../components/PeriodFilterDropdown';

export interface ExpenseCategory {
  id: string;
  name: string;
  type: string;
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  category_id: string;
  category_name: string;
  description?: string;
  payment_method?: string;
  transaction_date: string;
  created_at?: string;
}

export interface ExpenseStats {
  total_expense_this_month: number;
  total_expense_last_month: number;
  month_over_month_change_pct: number;
  entries_count_this_month: number;
  avg_expense_per_entry: number;
  top_category_name?: string | null;
  top_category_amount: number;
  top_category_percentage: number;
}

const PAGE_SIZE = 6;

export type SortColumn = 'date' | 'category' | 'description' | 'amount' | 'payment_method';
export type SortDirection = 'asc' | 'desc';

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-food', name: 'Food', type: 'expense' },
  { id: 'cat-rent', name: 'Rent', type: 'expense' },
  { id: 'cat-transport', name: 'Transport', type: 'expense' },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense' },
  { id: 'cat-bills', name: 'Bills', type: 'expense' },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'expense' },
  { id: 'cat-healthcare', name: 'Healthcare', type: 'expense' },
  { id: 'cat-subscriptions', name: 'Subscriptions', type: 'expense' },
  { id: 'cat-education', name: 'Education', type: 'expense' },
  { id: 'cat-other', name: 'Other', type: 'expense' }
];

const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Bank transfer', 'Net Banking'];

const MONTHS_LIST = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export interface ExpensePageProps {
  selectedMonth?: number;
  selectedYear?: number;
  periodType?: PeriodType;
  selectedQuarter?: number;
  selectedHalf?: number;
  periodLabel?: string;
  onPeriodTypeChange?: (type: PeriodType) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  onQuarterChange?: (quarter: number) => void;
  onHalfChange?: (half: number) => void;
}

export const ExpensePage: React.FC<ExpensePageProps> = ({
  selectedMonth = 4,
  selectedYear = 2026,
  periodType = 'monthly',
  selectedQuarter = 2,
  selectedHalf = 1,
  periodLabel: propPeriodLabel,
  onPeriodTypeChange,
  onYearChange,
  onMonthChange,
  onQuarterChange,
  onHalfChange
}) => {
  // Compute start_date and end_date based on navbar period view
  let startDate: string | undefined;
  let endDate: string | undefined;
  if (periodType === 'monthly') {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (periodType === 'quarterly') {
    const startM = (selectedQuarter - 1) * 3 + 1;
    const endM = startM + 2;
    const lastDay = new Date(selectedYear, endM, 0).getDate();
    startDate = `${selectedYear}-${String(startM).padStart(2, '0')}-01`;
    endDate = `${selectedYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (periodType === 'half_year') {
    const startM = selectedHalf === 1 ? 1 : 7;
    const endM = selectedHalf === 1 ? 6 : 12;
    const lastDay = new Date(selectedYear, endM, 0).getDate();
    startDate = `${selectedYear}-${String(startM).padStart(2, '0')}-01`;
    endDate = `${selectedYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  } else if (periodType === 'yearly') {
    startDate = `${selectedYear}-01-01`;
    endDate = `${selectedYear}-12-31`;
  }

  const months = MONTHS_LIST;
  const activePeriodLabel = propPeriodLabel || (periodType === 'monthly' ? `${months[selectedMonth]?.label || ''} ${selectedYear}` : `Year ${selectedYear}`);

  // Data state
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expense_this_month: 0,
    total_expense_last_month: 0,
    month_over_month_change_pct: 0,
    entries_count_this_month: 0,
    avg_expense_per_entry: 0,
    top_category_name: 'Rent',
    top_category_amount: 0,
    top_category_percentage: 0
  });

  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Column sort state
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Column-wise filter states (Amount only; Date filter removed per user specification)
  const [colMinAmount, setColMinAmount] = useState<string>('');
  const [colMaxAmount, setColMaxAmount] = useState<string>('');

  const hasActiveColumnFilters = Boolean(
    colMinAmount || colMaxAmount || (selectedCategory !== 'all')
  );

  const resetColumnFilters = () => {
    setColMinAmount('');
    setColMaxAmount('');
    setSelectedCategory('all');
    setPage(1);
  };

  // Column Sorting Handler & Helper
  const handleColumnSort = (colKey: 'date' | 'category' | 'description' | 'amount') => {
    setPage(1);
    if (colKey === 'date') {
      setSortBy((prev) => (prev === 'date_desc' ? 'date_asc' : 'date_desc'));
    } else if (colKey === 'category') {
      setSortBy((prev) => (prev === 'category_asc' ? 'category_desc' : 'category_asc'));
    } else if (colKey === 'description') {
      setSortBy((prev) => (prev === 'description_asc' ? 'description_desc' : 'description_asc'));
    } else if (colKey === 'amount') {
      setSortBy((prev) => (prev === 'amount_desc' ? 'amount_asc' : 'amount_desc'));
    }
  };

  const renderSortHeader = (title: string, colKey: 'date' | 'category' | 'description' | 'amount', align: 'left' | 'right' = 'left') => {
    let isActive = false;
    let isAsc = false;

    if (colKey === 'date' && (sortBy === 'date_asc' || sortBy === 'date_desc')) {
      isActive = true;
      isAsc = sortBy === 'date_asc';
    } else if (colKey === 'category' && (sortBy === 'category_asc' || sortBy === 'category_desc')) {
      isActive = true;
      isAsc = sortBy === 'category_asc';
    } else if (colKey === 'description' && (sortBy === 'description_asc' || sortBy === 'description_desc')) {
      isActive = true;
      isAsc = sortBy === 'description_asc';
    } else if (colKey === 'amount' && (sortBy === 'amount_asc' || sortBy === 'amount_desc')) {
      isActive = true;
      isAsc = sortBy === 'amount_asc';
    }

    return (
      <button
        type="button"
        onClick={() => handleColumnSort(colKey)}
        style={{
          border: 'none',
          background: 'transparent',
          color: isActive ? 'var(--primary)' : 'var(--secondary-text)',
          fontWeight: isActive ? 700 : 600,
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0',
          textAlign: align,
          width: align === 'right' ? '100%' : 'auto',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start'
        }}
      >
        <span>{title}</span>
        {isActive ? (
          isAsc ? <ArrowUp size={13} color="var(--danger)" strokeWidth={2.5} /> : <ArrowDown size={13} color="var(--danger)" strokeWidth={2.5} />
        ) : (
          <ArrowUpDown size={13} color="var(--secondary-text)" style={{ opacity: 0.6 }} />
        )}
      </button>
    );
  };

  // Ref for table container to support smooth pagination scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('UPI');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch expense categories
  useEffect(() => {
    api.get('/user/expenses/categories')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(() => {
        // Keep fallback categories
      });
  }, []);

  // Fetch stats for the selected period
  const fetchStats = useCallback(() => {
    const params: Record<string, string | number> = {};
    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    } else {
      if (selectedMonth > 0) params.month = selectedMonth;
      if (selectedYear > 0) params.year = selectedYear;
    }

    api.get('/user/expenses/stats', { params })
      .then((res) => setStats(res.data))
      .catch(() => {
        // Fallback calculation
      });
  }, [startDate, endDate, selectedMonth, selectedYear]);

  // Fetch expense entries with current filters & sorting
  const fetchExpenses = useCallback(() => {
    setIsFetching(true);
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
      sort_by: sortBy
    };

    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    } else {
      if (selectedMonth > 0) params.month = selectedMonth;
      if (selectedYear > 0) params.year = selectedYear;
    }
    if (selectedCategory !== 'all') params.category_id = selectedCategory;
    if (search.trim()) params.search = search.trim();
    if (colMinAmount) params.min_amount = parseFloat(colMinAmount);
    if (colMaxAmount) params.max_amount = parseFloat(colMaxAmount);

    api.get('/user/expenses', { params })
      .then((res) => {
        setExpenses(res.data.items || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
      })
      .catch(() => {
        // Fallback mock
      })
      .finally(() => {
        setLoading(false);
        setIsFetching(false);
      });
  }, [page, sortBy, startDate, endDate, selectedMonth, selectedYear, selectedCategory, search, colMinAmount, colMaxAmount]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, selectedMonth, selectedYear, periodType, selectedQuarter, selectedHalf]);

  useEffect(() => {
    fetchStats();
    fetchExpenses();
  }, [fetchStats, fetchExpenses]);

  // Smooth page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    if (tableContainerRef.current) {
      const rect = tableContainerRef.current.getBoundingClientRect();
      if (rect.top < 0) {
        tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormAmount('');
    setFormCategoryId(categories[0]?.id || '');
    setFormPaymentMethod('UPI');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (entry: ExpenseEntry) => {
    setEditingEntry(entry);
    setFormAmount(String(entry.amount));
    setFormCategoryId(entry.category_id);
    setFormPaymentMethod(entry.payment_method || 'UPI');
    setFormDate(entry.transaction_date);
    setFormDescription(entry.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (!formCategoryId) {
      setFormError('Please choose an expense category');
      return;
    }

    if (!formDate) {
      setFormError('Please select a valid transaction date');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEntry) {
        // Update existing expense
        await api.put(`/user/expenses/${editingEntry.id}`, {
          amount: parsedAmount,
          category_id: formCategoryId,
          payment_method: formPaymentMethod,
          transaction_date: formDate,
          description: formDescription.trim() || undefined
        });
        showFeedback('Expense transaction updated successfully.', 'success');
      } else {
        // Create new expense
        await api.post('/user/expenses', {
          amount: parsedAmount,
          category_id: formCategoryId,
          payment_method: formPaymentMethod,
          transaction_date: formDate,
          description: formDescription.trim() || undefined
        });
        showFeedback('Expense transaction recorded successfully.', 'success');
      }

      setIsModalOpen(false);
      fetchStats();
      fetchExpenses();
    } catch {
      setFormError('Failed to save expense. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toast feedback helper
  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteEntryId) return;
    try {
      await api.delete(`/user/expenses/${deleteEntryId}`);
      showFeedback('Expense transaction deleted successfully.', 'success');
      setDeleteEntryId(null);
      fetchStats();
      fetchExpenses();
    } catch {
      showFeedback('Failed to delete expense transaction.', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      const params: Record<string, string | number> = { format: 'csv' };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        if (selectedMonth > 0) params.month = selectedMonth;
        if (selectedYear > 0) params.year = selectedYear;
      }
      if (selectedCategory !== 'all') params.category_id = selectedCategory;

      const res = await api.get('/user/expenses/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileLabel = activePeriodLabel ? activePeriodLabel.replace(/\s+/g, '_').toLowerCase() : (selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all');
      link.setAttribute('download', `fintrack_expenses_${fileLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showFeedback('Expense CSV downloaded successfully!', 'success');
    } catch {
      if (expenses.length > 0) {
        exportClientSideCSV();
      } else {
        showFeedback('No expense entries available to export.', 'error');
      }
    }
  };

  // Fallback client-side CSV generator
  const exportClientSideCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Payment Method', 'Amount (INR)'];
    const rows = expenses.map(e => [
      e.transaction_date,
      `"${e.category_name.replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.payment_method || 'UPI').replace(/"/g, '""')}"`,
      e.amount.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileLabel = activePeriodLabel ? activePeriodLabel.replace(/\s+/g, '_').toLowerCase() : 'all';
    link.setAttribute('download', `fintrack_expenses_${fileLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showFeedback('Expense CSV generated and downloaded.', 'success');
  };

  // Export PDF
  const handleExportPDF = async () => {
    setShowExportMenu(false);
    try {
      const params: Record<string, string | number> = { format: 'pdf' };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        if (selectedMonth > 0) params.month = selectedMonth;
        if (selectedYear > 0) params.year = selectedYear;
      }
      if (selectedCategory !== 'all') params.category_id = selectedCategory;

      const res = await api.get('/user/expenses/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileLabel = activePeriodLabel ? activePeriodLabel.replace(/\s+/g, '_').toLowerCase() : (selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all');
      link.setAttribute('download', `fintrack_expenses_${fileLabel}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showFeedback('Expense PDF statement downloaded successfully!', 'success');
    } catch {
      showFeedback('Failed to generate PDF. Downloading CSV statement instead.', 'error');
      exportClientSideCSV();
    }
  };

  // Format currency in INR
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <main style={{ padding: '28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
      
      {/* 1. TOAST FEEDBACK NOTIFICATION */}
      {feedbackMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: feedbackMsg.type === 'success' ? '#10B981' : '#EF4444',
          color: '#FFFFFF',
          fontSize: '13.5px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {feedbackMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0, marginLeft: '8px' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. HEADER TITLE & CALL TO ACTION */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            Expenses & Transactions
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>
            Track, analyze, and manage your day-to-day spending and outflows.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Period Filter Dropdown (Navbar date filter applied in page) */}
          <PeriodFilterDropdown
            periodType={periodType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedQuarter={selectedQuarter}
            selectedHalf={selectedHalf}
            onPeriodTypeChange={onPeriodTypeChange}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
            onQuarterChange={onQuarterChange}
            onHalfChange={onHalfChange}
            height="42px"
            align="right"
          />

          {/* Export Menu Dropdown (CSV / PDF) */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '1px solid #000000',
                borderRadius: 'var(--radius-btn)',
                padding: '9px 16px',
                fontSize: '13.5px',
                fontWeight: 600,
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.15s ease'
              }}
              title="Export expenses as CSV or PDF"
            >
              <Download size={16} color="#FFFFFF" />
              <span style={{ color: '#FFFFFF' }}>Export</span>
              <ChevronDown size={14} color="#FFFFFF" style={{ transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                minWidth: '175px',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'fadeIn 0.15s ease'
              }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--main-text)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileSpreadsheet size={16} color="#10B981" />
                  <span>Export as CSV</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--main-text)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileText size={16} color="#EF4444" />
                  <span>Export as PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Add Expense Button */}
          <button
            onClick={handleOpenAdd}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 'var(--radius-btn)',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* 3. TOP KPI SUMMARY STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>
        {/* Total Expenses This Month */}
        <div className="card-box" style={{
          padding: '20px',
          borderLeft: '4px solid var(--danger)',
          minHeight: '130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Total Expenses ({activePeriodLabel})
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)'
            }}>
              <ArrowDownRight size={16} strokeWidth={2.5} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--danger)', letterSpacing: '-0.02em', margin: '4px 0' }}>
            {formatCurrency(stats.total_expense_this_month)}
          </div>
          <div style={{
            fontSize: '12px',
            color: stats.month_over_month_change_pct <= 0 ? 'var(--accent)' : 'var(--danger)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {stats.month_over_month_change_pct <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            <span>
              {stats.month_over_month_change_pct >= 0 ? `+${stats.month_over_month_change_pct}%` : `${stats.month_over_month_change_pct}%`} vs. last month
            </span>
          </div>
        </div>

        {/* Average Expense per Entry */}
        <div className="card-box" style={{
          padding: '20px',
          borderLeft: '4px solid var(--warning)',
          minHeight: '130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Average Per Outflow
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <CreditCard size={15} strokeWidth={2.2} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', margin: '4px 0' }}>
            {formatCurrency(stats.avg_expense_per_entry)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
            Across <b>{stats.entries_count_this_month}</b> recorded transactions in {activePeriodLabel}
          </div>
        </div>

        {/* Top Spending Category */}
        <div className="card-box" style={{
          padding: '20px',
          borderLeft: '4px solid var(--info)',
          minHeight: '130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Top Spending Category
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info)'
            }}>
              <PieChart size={15} strokeWidth={2.2} />
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', margin: '4px 0' }}>
            {stats.top_category_name || 'Rent'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
            {formatCurrency(stats.top_category_amount)} ({stats.top_category_percentage}% of total)
          </div>
        </div>
      </div>

      {/* 4. CLEAN SEARCH BAR TOOLBAR */}
      <div className="card-box" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          {/* Left: Search Box */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
            <input
              type="text"
              placeholder="Search description, category, method..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field"
              style={{ paddingLeft: '36px', paddingRight: search ? '32px' : '12px', height: '38px', fontSize: '13px', width: '100%' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Right: Total entries indicator chip */}
          <div>
            <span className="badge-pill" style={{ height: '36px', padding: '0 14px', fontSize: '12.5px' }}>
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

        </div>
      </div>

      {/* 5. DATA TABLE SECTION WITH COLUMN FILTERS & SORTING */}
      <div className="card-box" ref={tableContainerRef} style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--card-subtle)',
                borderBottom: '1px solid var(--border)',
                color: 'var(--secondary-text)',
                userSelect: 'none'
              }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {renderSortHeader('Date', 'date')}
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {renderSortHeader('Category', 'category')}
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Method
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {renderSortHeader('Description', 'description')}
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  {renderSortHeader('Amount', 'amount', 'right')}
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '110px' }}>Actions</th>
              </tr>

              {/* Column Filter Row */}
              <tr style={{
                backgroundColor: 'var(--card-subtle)',
                borderBottom: '2px solid var(--border)'
              }}>
                {/* 1. Date Column Filter - Removed per user request */}
                <th style={{ padding: '6px 12px 10px 20px' }}></th>

                {/* 2. Category Column Filter */}
                <th style={{ padding: '6px 12px 10px 12px' }}>
                  <CustomSelect
                    value={selectedCategory}
                    onChange={(val) => {
                      setSelectedCategory(String(val));
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...categories.map((c) => ({ value: c.id, label: c.name }))
                    ]}
                    size="sm"
                    buttonStyle={{ height: '32px', fontSize: '12px', borderRadius: '6px' }}
                  />
                </th>

                {/* 3. Method Column */}
                <th style={{ padding: '6px 12px 10px 12px' }}></th>

                {/* 4. Description Column Filter (EXCLUDED per requirement) */}
                <th style={{ padding: '6px 12px 10px 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--secondary-text)', fontStyle: 'italic', paddingLeft: '4px' }}>
                    (Search bar)
                  </div>
                </th>

                {/* 5. Amount Min / Max Inputs Column Filter */}
                <th style={{ padding: '6px 20px 10px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="min ₹"
                      value={colMinAmount}
                      onChange={(e) => {
                        setColMinAmount(e.target.value);
                        setPage(1);
                      }}
                      className="input-field"
                      style={{
                        height: '32px',
                        fontSize: '11.5px',
                        padding: '4px 6px',
                        width: '70px',
                        backgroundColor: 'var(--card)',
                        borderRadius: '6px'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>–</span>
                    <input
                      type="number"
                      placeholder="max ₹"
                      value={colMaxAmount}
                      onChange={(e) => {
                        setColMaxAmount(e.target.value);
                        setPage(1);
                      }}
                      className="input-field"
                      style={{
                        height: '32px',
                        fontSize: '11.5px',
                        padding: '4px 6px',
                        width: '70px',
                        backgroundColor: 'var(--card)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </th>

                {/* 6. Actions Reset Filter Button */}
                <th style={{ padding: '6px 12px 10px 12px', textAlign: 'center' }}>
                  {hasActiveColumnFilters && (
                    <button
                      onClick={resetColumnFilters}
                      style={{
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--danger)',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Reset all column filters"
                    >
                      <RotateCcw size={11} />
                      <span>Reset</span>
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading || isFetching ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--secondary-text)' }}>
                    Loading expense transactions...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--card-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--secondary-text)'
                      }}>
                        <Wallet size={22} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>
                        No Expense Records Found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--secondary-text)', maxWidth: '320px' }}>
                        No transactions match the selected filters. Log a new expense to start tracking!
                      </div>
                      <button
                        onClick={handleOpenAdd}
                        className="btn-primary"
                        style={{ marginTop: '8px', padding: '7px 14px', fontSize: '12.5px' }}
                      >
                        <Plus size={14} /> Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((entry, idx) => (
                  <tr
                    key={entry.id || idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--card-subtle)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Date */}
                    <td style={{ padding: '12px 18px', color: 'var(--main-text)', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.transaction_date)}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '12px 18px' }}>
                      <span className="badge-pill" style={{
                        fontSize: '11.5px',
                        padding: '3px 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--danger)',
                        fontWeight: 600
                      }}>
                        {entry.category_name}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td style={{ padding: '12px 18px', color: 'var(--secondary-text)', fontSize: '12px' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        fontSize: '11px',
                        fontWeight: 500
                      }}>
                        {entry.payment_method || 'UPI'}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '12px 18px', color: 'var(--main-text)', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.description || '—'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                      -{formatCurrency(entry.amount)}
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--secondary-text)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Edit transaction"
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-text)')}
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => setDeleteEntryId(entry.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--secondary-text)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete transaction"
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-text)')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 6. SMOOTH PAGINATION FOOTER (6 RECORDS PER PAGE) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
            Showing{' '}
            <b style={{ color: 'var(--primary)' }}>
              {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
            </b>{' '}
            to{' '}
            <b style={{ color: 'var(--primary)' }}>
              {Math.min(page * PAGE_SIZE, totalCount)}
            </b>{' '}
            of <b style={{ color: 'var(--primary)' }}>{totalCount}</b> entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Previous Page Button */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12.5px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: page <= 1 ? 'var(--secondary-text)' : 'var(--main-text)',
                opacity: page <= 1 ? 0.45 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={15} />
              <span>Previous</span>
            </button>

            {/* Page Number Pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              // Show window around current page
              if (totalPages > 6 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                return null;
              }
              const isSelected = p === page;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  style={{
                    minWidth: '32px',
                    height: '32px',
                    padding: '0 6px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--danger)' : '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--danger)' : 'var(--card)',
                    color: isSelected ? '#FFFFFF' : 'var(--main-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12.5px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: page >= totalPages ? 'var(--secondary-text)' : 'var(--main-text)',
                opacity: page >= totalPages ? 0.45 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 7. ADD / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            padding: '26px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)' }}>
                {editingEntry ? 'Edit Expense Transaction' : 'Record New Expense'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
                  Amount (INR) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--secondary-text)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 2450.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '28px', height: '40px', fontSize: '14px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
                  Category *
                </label>
                <select
                  required
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '13.5px', width: '100%', padding: '0 10px' }}
                >
                  <option value="" disabled>Select expense category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
                  Payment Method
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '13.5px', width: '100%', padding: '0 10px' }}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
                  Transaction Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '13.5px', width: '100%', padding: '0 10px' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)', marginBottom: '5px' }}>
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery Market & Pantry items"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '13.5px', width: '100%' }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    opacity: submitting ? 0.7 : 1,
                    backgroundColor: 'var(--danger)',
                    borderColor: 'var(--danger)'
                  }}
                >
                  {submitting ? 'Saving...' : editingEntry ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. DELETE CONFIRMATION MODAL */}
      {deleteEntryId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            width: '100%',
            maxWidth: '390px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <Trash2 size={20} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
              Delete Expense Entry?
            </div>
            <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginBottom: '18px' }}>
              Are you sure you want to delete this expense record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setDeleteEntryId(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
};
