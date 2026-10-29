import type { TourStep } from './tourTypes';

export const dashboardTourSteps: TourStep[] = [
  {
    id: 'dashboard-welcome',
    page: 'dashboard',
    element: '[data-tour="dashboard-welcome"]',
    title: 'Welcome to FinTrack',
    description: "Welcome to FinTrack. Here's a quick look at how everything works.",
    side: 'bottom',
    align: 'start',
    fullTourOnly: true
  },
  {
    id: 'dashboard-sidebar',
    page: 'dashboard',
    element: '[data-tour="sidebar-nav"]',
    title: 'The Sidebar',
    description: 'All your pages are organized here. Switch between Income, Expenses, Budgets, Goals, and Analytics anytime.',
    side: 'right',
    align: 'start',
    needsSidebar: true,
    fullTourOnly: true
  },
  {
    id: 'dashboard-topbar',
    page: 'dashboard',
    element: '[data-tour="header-tools"]',
    title: 'The Top Bar',
    description: 'Pick any date period (monthly, quarterly, half-yearly, yearly), toggle light or dark theme, and check your notification bell.',
    side: 'bottom',
    align: 'end',
    fullTourOnly: true
  },
  {
    id: 'dashboard-date-selector',
    page: 'dashboard',
    element: '[data-tour="header-date-selector"]',
    title: 'Date Selector',
    description: 'Every chart and summary follows the period you pick here (monthly, quarterly, half-yearly, or yearly).',
    side: 'bottom',
    align: 'end',
    fullTourOnly: true
  },
  {
    id: 'dashboard-notifications-bell',
    page: 'dashboard',
    element: '[data-tour="header-notifications"]',
    title: 'Notification Bell',
    description: 'Alerts about your budgets and goals appear here. Click one to see the details.',
    side: 'bottom',
    align: 'end',
    fullTourOnly: true
  },
  {
    id: 'dashboard-kpis',
    page: 'dashboard',
    element: '[data-tour="dashboard-kpis"]',
    title: 'Your Month at a Glance',
    description: 'Your month at a glance. See your total income, total expenses, and net savings rate right away.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'dashboard-health-card',
    page: 'dashboard',
    element: '[data-tour="dashboard-health-card"]',
    title: 'Financial Health Score',
    description: "Your score out of 100 shows how well you're managing money. Head to Analytics to see the full breakdown and recommendations.",
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'dashboard-quick-actions',
    page: 'dashboard',
    element: '[data-tour="dashboard-quick-actions"]',
    title: 'Quick Actions',
    description: 'Quickly add new income or log an expense on the go without leaving the dashboard.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'dashboard-chart',
    page: 'dashboard',
    element: '[data-tour="dashboard-chart"]',
    title: 'Income vs Expenses',
    description: 'Compare what came in against what went out across recent months. Hover over any bar to inspect the details.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'dashboard-budgets-goals',
    page: 'dashboard',
    element: '[data-tour="dashboard-goals-widget"]',
    title: 'Budgets & Goals',
    description: 'A quick look at your spending limits and savings progress. Tap Add money on any goal to contribute directly.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'dashboard-recent-transactions',
    page: 'dashboard',
    element: '[data-tour="dashboard-recent-transactions"]',
    title: 'Recent Transactions',
    description: 'Your latest spending and earnings appear here in real time. Click any entry or tap View all to see your full ledger.',
    side: 'top',
    align: 'end'
  },
  {
    id: 'dashboard-checklist',
    page: 'dashboard',
    element: '[data-tour="getting-started-checklist"]',
    title: 'Getting Started Checklist',
    description: 'Follow these first few steps to set up your account and get the most out of FinTrack.',
    side: 'bottom',
    align: 'start',
    optional: true
  }
];

export const incomeTourSteps: TourStep[] = [
  {
    id: 'income-why-start',
    page: 'income',
    element: '[data-tour="income-header"]',
    title: 'Start with Income',
    description: 'Everything in FinTrack starts with income. Add what you earn first.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'income-add-btn',
    page: 'income',
    element: '[data-tour="income-add-btn"]',
    title: 'Add Income',
    description: 'Use the Add Income button to log earnings with amount, date, source, and optional notes. You can also create custom categories on the fly.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'income-filters-search',
    page: 'income',
    element: '[data-tour="income-toolbar"]',
    title: 'Filters & Search',
    description: 'Search descriptions or sources, and filter by category or amount range to quickly find any record.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'income-summary-sorting',
    page: 'income',
    element: '[data-tour="income-summary-cards"]',
    title: 'Summary & Sorting',
    description: 'Track your total inflow, recorded count, and average per entry at a glance. Click any table header to sort instantly.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'income-export',
    page: 'income',
    element: '[data-tour="income-export-btn"]',
    title: 'Export CSV',
    description: "Downloads exactly what you're looking at. Export your filtered income records to CSV or a printable statement anytime.",
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'income-next-step',
    page: 'income',
    element: '[data-tour="income-header"]',
    title: 'Next: Expenses',
    description: 'Next, record your spending on the Expenses page.',
    side: 'bottom',
    align: 'start',
    fullTourOnly: true
  }
];

export const expenseTourSteps: TourStep[] = [
  {
    id: 'expense-add-btn',
    page: 'expenses',
    element: '[data-tour="expense-add-btn"]',
    title: 'Add Expense',
    description: 'Log your day-to-day spending with amount, category, payment mode, and date to keep your outflow organized.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'expense-filters-sorting',
    page: 'expenses',
    element: '[data-tour="expense-toolbar"]',
    title: 'Filters, Search & Sorting',
    description: 'Search by note, filter by category or amount range, and click column headers to sort by date, category, or amount.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'expense-summary',
    page: 'expenses',
    element: '[data-tour="expense-summary-cards"]',
    title: 'Expense Summary',
    description: 'Review your total spending, top category, and average daily spend to monitor your outflow trends.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'expense-export',
    page: 'expenses',
    element: '[data-tour="expense-export-btn"]',
    title: 'Export CSV',
    description: "Downloads exactly what you're looking at. Export your filtered expense records to CSV or PDF for review and record-keeping.",
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'expense-next-step',
    page: 'expenses',
    element: '[data-tour="expense-header"]',
    title: 'Next: Budgets',
    description: 'Your expenses feed your budgets and your health score.',
    side: 'bottom',
    align: 'start',
    fullTourOnly: true
  }
];

export const budgetTourSteps: TourStep[] = [
  {
    id: 'budgets-what-they-do',
    page: 'budgets',
    element: '[data-tour="budgets-header-title"]',
    title: 'What Budgets Do',
    description: 'Set a monthly limit for a category and FinTrack tracks your spending against it.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'budgets-add-btn',
    page: 'budgets',
    element: '[data-tour="budgets-add-btn"]',
    title: 'Set a Budget',
    description: 'Use the Set Budget button to select a category, define an amount limit, and configure custom alert notifications.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'budgets-card',
    page: 'budgets',
    element: '[data-tour="budget-card"]',
    title: 'Budget Card & Progress',
    description: "Each card displays your spent amount, monthly limit, remaining buffer, and a visual progress bar.",
    side: 'top',
    align: 'start'
  },
  {
    id: 'budgets-status-colors',
    page: 'budgets',
    element: '[data-tour="budget-status-legend"]',
    title: 'Status Colors',
    description: 'Categories update dynamically: green when you are on track, amber when approaching the limit, and red when over budget.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'budgets-bell-alerts',
    page: 'budgets',
    element: '[data-tour="budget-alert-bell"]',
    title: 'Budget Alert Bell',
    description: 'Choose when you want to be told, and whether by notification or email. Every budget has its own settings.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'budgets-pause-switch',
    page: 'budgets',
    element: '[data-tour="budget-pause-switch"]',
    title: 'Pause Budget Alerts',
    description: 'Turn all budget alerts off for a while without losing your settings.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'budgets-closing',
    page: 'budgets',
    element: '[data-tour="budgets-header-title"]',
    title: 'Next: Goals',
    description: "Next, set goals for the things you're saving towards.",
    side: 'bottom',
    align: 'start',
    fullTourOnly: true
  }
];

export const goalTourSteps: TourStep[] = [
  {
    id: 'goals-what-they-do',
    page: 'goals',
    element: '[data-tour="goals-header-title"]',
    title: 'Financial Goals',
    description: 'Save towards something you care about, with a target and a deadline.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'goals-create-btn',
    page: 'goals',
    element: '[data-tour="goals-create-btn"]',
    title: 'Create a Goal',
    description: 'Set up a target and deadline to get a live suggestion of how much to save each month to stay on schedule.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'goals-card',
    page: 'goals',
    element: '[data-tour="goal-card"]',
    title: 'Goal Card & Progress',
    description: "Track how much you've saved so far, your progress bar toward the target, and how much time remains until your deadline.",
    side: 'top',
    align: 'start'
  },
  {
    id: 'goals-add-money-btn',
    page: 'goals',
    element: '[data-tour="goal-add-money-btn"]',
    title: 'Add Money',
    description: "Record money you've set aside. It takes two taps.",
    side: 'top',
    align: 'start'
  },
  {
    id: 'goals-info-note',
    page: 'goals',
    element: '[data-tour="goals-info-note"]',
    title: 'Tracked Separately',
    description: "Goals are tracked separately. Money added to a goal isn't counted as an expense and doesn't change your savings figure.",
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'goals-details-btn',
    page: 'goals',
    element: '[data-tour="goal-details-btn"]',
    title: 'Details & Contribution History',
    description: 'Open Details on any goal to view your contribution history, track milestones, and edit or correct previous entries.',
    side: 'top',
    align: 'end'
  },
  {
    id: 'goals-alert-bell',
    page: 'goals',
    element: '[data-tour="goal-alert-bell"]',
    title: 'Goal Alerts & Pause Switch',
    description: 'Configure reminder notifications for milestones or deadlines on each goal, or use the top pause switch to temporarily mute alerts.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'goals-closing',
    page: 'goals',
    element: '[data-tour="goals-header-title"]',
    title: 'Next: Analytics',
    description: 'Next, see the bigger picture on the Analytics page.',
    side: 'bottom',
    align: 'start',
    fullTourOnly: true
  }
];

export const analyticsTourSteps: TourStep[] = [
  {
    id: 'analytics-what-this-page-is-for',
    page: 'analytics',
    element: '[data-tour="analytics-header-title"]',
    title: 'The Bigger Picture',
    description: 'The bigger picture: trends, where your money goes, and how healthy your finances are.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'analytics-health-score',
    page: 'analytics',
    element: '[data-tour="analytics-health-score"]',
    title: 'Financial Health Score',
    description: 'Your Financial Health Score and its status word reflect your overall savings rate, budget discipline, and expense stability.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'analytics-health-info-icon',
    page: 'analytics',
    element: '[data-tour="analytics-health-info-icon"]',
    title: 'Score Calculation Breakdown',
    description: 'Hover or tap it to see exactly how the score is calculated.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'analytics-health-factors',
    page: 'analytics',
    element: '[data-tour="analytics-health-factors"]',
    title: 'The Four Factors & Points',
    description: 'Your score is calculated across four key factors: Savings Rate (35 pts), Budget Adherence (30 pts), Expense Stability (20 pts), and Essential vs Lifestyle Mix (15 pts).',
    side: 'top',
    align: 'start'
  },
  {
    id: 'analytics-trends-chart',
    page: 'analytics',
    element: '[data-tour="analytics-trends-chart"]',
    title: 'Spending & Saving Trends',
    description: 'Track how your income, expenses, and savings change month over month to spot spending patterns.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'analytics-where-money-goes',
    page: 'analytics',
    element: '[data-tour="analytics-where-money-goes"]',
    title: 'Where the Money Goes',
    description: 'Review your category expense mix and explore your top 5 spending categories alongside your largest individual purchases.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'analytics-comparison',
    page: 'analytics',
    element: '[data-tour="analytics-comparison"]',
    title: 'Period Comparison',
    description: 'The comparison with the previous period highlights your income, expenses, and savings rate changes at a glance.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'analytics-download-report',
    page: 'analytics',
    element: '[data-tour="analytics-download-report-btn"]',
    title: 'Download Report',
    description: 'Get a PDF of this period. Export a complete financial summary report with charts and breakdowns in one click.',
    side: 'bottom',
    align: 'end'
  },
  {
    id: 'analytics-date-selector',
    page: 'analytics',
    element: '[data-tour="header-date-selector"]',
    title: 'Date Selector',
    description: 'Every chart on this page follows the period you pick in the top bar.',
    side: 'bottom',
    align: 'end',
    pageTourOnly: true
  }
];

export const helpTourSteps: TourStep[] = [
  {
    id: 'help-getting-started-checklist',
    page: 'help',
    element: '[data-tour="getting-started-checklist"]',
    title: 'Getting Started Checklist',
    description: 'Track your onboarding progress as you set up your income, log expenses, and configure budgets.',
    side: 'bottom',
    align: 'start',
    optional: true
  },
  {
    id: 'help-faq',
    page: 'help',
    element: '[data-tour="help-faq"]',
    title: 'Frequently Asked Questions',
    description: 'Browse quick answers about health scores, budget alerts, goal tracking, and report exports.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'help-report-form',
    page: 'help',
    element: '[data-tour="help-report-form"]',
    title: 'Report a Problem or Suggestion',
    description: 'Send us feedback, report an unexpected issue, or ask a question directly to our support team.',
    side: 'top',
    align: 'start'
  },
  {
    id: 'help-reports-list',
    page: 'help',
    element: '[data-tour="help-reports-list"]',
    title: 'Your Reports & Inquiries',
    description: 'Check the real-time review and resolution status of any feedback or issue reports you have submitted.',
    side: 'top',
    align: 'start'
  }
];

export const settingsTourSteps: TourStep[] = [
  {
    id: 'settings-profile',
    page: 'settings',
    element: '[data-tour="settings-profile"]',
    title: 'Profile Details',
    description: 'View and update your display name and check your registered account email.',
    side: 'bottom',
    align: 'start'
  },
  {
    id: 'settings-change-password',
    page: 'settings',
    element: '[data-tour="settings-change-password"]',
    title: 'Change Password',
    description: 'Update your account password securely whenever you need to.',
    side: 'left',
    align: 'center'
  },
  {
    id: 'settings-monthly-reports',
    page: 'settings',
    element: '[data-tour="settings-monthly-reports"]',
    title: 'Monthly Report Notifications',
    description: 'Toggle monthly notification alerts to be notified when your savings and health report is ready to review.',
    side: 'top',
    align: 'start'
  }
];

export const closingTourSteps: TourStep[] = [
  {
    id: 'closing-settings-link',
    page: 'closing',
    element: '[data-tour="sidebar-settings-link"]',
    title: 'Settings',
    description: 'Change your password and notification preferences here.',
    side: 'right',
    align: 'start',
    needsSidebar: true,
    fullTourOnly: true
  },
  {
    id: 'closing-help-link',
    page: 'closing',
    element: '[data-tour="sidebar-help-link"]',
    title: 'Help & Support',
    description: "Frequently asked questions, and a way to tell us if something's wrong.",
    side: 'right',
    align: 'start',
    needsSidebar: true,
    fullTourOnly: true
  },
  {
    id: 'closing-take-a-tour',
    page: 'closing',
    element: '[data-tour="header-tour-btn"]',
    title: 'Take a Tour Anytime',
    description: 'You can replay the tour for any page here, any time.',
    side: 'bottom',
    align: 'end',
    fullTourOnly: true
  },
  {
    id: 'closing-finish-thanks',
    page: 'closing',
    element: '[data-tour="header-tools"]',
    title: "You're All Set!",
    description: 'Thank you for exploring FinTrack! Start recording your income and expenses to take full control of your finances.',
    side: 'bottom',
    align: 'end',
    fullTourOnly: true
  }
];

// Initial default tour steps for each page in FinTrack
export const defaultStepsByPage: Record<string, TourStep[]> = {
  dashboard: dashboardTourSteps,
  income: incomeTourSteps,
  expenses: expenseTourSteps,
  transactions: expenseTourSteps,
  budgets: budgetTourSteps,
  goals: goalTourSteps,
  analytics: analyticsTourSteps,
  help: helpTourSteps,
  settings: settingsTourSteps,
  closing: closingTourSteps
};

// Full tour page sequence
export const FULL_TOUR_PAGE_SEQUENCE = [
  'dashboard',
  'income',
  'expenses',
  'budgets',
  'goals',
  'analytics',
  'closing'
];

class TourRegistry {
  private stepsByPage: Map<string, TourStep[]> = new Map();

  constructor() {
    // Initialize with default steps
    Object.entries(defaultStepsByPage).forEach(([page, steps]) => {
      this.stepsByPage.set(page, [...steps]);
    });
  }

  public register(page: string, steps: TourStep[]): void {
    const key = page.toLowerCase();
    this.stepsByPage.set(key, steps);
    if (key === 'expenses') {
      this.stepsByPage.set('transactions', steps);
    } else if (key === 'transactions') {
      this.stepsByPage.set('expenses', steps);
    }
  }

  public unregister(page: string): void {
    const key = page.toLowerCase();
    this.stepsByPage.delete(key);
    if (key === 'expenses') {
      this.stepsByPage.delete('transactions');
    } else if (key === 'transactions') {
      this.stepsByPage.delete('expenses');
    }
  }

  public getStepsForPage(page: string): TourStep[] {
    let key = page.toLowerCase();
    if (key === 'transactions' && !this.stepsByPage.has('transactions')) {
      key = 'expenses';
    }
    const steps = this.stepsByPage.get(key) || [];
    // Page tour shows only page-specific steps, excluding steps designated for full tour only
    return steps.filter(s => !s.fullTourOnly);
  }

  public getFullTourSteps(): TourStep[] {
    const fullSteps: TourStep[] = [];
    for (const page of FULL_TOUR_PAGE_SEQUENCE) {
      const key = page.toLowerCase();
      // For full tour, include all steps registered for the page (excluding pageTourOnly steps)
      const pageSteps = this.stepsByPage.get(key) || [];
      if (pageSteps && pageSteps.length > 0) {
        fullSteps.push(...pageSteps.filter(s => !s.pageTourOnly));
      }
    }
    return fullSteps;
  }
}

export const tourRegistry = new TourRegistry();
