import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { sampleDataManager } from '../tour/sampleData/sampleDataManager';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

// -------------------------------------------------------------
// Request Interceptor
// 1. Injects Auth Token if available
// 2. Disables mutations (POST, PUT, PATCH, DELETE) during Tour
// 3. Serves Sample Data during Full Tour without hitting backend
// -------------------------------------------------------------
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Check if tour is currently active
  if (sampleDataManager.isTourActive()) {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';

    // A. Disable all mutating actions (saving, editing, deleting) during tour
    // Exception: tour completion endpoint itself must be allowed
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      if (!url.includes('/user/tour/complete')) {
        config.adapter = () =>
          Promise.resolve({
            data: {
              success: false,
              message: 'Actions (create, edit, delete) are disabled during the guided tour.'
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            request: {}
          });
        return config;
      }
    }
  }

  return config;
});

// -------------------------------------------------------------
// Response Interceptor
// 1. Handles 401 Unauthorized
// 2. Guided Tour mode: Keeps user's real data wherever available;
//    swaps sample data ONLY for empty sections (both full & page tours).
// -------------------------------------------------------------
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Check if Guided Tour mode is active
    if (sampleDataManager.isTourActive()) {
      const url = response.config.url || '';

      // 1. Expenses: if user has real expenses, keep them; if empty, substitute sample expenses
      if (url.includes('/user/expenses') && !url.includes('/stats') && !url.includes('/categories')) {
        const hasRealExpenses = response.data?.items && response.data.items.length > 0;
        if (!hasRealExpenses) {
          sampleDataManager.markSectionUsingSample('expenses', true);
          response.data = sampleDataManager.getExpenseListPayload();
        } else {
          sampleDataManager.markSectionUsingSample('expenses', false);
        }
      } else if (url.includes('/user/expenses/stats')) {
        const hasRealStats = response.data && (response.data.entries_count_this_month > 0 || response.data.total_expense_this_month > 0);
        if (hasRealStats) {
          sampleDataManager.markSectionUsingSample('expenses', false);
        } else if (sampleDataManager.isSectionUsingSample('expenses')) {
          response.data = sampleDataManager.getExpenseStatsPayload();
        }
      }

      // 2. Income: if user has real income, keep them; if empty, substitute sample income
      if (url.includes('/user/income') && !url.includes('/stats') && !url.includes('/categories')) {
        const hasRealIncome = response.data?.items && response.data.items.length > 0;
        if (!hasRealIncome) {
          sampleDataManager.markSectionUsingSample('income', true);
          response.data = sampleDataManager.getIncomeListPayload();
        } else {
          sampleDataManager.markSectionUsingSample('income', false);
        }
      } else if (url.includes('/user/income/stats')) {
        const hasRealStats = response.data && (response.data.entries_count_this_month > 0 || response.data.total_income_this_month > 0);
        if (hasRealStats) {
          sampleDataManager.markSectionUsingSample('income', false);
        } else if (sampleDataManager.isSectionUsingSample('income')) {
          response.data = sampleDataManager.getIncomeStatsPayload();
        }
      }

      // 3. Budgets: if user has real budgets, keep them; if empty, substitute sample budgets
      if (url.includes('/user/budgets') && !url.includes('/summary') && !url.includes('/categories') && !url.includes('/alert')) {
        const hasRealBudgets = Array.isArray(response.data) && response.data.length > 0;
        if (!hasRealBudgets) {
          sampleDataManager.markSectionUsingSample('budgets', true);
          response.data = sampleDataManager.getBudgetsPayload();
        } else {
          sampleDataManager.markSectionUsingSample('budgets', false);
        }
      } else if (url.includes('/user/budgets/summary')) {
        const hasRealBudgets = response.data && response.data.budget_count > 0;
        if (hasRealBudgets) {
          sampleDataManager.markSectionUsingSample('budgets', false);
        } else if (sampleDataManager.isSectionUsingSample('budgets')) {
          response.data = sampleDataManager.getBudgetSummaryPayload();
        }
      }

      // 4. Goals: if user has real goals, keep them; if empty, substitute sample goals
      if (url.includes('/user/goals') && !url.includes('/summary') && !url.includes('/alert')) {
        const hasRealGoals = Array.isArray(response.data) && response.data.length > 0;
        if (!hasRealGoals) {
          sampleDataManager.markSectionUsingSample('goals', true);
          response.data = sampleDataManager.getGoalsPayload();
        } else {
          sampleDataManager.markSectionUsingSample('goals', false);
        }
      } else if (url.includes('/user/goals/summary')) {
        const hasRealGoals = response.data && response.data.total_goals > 0;
        if (hasRealGoals) {
          sampleDataManager.markSectionUsingSample('goals', false);
        } else if (sampleDataManager.isSectionUsingSample('goals')) {
          response.data = sampleDataManager.getGoalSummaryPayload();
        }
      }

      // 5. Analytics: if user has insufficient data for analytics overview or individual charts, show sample analytics with section badges
      if (url.includes('/user/analytics/overview')) {
        const isTourActive = sampleDataManager.isTourActive();
        if (isTourActive) {
          const samplePayload = sampleDataManager.getAnalyticsOverviewPayload();
          const realData = response.data;

          const hasRealHealth = realData?.health_score?.score !== null && realData?.health_score?.score !== undefined && realData?.health_score?.score > 0;
          const hasRealTrends = realData?.trends?.monthly_trends && realData.trends.monthly_trends.length > 0 && realData.trends.monthly_trends.some((t: any) => t.income > 0 || t.expenses > 0);
          const hasRealMix = realData?.expense_mix && realData.expense_mix.length > 0;
          const hasRealComparison = realData?.comparison && realData.comparison.length > 0 && realData.comparison.some((c: any) => c.current_value > 0 || c.previous_value > 0);

          if (!hasRealHealth && !hasRealTrends && !hasRealMix && !hasRealComparison) {
            // New user with no data: show all sample charts
            sampleDataManager.markSectionUsingSample('analytics', true);
            sampleDataManager.markSectionUsingSample('analytics-health', true);
            sampleDataManager.markSectionUsingSample('analytics-trends', true);
            sampleDataManager.markSectionUsingSample('analytics-mix', true);
            sampleDataManager.markSectionUsingSample('analytics-comparison', true);
            response.data = samplePayload;
          } else {
            // Existing user with partial data: preserve user's real data where available, fill missing charts with sample data
            const merged = { ...realData, has_enough_data: true };
            let hasAnySample = false;

            if (!hasRealHealth) {
              merged.health_score = samplePayload.health_score;
              sampleDataManager.markSectionUsingSample('analytics-health', true);
              hasAnySample = true;
            } else {
              sampleDataManager.markSectionUsingSample('analytics-health', false);
            }

            if (!hasRealTrends) {
              merged.trends = samplePayload.trends;
              sampleDataManager.markSectionUsingSample('analytics-trends', true);
              hasAnySample = true;
            } else {
              sampleDataManager.markSectionUsingSample('analytics-trends', false);
            }

            if (!hasRealMix) {
              merged.expense_mix = samplePayload.expense_mix;
              merged.top_5_categories = samplePayload.top_5_categories;
              merged.top_5_expenses = samplePayload.top_5_expenses;
              sampleDataManager.markSectionUsingSample('analytics-mix', true);
              hasAnySample = true;
            } else {
              sampleDataManager.markSectionUsingSample('analytics-mix', false);
            }

            if (!hasRealComparison) {
              merged.comparison = samplePayload.comparison;
              sampleDataManager.markSectionUsingSample('analytics-comparison', true);
              hasAnySample = true;
            } else {
              sampleDataManager.markSectionUsingSample('analytics-comparison', false);
            }

            sampleDataManager.markSectionUsingSample('analytics', hasAnySample);
            response.data = merged;
          }
        } else {
          sampleDataManager.markSectionUsingSample('analytics', false);
          sampleDataManager.markSectionUsingSample('analytics-health', false);
          sampleDataManager.markSectionUsingSample('analytics-trends', false);
          sampleDataManager.markSectionUsingSample('analytics-mix', false);
          sampleDataManager.markSectionUsingSample('analytics-comparison', false);
        }
      }

      // 6. Dashboard: if user has 0 entries / empty dashboard, show sample overview
      if (url.includes('/user/dashboard/overview')) {
        const hasRealData =
          (response.data?.recent_transactions && response.data.recent_transactions.length > 0) ||
          (typeof response.data?.total_income === 'number' && response.data.total_income > 0) ||
          (typeof response.data?.total_expenses === 'number' && response.data.total_expenses > 0);

        if (!hasRealData) {
          sampleDataManager.markSectionUsingSample('dashboard', true);
          response.data = sampleDataManager.getDashboardOverviewPayload();
        } else {
          sampleDataManager.markSectionUsingSample('dashboard', false);
        }
      }

      // 7. Notifications: if user has no notifications, show sample notifications
      if (url.includes('/user/notifications') && !url.includes('/unread')) {
        const hasRealNotifs = response.data?.items && response.data.items.length > 0;
        if (!hasRealNotifs) {
          sampleDataManager.markSectionUsingSample('notifications', true);
          response.data = sampleDataManager.getNotificationsPayload();
        } else {
          sampleDataManager.markSectionUsingSample('notifications', false);
        }
      }
    }

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
