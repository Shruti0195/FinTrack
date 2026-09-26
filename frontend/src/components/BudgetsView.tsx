import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Calendar,
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  X,
  PieChart as PieIcon,
  ShoppingBag,
  Utensils,
  Car,
  Film,
  Zap,
  GraduationCap,
  HeartPulse,
  Home,
  RefreshCw,
  FolderMinus,
  Layers
} from 'lucide-react';
import { 
  getBudgets, 
  getBudgetSummary, 
  getBudgetCategories, 
  createBudget, 
  updateBudget, 
  deleteBudget 
} from '../api/budgets';
import type { 
  Budget, 
  BudgetSummary, 
  BudgetCategory,
  BudgetPeriodType
} from '../api/budgets';

const MONTH_OPTIONS = [
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
  { value: 12, label: 'December' },
];

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1 (Jan – Mar)' },
  { value: 2, label: 'Q2 (Apr – Jun)' },
  { value: 3, label: 'Q3 (Jul – Sep)' },
  { value: 4, label: 'Q4 (Oct – Dec)' },
];

const HALF_YEAR_OPTIONS = [
  { value: 1, label: 'H1 (Jan – Jun)' },
  { value: 2, label: 'H2 (Jul – Dec)' },
];

const MONTH_NAMES = MONTH_OPTIONS.map(m => m.label);

const DEFAULT_FALLBACK_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-101', name: 'Food & Dining', type: 'expense' },
  { id: 'cat-102', name: 'Shopping', type: 'expense' },
  { id: 'cat-103', name: 'Transport', type: 'expense' },
  { id: 'cat-104', name: 'Entertainment', type: 'expense' },
  { id: 'cat-105', name: 'Bills & Utilities', type: 'expense' },
  { id: 'cat-106', name: 'Healthcare', type: 'expense' },
];

const getFallbackBudgetData = (periodType: BudgetPeriodType, periodVal: number, year: number) => {
  const multiplier = periodType === 'yearly' ? 12 : periodType === 'half_yearly' ? 6 : periodType === 'quarterly' ? 3 : 1;
  
  let pLabel = `September ${year}`;
  if (periodType === 'quarterly') pLabel = `Q${periodVal} ${year}`;
  if (periodType === 'half_yearly') pLabel = `H${periodVal} ${year}`;
  if (periodType === 'yearly') pLabel = `Full Year ${year}`;

  const mockBudgets: Budget[] = [
    {
      id: 'mock-b1',
      user_id: 'user-demo',
      category_id: 'cat-101',
      category_name: 'Food & Dining',
      type: 'expense',
      year,
      limit_amount: 7000 * multiplier,
      spent_amount: 4200 * multiplier,
      remaining_amount: 2800 * multiplier,
      percentage_used: 60.0,
      status: 'safe',
      period_type: periodType,
      period_label: pLabel,
      months_budgeted: multiplier
    },
    {
      id: 'mock-b2',
      user_id: 'user-demo',
      category_id: 'cat-102',
      category_name: 'Shopping',
      type: 'expense',
      year,
      limit_amount: 3000 * multiplier,
      spent_amount: 1560 * multiplier,
      remaining_amount: 1440 * multiplier,
      percentage_used: 52.0,
      status: 'safe',
      period_type: periodType,
      period_label: pLabel,
      months_budgeted: multiplier
    },
    {
      id: 'mock-b3',
      user_id: 'user-demo',
      category_id: 'cat-103',
      category_name: 'Transport',
      type: 'expense',
      year,
      limit_amount: 2000 * multiplier,
      spent_amount: 1900 * multiplier,
      remaining_amount: 100 * multiplier,
      percentage_used: 95.0,
      status: 'warning',
      period_type: periodType,
      period_label: pLabel,
      months_budgeted: multiplier
    },
    {
      id: 'mock-b4',
      user_id: 'user-demo',
      category_id: 'cat-104',
      category_name: 'Entertainment',
      type: 'expense',
      year,
      limit_amount: 2000 * multiplier,
      spent_amount: 2200 * multiplier,
      remaining_amount: 0,
      percentage_used: 110.0,
      status: 'exceeded',
      period_type: periodType,
      period_label: pLabel,
      months_budgeted: multiplier
    }
  ];

  const mockSummary: BudgetSummary = {
    year,
    period_type: periodType,
    period_label: pLabel,
    total_budget: 14000 * multiplier,
    total_spent: 9860 * multiplier,
    total_remaining: 4140 * multiplier,
    overall_percentage: 70.4,
    budget_count: 4,
    safe_count: 2,
    warning_count: 1,
    exceeded_count: 1
  };

  return { mockBudgets, mockSummary };
};

export const BudgetsView: React.FC = () => {
  const currentDate = new Date();

  // Period View state
  const [activePeriod, setActivePeriod] = useState<BudgetPeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Default to Sept 2026 for demo data
  const [selectedQuarter, setSelectedQuarter] = useState<number>(3); // Q3
  const [selectedHalf, setSelectedHalf] = useState<number>(2); // H2
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Form fields
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formLimitAmount, setFormLimitAmount] = useState('');
  const [formMonth, setFormMonth] = useState<number>(9);
  const [formYear, setFormYear] = useState<number>(2026);
  const [formApplyToPeriod, setFormApplyToPeriod] = useState<'single_month' | 'quarter' | 'half_year' | 'year'>('single_month');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const periodValue = activePeriod === 'monthly'
      ? selectedMonth
      : activePeriod === 'quarterly'
        ? selectedQuarter
        : activePeriod === 'half_yearly'
          ? selectedHalf
          : 1;

    try {
      const [budgetsData, summaryData, categoriesData] = await Promise.all([
        getBudgets({
          period_type: activePeriod,
          period_value: periodValue,
          month: selectedMonth,
          year: selectedYear
        }),
        getBudgetSummary({
          period_type: activePeriod,
          period_value: periodValue,
          month: selectedMonth,
          year: selectedYear
        }),
        getBudgetCategories()
      ]);
      setBudgets(budgetsData);
      setSummary(summaryData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.warn('Backend budgets API unavailable or unauthenticated, loading fallback demo data:', err);
      const { mockBudgets, mockSummary } = getFallbackBudgetData(activePeriod, periodValue, selectedYear);
      setBudgets(mockBudgets);
      setSummary(mockSummary);
      setCategories(DEFAULT_FALLBACK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [activePeriod, selectedMonth, selectedQuarter, selectedHalf, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toast auto-clear
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleResetToCurrent = () => {
    const curMonth = currentDate.getMonth() + 1;
    const curYear = currentDate.getFullYear();
    setSelectedMonth(curMonth);
    setSelectedQuarter(Math.floor((curMonth - 1) / 3) + 1);
    setSelectedHalf(curMonth <= 6 ? 1 : 2);
    setSelectedYear(curYear);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setFormError(null);
    setFormLimitAmount('');
    setFormMonth(selectedMonth);
    setFormYear(selectedYear);
    setFormApplyToPeriod('single_month');
    
    // Auto-select first category that isn't budgeted yet
    const budgetedCatIds = new Set(budgets.map(b => b.category_id));
    const firstAvailable = categories.find(c => !budgetedCatIds.has(c.id));
    setFormCategoryId(firstAvailable ? firstAvailable.id : (categories[0]?.id || ''));
    setIsCreateModalOpen(true);
  };

  // Submit Create Budget
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const limit = parseFloat(formLimitAmount);
    if (isNaN(limit) || limit <= 0) {
      setFormError('Please enter a valid limit amount greater than 0.');
      return;
    }
    if (!formCategoryId) {
      setFormError('Please select a category.');
      return;
    }

    setFormSubmitting(true);
    try {
      await createBudget({
        category_id: formCategoryId,
        month: formMonth,
        year: formYear,
        limit_amount: limit,
        apply_to_period: formApplyToPeriod
      });
      setIsCreateModalOpen(false);
      const catName = categories.find(c => c.id === formCategoryId)?.name || 'Category';
      
      const periodLabelStr = formApplyToPeriod === 'year' 
        ? `all 12 months of ${formYear}` 
        : formApplyToPeriod === 'half_year' 
          ? `6 months of H${formMonth <= 6 ? 1 : 2} ${formYear}` 
          : formApplyToPeriod === 'quarter' 
            ? `Q${Math.floor((formMonth - 1) / 3) + 1} ${formYear}` 
            : `${MONTH_NAMES[formMonth - 1]} ${formYear}`;

      setSuccessMsg(`Budget for ${catName} set for ${periodLabelStr}!`);
      
      if (formMonth !== selectedMonth || formYear !== selectedYear) {
        setSelectedMonth(formMonth);
        setSelectedYear(formYear);
      } else {
        fetchData();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (b: Budget) => {
    setEditingBudget(b);
    setFormLimitAmount(b.limit_amount.toString());
    setFormError(null);
  };

  // Submit Edit Budget
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    setFormError(null);
    const limit = parseFloat(formLimitAmount);
    if (isNaN(limit) || limit <= 0) {
      setFormError('Please enter a valid limit amount greater than 0.');
      return;
    }

    setFormSubmitting(true);
    try {
      await updateBudget(editingBudget.id, { limit_amount: limit });
      setEditingBudget(null);
      setSuccessMsg(`Budget for ${editingBudget.category_name} updated!`);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete budget
  const handleDeleteConfirm = async () => {
    if (!deletingBudgetId) return;
    try {
      await deleteBudget(deletingBudgetId);
      setDeletingBudgetId(null);
      setSuccessMsg('Budget deleted successfully.');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete budget.');
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('food') || name.includes('dining')) return <Utensils size={18} />;
    if (name.includes('shop')) return <ShoppingBag size={18} />;
    if (name.includes('trans') || name.includes('travel')) return <Car size={18} />;
    if (name.includes('entert') || name.includes('movie')) return <Film size={18} />;
    if (name.includes('bill') || name.includes('util')) return <Zap size={18} />;
    if (name.includes('rent') || name.includes('hous')) return <Home size={18} />;
    if (name.includes('edu')) return <GraduationCap size={18} />;
    if (name.includes('health')) return <HeartPulse size={18} />;
    return <PieIcon size={18} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. TOP HEADER & CONTROLS BAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
            Budgets & Expense Limits
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)' }}>
            Plan category spending and track limits across monthly, quarterly, and yearly cycles.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Period Selector Tabs: Monthly, Quarterly, Half-Yearly, Yearly */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-input)',
            padding: '3px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {[
              { id: 'monthly', label: 'Monthly' },
              { id: 'quarterly', label: 'Quarterly' },
              { id: 'half_yearly', label: 'Half-Yearly' },
              { id: 'yearly', label: 'Yearly' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePeriod(tab.id as BudgetPeriodType)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activePeriod === tab.id ? 'var(--primary)' : 'transparent',
                  color: activePeriod === tab.id ? 'var(--bg)' : 'var(--secondary-text)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Context-Sensitive Period Picker Dropdown (Matching Income Page Style) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-input)',
            padding: '2px 8px',
            gap: '6px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Calendar size={16} color="var(--secondary-text)" />
            
            {/* 1. Monthly Selector */}
            {activePeriod === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--main-text)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  padding: '8px 4px',
                  cursor: 'pointer'
                }}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value} style={{ background: 'var(--card)', color: 'var(--main-text)' }}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            {/* 2. Quarterly Selector */}
            {activePeriod === 'quarterly' && (
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--main-text)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  padding: '8px 4px',
                  cursor: 'pointer'
                }}
              >
                {QUARTER_OPTIONS.map((q) => (
                  <option key={q.value} value={q.value} style={{ background: 'var(--card)', color: 'var(--main-text)' }}>
                    {q.label}
                  </option>
                ))}
              </select>
            )}

            {/* 3. Half-Yearly Selector */}
            {activePeriod === 'half_yearly' && (
              <select
                value={selectedHalf}
                onChange={(e) => setSelectedHalf(Number(e.target.value))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--main-text)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  padding: '8px 4px',
                  cursor: 'pointer'
                }}
              >
                {HALF_YEAR_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value} style={{ background: 'var(--card)', color: 'var(--main-text)' }}>
                    {h.label}
                  </option>
                ))}
              </select>
            )}

            {/* Year Selector (Always Visible) */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--main-text)',
                fontSize: '13px',
                fontWeight: 500,
                outline: 'none',
                padding: '8px 4px',
                cursor: 'pointer',
                borderLeft: activePeriod !== 'yearly' ? '1px solid var(--border)' : 'none'
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} style={{ background: 'var(--card)', color: 'var(--main-text)' }}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Quick jump to Today */}
          <button
            onClick={handleResetToCurrent}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--secondary-text)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '7px 12px',
              borderRadius: 'var(--radius-btn)',
              cursor: 'pointer'
            }}
          >
            Today
          </button>

          {/* Set New Budget Button */}
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Set Budget
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR TOASTS */}
      {successMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: 'var(--light-accent)',
          color: 'var(--accent-hover)',
          fontSize: '13.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          fontSize: '13.5px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* 2. OVERALL SUMMARY METRIC BAR */}
      {summary && (
        <div className="card-box" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--primary)'
              }}>
                {summary.period_label}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                {activePeriod.toUpperCase().replace('_', ' ')} OVERVIEW
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Total Allocated Budget
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                ₹{summary.total_budget.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                Across {summary.budget_count} categories
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Total Period Spending
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: summary.total_spent > summary.total_budget ? 'var(--danger)' : 'var(--primary)' }}>
                ₹{summary.total_spent.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                {summary.overall_percentage}% of allocated budget
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Remaining Balance
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
                ₹{summary.total_remaining.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                Safe buffer for this period
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Category Health Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--light-accent)',
                  color: 'var(--accent-hover)'
                }}>
                  {summary.safe_count} Safe
                </span>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#D97706'
                }}>
                  {summary.warning_count} Warning
                </span>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--danger)'
                }}>
                  {summary.exceeded_count} Over
                </span>
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--secondary-text)', marginBottom: '8px' }}>
              <span>Period Budget Utilization</span>
              <span>{summary.overall_percentage}%</span>
            </div>
            <div style={{
              height: '10px',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(summary.overall_percentage, 100)}%`,
                backgroundColor: summary.overall_percentage >= 100 
                  ? 'var(--danger)' 
                  : summary.overall_percentage >= 80 
                    ? '#F59E0B' 
                    : 'var(--accent)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>
      )}

      {/* 3. CATEGORY BUDGETS GRID */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
            Category Breakdowns ({budgets.length})
          </h2>
          <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
            Showing limits for {summary?.period_label || 'selected period'}
          </span>
        </div>

        {loading ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: 'var(--secondary-text)',
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)'
          }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 500 }}>Loading budgets...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--card)',
            borderRadius: 'var(--radius-card)',
            border: '1px dashed var(--border)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--light-accent)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <FolderMinus size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
              No budgets recorded for {summary?.period_label || 'this period'}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', maxWidth: '440px', margin: '0 auto 20px' }}>
              Setting category budgets for this period helps ensure discipline and tracks spending limits over time.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '13.5px', fontWeight: 600 }}
            >
              <Plus size={16} /> Set First Budget
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px'
          }}>
            {budgets.map((b) => {
              const isOver = b.status === 'exceeded';
              const isWarning = b.status === 'warning';

              const barColor = isOver 
                ? 'var(--danger)' 
                : isWarning 
                  ? '#F59E0B' 
                  : 'var(--accent)';

              const statusBadgeBg = isOver
                ? 'rgba(239, 68, 68, 0.12)'
                : isWarning
                  ? 'rgba(245, 158, 11, 0.14)'
                  : 'var(--light-accent)';

              const statusBadgeColor = isOver
                ? 'var(--danger)'
                : isWarning
                  ? '#D97706'
                  : 'var(--accent-hover)';

              const statusText = isOver
                ? `Exceeded by ₹${Math.abs(b.limit_amount - b.spent_amount).toLocaleString('en-IN')}`
                : isWarning
                  ? `${b.percentage_used}% (Near limit)`
                  : `${b.percentage_used}% spent`;

              return (
                <div 
                  key={b.id || b.category_id} 
                  className="card-box" 
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${barColor}`,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  <div>
                    {/* Card Top: Category Icon & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--card-subtle)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: barColor
                        }}>
                          {getCategoryIcon(b.category_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>
                            {b.category_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>
                            {activePeriod === 'monthly' ? 'Monthly Limit' : `${b.period_label || 'Period'} Total`}
                          </div>
                        </div>
                      </div>

                      {/* Actions (Enabled in Monthly Mode) */}
                      {activePeriod === 'monthly' && b.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            title="Edit Limit"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--secondary-text)',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingBudgetId(b.id)}
                            title="Delete Budget"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--secondary-text)',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--secondary-text)', background: 'var(--card-subtle)', padding: '3px 6px', borderRadius: '4px' }}>
                            {b.months_budgeted ? `${b.months_budgeted} mo active` : 'Aggregate'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Spend vs Limit Figures */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                          ₹{b.spent_amount.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginLeft: '4px' }}>
                          / ₹{b.limit_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Status Tag */}
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: statusBadgeBg,
                        color: statusBadgeColor
                      }}>
                        {statusText}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: '8px',
                      backgroundColor: 'var(--card-subtle)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(b.percentage_used, 100)}%`,
                        backgroundColor: barColor,
                        borderRadius: '999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--secondary-text)', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                    <span>
                      {isOver ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={13} /> Over budget!
                        </span>
                      ) : (
                        <span>₹{b.remaining_amount.toLocaleString('en-IN')} remaining</span>
                      )}
                    </span>
                    <span>{b.period_label || `${b.month}/${b.year}`}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL: CREATE BUDGET (WITH FULL FREEDOM) */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="card-box" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                Set Category Budget
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-btn)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                fontSize: '12.5px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Category Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="input-field"
                  required
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month & Year Selection (Full Freedom) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Target Month
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', cursor: 'pointer' }}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Target Year
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', cursor: 'pointer' }}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Apply Scope Option (Single Month, Quarter, Half-Year, Year) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  <Layers size={14} color="var(--accent)" /> Apply Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'single_month', label: 'Single Month' },
                    { id: 'quarter', label: 'Entire Quarter (3 mo)' },
                    { id: 'half_year', label: 'Half-Year (6 mo)' },
                    { id: 'year', label: 'Full Year (12 mo)' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormApplyToPeriod(opt.id as any)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-btn)',
                        border: formApplyToPeriod === opt.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: formApplyToPeriod === opt.id ? 'var(--light-accent)' : 'var(--card-subtle)',
                        color: formApplyToPeriod === opt.id ? 'var(--accent-hover)' : 'var(--main-text)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Limit Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Monthly Limit Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  step="0.01"
                  min="1"
                  value={formLimitAmount}
                  onChange={(e) => setFormLimitAmount(e.target.value)}
                  className="input-field"
                  required
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                  {formApplyToPeriod === 'year' 
                    ? `Will allocate ₹${formLimitAmount || 0}/month across all 12 months in ${formYear}` 
                    : formApplyToPeriod === 'quarter' 
                      ? `Will allocate ₹${formLimitAmount || 0}/month across all 3 months in Q${Math.floor((formMonth - 1) / 3) + 1}` 
                      : formApplyToPeriod === 'half_year'
                        ? `Will allocate ₹${formLimitAmount || 0}/month across all 6 months in H${formMonth <= 6 ? 1 : 2}`
                        : `Allocates ₹${formLimitAmount || 0} for ${MONTH_NAMES[formMonth - 1]} ${formYear}`}
                </span>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                >
                  {formSubmitting ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT BUDGET */}
      {editingBudget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="card-box" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                Edit Budget: {editingBudget.category_name}
              </h3>
              <button
                onClick={() => setEditingBudget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-btn)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                fontSize: '12.5px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  New Monthly Limit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formLimitAmount}
                  onChange={(e) => setFormLimitAmount(e.target.value)}
                  className="input-field"
                  required
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px', display: 'block' }}>
                  Current spend: ₹{editingBudget.spent_amount.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                >
                  {formSubmitting ? 'Updating...' : 'Save Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: DELETE CONFIRMATION */}
      {deletingBudgetId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="card-box" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px' }}>
              Delete Budget?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginBottom: '20px' }}>
              Are you sure you want to remove this budget limit? Your underlying transactions will not be deleted.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingBudgetId(null)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '9px', fontSize: '13px' }}
              >
                Keep Budget
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn"
                style={{
                  flex: 1,
                  padding: '9px',
                  fontSize: '13px',
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
