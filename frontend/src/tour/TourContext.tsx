import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { driver, type Driver } from 'driver.js';
import './tour.css';
import type { TourStep, TourMode, TourContextType } from './tourTypes';
import { tourRegistry } from './tourRegistry';
import { sampleDataManager } from './sampleData';
import api from '../api/client';
import { getNextUndoneStep, getTourHint, fetchChecklistStatus, type NextSuggestion } from './tourSuggestions';
import type { ChecklistStatus } from '../api/help';
import { Sparkles, X } from 'lucide-react';

interface TourProviderProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onToggleMobileSidebar?: (open: boolean) => void;
  userRole?: string;
  userTourCompletedVersion?: number | null;
  onTourCompleted?: (version: number) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

// Utility to wait for a DOM element to become available, connected, and rendered
const waitForElement = (selector: string, timeoutMs = 2500): Promise<Element | null> => {
  return new Promise((resolve) => {
    const check = () => {
      const el = document.querySelector(selector);
      if (el && el.isConnected) {
        const rect = el.getBoundingClientRect();
        // Element must be connected and visible with non-zero dimensions
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
      return null;
    };

    const initial = check();
    if (initial) {
      setTimeout(() => {
        resolve(check() || initial);
      }, 50);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = check();
      if (el) {
        clearInterval(interval);
        setTimeout(() => {
          resolve(check() || el);
        }, 50);
      } else if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval);
        const fallback = document.querySelector(selector);
        resolve(fallback && fallback.isConnected ? fallback : null);
      }
    }, 50);
  });
};

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  activeTab,
  onNavigateTab,
  onToggleMobileSidebar,
  userRole,
  userTourCompletedVersion,
  onTourCompleted
}) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourMode, setTourMode] = useState<TourMode | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<ChecklistStatus | null>(null);
  const checklistStatusRef = useRef<ChecklistStatus | null>(null);
  const [showWhatsNext, setShowWhatsNext] = useState<boolean>(false);
  const [whatsNextSuggestion, setWhatsNextSuggestion] = useState<NextSuggestion | null>(null);
  const tourModeRef = useRef<TourMode | null>(null);

  const refreshChecklistStatus = useCallback(async () => {
    try {
      const status = await fetchChecklistStatus();
      setChecklistStatus(status);
      checklistStatusRef.current = status;
      return status;
    } catch {
      return checklistStatusRef.current;
    }
  }, []);

  useEffect(() => {
    refreshChecklistStatus();
  }, [refreshChecklistStatus]);

  useEffect(() => {
    const handleDataRefresh = () => {
      refreshChecklistStatus();
    };
    window.addEventListener('fintrack:refresh-data', handleDataRefresh);
    return () => {
      window.removeEventListener('fintrack:refresh-data', handleDataRefresh);
    };
  }, [refreshChecklistStatus]);

  const activeStepsRef = useRef<TourStep[]>([]);
  const currentStepIndexRef = useRef<number>(0);
  const driverRef = useRef<Driver | null>(null);
  const isNavigatingRef = useRef(false);
  const autoTourTriggeredRef = useRef(false);
  const autoTourTimerRef = useRef<any>(null);
  const noticeTimerRef = useRef<any>(null);

  // Synchronized refs for parent props & callbacks
  const onTourCompletedRef = useRef(onTourCompleted);
  useEffect(() => {
    onTourCompletedRef.current = onTourCompleted;
  }, [onTourCompleted]);

  const onNavigateTabRef = useRef(onNavigateTab);
  useEffect(() => {
    onNavigateTabRef.current = onNavigateTab;
  }, [onNavigateTab]);

  const onToggleMobileSidebarRef = useRef(onToggleMobileSidebar);
  useEffect(() => {
    onToggleMobileSidebarRef.current = onToggleMobileSidebar;
  }, [onToggleMobileSidebar]);

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Forward refs for internal callbacks
  const goToStepRef = useRef<(idx: number) => Promise<void>>(async () => {});
  const stopTourRef = useRef<(markCompleted?: boolean) => void>(() => {});
  const startFullTourRef = useRef<() => void>(() => {});

  const clearPageMessage = useCallback(() => {
    setPageMessage(null);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  const showPageMessage = useCallback((msg: string) => {
    clearPageMessage();
    setPageMessage(msg);
    noticeTimerRef.current = setTimeout(() => {
      setPageMessage(null);
    }, 3500);
  }, [clearPageMessage]);

  const markTourCompletedOnBackend = useCallback(async (version = 1) => {
    try {
      localStorage.setItem('fintrack_tour_completed', 'true');
      await api.post('/user/tour/complete', { version });
      if (onTourCompletedRef.current) {
        onTourCompletedRef.current(version);
      }
    } catch (err) {
      console.warn('Failed to persist tour completion to backend:', err);
    }
  }, []);

  const stopTour = useCallback((markCompleted = true) => {
    const wasPageTour = tourModeRef.current === 'page';
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
      } catch {}
      driverRef.current = null;
    }

    if (onToggleMobileSidebarRef.current) {
      onToggleMobileSidebarRef.current(false);
    }

    setIsTourActive(false);
    setTourMode(null);
    currentStepIndexRef.current = 0;
    setCurrentStepIndex(0);
    activeStepsRef.current = [];

    sampleDataManager.stopTour();
    document.body.classList.remove('tour-active-sample');
    window.dispatchEvent(new Event('fintrack:refresh-data'));

    if (markCompleted) {
      markTourCompletedOnBackend(1);
    }

    // At the end of a PAGE TOUR (not the full tour), show the "What's next" suggestion card
    if (wasPageTour) {
      refreshChecklistStatus().then((status) => {
        const suggestion = getNextUndoneStep(status);
        setWhatsNextSuggestion(suggestion);
        setShowWhatsNext(true);
      }).catch(() => {
        const suggestion = getNextUndoneStep(checklistStatusRef.current);
        setWhatsNextSuggestion(suggestion);
        setShowWhatsNext(true);
      });
    }
  }, [markTourCompletedOnBackend, refreshChecklistStatus]);

  useEffect(() => {
    stopTourRef.current = stopTour;
  }, [stopTour]);

  // Clean exit if page is unloaded or refreshed mid-tour
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTourActive) {
        markTourCompletedOnBackend(1);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTourActive, markTourCompletedOnBackend]);

  // Render custom popover content matching FinTrack theme
  const renderCustomPopover = useCallback((popoverDOM: any, step: TourStep, index: number, total: number) => {
    if (!popoverDOM || !popoverDOM.wrapper) return;

    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isPageMode = tourMode === 'page';
    const pageKey = (step.page || '').toLowerCase();
    const isUsingSample = sampleDataManager.isSectionUsingSample(pageKey);

    // Real-data based contextual guidance hint (never blocks tour)
    const hint = getTourHint(step.id, pageKey, checklistStatus || checklistStatusRef.current);
    const hintHtml = hint ? `
      <div class="fintrack-tour-hint-box">
        <div class="fintrack-tour-hint-text">${hint.text}</div>
        <button type="button" class="fintrack-tour-hint-btn" id="fintrack-tour-hint-action-btn">
          ${hint.buttonText} &rarr;
        </button>
      </div>
    ` : '';

    // Clear existing children from wrapper and insert our customized FinTrack template
    popoverDOM.wrapper.innerHTML = `
      <div class="fintrack-tour-card-inner">
        <div class="fintrack-tour-header">
          <span class="fintrack-tour-counter">${index + 1} of ${total}</span>
          ${isUsingSample ? '<span class="fintrack-sample-data-pill">Sample data</span>' : ''}
        </div>
        <div class="fintrack-tour-title">${step.title}</div>
        <div class="fintrack-tour-description">${step.description}</div>
        ${hintHtml}
        ${isPageMode && isFirst ? `<button type="button" class="fintrack-tour-switch-link" id="fintrack-tour-switch-btn">Take the full tour instead</button>` : ''}
        <div class="fintrack-tour-footer">
          <button type="button" class="fintrack-tour-btn-skip" id="fintrack-tour-skip-btn">Skip tour</button>
          <div class="fintrack-tour-btn-group">
            ${!isFirst ? `<button type="button" class="fintrack-tour-btn fintrack-tour-btn-secondary" id="fintrack-tour-back-btn">Back</button>` : ''}
            <button type="button" class="fintrack-tour-btn fintrack-tour-btn-primary" id="fintrack-tour-next-btn">${isLast ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    `;

    // Hook up button events
    const skipBtn = popoverDOM.wrapper.querySelector('#fintrack-tour-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        stopTourRef.current(true);
      });
    }

    const backBtn = popoverDOM.wrapper.querySelector('#fintrack-tour-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        goToStepRef.current(index - 1);
      });
    }

    const nextBtn = popoverDOM.wrapper.querySelector('#fintrack-tour-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        if (isLast) {
          stopTourRef.current(true);
        } else {
          goToStepRef.current(index + 1);
        }
      });
    }

    const hintBtn = popoverDOM.wrapper.querySelector('#fintrack-tour-hint-action-btn');
    if (hintBtn && hint) {
      hintBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        stopTourRef.current(false);
        if (onNavigateTabRef.current) {
          onNavigateTabRef.current(hint.targetTab);
        }
      });
    }

    const switchBtn = popoverDOM.wrapper.querySelector('#fintrack-tour-switch-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        startFullTourRef.current();
      });
    }
  }, [tourMode, checklistStatus]);

  // Navigate to and drive a specific step index
  const goToStep = useCallback(async (targetIndex: number) => {
    const steps = activeStepsRef.current;
    if (!steps || steps.length === 0) {
      stopTourRef.current(false);
      return;
    }

    if (targetIndex < 0 || targetIndex >= steps.length) {
      stopTourRef.current(true);
      return;
    }

    const step = steps[targetIndex];
    currentStepIndexRef.current = targetIndex;
    setCurrentStepIndex(targetIndex);

    // Sidebar handling for mobile
    const isMobile = window.innerWidth < 768;
    if (onToggleMobileSidebarRef.current) {
      if (isMobile && step.needsSidebar) {
        onToggleMobileSidebarRef.current(true);
      } else {
        onToggleMobileSidebarRef.current(false);
      }
    }

    // Tab navigation if step belongs to another page
    if (step.page && step.page !== 'closing') {
      const normalizeTab = (tab?: string) => {
        const t = (tab || '').toLowerCase();
        if (t === 'transactions') return 'expenses';
        if (t === 'reports') return 'analytics';
        return t;
      };
      const currentTabResolved = normalizeTab(activeTabRef.current);
      const targetTabResolved = normalizeTab(step.page);
      if (currentTabResolved !== targetTabResolved && onNavigateTabRef.current) {
        isNavigatingRef.current = true;
        onNavigateTabRef.current(step.page.toLowerCase());
      }
    }

    // Execute optional beforeStep hook
    if (step.beforeStep) {
      try {
        await step.beforeStep();
      } catch (err) {
        console.warn('Error in beforeStep:', err);
      }
    }

    // Wait for the element to be available and connected on screen (brief timeout for optional steps)
    const element = await waitForElement(step.element, step.optional ? 300 : 2500);

    if (!element) {
      // Element not found on screen: skip silently instead of breaking the tour
      console.warn(`Tour step element "${step.element}" not found on page "${step.page}". Skipping step silently.`);
      const isMovingForward = targetIndex >= (currentStepIndexRef.current || 0);
      if (isMovingForward) {
        if (targetIndex + 1 < steps.length) {
          goToStepRef.current(targetIndex + 1);
        } else {
          stopTourRef.current(true);
        }
      } else {
        if (targetIndex - 1 >= 0) {
          goToStepRef.current(targetIndex - 1);
        } else {
          stopTourRef.current(false);
        }
      }
      return;
    }

    // Destroy prior driver instance if any
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
      } catch {}
    }

    // Scroll element smoothly/instantly to center of viewport to avoid offscreen or header overlap issues
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    }
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Initialize Driver.js for this step
    const driverInstance = driver({
      animate: true,
      allowClose: false,
      overlayColor: '#000000',
      overlayOpacity: 0.72,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'fintrack-tour-popover',
      onPopoverRender: (popoverDOM) => {
        renderCustomPopover(popoverDOM, step, targetIndex, steps.length);
      },
      onDestroyStarted: () => {
        // Handled cleanly
      }
    });

    driverRef.current = driverInstance;

    // Highlight the element
    try {
      driverInstance.highlight({
        element: step.element,
        popover: {
          side: step.side || 'bottom',
          align: step.align || 'start'
        }
      });
    } catch (err) {
      console.warn('Driver highlight error, skipping step:', err);
      if (targetIndex + 1 < steps.length) {
        goToStepRef.current(targetIndex + 1);
      } else {
        stopTourRef.current(true);
      }
    }
  }, [renderCustomPopover]);

  useEffect(() => {
    goToStepRef.current = goToStep;
  }, [goToStep]);

  // Keyboard navigation listener (Esc, Left Arrow, Right Arrow)
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopTourRef.current(true);
      } else if (e.key === 'ArrowRight') {
        const nextIdx = currentStepIndexRef.current + 1;
        if (nextIdx < activeStepsRef.current.length) {
          e.preventDefault();
          goToStepRef.current(nextIdx);
        } else {
          e.preventDefault();
          stopTourRef.current(true);
        }
      } else if (e.key === 'ArrowLeft') {
        const prevIdx = currentStepIndexRef.current - 1;
        if (prevIdx >= 0) {
          e.preventDefault();
          goToStepRef.current(prevIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive]);

  // Start Full Tour
  const startFullTour = useCallback(() => {
    clearPageMessage();
    const steps = tourRegistry.getFullTourSteps();
    if (!steps || steps.length === 0) {
      showPageMessage("There's no tour for this page yet.");
      return;
    }

    activeStepsRef.current = steps;
    setTourMode('full');
    tourModeRef.current = 'full';
    setShowWhatsNext(false);
    setIsTourActive(true);
    setCurrentStepIndex(0);
    currentStepIndexRef.current = 0;

    sampleDataManager.startTour('full');
    document.body.classList.add('tour-active-sample');
    window.dispatchEvent(new Event('fintrack:refresh-data'));

    // Mark completion version on backend immediately so refresh mid-tour doesn't repeat
    markTourCompletedOnBackend(1);

    // If starting full tour while not on Dashboard, navigate to Dashboard first
    if (activeTabRef.current.toLowerCase() !== 'dashboard' && onNavigateTabRef.current) {
      onNavigateTabRef.current('dashboard');
    }

    // Kick off step 0 after React processes the fintrack:refresh-data remount
    setTimeout(() => {
      goToStepRef.current(0);
    }, 350);
  }, [clearPageMessage, markTourCompletedOnBackend, showPageMessage]);

  useEffect(() => {
    startFullTourRef.current = startFullTour;
  }, [startFullTour]);

  // Start Page Tour
  const startPageTour = useCallback((targetPage?: string) => {
    clearPageMessage();
    const pageKey = (targetPage || activeTabRef.current || 'dashboard').toLowerCase();
    const steps = tourRegistry.getStepsForPage(pageKey);

    if (!steps || steps.length === 0) {
      showPageMessage("There's no tour for this page yet.");
      return;
    }

    activeStepsRef.current = steps;
    setTourMode('page');
    tourModeRef.current = 'page';
    setShowWhatsNext(false);
    setIsTourActive(true);
    setCurrentStepIndex(0);
    currentStepIndexRef.current = 0;

    sampleDataManager.startTour('page');
    document.body.classList.add('tour-active-sample');
    window.dispatchEvent(new Event('fintrack:refresh-data'));

    // Mark backend completed so it persists
    markTourCompletedOnBackend(1);

    // Kick off step 0
    setTimeout(() => {
      goToStepRef.current(0);
    }, 250);
  }, [clearPageMessage, markTourCompletedOnBackend, showPageMessage]);

  const nextStep = useCallback(() => {
    goToStepRef.current(currentStepIndexRef.current + 1);
  }, []);

  const prevStep = useCallback(() => {
    goToStepRef.current(currentStepIndexRef.current - 1);
  }, []);

  const registerPageSteps = useCallback((page: string, steps: TourStep[]) => {
    tourRegistry.register(page, steps);
  }, []);

  const unregisterPageSteps = useCallback((page: string) => {
    tourRegistry.unregister(page);
  }, []);

  // Automatic Full Tour for Brand New Users (tour_completed_version === 0)
  useEffect(() => {
    // Only for regular user side, not admin
    if (userRole && userRole.toUpperCase() === 'ADMIN') {
      return;
    }

    // Check if tour was already marked as completed in this browser
    const localCompleted = localStorage.getItem('fintrack_tour_completed') === 'true';
    if (localCompleted) {
      return;
    }

    // Trigger only if brand new user (tour_completed_version === 0) and on Dashboard
    if (
      userTourCompletedVersion === 0 &&
      !autoTourTriggeredRef.current &&
      activeTab.toLowerCase() === 'dashboard' &&
      !isTourActive
    ) {
      // Clear any prior timer
      if (autoTourTimerRef.current) {
        clearTimeout(autoTourTimerRef.current);
      }

      autoTourTimerRef.current = setTimeout(() => {
        if (!autoTourTriggeredRef.current && !isTourActive) {
          autoTourTriggeredRef.current = true;
          startFullTourRef.current();
        }
      }, 500);
    }
  }, [userTourCompletedVersion, userRole, activeTab, isTourActive]);

  // Cancel pending auto-tour timer if user actively navigates away from dashboard
  useEffect(() => {
    if (activeTab.toLowerCase() !== 'dashboard' && autoTourTimerRef.current) {
      clearTimeout(autoTourTimerRef.current);
      autoTourTimerRef.current = null;
    }
  }, [activeTab]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (autoTourTimerRef.current) {
        clearTimeout(autoTourTimerRef.current);
      }
    };
  }, []);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        tourMode,
        currentStepIndex,
        totalSteps: activeStepsRef.current.length,
        startFullTour,
        startPageTour,
        stopTour,
        nextStep,
        prevStep,
        registerPageSteps,
        unregisterPageSteps,
        pageMessage,
        clearPageMessage
      }}
    >
      {children}

      {/* "What's Next" Floating Card displayed once at the end of each page tour */}
      {showWhatsNext && whatsNextSuggestion && !isTourActive && (
        <aside
          className="fintrack-whats-next-card"
          role="region"
          aria-label="What's next suggestion"
        >
          <div className="fintrack-whats-next-header">
            <div className="fintrack-whats-next-badge">
              <Sparkles size={13} />
              <span>What's Next</span>
            </div>
            <button
              type="button"
              className="fintrack-whats-next-close"
              onClick={() => setShowWhatsNext(false)}
              aria-label="Dismiss recommendation"
            >
              <X size={15} />
            </button>
          </div>

          <div className="fintrack-whats-next-body">
            {whatsNextSuggestion.id === 'all_done' ? (
              <div className="fintrack-whats-next-title">You're all set.</div>
            ) : (
              <div className="fintrack-whats-next-title">
                Done. Next suggestion: <span className="fintrack-whats-next-step">{whatsNextSuggestion.title}</span>
              </div>
            )}
          </div>

          <div className="fintrack-whats-next-actions">
            {whatsNextSuggestion.id === 'all_done' ? (
              <button
                type="button"
                className="fintrack-tour-btn fintrack-tour-btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowWhatsNext(false)}
              >
                Got it
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="fintrack-tour-btn fintrack-tour-btn-primary"
                  onClick={() => {
                    setShowWhatsNext(false);
                    if (onNavigateTabRef.current) {
                      onNavigateTabRef.current(whatsNextSuggestion.tab);
                    }
                  }}
                >
                  {whatsNextSuggestion.btnText}
                </button>
                <button
                  type="button"
                  className="fintrack-whats-next-not-now"
                  onClick={() => setShowWhatsNext(false)}
                >
                  Not now
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </TourContext.Provider>
  );
};
