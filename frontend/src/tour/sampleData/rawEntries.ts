/**
 * Raw Sample Data Definitions for FinTrack Guided Tour
 * 
 * Rules:
 * - Dates are stored strictly as offsets from today ("start of this month", "3 days ago", "month-X, day Y")
 * - NO totals, percentages, remaining amounts, or scores are typed here by hand.
 * - Everything is calculated by pure code in generator.ts.
 */

export interface RawIncomeEntry {
  id: string;
  amount: number;
  category: 'Salary' | 'Freelance' | 'Investments' | 'Other';
  description: string;
  paymentMethod: 'Bank Transfer' | 'UPI' | 'Net Banking' | 'Cheque';
  dateOffset: string; // e.g. "start of this month", "month-1, day 15"
}

export interface RawExpenseEntry {
  id: string;
  amount: number;
  category: 'Food' | 'Rent' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Healthcare' | 'Subscriptions' | 'Other';
  description: string;
  paymentMethod: 'UPI' | 'Card' | 'Net Banking' | 'Cash';
  dateOffset: string;
}

export interface RawBudgetConfig {
  id: string;
  category: 'Food' | 'Rent' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Healthcare' | 'Subscriptions' | 'Other';
  limitAmount: number;
}

export interface RawGoalContribution {
  id: string;
  amount: number;
  dateOffset: string;
  note: string;
}

export interface RawGoalConfig {
  id: string;
  title: string;
  targetAmount: number;
  color: string;
  icon: string;
  deadlineOffset: string; // e.g. "month+6, day 1"
  contributions: RawGoalContribution[];
}

// -------------------------------------------------------------
// 1. Raw Income Entries (~6 Months ending in current month)
// -------------------------------------------------------------
export const RAW_INCOME_ENTRIES: RawIncomeEntry[] = [
  // Month 0 (Current Month)
  {
    id: 's-inc-m0-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'start of this month'
  },
  // Month 1 (1 Month Ago)
  {
    id: 's-inc-m1-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'month-1, day 1'
  },
  {
    id: 's-inc-m1-2',
    amount: 12000,
    category: 'Freelance',
    description: 'Mobile App UI Design Project',
    paymentMethod: 'UPI',
    dateOffset: 'month-1, day 15'
  },
  // Month 2 (2 Months Ago)
  {
    id: 's-inc-m2-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'month-2, day 1'
  },
  // Month 3 (3 Months Ago)
  {
    id: 's-inc-m3-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'month-3, day 1'
  },
  {
    id: 's-inc-m3-2',
    amount: 15000,
    category: 'Freelance',
    description: 'Web Architecture Consultation',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-3, day 18'
  },
  // Month 4 (4 Months Ago)
  {
    id: 's-inc-m4-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'month-4, day 1'
  },
  // Month 5 (5 Months Ago)
  {
    id: 's-inc-m5-1',
    amount: 50000,
    category: 'Salary',
    description: 'Monthly Tech Salary',
    paymentMethod: 'Bank Transfer',
    dateOffset: 'month-5, day 1'
  }
];

// -------------------------------------------------------------
// 2. Raw Expense Entries Across Standard Categories (~6 Months)
// -------------------------------------------------------------
export const RAW_EXPENSE_ENTRIES: RawExpenseEntry[] = [
  // --- Month 0 (Current Month) ---
  {
    id: 's-exp-m0-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'start of this month'
  },
  {
    id: 's-exp-m0-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Spotify & Cloud Backup Bundle',
    paymentMethod: 'Card',
    dateOffset: 'month-0, day 2'
  },
  {
    id: 's-exp-m0-3',
    amount: 6000,
    category: 'Food',
    description: 'Monthly Grocery Stock at Nature Basket',
    paymentMethod: 'UPI',
    dateOffset: 'month-0, day 4'
  },
  {
    id: 's-exp-m0-4',
    amount: 3200,
    category: 'Bills',
    description: 'Electricity & High-Speed Broadband',
    paymentMethod: 'UPI',
    dateOffset: 'month-0, day 8'
  },
  {
    id: 's-exp-m0-5',
    amount: 2800,
    category: 'Transport',
    description: 'Metro Card Recharge & Uber Commutes',
    paymentMethod: 'UPI',
    dateOffset: 'month-0, day 10'
  },
  {
    id: 's-exp-m0-6',
    amount: 500,
    category: 'Healthcare',
    description: 'Multivitamins & First Aid Supplies',
    paymentMethod: 'UPI',
    dateOffset: 'month-0, day 12'
  },
  {
    id: 's-exp-m0-7',
    amount: 3000,
    category: 'Shopping',
    description: 'Formal Shirts & Shoes',
    paymentMethod: 'Card',
    dateOffset: 'month-0, day 14'
  },
  {
    id: 's-exp-m0-8',
    amount: 1500,
    category: 'Entertainment',
    description: 'IMAX Movie Tickets & Snacks',
    paymentMethod: 'UPI',
    dateOffset: 'month-0, day 16'
  },
  {
    id: 's-exp-m0-9',
    amount: 3500,
    category: 'Food',
    description: 'Weekend Dining with Family',
    paymentMethod: 'Card',
    dateOffset: '3 days ago'
  },

  // --- Month 1 (1 Month Ago) ---
  {
    id: 's-exp-m1-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-1, day 1'
  },
  {
    id: 's-exp-m1-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Streaming & Software Subscription',
    paymentMethod: 'Card',
    dateOffset: 'month-1, day 3'
  },
  {
    id: 's-exp-m1-3',
    amount: 6200,
    category: 'Food',
    description: 'Supermarket Groceries & Pantry Restock',
    paymentMethod: 'UPI',
    dateOffset: 'month-1, day 5'
  },
  {
    id: 's-exp-m1-4',
    amount: 3100,
    category: 'Bills',
    description: 'Power & Water Utility Bills',
    paymentMethod: 'UPI',
    dateOffset: 'month-1, day 8'
  },
  {
    id: 's-exp-m1-5',
    amount: 2900,
    category: 'Transport',
    description: 'Fuel & Cab Rides',
    paymentMethod: 'Card',
    dateOffset: 'month-1, day 11'
  },
  {
    id: 's-exp-m1-6',
    amount: 6500,
    category: 'Shopping',
    description: 'Festive Clothes & Gifts',
    paymentMethod: 'Card',
    dateOffset: 'month-1, day 15'
  },
  {
    id: 's-exp-m1-7',
    amount: 2500,
    category: 'Healthcare',
    description: 'Dental Checkup & Prescriptions',
    paymentMethod: 'UPI',
    dateOffset: 'month-1, day 18'
  },
  {
    id: 's-exp-m1-8',
    amount: 3600,
    category: 'Food',
    description: 'Bistro Dinner & Cafes',
    paymentMethod: 'Card',
    dateOffset: 'month-1, day 22'
  },
  {
    id: 's-exp-m1-9',
    amount: 2000,
    category: 'Entertainment',
    description: 'Concert Passes',
    paymentMethod: 'UPI',
    dateOffset: 'month-1, day 25'
  },
  {
    id: 's-exp-m1-10',
    amount: 1200,
    category: 'Other',
    description: 'Home Hardware & Plant Pots',
    paymentMethod: 'Cash',
    dateOffset: 'month-1, day 27'
  },

  // --- Month 2 (2 Months Ago) ---
  {
    id: 's-exp-m2-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-2, day 1'
  },
  {
    id: 's-exp-m2-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Digital Subscriptions',
    paymentMethod: 'Card',
    dateOffset: 'month-2, day 3'
  },
  {
    id: 's-exp-m2-3',
    amount: 9200,
    category: 'Food',
    description: 'Monthly Provisions & Dining',
    paymentMethod: 'UPI',
    dateOffset: 'month-2, day 6'
  },
  {
    id: 's-exp-m2-4',
    amount: 2900,
    category: 'Bills',
    description: 'Electricity & Mobile Postpaid',
    paymentMethod: 'UPI',
    dateOffset: 'month-2, day 9'
  },
  {
    id: 's-exp-m2-5',
    amount: 2700,
    category: 'Transport',
    description: 'Metro Smart Card & Auto Rides',
    paymentMethod: 'UPI',
    dateOffset: 'month-2, day 12'
  },
  {
    id: 's-exp-m2-6',
    amount: 3200,
    category: 'Shopping',
    description: 'Books & Desk Accessories',
    paymentMethod: 'Card',
    dateOffset: 'month-2, day 16'
  },
  {
    id: 's-exp-m2-7',
    amount: 1000,
    category: 'Healthcare',
    description: 'Eye Drops & Medical Consultation',
    paymentMethod: 'UPI',
    dateOffset: 'month-2, day 19'
  },
  {
    id: 's-exp-m2-8',
    amount: 1400,
    category: 'Entertainment',
    description: 'Bowling & Weekend Arcade',
    paymentMethod: 'UPI',
    dateOffset: 'month-2, day 23'
  },
  {
    id: 's-exp-m2-9',
    amount: 600,
    category: 'Other',
    description: 'Courier & Key Duplication',
    paymentMethod: 'Cash',
    dateOffset: 'month-2, day 26'
  },

  // --- Month 3 (3 Months Ago) ---
  {
    id: 's-exp-m3-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-3, day 1'
  },
  {
    id: 's-exp-m3-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Cloud Storage & Streaming',
    paymentMethod: 'Card',
    dateOffset: 'month-3, day 3'
  },
  {
    id: 's-exp-m3-3',
    amount: 10500,
    category: 'Food',
    description: 'Groceries & Dining Celebrations',
    paymentMethod: 'UPI',
    dateOffset: 'month-3, day 7'
  },
  {
    id: 's-exp-m3-4',
    amount: 3400,
    category: 'Bills',
    description: 'Utility & High Summer Power Bill',
    paymentMethod: 'UPI',
    dateOffset: 'month-3, day 10'
  },
  {
    id: 's-exp-m3-5',
    amount: 3000,
    category: 'Transport',
    description: 'Airport Cabs & Metro Travel',
    paymentMethod: 'Card',
    dateOffset: 'month-3, day 14'
  },
  {
    id: 's-exp-m3-6',
    amount: 7000,
    category: 'Shopping',
    description: 'Noise Cancelling Headphones',
    paymentMethod: 'Card',
    dateOffset: 'month-3, day 17'
  },
  {
    id: 's-exp-m3-7',
    amount: 1800,
    category: 'Healthcare',
    description: 'Annual Health Checkup Tests',
    paymentMethod: 'UPI',
    dateOffset: 'month-3, day 21'
  },
  {
    id: 's-exp-m3-8',
    amount: 2500,
    category: 'Entertainment',
    description: 'Escape Room with Team',
    paymentMethod: 'UPI',
    dateOffset: 'month-3, day 24'
  },
  {
    id: 's-exp-m3-9',
    amount: 1300,
    category: 'Other',
    description: 'Kitchen Repair & Plumbing',
    paymentMethod: 'Cash',
    dateOffset: 'month-3, day 28'
  },

  // --- Month 4 (4 Months Ago) ---
  {
    id: 's-exp-m4-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-4, day 1'
  },
  {
    id: 's-exp-m4-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Media Subscriptions',
    paymentMethod: 'Card',
    dateOffset: 'month-4, day 2'
  },
  {
    id: 's-exp-m4-3',
    amount: 9000,
    category: 'Food',
    description: 'Fresh Produce & Pantry Staples',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 5'
  },
  {
    id: 's-exp-m4-4',
    amount: 2800,
    category: 'Bills',
    description: 'Broadband & Water Bills',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 8'
  },
  {
    id: 's-exp-m4-5',
    amount: 2600,
    category: 'Transport',
    description: 'Fuel Refill & Tolls',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 12'
  },
  {
    id: 's-exp-m4-6',
    amount: 3500,
    category: 'Shopping',
    description: 'Kitchen Ware & Cookware',
    paymentMethod: 'Card',
    dateOffset: 'month-4, day 16'
  },
  {
    id: 's-exp-m4-7',
    amount: 800,
    category: 'Healthcare',
    description: 'Prescription Refills',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 20'
  },
  {
    id: 's-exp-m4-8',
    amount: 1600,
    category: 'Entertainment',
    description: 'Live Comedy Club Event',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 24'
  },
  {
    id: 's-exp-m4-9',
    amount: 500,
    category: 'Other',
    description: 'Shoe Laundry Service',
    paymentMethod: 'UPI',
    dateOffset: 'month-4, day 27'
  },

  // --- Month 5 (5 Months Ago) ---
  {
    id: 's-exp-m5-1',
    amount: 15000,
    category: 'Rent',
    description: 'Monthly Apartment Rent',
    paymentMethod: 'Net Banking',
    dateOffset: 'month-5, day 1'
  },
  {
    id: 's-exp-m5-2',
    amount: 999,
    category: 'Subscriptions',
    description: 'Streaming & Software Subscription',
    paymentMethod: 'Card',
    dateOffset: 'month-5, day 2'
  },
  {
    id: 's-exp-m5-3',
    amount: 9100,
    category: 'Food',
    description: 'Groceries, Dairy & Takeouts',
    paymentMethod: 'UPI',
    dateOffset: 'month-5, day 6'
  },
  {
    id: 's-exp-m5-4',
    amount: 3000,
    category: 'Bills',
    description: 'Electricity & Broadband Bill',
    paymentMethod: 'UPI',
    dateOffset: 'month-5, day 9'
  },
  {
    id: 's-exp-m5-5',
    amount: 2700,
    category: 'Transport',
    description: 'Public Transit Pass & Cabs',
    paymentMethod: 'UPI',
    dateOffset: 'month-5, day 13'
  },
  {
    id: 's-exp-m5-6',
    amount: 3100,
    category: 'Shopping',
    description: 'Casual Apparel & Backpack',
    paymentMethod: 'Card',
    dateOffset: 'month-5, day 17'
  },
  {
    id: 's-exp-m5-7',
    amount: 1200,
    category: 'Healthcare',
    description: 'Consultation & Eye Care',
    paymentMethod: 'UPI',
    dateOffset: 'month-5, day 21'
  },
  {
    id: 's-exp-m5-8',
    amount: 1500,
    category: 'Entertainment',
    description: 'Board Games & Movie Night',
    paymentMethod: 'UPI',
    dateOffset: 'month-5, day 25'
  },
  {
    id: 's-exp-m5-9',
    amount: 700,
    category: 'Other',
    description: 'Stationery & Home Repairs',
    paymentMethod: 'Cash',
    dateOffset: 'month-5, day 28'
  }
];

// -------------------------------------------------------------
// 3. Raw Budget Configuration (For Current Month)
// -------------------------------------------------------------
// 5 budgets: most on track, one close to limit (Food: 79.2%), one over (Bills: 106.7%)
export const RAW_BUDGET_CONFIGS: RawBudgetConfig[] = [
  {
    id: 's-bud-1',
    category: 'Rent',
    limitAmount: 15000 // Exact match (100% - safe)
  },
  {
    id: 's-bud-2',
    category: 'Food',
    limitAmount: 12000 // 9,500 spent -> 79.2% (close to limit / warning)
  },
  {
    id: 's-bud-3',
    category: 'Transport',
    limitAmount: 4000 // 2,800 spent -> 70.0% (on track)
  },
  {
    id: 's-bud-4',
    category: 'Shopping',
    limitAmount: 5000 // 3,000 spent -> 60.0% (on track)
  },
  {
    id: 's-bud-5',
    category: 'Bills',
    limitAmount: 3000 // 3,200 spent -> 106.7% (over limit / exceeded)
  }
];

// -------------------------------------------------------------
// 4. Raw Goals Configuration
// -------------------------------------------------------------
// 3 goals: one well on its way, one just started, one intermediate
export const RAW_GOAL_CONFIGS: RawGoalConfig[] = [
  {
    id: 's-goal-1',
    title: 'Emergency Fund',
    targetAmount: 150000,
    color: '#10B981',
    icon: 'shield',
    deadlineOffset: 'month+6, day 1',
    contributions: [
      { id: 's-gc-1-1', amount: 25000, dateOffset: 'month-4, day 10', note: 'Initial emergency allocation' },
      { id: 's-gc-1-2', amount: 25000, dateOffset: 'month-3, day 12', note: 'Monthly savings transfer' },
      { id: 's-gc-1-3', amount: 25000, dateOffset: 'month-2, day 15', note: 'Monthly savings transfer' },
      { id: 's-gc-1-4', amount: 25000, dateOffset: 'month-1, day 10', note: 'Monthly savings transfer' }
    ] // Total saved: 1,00,000 / 1,50,000 (66.7% - well on its way)
  },
  {
    id: 's-goal-2',
    title: 'Goa Vacation',
    targetAmount: 30000,
    color: '#3B82F6',
    icon: 'palmtree',
    deadlineOffset: 'month+4, day 1',
    contributions: [
      { id: 's-gc-2-1', amount: 3000, dateOffset: 'start of this month', note: 'First trip deposit' }
    ] // Total saved: 3,000 / 30,000 (10.0% - just started)
  },
  {
    id: 's-goal-3',
    title: 'New Work Laptop',
    targetAmount: 80000,
    color: '#8B5CF6',
    icon: 'laptop',
    deadlineOffset: 'month+5, day 1',
    contributions: [
      { id: 's-gc-3-1', amount: 20000, dateOffset: 'month-2, day 20', note: 'Freelance savings bonus' },
      { id: 's-gc-3-2', amount: 15000, dateOffset: 'month-1, day 22', note: 'Tech upgrade fund' }
    ] // Total saved: 35,000 / 80,000 (43.8%)
  }
];
