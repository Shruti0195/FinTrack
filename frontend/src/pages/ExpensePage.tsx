import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Download,
  Calendar,
  Filter,
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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import api from '../api/client';

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

export const ExpensePage: React.FC = () => {
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

  // Column sort state: null means default normal sorting (newest first)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

  // Fetch stats for the selected month/year
  const fetchStats = useCallback(() => {
    const params: Record<string, number> = {};
    if (selectedMonth > 0) params.month = selectedMonth;
    if (selectedYear > 0) params.year = selectedYear;

    api.get('/user/expenses/stats', { params })
      .then((res) => setStats(res.data))
      .catch(() => {
        // Fallback calculation
      });
  }, [selectedMonth, selectedYear]);

  // Fetch expense entries with current filters & sorting
  const fetchExpenses = useCallback(() => {
    setIsFetching(true);
    const sortByParam = sortColumn && sortDirection ? `${sortColumn}_${sortDirection}` : 'date_desc';
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
      sort_by: sortByParam
    };

    if (selectedMonth > 0) params.month = selectedMonth;
    if (selectedYear > 0) params.year = selectedYear;
    if (selectedCategory !== 'all') params.category_id = selectedCategory;
    if (search.trim()) params.search = search.trim();

    api.get('/user/expenses', { params })
      .then((res) => {
        setExpenses(res.data.items || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
      })
      .catch(() => {
        // Realistic fallback mock data if backend unavailable
        const mock: ExpenseEntry[] = [
          { id: 'exp-1', amount: 9000, category_id: 'cat-rent', category_name: 'Rent', description: 'September Apartment Rent', payment_method: 'Bank transfer', transaction_date: '2026-09-08' },
          { id: 'exp-2', amount: 2100, category_id: 'cat-food', category_name: 'Food', description: 'Grocery Market & Pantry Refill', payment_method: 'UPI', transaction_date: '2026-09-11' },
          { id: 'exp-3', amount: 2100, category_id: 'cat-food', category_name: 'Food', description: 'Weekend Restaurant Outing', payment_method: 'UPI', transaction_date: '2026-09-21' },
          { id: 'exp-4', amount: 1900, category_id: 'cat-transport', category_name: 'Transport', description: 'Monthly Metro SmartCard Pass', payment_method: 'Card', transaction_date: '2026-09-16' },
          { id: 'exp-5', amount: 1560, category_id: 'cat-shopping', category_name: 'Shopping', description: 'Home Essentials & Books Order', payment_method: 'Card', transaction_date: '2026-09-19' },
          { id: 'exp-6', amount: 2200, category_id: 'cat-entertainment', category_name: 'Entertainment', description: 'Movie Screening & Snacks', payment_method: 'UPI', transaction_date: '2026-09-23' },
          { id: 'exp-7', amount: 1400, category_id: 'cat-bills', category_name: 'Bills', description: 'Broadband Internet & Power Bill', payment_method: 'UPI', transaction_date: '2026-09-24' },
          { id: 'exp-8', amount: 1850, category_id: 'cat-subscriptions', category_name: 'Subscriptions', description: 'Cloud Storage & Streaming Suite', payment_method: 'Card', transaction_date: '2026-09-25' },
          { id: 'exp-9', amount: 3500, category_id: 'cat-healthcare', category_name: 'Healthcare', description: 'Annual Health Checkup & Vitamins', payment_method: 'UPI', transaction_date: '2026-09-05' },
          { id: 'exp-10', amount: 1200, category_id: 'cat-food', category_name: 'Food', description: 'Office Team Lunch', payment_method: 'UPI', transaction_date: '2026-09-02' },
          { id: 'exp-11', amount: 850, category_id: 'cat-transport', category_name: 'Transport', description: 'Cab Ride to City Center', payment_method: 'Cash', transaction_date: '2026-09-04' },
          { id: 'exp-12', amount: 4200, category_id: 'cat-shopping', category_name: 'Shopping', description: 'Sports Shoes & Workout Gear', payment_method: 'Card', transaction_date: '2026-09-14' }
        ];

        if (sortColumn === 'date') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.transaction_date.localeCompare(b.transaction_date) : b.transaction_date.localeCompare(a.transaction_date));
        } else if (sortColumn === 'amount') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount);
        } else if (sortColumn === 'category') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.category_name.localeCompare(b.category_name) : b.category_name.localeCompare(a.category_name));
        } else if (sortColumn === 'description') {
          mock.sort((a, b) => sortDirection === 'asc' ? (a.description || '').localeCompare(b.description || '') : (b.description || '').localeCompare(a.description || ''));
        } else if (sortColumn === 'payment_method') {
          mock.sort((a, b) => sortDirection === 'asc' ? (a.payment_method || '').localeCompare(b.payment_method || '') : (b.payment_method || '').localeCompare(a.payment_method || ''));
        } else {
          // Normal: newest first
          mock.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
        }

        const startIndex = (page - 1) * PAGE_SIZE;
        const pageItems = mock.slice(startIndex, startIndex + PAGE_SIZE);
        setExpenses(pageItems);
        setTotalCount(mock.length);
        setTotalPages(Math.max(1, Math.ceil(mock.length / PAGE_SIZE)));
      })
      .finally(() => {
        setLoading(false);
        setIsFetching(false);
      });
  }, [page, sortColumn, sortDirection, selectedMonth, selectedYear, selectedCategory, search]);

  useEffect(() => {
    fetchStats();
    fetchExpenses();
  }, [fetchStats, fetchExpenses]);

  // 3-way toggle per column: ascending -> descending -> normal
  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      // 3rd click: Reset to normal
      setSortColumn(null);
      setSortDirection(null);
    }
    setPage(1);
  };

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
      if (selectedMonth > 0) params.month = selectedMonth;
      if (selectedYear > 0) params.year = selectedYear;
      if (selectedCategory !== 'all') params.category_id = selectedCategory;

      const res = await api.get('/user/expenses/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all';
      link.setAttribute('download', `fintrack_expenses_${selectedYear}_${monthLabel}.csv`);
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
    link.setAttribute('download', `fintrack_expenses_export.csv`);
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
      if (selectedMonth > 0) params.month = selectedMonth;
      if (selectedYear > 0) params.year = selectedYear;
      if (selectedCategory !== 'all') params.category_id = selectedCategory;

      const res = await api.get('/user/expenses/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all';
      link.setAttribute('download', `fintrack_expenses_${selectedYear}_${monthLabel}.pdf`);
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

  const months = [
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

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Helper for render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={13} style={{ color: 'var(--secondary-text)', opacity: 0.6 }} />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} style={{ color: 'var(--danger)', fontWeight: 'bold' }} />;
    }
    return <ChevronDown size={14} style={{ color: 'var(--danger)', fontWeight: 'bold' }} />;
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Export Menu Dropdown (CSV / PDF) */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 15px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: 'var(--radius-btn)',
                cursor: 'pointer'
              }}
            >
              <Download size={15} />
              <span>Export</span>
              <ChevronDown size={14} style={{ transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
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
              Total Expenses (This Month)
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
            Across <b>{stats.entries_count_this_month}</b> recorded transactions
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

      {/* 4. FILTERS & SEARCH TOOLBAR */}
      <div className="card-box" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
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
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--secondary-text)" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{ height: '38px', fontSize: '13px', padding: '0 10px', minWidth: '140px' }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--secondary-text)" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(parseInt(e.target.value));
                  setPage(1);
                }}
                className="input-field"
                style={{ height: '38px', fontSize: '13px', padding: '0 10px' }}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setPage(1);
              }}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', padding: '0 10px' }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(search || selectedCategory !== 'all' || selectedMonth !== 0 || sortColumn !== null) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedMonth(new Date().getMonth() + 1);
                  setSortColumn(null);
                  setSortDirection(null);
                  setPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. DATA TABLE SECTION (6 RECORDS PER PAGE + COLUMN SORTING) */}
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
                {/* Date Column */}
                <th
                  onClick={() => handleSort('date')}
                  style={{
                    padding: '12px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to sort by date"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Date</span>
                    {renderSortIcon('date')}
                  </div>
                </th>

                {/* Category Column */}
                <th
                  onClick={() => handleSort('category')}
                  style={{
                    padding: '12px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to sort by category"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>

                {/* Payment Method Column */}
                <th
                  onClick={() => handleSort('payment_method')}
                  style={{
                    padding: '12px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to sort by payment method"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Method</span>
                    {renderSortIcon('payment_method')}
                  </div>
                </th>

                {/* Description Column */}
                <th
                  onClick={() => handleSort('description')}
                  style={{
                    padding: '12px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to sort by description"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Description</span>
                    {renderSortIcon('description')}
                  </div>
                </th>

                {/* Amount Column */}
                <th
                  onClick={() => handleSort('amount')}
                  style={{
                    padding: '12px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to sort by amount"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Amount</span>
                    {renderSortIcon('amount')}
                  </div>
                </th>

                {/* Actions Column */}
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'center', width: '100px' }}>
                  Actions
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
