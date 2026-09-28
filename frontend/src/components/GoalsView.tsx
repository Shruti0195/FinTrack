import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Award,
  X,
  Smartphone,
  Plane,
  ShieldCheck,
  Home,
  Car,
  Laptop,
  Gift,
  Heart,
  Zap
} from 'lucide-react';
import type { Goal, GoalSummary, GoalContribution } from '../api/goals';
import {
  getGoals,
  getGoalsSummary,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalContribution,
  updateGoalContribution,
  deleteGoalContribution,
} from '../api/goals';

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'No deadline';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const COLOR_PALETTE = [
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Deep Navy', hex: '#0F172A' },
  { name: 'Royal Blue', hex: '#3B82F6' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Amber', hex: '#F59E0B' }
];

const ICON_OPTIONS = [
  { id: 'target', label: 'Target', IconComp: Target },
  { id: 'phone', label: 'Phone', IconComp: Smartphone },
  { id: 'plane', label: 'Travel', IconComp: Plane },
  { id: 'shield', label: 'Emergency', IconComp: ShieldCheck },
  { id: 'home', label: 'Home', IconComp: Home },
  { id: 'car', label: 'Vehicle', IconComp: Car },
  { id: 'laptop', label: 'Gadget', IconComp: Laptop },
  { id: 'gift', label: 'Gift', IconComp: Gift },
  { id: 'sparkles', label: 'Dream', IconComp: Sparkles },
  { id: 'heart', label: 'Personal', IconComp: Heart }
];

const renderGoalIcon = (iconId: string, size = 20, color = '#10B981') => {
  const found = ICON_OPTIONS.find((i) => i.id === iconId);
  const Component = found ? found.IconComp : Target;
  return <Component size={size} color={color} />;
};

export const GoalsView: React.FC = () => {
  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'celebrate' } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Detail Modal
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const selectedGoalDetail = goals.find((g) => g.id === selectedGoalId) || null;

  // Quick Add Money 2-Tap Modal
  const [quickAddGoal, setQuickAddGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState<string>('');
  const [contribNote, setContribNote] = useState<string>('');
  const [contribDate, setContribDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [addMoneyError, setAddMoneyError] = useState<string>('');

  // Contribution Edit Modal
  const [editingContrib, setEditingContrib] = useState<{ goal: Goal; contrib: GoalContribution } | null>(null);
  const [editContribAmount, setEditContribAmount] = useState<string>('');
  const [editContribNote, setEditContribNote] = useState<string>('');
  const [editContribDate, setEditContribDate] = useState<string>('');
  const [editContribError, setEditContribError] = useState<string>('');

  // Delete Confirmations
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [deleteContribTarget, setDeleteContribTarget] = useState<{ goalId: string; contribId: string } | null>(null);

  // Form state for Create / Edit Goal
  const [formTitle, setFormTitle] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formTimeframeMode, setFormTimeframeMode] = useState<'months' | 'custom'>('months');
  const [formMonths, setFormMonths] = useState<number>(3);
  const [formDeadline, setFormDeadline] = useState('');
  const [formColor, setFormColor] = useState('#10B981');
  const [formIcon, setFormIcon] = useState('target');
  const [formError, setFormError] = useState('');

  const showToast = (text: string, type: 'success' | 'info' | 'celebrate' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const loadGoalsData = useCallback(async () => {
    try {
      setLoading(true);
      const [goalsData, summaryData] = await Promise.all([
        getGoals(filterTab === 'all' ? undefined : filterTab),
        getGoalsSummary()
      ]);
      setGoals(goalsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  }, [filterTab]);

  useEffect(() => {
    loadGoalsData();
  }, [loadGoalsData]);

  // Calculate live monthly suggestion for Create/Edit Modal
  const computeLiveMonthlySuggestion = () => {
    const amt = parseFloat(formTargetAmount);
    if (isNaN(amt) || amt <= 0) return null;

    let totalMonths = 1;
    if (formTimeframeMode === 'months') {
      totalMonths = Math.max(1, formMonths);
    } else if (formDeadline) {
      const today = new Date();
      const targetDate = new Date(formDeadline);
      const diffDays = (targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
      totalMonths = Math.max(1, Math.ceil(diffDays / 30.44));
    }

    const perMonth = Math.round(amt / totalMonths);
    return { perMonth, totalMonths };
  };

  // Open Create Goal Modal
  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormTargetAmount('');
    setFormTimeframeMode('months');
    setFormMonths(3);
    setFormDeadline('');
    setFormColor('#10B981');
    setFormIcon('target');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Goal Modal
  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormTargetAmount(String(goal.target_amount));
    setFormTimeframeMode('custom');
    setFormDeadline(goal.deadline || '');
    setFormMonths(3);
    setFormColor(goal.color || '#10B981');
    setFormIcon(goal.icon || 'target');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Create Goal Submit
  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetAmt = parseFloat(formTargetAmount);
    if (!formTitle.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (isNaN(targetAmt) || targetAmt <= 0) {
      setFormError('Target amount must be a positive number greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createGoal({
        title: formTitle.trim(),
        target_amount: targetAmt,
        months: formTimeframeMode === 'months' ? formMonths : undefined,
        deadline: formTimeframeMode === 'custom' && formDeadline ? formDeadline : undefined,
        color: formColor,
        icon: formIcon
      });

      setIsCreateModalOpen(false);
      showToast(`Great start! Your "${created.title}" savings fund begins today. 🚀`, 'celebrate');
      await loadGoalsData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create goal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Goal Submit
  const handleEditGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setFormError('');

    const targetAmt = parseFloat(formTargetAmount);
    if (!formTitle.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (isNaN(targetAmt) || targetAmt <= 0) {
      setFormError('Target amount must be a positive number greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateGoal(editingGoal.id, {
        title: formTitle.trim(),
        target_amount: targetAmt,
        deadline: formTimeframeMode === 'custom' && formDeadline ? formDeadline : undefined,
        color: formColor,
        icon: formIcon
      });

      setIsEditModalOpen(false);
      setEditingGoal(null);
      showToast(`Updated "${updated.title}" goal target & progress preferences.`, 'info');
      await loadGoalsData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update goal.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Goal
  const handleConfirmDeleteGoal = async () => {
    if (!deleteGoalId) return;
    try {
      await deleteGoal(deleteGoalId);
      setDeleteGoalId(null);
      if (selectedGoalId === deleteGoalId) {
        setSelectedGoalId(null);
      }
      showToast('Goal and history deleted successfully.', 'info');
      await loadGoalsData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete goal.', 'info');
    }
  };

  // Open 2-Tap Quick Add Money Modal
  const handleOpenAddMoney = (goal: Goal) => {
    if (goal.status === 'completed' || goal.percentage >= 100 || goal.remaining_amount <= 0) {
      showToast(`"${goal.title}" is already 100% achieved! 🎉 No further contributions needed.`, 'info');
      return;
    }
    setQuickAddGoal(goal);
    setContribAmount('');
    setContribNote('');
    setContribDate(new Date().toISOString().split('T')[0]);
    setAddMoneyError('');
  };

  // Submit Add Money (2-Tap Action)
  const handleAddMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddGoal) return;
    setAddMoneyError('');

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setAddMoneyError('Please enter a valid positive contribution amount.');
      return;
    }

    if (amt > quickAddGoal.remaining_amount) {
      setAddMoneyError(`Cannot add ${formatINR(amt)}. Remaining amount to reach goal target is ${formatINR(quickAddGoal.remaining_amount)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const updatedGoal = await addGoalContribution(quickAddGoal.id, {
        amount: amt,
        note: contribNote.trim() || undefined,
        contributed_at: contribDate || undefined
      });

      setQuickAddGoal(null);

      // Check celebration milestone
      if (updatedGoal.percentage >= 100) {
        showToast(`🎉 AMAZING! You've officially achieved your goal for "${updatedGoal.title}"! Celebration time! 🥳`, 'celebrate');
      } else {
        showToast(`Added ${formatINR(amt)} to "${updatedGoal.title}". ${updatedGoal.cheering_message}`, 'success');
      }

      await loadGoalsData();
    } catch (err: any) {
      setAddMoneyError(err.response?.data?.detail || 'Failed to add contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Contribution Modal
  const handleOpenEditContrib = (goal: Goal, contrib: GoalContribution) => {
    setEditingContrib({ goal, contrib });
    setEditContribAmount(String(contrib.amount));
    setEditContribNote(contrib.note || '');
    setEditContribDate(contrib.contributed_at);
    setEditContribError('');
  };

  // Submit Edit Contribution
  const handleEditContribSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContrib) return;
    setEditContribError('');

    const amt = parseFloat(editContribAmount);
    if (isNaN(amt) || amt <= 0) {
      setEditContribError('Please enter a valid contribution amount.');
      return;
    }

    const savedWithoutThis = editingContrib.goal.saved_amount - editingContrib.contrib.amount;
    const maxAllowed = editingContrib.goal.target_amount - savedWithoutThis;

    if (amt > maxAllowed + 0.01) {
      setEditContribError(`Contribution amount (${formatINR(amt)}) exceeds the goal target (${formatINR(editingContrib.goal.target_amount)}). Maximum allowed for this entry is ${formatINR(maxAllowed)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await updateGoalContribution(editingContrib.goal.id, editingContrib.contrib.id, {
        amount: amt,
        note: editContribNote.trim() || undefined,
        contributed_at: editContribDate || undefined
      });

      setEditingContrib(null);
      showToast(`Updated contribution to ${formatINR(amt)}. Progress recalculated!`, 'info');
      await loadGoalsData();
    } catch (err: any) {
      setEditContribError(err.response?.data?.detail || 'Failed to update contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Contribution
  const handleConfirmDeleteContrib = async () => {
    if (!deleteContribTarget) return;
    try {
      await deleteGoalContribution(deleteContribTarget.goalId, deleteContribTarget.contribId);
      setDeleteContribTarget(null);
      showToast('Contribution removed. Remaining target recalculated.', 'info');
      await loadGoalsData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete contribution.', 'info');
    }
  };

  // Extend Overdue Goal Deadline by 1 Month
  const handleExtendDeadline = async (goal: Goal) => {
    const today = new Date();
    const newDeadline = new Date(today.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    try {
      await updateGoal(goal.id, { deadline: newDeadline });
      showToast(`Deadline for "${goal.title}" extended by 30 days. You've got this! 💪`, 'success');
      await loadGoalsData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* 1. TOAST NOTIFICATION / CHEERING BANNER */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '12px',
          backgroundColor: toastMsg.type === 'celebrate' ? '#0F172A' : toastMsg.type === 'info' ? '#3B82F6' : '#10B981',
          color: '#FFFFFF',
          fontSize: '13.5px',
          fontWeight: 600,
          boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.25)',
          border: toastMsg.type === 'celebrate' ? '2px solid #10B981' : 'none',
          animation: 'dropdownFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          maxWidth: '420px'
        }}>
          {toastMsg.type === 'celebrate' ? <Sparkles size={20} color="#10B981" /> : <CheckCircle2 size={18} />}
          <div style={{ flex: 1 }}>{toastMsg.text}</div>
          <button
            onClick={() => setToastMsg(null)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px', opacity: 0.8 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--light-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Target size={18} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Financial Goals
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--secondary-text)', margin: 0 }}>
            Set meaningful targets, save step-by-step, and watch your progress grow.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '13.5px',
            fontWeight: 600,
            borderRadius: 'var(--radius-btn)',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Create New Goal</span>
        </button>
      </div>

      {/* 3. SUMMARY KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Total Target */}
        <div className="card-box" style={{ padding: '20px', borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Goals Target</span>
            <Target size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
            {formatINR(summary?.total_target_amount || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            Across <b>{summary?.total_goals || 0}</b> total goals
          </div>
        </div>

        {/* Total Saved */}
        <div className="card-box" style={{ padding: '20px', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Saved So Far</span>
            <TrendingUp size={18} color="#3B82F6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6', letterSpacing: '-0.02em' }}>
            {formatINR(summary?.total_saved_amount || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '4px' }}>
            <b>{summary?.overall_percentage || 0}%</b> of overall target reached
          </div>
        </div>

        {/* Goals Breakdown */}
        <div className="card-box" style={{ padding: '20px', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--secondary-text)', fontWeight: 500 }}>Goals Breakdown</span>
            <Award size={18} color="#8B5CF6" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{summary?.active_goals || 0}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Active</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#8B5CF6' }}>{summary?.completed_goals || 0}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)' }}>Completed 🎉</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FILTER SEGMENT TABS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '4px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
        }}>
          {(['all', 'active', 'completed'] as const).map((tab) => {
            const isSel = filterTab === tab;
            const labels = { all: 'All Goals', active: 'Active Goals', completed: 'Completed 🎉' };
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: isSel ? 600 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSel ? 'var(--accent)' : 'transparent',
                  color: isSel ? '#FFFFFF' : 'var(--secondary-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. GOALS CARDS GRID */}
      {loading ? (
        <div className="card-box" style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary-text)' }}>
          Loading your financial goals...
        </div>
      ) : goals.length === 0 ? (
        /* FIRST-TIME FRIENDLY EMPTY STATE */
        <div className="card-box" style={{
          padding: '60px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--card)',
          borderRadius: '12px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--light-accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
            Start Saving for Something Special!
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary-text)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Create your first savings goal (e.g. <i>"New Phone"</i>, <i>"Emergency Fund"</i>, or <i>"Goa Trip"</i>).
            Track progress step-by-step and watch your savings grow!
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '13.5px', margin: '0 auto' }}
          >
            <Plus size={16} /> Create Your First Goal
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {goals.map((goal) => {
            const isCompleted = goal.status === 'completed' || goal.percentage >= 100;
            const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && !isCompleted;
            const goalColor = goal.color || '#10B981';

            return (
              <div
                key={goal.id}
                className="card-box"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: isCompleted ? '2px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Top Row: Icon, Title, Options */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: `${goalColor}1A`,
                        border: `1px solid ${goalColor}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {renderGoalIcon(goal.icon, 22, goalColor)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0, lineHeight: 1.2 }}>
                          {goal.title}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                          Target: <b>{formatINR(goal.target_amount)}</b>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className="badge-pill" style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      backgroundColor: isCompleted ? 'var(--light-accent)' : isOverdue ? 'rgba(245, 158, 11, 0.15)' : 'var(--card-subtle)',
                      color: isCompleted ? 'var(--accent)' : isOverdue ? 'var(--warning)' : 'var(--secondary-text)',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {isCompleted ? 'Achieved 🎉' : isOverdue ? 'Deadline Passed' : 'Active'}
                    </span>
                  </div>

                  {/* Progress Bar & Amounts */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--secondary-text)' }}>
                        Saved: <strong style={{ color: 'var(--primary)' }}>{formatINR(goal.saved_amount)}</strong>
                      </span>
                      <strong style={{ color: goalColor, fontWeight: 700 }}>
                        {goal.percentage}%
                      </strong>
                    </div>

                    {/* Outer Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '10px',
                      backgroundColor: 'var(--border)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${Math.min(100, goal.percentage)}%`,
                        height: '100%',
                        backgroundColor: goalColor,
                        borderRadius: '999px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Remaining & Deadline Subtext */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--secondary-text)', marginTop: '6px' }}>
                      <span>Remaining: <b>{formatINR(goal.remaining_amount)}</b></span>
                      <span>{goal.deadline ? `Target: ${formatDate(goal.deadline)}` : 'No fixed date'}</span>
                    </div>
                  </div>

                  {/* Monthly Suggestion Box */}
                  {!isCompleted && goal.suggested_monthly_savings > 0 && (
                    <div style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: 'var(--main-text)',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Zap size={14} color="var(--accent)" />
                      <span>Save <b>{formatINR(goal.suggested_monthly_savings)}/month</b> to reach target on time.</span>
                    </div>
                  )}

                  {/* Warm Cheering Note Box */}
                  <div style={{
                    backgroundColor: `${goalColor}0D`,
                    borderLeft: `3px solid ${goalColor}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--main-text)',
                    fontStyle: 'italic',
                    marginBottom: '16px',
                    lineHeight: 1.4
                  }}>
                    "{goal.cheering_message}"
                  </div>

                  {/* Overdue Deadline Gentle Nudge */}
                  {isOverdue && (
                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid var(--warning)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: 'var(--main-text)'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '4px' }}>
                        Deadline Passed
                      </div>
                      You're already <b>{goal.percentage}%</b> there! Would you like to extend your deadline by 30 days?
                      <button
                        onClick={() => handleExtendDeadline(goal)}
                        className="btn-outline"
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          height: '28px',
                          fontSize: '11.5px',
                          borderColor: 'var(--warning)',
                          color: 'var(--warning)'
                        }}
                      >
                        + Extend Deadline 30 Days
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Row: 2-Tap Quick Add Money Button & Details */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => handleOpenAddMoney(goal)}
                    disabled={isCompleted}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      height: '36px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: isCompleted ? 'var(--border)' : goalColor,
                      borderColor: isCompleted ? 'var(--border)' : goalColor,
                      cursor: isCompleted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Plus size={15} /> Add Money
                  </button>

                  <button
                    onClick={() => setSelectedGoalId(goal.id)}
                    className="btn-outline"
                    style={{ height: '36px', padding: '0 12px', fontSize: '12.5px' }}
                    title="View Goal Details & Contribution History"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(goal)}
                    className="btn-outline"
                    style={{ height: '36px', padding: '0 10px', color: 'var(--secondary-text)' }}
                    title="Edit Goal"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. CREATE / EDIT GOAL MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  {isEditModalOpen ? 'Edit Savings Goal' : 'Create Savings Goal'}
                </h3>
              </div>
              <button
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingGoal(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={isEditModalOpen ? handleEditGoalSubmit : handleCreateGoalSubmit} style={{ padding: '20px' }}>
              {formError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                  fontWeight: 500
                }}>
                  {formError}
                </div>
              )}

              {/* Goal Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                  Goal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Phone, Goa Vacation, Emergency Fund"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '13.5px' }}
                  required
                  autoFocus
                />
              </div>

              {/* Target Amount */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                  Target Amount (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 30000"
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(e.target.value)}
                  className="input-field"
                  style={{ height: '40px', fontSize: '14px', fontWeight: 600 }}
                  required
                />
              </div>

              {/* Target Timeframe Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Target Timeframe *
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormTimeframeMode('months')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: formTimeframeMode === 'months' ? 600 : 500,
                      borderRadius: '6px',
                      border: `1px solid ${formTimeframeMode === 'months' ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: formTimeframeMode === 'months' ? 'var(--light-accent)' : 'transparent',
                      color: formTimeframeMode === 'months' ? 'var(--accent)' : 'var(--secondary-text)',
                      cursor: 'pointer'
                    }}
                  >
                    Quick Duration (Months)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTimeframeMode('custom')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: formTimeframeMode === 'custom' ? 600 : 500,
                      borderRadius: '6px',
                      border: `1px solid ${formTimeframeMode === 'custom' ? 'var(--accent)' : 'var(--border)'}`,
                      backgroundColor: formTimeframeMode === 'custom' ? 'var(--light-accent)' : 'transparent',
                      color: formTimeframeMode === 'custom' ? 'var(--accent)' : 'var(--secondary-text)',
                      cursor: 'pointer'
                    }}
                  >
                    Specific Target Date
                  </button>
                </div>

                {formTimeframeMode === 'months' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMonths(m)}
                        style={{
                          flex: 1,
                          height: '34px',
                          fontSize: '12px',
                          fontWeight: formMonths === m ? 700 : 500,
                          borderRadius: '6px',
                          border: `1px solid ${formMonths === m ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: formMonths === m ? 'var(--accent)' : 'var(--card)',
                          color: formMonths === m ? '#FFFFFF' : 'var(--main-text)',
                          cursor: 'pointer'
                        }}
                      >
                        {m} {m === 1 ? 'Mo' : 'Mos'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                )}
              </div>

              {/* Dynamic Live Monthly Suggestion Banner */}
              {computeLiveMonthlySuggestion() && (
                <div style={{
                  backgroundColor: 'var(--light-accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                  color: 'var(--primary)'
                }}>
                  💡 To reach <b>{formatINR(parseFloat(formTargetAmount))}</b> in <b>{computeLiveMonthlySuggestion()?.totalMonths} month(s)</b>,
                  you need to save about <b>{formatINR(computeLiveMonthlySuggestion()?.perMonth || 0)}/month</b>.
                </div>
              )}

              {/* Personalization: Icon & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                    Pick Icon
                  </label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px' }}
                  >
                    {ICON_OPTIONS.map((i) => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                    Color Tag
                  </label>
                  <div style={{ display: 'flex', gap: '6px', height: '38px', alignItems: 'center' }}>
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormColor(c.hex)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: c.hex,
                          border: formColor === c.hex ? '2px solid var(--primary)' : 'none',
                          cursor: 'pointer',
                          transform: formColor === c.hex ? 'scale(1.15)' : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingGoal(null); }}
                  className="btn-outline"
                  style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
                >
                  {submitting ? 'Saving...' : isEditModalOpen ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. QUICK 2-TAP "ADD MONEY" MODAL */}
      {quickAddGoal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--accent)" />
                <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  Add Money to {quickAddGoal.title}
                </h3>
              </div>
              <button
                onClick={() => setQuickAddGoal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMoneySubmit} style={{ padding: '20px' }}>
              {addMoneyError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  marginBottom: '16px',
                  fontWeight: 600,
                  lineHeight: 1.4
                }}>
                  ⚠️ {addMoneyError}
                </div>
              )}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                  Contribution Amount (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 500"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '16px', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                  Short Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freelance bonus, Diwali savings"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setQuickAddGoal(null)}
                  className="btn-outline"
                  style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ height: '38px', padding: '0 22px', fontSize: '13.5px', fontWeight: 600 }}
                >
                  {submitting ? 'Saving...' : 'Add Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. GOAL DETAIL VIEW MODAL & HISTORY */}
      {selectedGoalDetail && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 998,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: `${selectedGoalDetail.color}1A`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {renderGoalIcon(selectedGoalDetail.icon, 24, selectedGoalDetail.color)}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                    {selectedGoalDetail.title}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    Target Date: <b>{formatDate(selectedGoalDetail.deadline)}</b>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGoalId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Progress Summary Card */}
              <div style={{
                backgroundColor: 'var(--card-subtle)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500 }}>Overall Goal Progress</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: selectedGoalDetail.color }}>{selectedGoalDetail.percentage}%</span>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: 'var(--border)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: `${Math.min(100, selectedGoalDetail.percentage)}%`,
                    height: '100%',
                    backgroundColor: selectedGoalDetail.color,
                    borderRadius: '999px'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Saved: <b style={{ color: 'var(--accent)' }}>{formatINR(selectedGoalDetail.saved_amount)}</b></span>
                  <span>Target: <b style={{ color: 'var(--primary)' }}>{formatINR(selectedGoalDetail.target_amount)}</b></span>
                </div>
              </div>

              {/* Contribution History Table */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                    Contribution History ({selectedGoalDetail.contributions.length})
                  </h4>
                  <button
                    onClick={() => handleOpenAddMoney(selectedGoalDetail)}
                    disabled={selectedGoalDetail.status === 'completed' || selectedGoalDetail.percentage >= 100}
                    className="btn-primary"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '12px',
                      backgroundColor: (selectedGoalDetail.status === 'completed' || selectedGoalDetail.percentage >= 100) ? 'var(--border)' : undefined,
                      borderColor: (selectedGoalDetail.status === 'completed' || selectedGoalDetail.percentage >= 100) ? 'var(--border)' : undefined,
                      cursor: (selectedGoalDetail.status === 'completed' || selectedGoalDetail.percentage >= 100) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    + Add Money
                  </button>
                </div>

                {selectedGoalDetail.contributions.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--secondary-text)', textAlign: 'center', padding: '24px', backgroundColor: 'var(--card-subtle)', borderRadius: '8px' }}>
                    No contributions added yet. Click "+ Add Money" to start saving!
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--card-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--secondary-text)' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Note</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGoalDetail.contributions.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(c.contributed_at)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--secondary-text)' }}>{c.note || '—'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                              +{formatINR(c.amount)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                <button
                                  onClick={() => handleOpenEditContrib(selectedGoalDetail, c)}
                                  style={{ border: 'none', background: 'none', color: 'var(--secondary-text)', cursor: 'pointer' }}
                                  title="Edit contribution"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteContribTarget({ goalId: selectedGoalDetail.id, contribId: c.id })}
                                  style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                  title="Delete contribution"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Goal Management Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setDeleteGoalId(selectedGoalDetail.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--danger)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={14} /> Delete Goal
                </button>

                <button
                  onClick={() => handleOpenEditModal(selectedGoalDetail)}
                  className="btn-outline"
                  style={{ height: '34px', padding: '0 14px', fontSize: '12.5px' }}
                >
                  Edit Goal Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. EDIT CONTRIBUTION MODAL */}
      {editingContrib && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{ backgroundColor: 'var(--card)', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '380px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px' }}>
              Edit Contribution Entry
            </h3>

            <form onSubmit={handleEditContribSubmit}>
              {editContribError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                  fontWeight: 600,
                  lineHeight: 1.4
                }}>
                  ⚠️ {editContribError}
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Amount (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editContribAmount}
                  onChange={(e) => setEditContribAmount(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '14px', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Note (Optional)</label>
                <input
                  type="text"
                  value={editContribNote}
                  onChange={(e) => setEditContribNote(e.target.value)}
                  className="input-field"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  value={editContribDate}
                  onChange={(e) => setEditContribDate(e.target.value)}
                  className="input-field"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingContrib(null)} className="btn-outline" style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ height: '34px', padding: '0 16px', fontSize: '12px' }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. DELETE CONFIRMATION MODALS */}
      {deleteGoalId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card)', borderRadius: '12px', padding: '24px', maxWidth: '380px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <Trash2 size={28} color="var(--danger)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>Delete Savings Goal?</h4>
            <p style={{ fontSize: '13px', color: 'var(--secondary-text)', margin: '0 0 20px' }}>
              Are you sure you want to delete this goal and all contribution records? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteGoalId(null)} className="btn-outline" style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleConfirmDeleteGoal} style={{ height: '36px', padding: '0 20px', fontSize: '13px', fontWeight: 600, backgroundColor: 'var(--danger)', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Delete Goal</button>
            </div>
          </div>
        </div>
      )}

      {deleteContribTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--card)', borderRadius: '12px', padding: '24px', maxWidth: '360px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <Trash2 size={24} color="var(--danger)" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>Delete Contribution Entry?</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--secondary-text)', margin: '0 0 18px' }}>
              Remove this payment entry from your goal history? Saved total will update.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteContribTarget(null)} className="btn-outline" style={{ height: '34px', padding: '0 14px', fontSize: '12px' }}>Cancel</button>
              <button onClick={handleConfirmDeleteContrib} style={{ height: '34px', padding: '0 18px', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--danger)', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
