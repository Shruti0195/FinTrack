export type TourMode = 'full' | 'page';

export interface TourStep {
  id: string;
  page: string; // e.g. 'dashboard', 'income', 'expenses', 'budgets', 'goals', 'analytics', 'closing'
  element: string; // CSS selector e.g. '[data-tour="dashboard-kpis"]'
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  needsSidebar?: boolean; // If true, on mobile the sidebar is opened for this step
  fullTourOnly?: boolean; // If true, step only appears during full tour, omitted in page tour
  pageTourOnly?: boolean; // If true, step only appears during page tour, omitted in full tour
  optional?: boolean; // If true, skipped silently without long timeout when element is absent
  beforeStep?: () => Promise<void> | void;
}

export interface TourContextType {
  isTourActive: boolean;
  tourMode: TourMode | null;
  currentStepIndex: number;
  totalSteps: number;
  startFullTour: () => void;
  startPageTour: (page?: string) => void;
  stopTour: (markCompleted?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  registerPageSteps: (page: string, steps: TourStep[]) => void;
  unregisterPageSteps: (page: string) => void;
  pageMessage: string | null;
  clearPageMessage: () => void;
}
