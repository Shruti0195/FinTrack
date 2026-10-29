import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
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
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getBudgets, 
  getBudgetSummary, 
  getBudgetCategories, 
  createBudget, 
  updateBudget, 
  deleteBudget,
  getBudgetAlertPauseStatus,
  pauseBudgetAlerts,
  resumeBudgetAlerts,
  getBudgetAlertSettings
} from '../api/budgets';
import api from '../api/client';
import { CustomSelect } from './CustomSelect';
import { BudgetAlertSettingsModal, formatBudgetAlertPreview, formatBudgetCardBellSummary } from './BudgetAlertSettingsModal';
import { PauseAlertsModal } from './PauseAlertsModal';
import { PeriodCapsule } from './PeriodCapsule';
import { useTour } from '../tour';
import { budgetTourSteps } from '../tour/tourRegistry';
import type { PeriodType } from './PeriodFilterDropdown';
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

const MONTH_NAMES = MONTH_OPTIONS.map(m => m.label);
const QUICK_PERCENTAGES = [50, 75, 80, 90, 100];

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

export interface BudgetsViewProps {
  selectedMonth?: number;
  selectedYear?: number;
  periodType?: PeriodType;
  selectedQuarter?: number;
  selectedHalf?: number;
  periodLabel?: string;
  highlightedBudgetId?: string | null;
  onClearHighlight?: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedMonth: propMonth,
  selectedYear: propYear,
  periodType: propPeriodType,
  selectedQuarter: propQuarter,
  selectedHalf: propHalf,
  periodLabel: propPeriodLabel,
  highlightedBudgetId: propHighlightedBudgetId,
  onClearHighlight
}) => {

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil(currentMonth / 3);
  const currentHalf = currentMonth <= 6 ? 1 : 2;

  // Period View state
  const [activePeriod, setActivePeriod] = useState<BudgetPeriodType>('monthly');

  const { registerPageSteps, isTourActive } = useTour();

  useEffect(() => {
    registerPageSteps('budgets', budgetTourSteps);
  }, [registerPageSteps]);
  const [selectedMonth, setSelectedMonth] = useState<number>(propMonth || currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(propQuarter || currentQuarter);
  const [selectedHalf, setSelectedHalf] = useState<number>(propHalf || currentHalf);
  const [selectedYear, setSelectedYear] = useState<number>(propYear || currentYear);

  useEffect(() => {
    if (propMonth !== undefined) setSelectedMonth(propMonth);
    if (propYear !== undefined) setSelectedYear(propYear);
    if (propQuarter !== undefined) setSelectedQuarter(propQuarter);
    if (propHalf !== undefined) setSelectedHalf(propHalf);
    if (propPeriodType !== undefined) {
      const mapped: BudgetPeriodType = propPeriodType === 'half_year' ? 'half_yearly' : propPeriodType;
      setActivePeriod(mapped);
    }
  }, [propMonth, propYear, propQuarter, propHalf, propPeriodType]);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Card highlight state from notification navigation
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(propHighlightedBudgetId || null);

  useEffect(() => {
    if (propHighlightedBudgetId) {
      setActiveHighlightId(propHighlightedBudgetId);
    }
  }, [propHighlightedBudgetId]);

  useEffect(() => {
    if (!activeHighlightId) return;
    const timer = setTimeout(() => {
      const handleGlobalClick = () => {
        setActiveHighlightId(null);
        if (onClearHighlight) onClearHighlight();
      };
      window.addEventListener('click', handleGlobalClick, { once: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeHighlightId, onClearHighlight]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAlertSettingsModalOpen, setIsAlertSettingsModalOpen] = useState(false);
  const [selectedBudgetForAlerts, setSelectedBudgetForAlerts] = useState<Budget | null>(null);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isAlertsPaused, setIsAlertsPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Form fields
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formLimitAmount, setFormLimitAmount] = useState('');
  const [formMonth, setFormMonth] = useState<number>(currentMonth);
  const [formYear, setFormYear] = useState<number>(currentYear);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Alert accordion state for Create / Edit modal
  const [isAlertAccordionOpen, setIsAlertAccordionOpen] = useState<boolean>(false);
  const [customThresholds, setCustomThresholds] = useState<number[]>([80, 100]);
  const [customInApp, setCustomInApp] = useState<boolean>(true);
  const [customEmail, setCustomEmail] = useState<boolean>(true);
  const [customPctInput, setCustomPctInput] = useState<string>('');
  const [customPctError, setCustomPctError] = useState<string>('');

  // Custom Category creation state
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCategoryName.trim()) {
      setCustomCategoryError('Category name is required.');
      return;
    }
    setIsCreatingCategory(true);
    setCustomCategoryError('');
    try {
      const res = await api.post('/user/expenses/categories', { name: customCategoryName.trim() });
      const newCat: BudgetCategory = res.data;

      setCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id)) return prev;
        return [...prev, newCat];
      });

      setFormCategoryId(newCat.id);
      setCustomCategoryName('');
      setIsAddingCustomCategory(false);
      setSuccessMsg(`Custom category "${newCat.name}" added!`);
    } catch (err: any) {
      setCustomCategoryError(err.response?.data?.detail || 'Failed to create custom category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

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
      const [budgetsData, summaryData, categoriesData, pauseStatus] = await Promise.all([
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
        getBudgetCategories(),
        getBudgetAlertPauseStatus().catch(() => ({ is_paused: false, paused_until: null }))
      ]);
      setBudgets(budgetsData);
      setSummary(summaryData);
      setCategories(categoriesData);
      setIsAlertsPaused(pauseStatus.is_paused);
      setPausedUntil(pauseStatus.paused_until || null);
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

  // Alert pause handlers
  const handleResumeAlerts = async () => {
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setErrorMsg('Budget alert changes are disabled during the guided tour.');
      return;
    }
    try {
      const res = await resumeBudgetAlerts();
      setIsAlertsPaused(res.is_paused);
      setPausedUntil(null);
      setSuccessMsg('Budget alerts resumed.');
      fetchData();
    } catch {
      setErrorMsg('Failed to resume budget alerts.');
    }
  };

  const handleConfirmPause = async (duration: '1_day' | '1_week' | '1_month' | 'indefinite') => {
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setErrorMsg('Budget alert changes are disabled during the guided tour.');
      return;
    }
    try {
      const res = await pauseBudgetAlerts(duration);
      setIsAlertsPaused(res.is_paused);
      setPausedUntil(res.paused_until || null);
      setSuccessMsg('Budget alerts paused.');
      fetchData();
    } catch {
      setErrorMsg('Failed to pause budget alerts.');
    }
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setErrorMsg('Creating budgets is disabled during the guided tour.');
      return;
    }
    setFormError(null);
    setFormLimitAmount('');
    setFormMonth(selectedMonth);
    setFormYear(selectedYear);
    setIsAlertAccordionOpen(false);

    // Fetch user remembered alert settings for starting values
    getBudgetAlertSettings()
      .then((data) => {
        setCustomThresholds(data.thresholds || [80, 100]);
        setCustomInApp(data.in_app ?? true);
        setCustomEmail(data.email ?? true);
      })
      .catch(() => {
        setCustomThresholds([80, 100]);
        setCustomInApp(true);
        setCustomEmail(true);
      });

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
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setFormError('Actions that save are disabled during the guided tour.');
      return;
    }
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
        apply_to_period: 'single_month',
        has_custom_alerts: true,
        custom_alert_thresholds: customThresholds.length > 0 ? customThresholds : [80, 100],
        custom_alert_in_app: customInApp,
        custom_alert_email: customEmail
      });
      setIsCreateModalOpen(false);
      const catName = categories.find(c => c.id === formCategoryId)?.name || 'Category';
      setSuccessMsg(`Budget for ${catName} set for ${MONTH_NAMES[formMonth - 1]} ${formYear}!`);

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

  const toggleCustomThreshold = (pct: number) => {
    if (customThresholds.includes(pct)) {
      setCustomThresholds(customThresholds.filter(t => t !== pct));
    } else {
      if (customThresholds.length >= 5) {
        setCustomPctError('You can set up to 5 alert percentages.');
        return;
      }
      setCustomThresholds([...customThresholds, pct].sort((a, b) => a - b));
    }
  };

  const handleAddCustomPct = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomPctError('');
    const val = parseInt(customPctInput, 10);
    if (isNaN(val) || val < 1 || val > 150) {
      setCustomPctError('Please enter a percentage between 1 and 150.');
      return;
    }
    if (customThresholds.includes(val)) {
      setCustomPctError('This percentage is already selected.');
      return;
    }
    if (customThresholds.length >= 5) {
      setCustomPctError('You can set up to 5 alert percentages.');
      return;
    }
    setCustomThresholds([...customThresholds, val].sort((a, b) => a - b));
    setCustomPctInput('');
  };

  const handleRemoveCustomThreshold = (pct: number) => {
    setCustomThresholds(customThresholds.filter(t => t !== pct));
  };

  // Open Edit Modal
  const handleOpenEditModal = (b: Budget) => {
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setErrorMsg('Editing budgets is disabled during the guided tour.');
      return;
    }
    setEditingBudget(b);
    setFormLimitAmount(b.limit_amount.toString());
    setCustomThresholds(b.custom_alert_thresholds && b.custom_alert_thresholds.length > 0 ? b.custom_alert_thresholds : [80, 100]);
    setCustomInApp(b.custom_alert_in_app !== null && b.custom_alert_in_app !== undefined ? b.custom_alert_in_app : true);
    setCustomEmail(b.custom_alert_email !== null && b.custom_alert_email !== undefined ? b.custom_alert_email : true);
    setIsAlertAccordionOpen(false);
    setCustomPctInput('');
    setCustomPctError('');
    setFormError(null);
  };

  // Submit Edit Budget
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setFormError('Actions that save are disabled during the guided tour.');
      return;
    }
    if (!editingBudget) return;
    setFormError(null);
    const limit = parseFloat(formLimitAmount);
    if (isNaN(limit) || limit <= 0) {
      setFormError('Please enter a valid limit amount greater than 0.');
      return;
    }

    setFormSubmitting(true);
    try {
      await updateBudget(editingBudget.id, { 
        limit_amount: limit,
        has_custom_alerts: true,
        custom_alert_thresholds: customThresholds.length > 0 ? customThresholds : [80, 100],
        custom_alert_in_app: customInApp,
        custom_alert_email: customEmail
      });
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
    if (isTourActive || document.body.classList.contains('tour-active-sample')) {
      setErrorMsg('Deleting budgets is disabled during the guided tour.');
      setDeletingBudgetId(null);
      return;
    }
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
        <div data-tour="budgets-header-title">
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
            Budgets & Expense Limits
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)' }}>
            Plan category spending and track limits across monthly, quarterly, and yearly cycles.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <PeriodCapsule
            periodType={activePeriod}
            periodLabel={summary?.period_label || propPeriodLabel || `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
          />
          {/* Budget alerts pause switch */}
          <div
            data-tour="budget-pause-switch"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary)',
            }}
          >
            {isAlertsPaused ? (
              <BellOff size={15} color="var(--secondary-text)" />
            ) : (
              <Bell size={15} color="var(--accent)" />
            )}
            <span>Budget alerts</span>
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '36px',
                height: '20px',
                cursor: 'pointer',
                margin: 0,
              }}
              title={isAlertsPaused ? 'Click to resume alerts' : 'Click to pause alerts'}
            >
              <input
                type="checkbox"
                checked={!isAlertsPaused}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setIsPauseModalOpen(true);
                  } else {
                    handleResumeAlerts();
                  }
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: !isAlertsPaused ? 'var(--accent)' : 'var(--border)',
                  borderRadius: '20px',
                  transition: '0.2s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '14px',
                    width: '14px',
                    left: !isAlertsPaused ? '19px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    transition: '0.2s ease',
                  }}
                />
              </span>
            </label>
          </div>

          {/* Set New Budget Button */}
          <button
            data-tour="budgets-add-btn"
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

      {/* TOP PAUSE BANNER */}
      {isAlertsPaused && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            color: 'var(--primary)',
            fontSize: '13px',
            fontWeight: 500,
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellOff size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
            <span>
              {pausedUntil
                ? `Budget alerts are paused until ${new Date(pausedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
                : 'Budget alerts are paused.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResumeAlerts}
            className="btn btn-outline"
            style={{
              padding: '5px 12px',
              fontSize: '12.5px',
              borderColor: '#F59E0B',
              color: '#F59E0B',
              fontWeight: 600,
            }}
          >
            Resume
          </button>
        </div>
      )}

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
          backgroundColor: 'var(--light-danger)',
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

            <div data-tour="budget-status-legend">
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
                  backgroundColor: 'var(--light-warning)',
                  color: 'var(--warning)'
                }}>
                  {summary.warning_count} Warning
                </span>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--light-danger)',
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
                    ? 'var(--warning)' 
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
            {budgets.map((b, bIdx) => {
              const isOver = b.status === 'exceeded';
              const isWarning = b.status === 'warning';

              const barColor = isOver 
                ? 'var(--danger)' 
                : isWarning 
                  ? 'var(--warning)' 
                  : 'var(--accent)';

              const statusBadgeBg = isOver
                ? 'var(--light-danger)'
                : isWarning
                  ? 'var(--light-warning)'
                  : 'var(--light-accent)';

              const statusBadgeColor = isOver
                ? 'var(--danger)'
                : isWarning
                  ? 'var(--warning)'
                  : 'var(--accent-hover)';

              const statusText = isOver
                ? `Exceeded by ₹${Math.abs(b.limit_amount - b.spent_amount).toLocaleString('en-IN')}`
                : isWarning
                  ? `${b.percentage_used}% (Near limit)`
                  : `${b.percentage_used}% spent`;

              const isHighlighted = Boolean(
                activeHighlightId && (b.id === activeHighlightId || b.category_id === activeHighlightId)
              );

              return (
                <div 
                  key={b.id || b.category_id} 
                  className="card-box"
                  {...(bIdx === 0 ? { 'data-tour': 'budget-card' } : {})} 
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${barColor}`,
                    boxShadow: isHighlighted ? '0 0 0 3px var(--accent), var(--shadow-lg)' : undefined,
                    backgroundColor: isHighlighted ? 'var(--light-accent)' : undefined,
                    transition: 'all 0.25s ease'
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>
                              {b.category_name}
                            </span>
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

                    {/* Card-level Alert Summary Bell Button */}
                    <button
                      type="button"
                      {...(bIdx === 0 ? { 'data-tour': 'budget-alert-bell' } : {})}
                      onClick={() => {
                        setSelectedBudgetForAlerts(b);
                        setIsAlertSettingsModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: isAlertsPaused ? '1px dashed var(--border)' : '1px solid rgba(16, 185, 129, 0.25)',
                        backgroundColor: isAlertsPaused ? 'var(--card-subtle)' : 'rgba(16, 185, 129, 0.08)',
                        color: isAlertsPaused ? 'var(--secondary-text)' : 'var(--accent)',
                        fontSize: '11.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        marginBottom: '10px',
                        textAlign: 'left',
                        transition: '0.15s ease',
                      }}
                      title="Click to view and edit alert settings for this budget"
                    >
                      {isAlertsPaused ? (
                        <BellOff size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                      ) : (
                        <Bell size={13} style={{ flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          opacity: isAlertsPaused ? 0.75 : 1,
                        }}
                      >
                        {formatBudgetCardBellSummary(
                          b.custom_alert_thresholds,
                          b.custom_alert_in_app,
                          b.custom_alert_email,
                          isAlertsPaused
                        )}
                      </span>
                    </button>
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
                backgroundColor: 'var(--light-danger)',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--main-text)' }}>
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomCategory(!isAddingCustomCategory);
                      setCustomCategoryError('');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--accent)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} />
                    <span>{isAddingCustomCategory ? 'Cancel' : 'Add Custom Category'}</span>
                  </button>
                </div>

                {isAddingCustomCategory ? (
                  <div style={{
                    backgroundColor: 'var(--card-subtle)',
                    border: '1px solid var(--accent)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                      Create Custom Category (Private to your account)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. Subscriptions, Pet Care"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="input-field"
                        style={{ height: '38px', fontSize: '13.5px', flex: 1 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomCategory}
                        disabled={isCreatingCategory}
                        className="btn-primary"
                        style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                      >
                        {isCreatingCategory ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                    {customCategoryError && (
                      <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                        {customCategoryError}
                      </div>
                    )}
                  </div>
                ) : (
                  <CustomSelect
                    value={formCategoryId}
                    onChange={(val) => setFormCategoryId(String(val))}
                    options={categories.map((c) => ({ value: c.id, label: `${c.name}${c.user_id ? ' (Custom)' : ''}` }))}
                    placeholder="Select category..."
                    style={{ width: '100%' }}
                    buttonStyle={{ height: '42px', fontSize: '14px' }}
                  />
                )}
              </div>

              {/* Month & Year Selection (Full Freedom) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Target Month
                  </label>
                  <CustomSelect
                    value={formMonth}
                    onChange={(val) => setFormMonth(Number(val))}
                    options={MONTH_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
                    style={{ width: '100%' }}
                    buttonStyle={{ height: '42px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Target Year
                  </label>
                  <CustomSelect
                    value={formYear}
                    onChange={(val) => setFormYear(Number(val))}
                    options={[2024, 2025, 2026, 2027, 2028].map((y) => ({ value: y, label: String(y) }))}
                    style={{ width: '100%' }}
                    buttonStyle={{ height: '42px', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Monthly Limit Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Monthly Limit (₹)
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
                  Spending limit for {MONTH_NAMES[formMonth - 1]} {formYear}
                </span>
              </div>

              {/* Collapsible Alert Settings Section */}
              <div
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAlertAccordionOpen(!isAlertAccordionOpen)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={15} color="var(--accent)" />
                    <span>Alert settings</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-text)', fontSize: '12px' }}>
                    <span>{customThresholds.length > 0 ? customThresholds.map((t) => `${t}%`).join(', ') : 'None'}</span>
                    {isAlertAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isAlertAccordionOpen && (
                  <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: '10px' }}>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                        Alert me at (% of budget used):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {QUICK_PERCENTAGES.map((pct) => {
                          const isSel = customThresholds.includes(pct);
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => toggleCustomThreshold(pct)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                                backgroundColor: isSel ? 'var(--light-accent)' : 'var(--card-box)',
                                color: isSel ? 'var(--accent)' : 'var(--main-text)',
                                fontSize: '11.5px',
                                fontWeight: isSel ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        <input
                          type="number"
                          min="1"
                          max="150"
                          placeholder="Custom % (1-150)"
                          value={customPctInput}
                          onChange={(e) => setCustomPctInput(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card-box)',
                            color: 'var(--main-text)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomPct}
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          Add
                        </button>
                      </div>
                      {customPctError && (
                        <span style={{ fontSize: '11px', color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>
                          {customPctError}
                        </span>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {customThresholds.map((pct) => (
                          <span
                            key={pct}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--accent)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            {pct}%
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomThreshold(pct)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)' }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--main-text)' }}>In-app notification</span>
                        <input
                          type="checkbox"
                          checked={customInApp}
                          onChange={(e) => setCustomInApp(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--main-text)' }}>Email notification</span>
                        <input
                          type="checkbox"
                          checked={customEmail}
                          onChange={(e) => setCustomEmail(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: !customInApp && !customEmail ? 'var(--warning)' : 'var(--secondary-text)', lineHeight: 1.4 }}>
                      {formatBudgetAlertPreview(customThresholds, customInApp, customEmail, true)}
                    </div>
                  </div>
                )}
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
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
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
                backgroundColor: 'var(--light-danger)',
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

              {/* Collapsible Alert Settings Section */}
              <div
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAlertAccordionOpen(!isAlertAccordionOpen)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={15} color="var(--accent)" />
                    <span>Alert settings</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-text)', fontSize: '12px' }}>
                    <span>{customThresholds.length > 0 ? customThresholds.map((t) => `${t}%`).join(', ') : 'None'}</span>
                    {isAlertAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isAlertAccordionOpen && (
                  <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: '10px' }}>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                        Alert me at (% of budget used):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {QUICK_PERCENTAGES.map((pct) => {
                          const isSel = customThresholds.includes(pct);
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => toggleCustomThreshold(pct)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                                backgroundColor: isSel ? 'var(--light-accent)' : 'var(--card-box)',
                                color: isSel ? 'var(--accent)' : 'var(--main-text)',
                                fontSize: '11.5px',
                                fontWeight: isSel ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        <input
                          type="number"
                          min="1"
                          max="150"
                          placeholder="Custom % (1-150)"
                          value={customPctInput}
                          onChange={(e) => setCustomPctInput(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--card-box)',
                            color: 'var(--main-text)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomPct}
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          Add
                        </button>
                      </div>
                      {customPctError && (
                        <span style={{ fontSize: '11px', color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>
                          {customPctError}
                        </span>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {customThresholds.map((pct) => (
                          <span
                            key={pct}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--accent)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            {pct}%
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomThreshold(pct)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)' }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--main-text)' }}>In-app notification</span>
                        <input
                          type="checkbox"
                          checked={customInApp}
                          onChange={(e) => setCustomInApp(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--main-text)' }}>Email notification</span>
                        <input
                          type="checkbox"
                          checked={customEmail}
                          onChange={(e) => setCustomEmail(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: !customInApp && !customEmail ? 'var(--warning)' : 'var(--secondary-text)', lineHeight: 1.4 }}>
                      {formatBudgetAlertPreview(customThresholds, customInApp, customEmail, true)}
                    </div>
                  </div>
                )}
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

      {/* 7. MODAL: BUDGET ALERT SETTINGS */}
      <BudgetAlertSettingsModal
        isOpen={isAlertSettingsModalOpen}
        onClose={() => {
          setIsAlertSettingsModalOpen(false);
          setSelectedBudgetForAlerts(null);
        }}
        budget={selectedBudgetForAlerts}
        isPagePaused={isAlertsPaused}
        onSaved={fetchData}
      />

      {/* 8. MODAL: PAUSE ALERTS DURATION */}
      <PauseAlertsModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onConfirm={handleConfirmPause}
        type="budget"
      />

    </div>
  );
};
