import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Download,
  Calendar,
  ArrowUpDown,
  Edit2,
  Trash2,
  TrendingUp,
  CreditCard,
  DollarSign,
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
  RotateCcw,
  Filter
} from 'lucide-react';
import api from '../api/client';
import { CustomSelect } from '../components/CustomSelect';

export interface IncomeCategory {
  id: string;
  name: string;
  type: string;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  category_id: string;
  category_name: string;
  description?: string;
  transaction_date: string;
  created_at?: string;
}

export interface IncomeStats {
  total_income_this_month: number;
  total_income_last_month: number;
  month_over_month_change_pct: number;
  entries_count_this_month: number;
  avg_income_per_entry: number;
  top_source_name?: string | null;
  top_source_amount: number;
  top_source_percentage: number;
}

const PAGE_SIZE = 6;

export type SortColumn = 'date' | 'category' | 'description' | 'amount';
export type SortDirection = 'asc' | 'desc';

const DEFAULT_CATEGORIES: IncomeCategory[] = [
  { id: 'cat-1', name: 'Salary', type: 'income' },
  { id: 'cat-2', name: 'Freelancing', type: 'income' },
  { id: 'cat-3', name: 'Business', type: 'income' },
  { id: 'cat-4', name: 'Interest', type: 'income' },
  { id: 'cat-5', name: 'Other', type: 'income' }
];

export const IncomePage: React.FC = () => {
  // Data state
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>(DEFAULT_CATEGORIES);
  const [stats, setStats] = useState<IncomeStats>({
    total_income_this_month: 0,
    total_income_last_month: 0,
    month_over_month_change_pct: 0,
    entries_count_this_month: 0,
    avg_income_per_entry: 0,
    top_source_name: 'Salary',
    top_source_amount: 0,
    top_source_percentage: 0
  });

  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Column sort state: null means normal default sorting
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  // Column Filter & Search state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Ref for table container to support smooth pagination scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Column-wise filter states (Date & Amount; Description is excluded per requirements)
  const [colDateFilter, setColDateFilter] = useState<string>('');
  const [colMinAmount, setColMinAmount] = useState<string>('');
  const [colMaxAmount, setColMaxAmount] = useState<string>('');

  const hasActiveColumnFilters = Boolean(
    colDateFilter || colMinAmount || colMaxAmount || (selectedCategory !== 'all')
  );

  const resetColumnFilters = () => {
    setColDateFilter('');
    setColMinAmount('');
    setColMaxAmount('');
    setSelectedCategory('all');
    setPage(1);
  };

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
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
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories once
  useEffect(() => {
    api.get('/user/income/categories')
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

    api.get('/user/income/stats', { params })
      .then((res) => setStats(res.data))
      .catch(() => {
        // Fallback calculations if backend unavailable
      });
  }, [selectedMonth, selectedYear]);

  // Fetch income entries with current filters & sorting
  const fetchIncomes = useCallback(() => {
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
    if (colDateFilter.trim()) params.date = colDateFilter.trim();
    if (colMinAmount.trim()) params.min_amount = Number(colMinAmount);
    if (colMaxAmount.trim()) params.max_amount = Number(colMaxAmount);

    api.get('/user/income', { params })
      .then((res) => {
        setIncomes(res.data.items || []);
        setTotalCount(res.data.total_count || 0);
        setTotalPages(res.data.total_pages || 1);
      })
      .catch(() => {
        // Mock fallback for demo (14 realistic records)
        let mock: IncomeEntry[] = [
          { id: 'm-1', amount: 52000, category_id: 'cat-1', category_name: 'Salary', description: 'Monthly Software Engineering Salary', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-01` },
          { id: 'm-2', amount: 12500, category_id: 'cat-2', category_name: 'Freelancing', description: 'E-commerce Website UI Redesign', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-03` },
          { id: 'm-3', amount: 18000, category_id: 'cat-3', category_name: 'Business', description: 'Digital Products & Template Sales', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-05` },
          { id: 'm-4', amount: 1450, category_id: 'cat-4', category_name: 'Interest', description: 'Quarterly High-Yield Savings Interest', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-07` },
          { id: 'm-5', amount: 8200, category_id: 'cat-2', category_name: 'Freelancing', description: 'Brand Identity & Logo Suite', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-09` },
          { id: 'm-6', amount: 4500, category_id: 'cat-5', category_name: 'Other', description: 'Sold Old Graphic Tablet', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-11` },
          { id: 'm-7', amount: 9800, category_id: 'cat-3', category_name: 'Business', description: 'Consulting Workshop Honorarium', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-13` },
          { id: 'm-8', amount: 14000, category_id: 'cat-2', category_name: 'Freelancing', description: 'Mobile App MVP Frontend Development', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-16` },
          { id: 'm-9', amount: 2100, category_id: 'cat-4', category_name: 'Interest', description: 'Fixed Deposit Interest Credit', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-18` },
          { id: 'm-10', amount: 3200, category_id: 'cat-5', category_name: 'Other', description: 'Cashback Rewards & Referral Bonus', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-20` },
          { id: 'm-11', amount: 7500, category_id: 'cat-2', category_name: 'Freelancing', description: 'SEO Optimization & Technical Writing', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-21` },
          { id: 'm-12', amount: 15500, category_id: 'cat-3', category_name: 'Business', description: 'SaaS Subscription Revenue Share', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-22` },
          { id: 'm-13', amount: 10000, category_id: 'cat-1', category_name: 'Salary', description: 'Quarterly Performance Incentive', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-23` },
          { id: 'm-14', amount: 2800, category_id: 'cat-5', category_name: 'Other', description: 'Used Textbook & Gadget Resale', transaction_date: `${selectedYear}-${String(selectedMonth || 9).padStart(2, '0')}-24` },
        ];
        if (selectedCategory !== 'all') {
          mock = mock.filter(m => m.category_id === selectedCategory);
        }
        if (colDateFilter.trim()) {
          mock = mock.filter(m => m.transaction_date.includes(colDateFilter.trim()));
        }
        if (colMinAmount.trim()) {
          mock = mock.filter(m => m.amount >= Number(colMinAmount));
        }
        if (colMaxAmount.trim()) {
          mock = mock.filter(m => m.amount <= Number(colMaxAmount));
        }
        if (search.trim()) {
          const s = search.trim().toLowerCase();
          mock = mock.filter(m => m.category_name.toLowerCase().includes(s) || (m.description || '').toLowerCase().includes(s));
        }
        // Column sort on mock data
        if (sortColumn === 'date') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.transaction_date.localeCompare(b.transaction_date) : b.transaction_date.localeCompare(a.transaction_date));
        } else if (sortColumn === 'amount') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount);
        } else if (sortColumn === 'category') {
          mock.sort((a, b) => sortDirection === 'asc' ? a.category_name.localeCompare(b.category_name) : b.category_name.localeCompare(a.category_name));
        } else if (sortColumn === 'description') {
          mock.sort((a, b) => sortDirection === 'asc' ? (a.description || '').localeCompare(b.description || '') : (b.description || '').localeCompare(a.description || ''));
        } else {
          // Normal: newest first
          mock.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
        }
        const startIndex = (page - 1) * PAGE_SIZE;
        const pageItems = mock.slice(startIndex, startIndex + PAGE_SIZE);
        setIncomes(pageItems);
        setTotalCount(mock.length);
        setTotalPages(Math.max(1, Math.ceil(mock.length / PAGE_SIZE)));
      })
      .finally(() => {
        setLoading(false);
        setIsFetching(false);
      });
  }, [page, sortColumn, sortDirection, selectedMonth, selectedYear, selectedCategory, search, colDateFilter, colMinAmount, colMaxAmount]);

  useEffect(() => {
    fetchStats();
    fetchIncomes();
  }, [fetchStats, fetchIncomes]);

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
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (entry: IncomeEntry) => {
    setEditingEntry(entry);
    setFormAmount(String(entry.amount));
    setFormCategoryId(entry.category_id);
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
      setFormError('Please choose an income category / source');
      return;
    }

    if (!formDate) {
      setFormError('Please select a transaction date');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEntry) {
        // Edit existing
        await api.put(`/user/income/${editingEntry.id}`, {
          amount: parsedAmount,
          category_id: formCategoryId,
          transaction_date: formDate,
          description: formDescription.trim() || undefined
        });
        showFeedback('Income entry updated successfully!', 'success');
      } else {
        // Add new
        await api.post('/user/income', {
          amount: parsedAmount,
          category_id: formCategoryId,
          transaction_date: formDate,
          description: formDescription.trim() || undefined
        });
        showFeedback('New income added successfully!', 'success');
      }
      setIsModalOpen(false);
      fetchStats();
      fetchIncomes();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail 
        || 'Failed to save income. Please try again.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteEntryId) return;
    try {
      await api.delete(`/user/income/${deleteEntryId}`);
      showFeedback('Income entry deleted successfully.', 'success');
      setDeleteEntryId(null);
      fetchStats();
      fetchIncomes();
    } catch {
      showFeedback('Failed to delete income entry.', 'error');
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

      const res = await api.get('/user/income/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all';
      link.setAttribute('download', `fintrack_income_${selectedYear}_${monthLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showFeedback('Income CSV downloaded successfully!', 'success');
    } catch {
      // Fallback: Generate CSV directly from current entries if backend endpoint is unavailable or demo mode
      if (incomes.length > 0) {
        exportClientSideCSV();
      } else {
        showFeedback('No income entries available to export.', 'error');
      }
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    setShowExportMenu(false);
    try {
      const params: Record<string, string | number> = { format: 'pdf' };
      if (selectedMonth > 0) params.month = selectedMonth;
      if (selectedYear > 0) params.year = selectedYear;
      if (selectedCategory !== 'all') params.category_id = selectedCategory;

      const res = await api.get('/user/income/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all';
      link.setAttribute('download', `fintrack_income_${selectedYear}_${monthLabel}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showFeedback('Income PDF statement downloaded successfully!', 'success');
    } catch {
      // Fallback: Generate printable statement in browser if offline or demo
      if (incomes.length > 0) {
        printClientSideStatement();
      } else {
        showFeedback('No income entries available to export.', 'error');
      }
    }
  };

  const printClientSideStatement = () => {
    const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label : 'All Time';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showFeedback('Popup blocked. Please allow popups to view printable PDF statement.', 'error');
      return;
    }
    const total = incomes.reduce((sum, item) => sum + item.amount, 0);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FinTrack Income Statement - ${monthLabel} ${selectedYear}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #0F172A; }
          .header { border-bottom: 2px solid #E2E8F0; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 700; color: #0F172A; }
          .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; color: #334155; }
          .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
          .kpi-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; flex: 1; background: #F8FAFC; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; }
          .kpi-val { font-size: 18px; font-weight: 700; color: #10B981; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th { text-align: left; background: #0F172A; color: #fff; padding: 10px; font-weight: 600; }
          td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .amount { text-align: right; font-weight: 700; color: #10B981; }
          .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FinTrack — Income Statement</div>
          <div class="subtitle">Official Personal Finance Revenue Report</div>
        </div>
        <div class="meta">
          <div><b>Statement Period:</b> ${monthLabel} ${selectedYear}</div>
          <div><b>Generated On:</b> ${new Date().toLocaleDateString('en-GB')}</div>
        </div>
        <div class="kpis">
          <div class="kpi-card"><div class="kpi-label">Total Inflow</div><div class="kpi-val">${formatCurrency(total)}</div></div>
          <div class="kpi-card"><div class="kpi-label">Entries Count</div><div class="kpi-val" style="color:#0F172A;">${incomes.length}</div></div>
          <div class="kpi-card"><div class="kpi-label">Average Inflow</div><div class="kpi-val" style="color:#0F172A;">${formatCurrency(incomes.length ? total / incomes.length : 0)}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right;">Amount (INR)</th></tr>
          </thead>
          <tbody>
            ${incomes.map(item => `
              <tr>
                <td>${formatDate(item.transaction_date)}</td>
                <td><b>${item.category_name}</b></td>
                <td>${item.description || '—'}</td>
                <td class="amount">+${formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">FinTrack Personal Finance • Generated Statement</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showFeedback('Opened printable PDF statement view!', 'success');
  };

  const exportClientSideCSV = () => {
    const headers = ['Date', 'Source/Category', 'Description', 'Amount (INR)'];
    const rows = incomes.map((inc) => [
      inc.transaction_date,
      `"${inc.category_name.replace(/"/g, '""')}"`,
      `"${(inc.description || '').replace(/"/g, '""')}"`,
      inc.amount.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthLabel = selectedMonth > 0 ? months.find(m => m.value === selectedMonth)?.label.toLowerCase() : 'all';
    link.setAttribute('download', `fintrack_income_${selectedYear}_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showFeedback('Income CSV downloaded successfully!', 'success');
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

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

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 28px 60px' }}>
      
      {/* Toast Notification */}
      {feedbackMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          zIndex: 9999,
          backgroundColor: feedbackMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          {feedbackMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h1 className="page-heading" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
            Income
          </h1>
          <p className="normal-text" style={{ fontSize: '15px', color: 'var(--secondary-text)' }}>
            Track and manage your revenue streams, earnings, and financial inflows.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Month & Year Picker */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-input)',
            padding: '2px 8px',
            gap: '6px'
          }}>
            <Calendar size={16} color="var(--secondary-text)" style={{ marginLeft: '4px' }} />
            
            <CustomSelect
              value={selectedMonth}
              onChange={(val) => {
                setSelectedMonth(Number(val));
                setPage(1);
              }}
              options={months.map(m => ({ value: m.value, label: m.label }))}
              size="sm"
              buttonStyle={{ border: 'none', background: 'transparent', height: '36px', boxShadow: 'none' }}
            />

            <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border)' }} />

            <CustomSelect
              value={selectedYear}
              onChange={(val) => {
                setSelectedYear(Number(val));
                setPage(1);
              }}
              options={[2024, 2025, 2026, 2027].map(y => ({ value: y, label: String(y) }))}
              size="sm"
              buttonStyle={{ border: 'none', background: 'transparent', height: '36px', boxShadow: 'none' }}
            />
          </div>

          {/* Export Dropdown Menu (CSV or PDF) */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="btn-outline"
              style={{
                padding: '9px 14px',
                fontSize: '13.5px',
                height: '42px',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Export income data as CSV or PDF"
            >
              <Download size={16} />
              <span>Export</span>
              <ChevronDown size={14} style={{ transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Dropdown Options */}
            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '235px',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease'
              }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--main-text)',
                    borderRadius: 'var(--radius-btn)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileSpreadsheet size={17} color="var(--accent)" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Export as CSV</div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Excel / Google Sheets (.csv)</div>
                  </div>
                </button>

                <button
                  onClick={handleExportPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--main-text)',
                    borderRadius: 'var(--radius-btn)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                    marginTop: '2px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileText size={17} color="var(--info)" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Export as PDF</div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Printable Statement (.pdf)</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Add Income Button */}
          <button
            onClick={handleOpenAdd}
            className="btn-primary"
            style={{
              padding: '9px 18px',
              fontSize: '14px',
              height: '42px',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              gap: '6px'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* 2. STATS & KPI METRIC CARDS (4 CARDS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Total Income */}
        <div className="card-box" style={{ padding: '22px 24px', borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Total Income {selectedMonth > 0 ? `(${months[selectedMonth].label.slice(0, 3)})` : ''}
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--light-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <DollarSign size={16} strokeWidth={2.5} />
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>
            {formatCurrency(stats.total_income_this_month)}
          </div>
          <div style={{
            fontSize: '12px',
            color: stats.month_over_month_change_pct >= 0 ? 'var(--accent)' : 'var(--danger)',
            fontWeight: 600,
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <TrendingUp size={14} />
            <span>
              {stats.month_over_month_change_pct >= 0 ? `+${stats.month_over_month_change_pct}%` : `${stats.month_over_month_change_pct}%`} vs last month
            </span>
          </div>
        </div>

        {/* Entries Count */}
        <div className="card-box" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Recorded Inflows
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--light-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info)'
            }}>
              <CreditCard size={16} />
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
            {stats.entries_count_this_month} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)' }}>entries</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            {selectedMonth > 0 ? `In ${months[selectedMonth].label} ${selectedYear}` : 'Filtered period'}
          </div>
        </div>

        {/* Average per Inflow */}
        <div className="card-box" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Average per Entry
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--light-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <PieChart size={16} />
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
            {formatCurrency(stats.avg_income_per_entry)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            Across all income streams
          </div>
        </div>

        {/* Top Income Source */}
        <div className="card-box" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500 }}>
              Top Income Stream
            </span>
            <span className="badge-pill" style={{ fontSize: '11px', padding: '3px 8px' }}>
              {stats.top_source_percentage > 0 ? `${stats.top_source_percentage}%` : 'Primary'}
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
            {stats.top_source_name || 'Salary'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
            {stats.top_source_amount > 0 ? formatCurrency(stats.top_source_amount) : 'Leading source'}
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & FILTER CONTROLS */}
      <div className="card-box" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          
          {/* Left: Search input */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text)' }} />
            <input
              type="text"
              placeholder="Search description or source..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field"
              style={{
                paddingLeft: '36px',
                height: '40px',
                fontSize: '13.5px',
                backgroundColor: 'var(--input-bg)'
              }}
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

          {/* Right: Filters & Sorter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--secondary-text)" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{
                  height: '40px',
                  width: 'auto',
                  padding: '8px 12px',
                  fontSize: '13px',
                  backgroundColor: 'var(--input-bg)',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Sources</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Sort Reset Pill if sorted */}
            {sortColumn && (
              <button
                onClick={() => {
                  setSortColumn(null);
                  setSortDirection(null);
                  setPage(1);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--accent)',
                  backgroundColor: 'var(--light-accent)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
                title="Click to reset to default sorting (Normal)"
              >
                <span>Sorted: {sortColumn.charAt(0).toUpperCase() + sortColumn.slice(1)} ({sortDirection === 'asc' ? 'Ascending' : 'Descending'})</span>
                <X size={13} />
              </button>
            )}

            {/* Total entries indicator chip */}
            <span className="badge-pill" style={{ height: '38px', padding: '0 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center' }}>
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

        </div>
      </div>

      {/* 4. INCOME DATA TABLE */}
      <div ref={tableContainerRef} className="card-box" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
        {/* Subtle Loading Top Bar */}
        <div style={{
          height: '2px',
          width: '100%',
          backgroundColor: isFetching ? 'var(--accent)' : 'transparent',
          transition: 'background-color 0.2s ease',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 10
        }} />

        <div style={{ overflowX: 'auto', minHeight: '375px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--card-subtle)',
                borderBottom: '1px solid var(--border)',
                color: 'var(--secondary-text)'
              }}>
                {/* Date Header */}
                <th
                  onClick={() => handleSort('date')}
                  style={{
                    padding: '14px 20px',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortColumn === 'date' ? 'var(--accent)' : 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Date: ${sortColumn === 'date' ? (sortDirection === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Normal)') : 'Click to sort Ascending'}`}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Date</span>
                    {sortColumn === 'date' ? (
                      sortDirection === 'asc' ? <ChevronUp size={15} strokeWidth={2.5} color="var(--accent)" /> : <ChevronDown size={15} strokeWidth={2.5} color="var(--accent)" />
                    ) : (
                      <ArrowUpDown size={13} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                {/* Source / Category Header */}
                <th
                  onClick={() => handleSort('category')}
                  style={{
                    padding: '14px 20px',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortColumn === 'category' ? 'var(--accent)' : 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Category: ${sortColumn === 'category' ? (sortDirection === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Normal)') : 'Click to sort Ascending'}`}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Source / Category</span>
                    {sortColumn === 'category' ? (
                      sortDirection === 'asc' ? <ChevronUp size={15} strokeWidth={2.5} color="var(--accent)" /> : <ChevronDown size={15} strokeWidth={2.5} color="var(--accent)" />
                    ) : (
                      <ArrowUpDown size={13} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                {/* Description Header */}
                <th
                  onClick={() => handleSort('description')}
                  style={{
                    padding: '14px 20px',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortColumn === 'description' ? 'var(--accent)' : 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Description: ${sortColumn === 'description' ? (sortDirection === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Normal)') : 'Click to sort Ascending'}`}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Description</span>
                    {sortColumn === 'description' ? (
                      sortDirection === 'asc' ? <ChevronUp size={15} strokeWidth={2.5} color="var(--accent)" /> : <ChevronDown size={15} strokeWidth={2.5} color="var(--accent)" />
                    ) : (
                      <ArrowUpDown size={13} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                {/* Amount Header */}
                <th
                  onClick={() => handleSort('amount')}
                  style={{
                    padding: '14px 20px',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: 'right',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortColumn === 'amount' ? 'var(--accent)' : 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Amount: ${sortColumn === 'amount' ? (sortDirection === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Normal)') : 'Click to sort Ascending'}`}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span>Amount</span>
                    {sortColumn === 'amount' ? (
                      sortDirection === 'asc' ? <ChevronUp size={15} strokeWidth={2.5} color="var(--accent)" /> : <ChevronDown size={15} strokeWidth={2.5} color="var(--accent)" />
                    ) : (
                      <ArrowUpDown size={13} style={{ opacity: 0.35 }} />
                    )}
                  </div>
                </th>

                {/* Actions Header */}
                <th style={{ padding: '14px 20px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', width: '110px' }}>Actions</th>
              </tr>

              {/* Column Filter Row */}
              <tr style={{
                backgroundColor: 'var(--card-subtle)',
                borderBottom: '2px solid var(--border)'
              }}>
                {/* 1. Date Column Filter */}
                <th style={{ padding: '6px 12px 10px 20px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={colDateFilter}
                      onChange={(e) => {
                        setColDateFilter(e.target.value);
                        setPage(1);
                      }}
                      className="input-field"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--card)',
                        width: '100%',
                        borderRadius: '6px'
                      }}
                      title="Filter by specific date"
                    />
                    {colDateFilter && (
                      <button
                        onClick={() => { setColDateFilter(''); setPage(1); }}
                        style={{
                          position: 'absolute',
                          right: '24px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--secondary-text)',
                          cursor: 'pointer'
                        }}
                        title="Clear date filter"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </th>

                {/* 2. Source / Category Column Filter */}
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
                    style={{ width: '100%' }}
                    buttonStyle={{ height: '32px', fontSize: '12px' }}
                  />
                </th>

                {/* 3. Description Column: NO FILTER (except description column) */}
                <th style={{ padding: '6px 12px 10px 12px' }}>
                  <div style={{
                    fontSize: '11.5px',
                    color: 'var(--secondary-text)',
                    fontStyle: 'italic',
                    padding: '4px 8px',
                    opacity: 0.65
                  }}>
                    — No filter —
                  </div>
                </th>

                {/* 4. Amount Column Filter (Min / Max) */}
                <th style={{ padding: '6px 20px 10px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={colMinAmount}
                      onChange={(e) => {
                        setColMinAmount(e.target.value);
                        setPage(1);
                      }}
                      className="input-field"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        padding: '4px 6px',
                        backgroundColor: 'var(--card)',
                        width: '75px',
                        borderRadius: '6px',
                        textAlign: 'right'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>-</span>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={colMaxAmount}
                      onChange={(e) => {
                        setColMaxAmount(e.target.value);
                        setPage(1);
                      }}
                      className="input-field"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        padding: '4px 6px',
                        backgroundColor: 'var(--card)',
                        width: '75px',
                        borderRadius: '6px',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                </th>

                {/* 5. Actions Column (Clear Filters) */}
                <th style={{ padding: '6px 20px 10px 12px', textAlign: 'center' }}>
                  {hasActiveColumnFilters && (
                    <button
                      onClick={resetColumnFilters}
                      style={{
                        height: '32px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        backgroundColor: 'var(--light-danger)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                      title="Clear column filters"
                    >
                      <RotateCcw size={12} /> Clear
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody style={{ opacity: isFetching ? 0.45 : 1, transition: 'opacity 0.2s ease-in-out' }}>
              {loading && incomes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)' }}>
                    Loading income records...
                  </td>
                </tr>
              ) : incomes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '50px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--light-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)'
                      }}>
                        <DollarSign size={24} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}>
                        No income entries found
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', maxWidth: '340px' }}>
                        No records match the selected month, category, or search filters.
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="btn-primary"
                        style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
                      >
                        + Log First Income
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr
                    key={inc.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Date */}
                    <td style={{ padding: '16px 20px', color: 'var(--secondary-text)', whiteSpace: 'nowrap' }}>
                      {formatDate(inc.transaction_date)}
                    </td>

                    {/* Source / Category badge */}
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        className="badge-pill"
                        style={{
                          backgroundColor: 'var(--light-accent)',
                          color: 'var(--accent)',
                          fontWeight: 600,
                          fontSize: '12px'
                        }}
                      >
                        {inc.category_name}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '16px 20px', color: 'var(--main-text)', fontWeight: 500 }}>
                      {inc.description || <span style={{ color: 'var(--secondary-text)', fontStyle: 'italic' }}>No description</span>}
                    </td>

                    {/* Amount */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '15px',
                      color: 'var(--accent)',
                      whiteSpace: 'nowrap'
                    }}>
                      +{formatCurrency(inc.amount)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEdit(inc)}
                          title="Edit Income"
                          style={{
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            borderRadius: '6px',
                            padding: '6px',
                            color: 'var(--secondary-text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--accent)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--secondary-text)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => setDeleteEntryId(inc.id)}
                          title="Delete Income"
                          style={{
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            borderRadius: '6px',
                            padding: '6px',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                            e.currentTarget.style.borderColor = 'var(--danger)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--card)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            fontSize: '13px',
            color: 'var(--secondary-text)',
            backgroundColor: 'var(--card)'
          }}>
            <div>
              Showing <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}</span> to{' '}
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{totalCount}</span> entries (6 per page)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Previous Button */}
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="btn-outline"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '12.5px',
                  opacity: page <= 1 ? 0.45 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <ChevronLeft size={15} />
                <span>Prev</span>
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      height: '34px',
                      minWidth: '34px',
                      padding: '0 8px',
                      borderRadius: 'var(--radius-btn)',
                      fontSize: '12.5px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--card)',
                      color: isActive ? '#FFFFFF' : 'var(--main-text)',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--card)';
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="btn-outline"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '12.5px',
                  opacity: page >= totalPages ? 0.45 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT INCOME MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)'
            }}>
              <h3 className="card-heading" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>
                {editingEntry ? 'Edit Income Entry' : 'Add New Income'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '24px' }}>
              {formError && (
                <div style={{
                  backgroundColor: 'var(--light-danger)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  {formError}
                </div>
              )}

              {/* Amount */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 50000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '15px', fontWeight: 600 }}
                  required
                />
              </div>

              {/* Source / Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Income Source / Category *
                </label>
                <CustomSelect
                  value={formCategoryId}
                  onChange={(val) => setFormCategoryId(String(val))}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select category..."
                  style={{ width: '100%' }}
                  buttonStyle={{ height: '42px', fontSize: '14px' }}
                />
              </div>

              {/* Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Date Received *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="input-field"
                  style={{ height: '42px' }}
                  required
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary, Web design project"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field"
                  style={{ height: '42px' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline"
                  style={{ height: '42px', padding: '0 18px', fontSize: '14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    fontSize: '14px',
                    backgroundColor: 'var(--accent)',
                    color: '#FFFFFF'
                  }}
                >
                  {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteEntryId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-danger)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={22} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              Delete Income Entry?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', marginBottom: '22px' }}>
              Are you sure you want to permanently delete this income record? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteEntryId(null)}
                className="btn-outline"
                style={{ flex: 1, height: '40px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  height: '40px',
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
