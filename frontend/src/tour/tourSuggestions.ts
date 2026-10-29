import { fetchChecklistStatus, type ChecklistStatus } from '../api/help';

export interface NextSuggestion {
  id: 'income' | 'expense' | 'budget' | 'goal' | 'analytics' | 'all_done';
  title: string;
  tab: string;
  btnText: string;
}

export interface TourHint {
  text: string;
  buttonText: string;
  targetTab: string;
}

/**
 * Evaluates the next undone onboarding step in FinTrack's logical order:
 * 1. Add income
 * 2. Add an expense
 * 3. Set a budget
 * 4. Create a goal
 * 5. Look at Analytics
 *
 * If everything is done, returns 'all_done' with "You're all set."
 */
export function getNextUndoneStep(checklist: ChecklistStatus | null): NextSuggestion {
  if (!checklist) {
    return {
      id: 'income',
      title: 'Add income',
      tab: 'income',
      btnText: 'Add income'
    };
  }
  if (!checklist.has_income) {
    return {
      id: 'income',
      title: 'Add income',
      tab: 'income',
      btnText: 'Add income'
    };
  }
  if (!checklist.has_expense) {
    return {
      id: 'expense',
      title: 'Add an expense',
      tab: 'expenses',
      btnText: 'Add expense'
    };
  }
  if (!checklist.has_budget) {
    return {
      id: 'budget',
      title: 'Set a budget',
      tab: 'budgets',
      btnText: 'Set a budget'
    };
  }
  if (!checklist.has_goal) {
    return {
      id: 'goal',
      title: 'Create a goal',
      tab: 'goals',
      btnText: 'Create a goal'
    };
  }
  if (!checklist.has_viewed_analytics) {
    return {
      id: 'analytics',
      title: 'Look at Analytics',
      tab: 'analytics',
      btnText: 'Look at Analytics'
    };
  }
  return {
    id: 'all_done',
    title: "You're all set.",
    tab: '',
    btnText: ''
  };
}

/**
 * Returns contextual guidance hints inside tour cards based on real user actions.
 * Only shows when prerequisites are missing and never blocks the tour.
 */
export function getTourHint(
  stepId: string,
  pageKey: string,
  status: ChecklistStatus | null
): TourHint | null {
  const normPage = (pageKey || '').toLowerCase();
  const hasIncome = Boolean(status?.has_income);
  const hasExpense = Boolean(status?.has_expense);

  // 1. Budgets: if user has no expenses yet, add hint on the first step
  if (normPage === 'budgets' && (stepId === 'budgets-what-they-do' || stepId === 'budgets-step-1')) {
    if (!hasExpense) {
      return {
        text: 'Budgets track your spending. Add a few expenses first so they have something to measure,',
        buttonText: 'Go to Expenses',
        targetTab: 'expenses'
      };
    }
  }

  // 2. Expenses: if user has no income yet, add hint on the first step
  if (
    (normPage === 'expenses' || normPage === 'transactions') &&
    (stepId === 'expense-add-btn' || stepId === 'expense-step-1')
  ) {
    if (!hasIncome) {
      return {
        text: "Add your income first so FinTrack can show how much you're saving,",
        buttonText: 'Go to Income',
        targetTab: 'income'
      };
    }
  }

  // 3. Analytics: if user has fewer than a few entries, add hint on the first step
  if (normPage === 'analytics' && (stepId === 'analytics-what-this-page-is-for' || stepId === 'analytics-step-1')) {
    if (!hasIncome || !hasExpense) {
      const targetTab = !hasIncome ? 'income' : 'expenses';
      const buttonText = !hasIncome ? 'Go to Income' : 'Go to Expenses';
      return {
        text: 'Charts and your score need some data. Add income and expenses to see them fill in,',
        buttonText,
        targetTab
      };
    }
  }

  // Goals have no prerequisite. No hint is needed there.
  return null;
}

export { fetchChecklistStatus };
