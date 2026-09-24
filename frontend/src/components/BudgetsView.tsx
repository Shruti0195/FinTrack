import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
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
  FolderMinus
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
  BudgetCategory 
} from '../api/budgets';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const BudgetsView: React.FC = () => {
  const currentDate = new Date();
  // Default to Month 9 (September) 2026 if today is earlier or matching seed data, or current date
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    // If year is 2026, default to 9 (September) so seed data immediately appears
    return 9;
  });
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
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [budgetsData, summaryData, categoriesData] = await Promise.all([
        getBudgets(selectedMonth, selectedYear),
        getBudgetSummary(selectedMonth, selectedYear),
        getBudgetCategories()
      ]);
      setBudgets(budgetsData);
      setSummary(summaryData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to load budgets:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to load budgets data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

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

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setFormError(null);
    setFormLimitAmount('');
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
        month: selectedMonth,
        year: selectedYear,
        limit_amount: limit
      });
      setIsCreateModalOpen(false);
      setSuccessMsg('Budget created successfully!');
      fetchData();
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
      
      {/* 1. TOP HEADER & MONTH SELECTOR BAR */}
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
            Plan category spending and track limits with live threshold warnings.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Month Selector Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 6px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--main-text)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'var(--primary)',
              padding: '0 10px',
              minWidth: '130px',
              textAlign: 'center'
            }}>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>

            <button
              onClick={handleNextMonth}
              title="Next Month"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--main-text)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quick jump to Current Month button */}
          {(selectedMonth !== currentDate.getMonth() + 1 || selectedYear !== currentDate.getFullYear()) && (
            <button
              onClick={handleResetToCurrentMonth}
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
          )}

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
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Total Monthly Budget
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
                Total Actual Spent
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: summary.total_spent > summary.total_budget ? 'var(--danger)' : 'var(--primary)' }}>
                ₹{summary.total_spent.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                {summary.overall_percentage}% of total allocated
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Remaining Buffer
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
                ₹{summary.total_remaining.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
                Safe to spend this month
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
              <span>Monthly Budget Utilization</span>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
            Category Breakdowns ({budgets.length})
          </h2>
          <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)' }}>
            Threshold alert at 80% and 100%
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
              No budgets set for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', maxWidth: '400px', margin: '0 auto 20px' }}>
              Setting monthly category budgets helps curb impulse spending and increases your monthly savings rate.
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
                  key={b.id} 
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
                            Monthly Allocation
                          </div>
                        </div>
                      </div>

                      {/* Edit / Delete actions */}
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

                  {/* Card Footer: Remaining text */}
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
                    <span>{b.month}/{b.year}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL: CREATE BUDGET */}
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
            maxWidth: '440px',
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

              {/* Month & Year Display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Month
                  </label>
                  <input
                    type="text"
                    disabled
                    value={MONTH_NAMES[selectedMonth - 1]}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', opacity: 0.8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                    Year
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedYear}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', opacity: 0.8 }}
                  />
                </div>
              </div>

              {/* Limit Amount */}
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
