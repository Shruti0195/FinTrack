import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, ArrowDownRight } from 'lucide-react';
import api from '../api/client';
import { CustomSelect } from './CustomSelect';

export interface ExpenseCategory {
  id: string;
  name: string;
  type?: string;
  user_id?: string | null;
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-exp-1', name: 'Food & Dining' },
  { id: 'cat-exp-2', name: 'Shopping' },
  { id: 'cat-exp-3', name: 'Transport' },
  { id: 'cat-exp-4', name: 'Bills & Utilities' },
  { id: 'cat-exp-5', name: 'Entertainment' },
  { id: 'cat-exp-6', name: 'Healthcare' },
  { id: 'cat-exp-7', name: 'Other' },
];

const PAYMENT_METHODS = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cash',
  'Other'
];

export interface QuickAddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, categoryName: string) => void;
}

export const QuickAddExpenseModal: React.FC<QuickAddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPaymentMethod('UPI');
      setFormError(null);
      setIsAddingCustomCategory(false);
      setCustomCategoryName('');

      // Fetch latest expense categories
      api.get<ExpenseCategory[]>('/user/expenses/categories')
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setCategories(res.data);
            setCategoryId(res.data[0].id);
          } else {
            setCategoryId(DEFAULT_CATEGORIES[0].id);
          }
        })
        .catch(() => {
          setCategoryId(DEFAULT_CATEGORIES[0].id);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateCustomCategory = async () => {
    if (!customCategoryName.trim()) {
      setCustomCategoryError('Please enter a category name');
      return;
    }
    setIsCreatingCategory(true);
    setCustomCategoryError('');
    try {
      const res = await api.post('/user/expenses/categories', { name: customCategoryName.trim() });
      const created = res.data;
      setCategories(prev => [...prev, created]);
      setCategoryId(created.id);
      setIsAddingCustomCategory(false);
      setCustomCategoryName('');
    } catch {
      setCustomCategoryError('Could not create category. Please retry.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!categoryId) {
      setFormError('Please select an expense category');
      return;
    }
    if (!date) {
      setFormError('Please select a transaction date');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/user/expenses', {
        amount: parsedAmount,
        category_id: categoryId,
        payment_method: paymentMethod,
        transaction_date: date,
        description: description.trim() || undefined
      });

      const selectedCat = categories.find(c => c.id === categoryId);
      onSuccess(parsedAmount, selectedCat?.name || 'Expense');
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(detail || 'Failed to record expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-expense-modal-title"
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--card-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowDownRight size={16} strokeWidth={2.5} />
            </span>
            <h3 id="quick-expense-modal-title" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Add Expense
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary-text)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
          {formError && (
            <div
              style={{
                backgroundColor: 'var(--light-danger)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
              Amount (₹) *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--secondary-text)' }}>
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 1250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '28px', height: '42px', fontSize: '15px', fontWeight: 600, width: '100%' }}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                Category *
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
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} />
                <span>{isAddingCustomCategory ? 'Cancel' : 'Add Custom'}</span>
              </button>
            </div>

            {isAddingCustomCategory ? (
              <div
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  border: '1px solid var(--accent)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Books, Gym"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="input-field"
                    style={{ height: '36px', fontSize: '13px', flex: 1 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    disabled={isCreatingCategory}
                    className="btn-primary"
                    style={{ height: '36px', padding: '0 14px', fontSize: '12.5px' }}
                  >
                    {isCreatingCategory ? 'Saving...' : 'Add'}
                  </button>
                </div>
                {customCategoryError && (
                  <div style={{ color: 'var(--danger)', fontSize: '11.5px', marginTop: '6px' }}>
                    {customCategoryError}
                  </div>
                )}
              </div>
            ) : (
              <CustomSelect
                value={categoryId}
                onChange={(val) => setCategoryId(String(val))}
                options={categories.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.user_id ? ' (Custom)' : ''}`
                }))}
                placeholder="Select category..."
                style={{ width: '100%' }}
                buttonStyle={{ height: '42px', fontSize: '13.5px' }}
              />
            )}
          </div>

          {/* Payment Method & Date Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
                Payment Method
              </label>
              <CustomSelect
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(String(val))}
                options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
                style={{ width: '100%' }}
                buttonStyle={{ height: '42px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                style={{ height: '42px', width: '100%' }}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
              Description <span style={{ fontWeight: 400, color: 'var(--secondary-text)' }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grocery, Electricity bill, Swiggy"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ height: '42px', width: '100%' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              style={{ height: '40px', padding: '0 16px', fontSize: '13.5px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ height: '40px', padding: '0 20px', fontSize: '13.5px', fontWeight: 600, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              {submitting ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
