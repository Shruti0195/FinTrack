import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Palette,
  Target
} from 'lucide-react';
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  type AdminCategoryItem,
  fetchAdminGoalIcons,
  createAdminGoalIcon,
  updateAdminGoalIcon,
  deleteAdminGoalIcon,
  type AdminGoalIconItem,
  fetchAdminGoalColors,
  createAdminGoalColor,
  updateAdminGoalColor,
  deleteAdminGoalColor,
  type AdminGoalColorItem
} from '../../api/admin';
import { renderGoalIcon, AVAILABLE_GOAL_ICONS } from '../../utils/goalIcons';

type ActiveTab = 'expense' | 'income' | 'goal_icons' | 'goal_colors';

export const AdminCategoriesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expense');

  // Categories state
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  // Goal options state
  const [goalIcons, setGoalIcons] = useState<AdminGoalIconItem[]>([]);
  const [goalColors, setGoalColors] = useState<AdminGoalColorItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modals state
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');
  const [submittingCategoryAdd, setSubmittingCategoryAdd] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [submittingCategoryEdit, setSubmittingCategoryEdit] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<AdminCategoryItem | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [submittingCategoryDelete, setSubmittingCategoryDelete] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);

  // Goal Icon Modals state
  const [isAddIconModalOpen, setIsAddIconModalOpen] = useState(false);
  const [newIconName, setNewIconName] = useState('');
  const [newIconKey, setNewIconKey] = useState('target');
  const [submittingIconAdd, setSubmittingIconAdd] = useState(false);
  const [addIconError, setAddIconError] = useState<string | null>(null);

  const [editingIcon, setEditingIcon] = useState<AdminGoalIconItem | null>(null);
  const [editIconName, setEditIconName] = useState('');
  const [editIconKey, setEditIconKey] = useState('');
  const [submittingIconEdit, setSubmittingIconEdit] = useState(false);
  const [editIconError, setEditIconError] = useState<string | null>(null);

  const [deletingIcon, setDeletingIcon] = useState<AdminGoalIconItem | null>(null);
  const [targetIconId, setTargetIconId] = useState<string>('');
  const [submittingIconDelete, setSubmittingIconDelete] = useState(false);
  const [deleteIconError, setDeleteIconError] = useState<string | null>(null);

  // Goal Color Modals state
  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#10B981');
  const [submittingColorAdd, setSubmittingColorAdd] = useState(false);
  const [addColorError, setAddColorError] = useState<string | null>(null);

  const [editingColor, setEditingColor] = useState<AdminGoalColorItem | null>(null);
  const [editColorName, setEditColorName] = useState('');
  const [editColorHex, setEditColorHex] = useState('#10B981');
  const [submittingColorEdit, setSubmittingColorEdit] = useState(false);
  const [editColorError, setEditColorError] = useState<string | null>(null);

  const [deletingColor, setDeletingColor] = useState<AdminGoalColorItem | null>(null);
  const [targetColorId, setTargetColorId] = useState<string>('');
  const [submittingColorDelete, setSubmittingColorDelete] = useState(false);
  const [deleteColorError, setDeleteColorError] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catsData, iconsData, colorsData] = await Promise.all([
        fetchAdminCategories('all'),
        fetchAdminGoalIcons(),
        fetchAdminGoalColors()
      ]);
      setCategories(catsData);
      setGoalIcons(iconsData);
      setGoalColors(colorsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load configuration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  // ========================
  // Category Handlers
  // ========================
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    setSubmittingCategoryAdd(true);
    setAddCategoryError(null);
    try {
      const created = await createAdminCategory(trimmed, newCategoryType);
      setIsAddCategoryModalOpen(false);
      setNewCategoryName('');
      showNotification(`Standard ${created.type} category "${created.name}" created successfully.`);
      const catsData = await fetchAdminCategories('all');
      setCategories(catsData);
    } catch (err: any) {
      setAddCategoryError(err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setSubmittingCategoryAdd(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = editCategoryName.trim();
    if (!trimmed) return;

    setSubmittingCategoryEdit(true);
    setEditCategoryError(null);
    try {
      const updated = await updateAdminCategory(editingCategory.id, trimmed);
      setEditingCategory(null);
      setEditCategoryName('');
      showNotification(`Category renamed to "${updated.name}" successfully.`);
      const catsData = await fetchAdminCategories('all');
      setCategories(catsData);
    } catch (err: any) {
      setEditCategoryError(err.response?.data?.detail || 'Failed to rename category.');
    } finally {
      setSubmittingCategoryEdit(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    if (deletingCategory.transaction_count > 0 && !targetCategoryId) {
      setDeleteCategoryError(`Please select a target ${deletingCategory.type} category to move existing entries to.`);
      return;
    }

    setSubmittingCategoryDelete(true);
    setDeleteCategoryError(null);
    try {
      const res = await deleteAdminCategory(
        deletingCategory.id,
        deletingCategory.transaction_count > 0 ? targetCategoryId : undefined
      );
      setDeletingCategory(null);
      setTargetCategoryId('');
      showNotification(res.message || `Category "${deletingCategory.name}" deleted.`);
      const catsData = await fetchAdminCategories('all');
      setCategories(catsData);
    } catch (err: any) {
      setDeleteCategoryError(err.response?.data?.detail || 'Failed to delete category.');
    } finally {
      setSubmittingCategoryDelete(false);
    }
  };

  // ========================
  // Goal Icon Handlers
  // ========================
  const handleCreateIcon = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newIconName.trim();
    const trimmedKey = newIconKey.trim().toLowerCase();
    if (!trimmedName || !trimmedKey) return;

    setSubmittingIconAdd(true);
    setAddIconError(null);
    try {
      const created = await createAdminGoalIcon(trimmedName, trimmedKey);
      setIsAddIconModalOpen(false);
      setNewIconName('');
      setNewIconKey('target');
      showNotification(`Goal icon "${created.name}" created successfully.`);
      const iconsData = await fetchAdminGoalIcons();
      setGoalIcons(iconsData);
    } catch (err: any) {
      setAddIconError(err.response?.data?.detail || 'Failed to create goal icon.');
    } finally {
      setSubmittingIconAdd(false);
    }
  };

  const handleUpdateIcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;
    const trimmedName = editIconName.trim();
    const trimmedKey = editIconKey.trim().toLowerCase();
    if (!trimmedName || !trimmedKey) return;

    setSubmittingIconEdit(true);
    setEditIconError(null);
    try {
      const updated = await updateAdminGoalIcon(editingIcon.id, {
        name: trimmedName,
        icon_key: trimmedKey
      });
      setEditingIcon(null);
      showNotification(`Goal icon "${updated.name}" updated successfully.`);
      const iconsData = await fetchAdminGoalIcons();
      setGoalIcons(iconsData);
    } catch (err: any) {
      setEditIconError(err.response?.data?.detail || 'Failed to update goal icon.');
    } finally {
      setSubmittingIconEdit(false);
    }
  };

  const handleDeleteIcon = async () => {
    if (!deletingIcon) return;
    if (deletingIcon.goal_count > 0 && !targetIconId) {
      setDeleteIconError('Please select a target icon to reassign existing user goals to.');
      return;
    }

    setSubmittingIconDelete(true);
    setDeleteIconError(null);
    try {
      const res = await deleteAdminGoalIcon(
        deletingIcon.id,
        deletingIcon.goal_count > 0 ? targetIconId : undefined
      );
      setDeletingIcon(null);
      setTargetIconId('');
      showNotification(res.message || `Goal icon "${deletingIcon.name}" deleted.`);
      const iconsData = await fetchAdminGoalIcons();
      setGoalIcons(iconsData);
    } catch (err: any) {
      setDeleteIconError(err.response?.data?.detail || 'Failed to delete goal icon.');
    } finally {
      setSubmittingIconDelete(false);
    }
  };

  // ========================
  // Goal Color Handlers
  // ========================
  const handleCreateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newColorName.trim();
    const trimmedHex = newColorHex.trim();
    if (!trimmedName || !trimmedHex) return;

    setSubmittingColorAdd(true);
    setAddColorError(null);
    try {
      const created = await createAdminGoalColor(trimmedName, trimmedHex);
      setIsAddColorModalOpen(false);
      setNewColorName('');
      setNewColorHex('#10B981');
      showNotification(`Goal color tag "${created.name}" created successfully.`);
      const colorsData = await fetchAdminGoalColors();
      setGoalColors(colorsData);
    } catch (err: any) {
      // Show duplicate/validation error inside the popup itself!
      setAddColorError(err.response?.data?.detail || 'Failed to create goal color tag.');
    } finally {
      setSubmittingColorAdd(false);
    }
  };

  const handleUpdateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColor) return;
    const trimmedName = editColorName.trim();
    const trimmedHex = editColorHex.trim();
    if (!trimmedName || !trimmedHex) return;

    setSubmittingColorEdit(true);
    setEditColorError(null);
    try {
      const updated = await updateAdminGoalColor(editingColor.id, {
        name: trimmedName,
        hex: trimmedHex
      });
      setEditingColor(null);
      showNotification(`Goal color tag "${updated.name}" updated successfully.`);
      const colorsData = await fetchAdminGoalColors();
      setGoalColors(colorsData);
    } catch (err: any) {
      // Show duplicate/validation error inside the popup itself!
      setEditColorError(err.response?.data?.detail || 'Failed to update goal color tag.');
    } finally {
      setSubmittingColorEdit(false);
    }
  };

  const handleDeleteColor = async () => {
    if (!deletingColor) return;
    if (deletingColor.goal_count > 0 && !targetColorId) {
      setDeleteColorError('Please select a target color tag to reassign existing user goals to.');
      return;
    }

    setSubmittingColorDelete(true);
    setDeleteColorError(null);
    try {
      const res = await deleteAdminGoalColor(
        deletingColor.id,
        deletingColor.goal_count > 0 ? targetColorId : undefined
      );
      setDeletingColor(null);
      setTargetColorId('');
      showNotification(res.message || `Goal color tag "${deletingColor.name}" deleted.`);
      const colorsData = await fetchAdminGoalColors();
      setGoalColors(colorsData);
    } catch (err: any) {
      setDeleteColorError(err.response?.data?.detail || 'Failed to delete goal color tag.');
    } finally {
      setSubmittingColorDelete(false);
    }
  };

  // Filtered lists
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const displayedExpenseCategories = expenseCategories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedIncomeCategories = incomeCategories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedIcons = goalIcons.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.icon_key.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedColors = goalColors.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.hex.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: 'var(--main-text)', letterSpacing: '-0.02em' }}>
            Categories & Tags
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--secondary-text)' }}>
            Configure default categories, goal icons, and color palettes available across user accounts.
          </p>
        </div>

        {/* Action Button depending on Active Tab */}
        {activeTab === 'expense' && (
          <button
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryType('expense');
              setAddCategoryError(null);
              setIsAddCategoryModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Expense Category</span>
          </button>
        )}

        {activeTab === 'income' && (
          <button
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryType('income');
              setAddCategoryError(null);
              setIsAddCategoryModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Income Category</span>
          </button>
        )}

        {activeTab === 'goal_icons' && (
          <button
            onClick={() => {
              setNewIconName('');
              setNewIconKey('target');
              setAddIconError(null);
              setIsAddIconModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Goal Icon</span>
          </button>
        )}

        {activeTab === 'goal_colors' && (
          <button
            onClick={() => {
              setNewColorName('');
              setNewColorHex('#8B5CF6');
              setAddColorError(null);
              setIsAddColorModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Color Tag</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid #10B981',
          color: '#10B981',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Page-level error (used for fetch errors) */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid #EF4444',
          color: '#EF4444',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Controls & Tab Switcher */}
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Expense */}
          <button
            onClick={() => setActiveTab('expense')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'expense' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid transparent',
              backgroundColor: activeTab === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-subtle)',
              color: activeTab === 'expense' ? '#EF4444' : 'var(--secondary-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowDownLeft size={16} />
            <span>Expense Categories ({expenseCategories.length})</span>
          </button>

          {/* Income */}
          <button
            onClick={() => setActiveTab('income')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'income' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
              backgroundColor: activeTab === 'income' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-subtle)',
              color: activeTab === 'income' ? '#10B981' : 'var(--secondary-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowUpRight size={16} />
            <span>Income Categories ({incomeCategories.length})</span>
          </button>

          {/* Goal Icons */}
          <button
            onClick={() => setActiveTab('goal_icons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'goal_icons' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
              backgroundColor: activeTab === 'goal_icons' ? 'rgba(59, 130, 246, 0.12)' : 'var(--card-subtle)',
              color: activeTab === 'goal_icons' ? '#3B82F6' : 'var(--secondary-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={16} />
            <span>Goal Icons ({goalIcons.length})</span>
          </button>

          {/* Goal Color Tags */}
          <button
            onClick={() => setActiveTab('goal_colors')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'goal_colors' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
              backgroundColor: activeTab === 'goal_colors' ? 'rgba(139, 92, 246, 0.12)' : 'var(--card-subtle)',
              color: activeTab === 'goal_colors' ? '#8B5CF6' : 'var(--secondary-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Palette size={16} />
            <span>Goal Color Tags ({goalColors.length})</span>
          </button>

        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--card-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 14px',
          width: '100%',
          maxWidth: '300px'
        }}>
          <Search size={16} color="var(--secondary-text)" />
          <input
            type="text"
            placeholder={
              activeTab === 'expense'
                ? 'Search expense categories...'
                : activeTab === 'income'
                ? 'Search income categories...'
                : activeTab === 'goal_icons'
                ? 'Search goal icons...'
                : 'Search color tags...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--main-text)',
              fontSize: '13px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* 3. Tables Section */}

      {/* TABLE A: EXPENSE OR INCOME CATEGORIES */}
      {(activeTab === 'expense' || activeTab === 'income') && (
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--secondary-text)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '14px 20px' }}>Category Name</th>
                  <th style={{ padding: '14px 20px' }}>Type</th>
                  <th style={{ padding: '14px 20px' }}>Usage / Entries</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
                      Loading categories...
                    </td>
                  </tr>
                ) : (activeTab === 'expense' ? displayedExpenseCategories : displayedIncomeCategories).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        color: 'var(--secondary-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <FolderTree size={22} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                        No {activeTab} categories found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                        {searchQuery ? `No ${activeTab} category matching "${searchQuery}" was found.` : `No standard ${activeTab} categories configured.`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'expense' ? displayedExpenseCategories : displayedIncomeCategories).map((cat) => {
                    const isIncome = cat.type === 'income';

                    return (
                      <tr
                        key={cat.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Category Name */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                              color: isIncome ? '#10B981' : '#EF4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--main-text)' }}>
                              {cat.name}
                            </span>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                            color: isIncome ? '#10B981' : '#EF4444',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'capitalize'
                          }}>
                            Standard {cat.type}
                          </span>
                        </td>

                        {/* Usage / Entries */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Receipt size={14} color="var(--secondary-text)" />
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: cat.transaction_count > 0 ? 'var(--main-text)' : 'var(--secondary-text)'
                            }}>
                              {cat.transaction_count} {cat.transaction_count === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditCategoryName(cat.name);
                                setEditCategoryError(null);
                              }}
                              title="Rename Category"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--main-text)',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                                e.currentTarget.style.borderColor = '#10B981';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--border)';
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Rename</span>
                            </button>

                            <button
                              onClick={() => {
                                setDeletingCategory(cat);
                                const firstOther = categories.find(c => c.type === cat.type && c.id !== cat.id);
                                setTargetCategoryId(firstOther ? firstOther.id : '');
                                setDeleteCategoryError(null);
                              }}
                              title="Delete Category"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                color: '#EF4444',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#EF4444';
                                e.currentTarget.style.color = '#FFFFFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                                e.currentTarget.style.color = '#EF4444';
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE B: GOAL ICONS */}
      {activeTab === 'goal_icons' && (
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--secondary-text)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '14px 20px' }}>Icon Preview</th>
                  <th style={{ padding: '14px 20px' }}>Display Label</th>
                  <th style={{ padding: '14px 20px' }}>Icon Identifier Key</th>
                  <th style={{ padding: '14px 20px' }}>Active Goals Count</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
                      Loading goal icons...
                    </td>
                  </tr>
                ) : displayedIcons.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3B82F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <Target size={22} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                        No goal icons found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                        {searchQuery ? `No goal icon matching "${searchQuery}" was found.` : `No goal icons currently configured.`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedIcons.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Icon Preview */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {renderGoalIcon(item.icon_key, 20, '#3B82F6')}
                        </div>
                      </td>

                      {/* Display Label */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--main-text)' }}>
                          {item.name}
                        </span>
                        {item.is_default && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--card-subtle)',
                            color: 'var(--secondary-text)'
                          }}>
                            default
                          </span>
                        )}
                      </td>

                      {/* Key */}
                      <td style={{ padding: '16px 20px' }}>
                        <code style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--card-subtle)',
                          fontSize: '12.5px',
                          color: '#3B82F6',
                          border: '1px solid var(--border)'
                        }}>
                          {item.icon_key}
                        </code>
                      </td>

                      {/* Goals Usage Count */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: item.goal_count > 0 ? 'var(--main-text)' : 'var(--secondary-text)'
                        }}>
                          {item.goal_count} {item.goal_count === 1 ? 'goal' : 'goals'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingIcon(item);
                              setEditIconName(item.name);
                              setEditIconKey(item.icon_key);
                              setEditIconError(null);
                            }}
                            title="Edit Icon"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'transparent',
                              color: 'var(--main-text)',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                              e.currentTarget.style.borderColor = '#3B82F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Rename</span>
                          </button>

                          <button
                            onClick={() => {
                              setDeletingIcon(item);
                              const firstOther = goalIcons.find(i => i.id !== item.id);
                              setTargetIconId(firstOther ? firstOther.id : '');
                              setDeleteIconError(null);
                            }}
                            title="Delete Icon"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: '#EF4444',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#EF4444';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                              e.currentTarget.style.color = '#EF4444';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE C: GOAL COLOR TAGS */}
      {activeTab === 'goal_colors' && (
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--secondary-text)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '14px 20px' }}>Color Swatch</th>
                  <th style={{ padding: '14px 20px' }}>Display Label</th>
                  <th style={{ padding: '14px 20px' }}>Hex Code</th>
                  <th style={{ padding: '14px 20px' }}>Active Goals Count</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px' }}>
                      Loading goal color tags...
                    </td>
                  </tr>
                ) : displayedColors.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        color: '#8B5CF6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}>
                        <Palette size={22} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '4px' }}>
                        No goal color tags found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                        {searchQuery ? `No color tag matching "${searchQuery}" was found.` : `No goal color tags currently configured.`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedColors.map((colorItem) => (
                    <tr
                      key={colorItem.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Swatch */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: colorItem.hex,
                          border: '2px solid rgba(255,255,255,0.4)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                        }} />
                      </td>

                      {/* Display Label */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--main-text)' }}>
                          {colorItem.name}
                        </span>
                        {colorItem.is_default && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--card-subtle)',
                            color: 'var(--secondary-text)'
                          }}>
                            default
                          </span>
                        )}
                      </td>

                      {/* Hex */}
                      <td style={{ padding: '16px 20px' }}>
                        <code style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--card-subtle)',
                          fontSize: '12.5px',
                          color: colorItem.hex,
                          border: '1px solid var(--border)',
                          fontWeight: 700
                        }}>
                          {colorItem.hex.toUpperCase()}
                        </code>
                      </td>

                      {/* Usage */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: colorItem.goal_count > 0 ? 'var(--main-text)' : 'var(--secondary-text)'
                        }}>
                          {colorItem.goal_count} {colorItem.goal_count === 1 ? 'goal' : 'goals'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingColor(colorItem);
                              setEditColorName(colorItem.name);
                              setEditColorHex(colorItem.hex);
                              setEditColorError(null);
                            }}
                            title="Edit Color"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'transparent',
                              color: 'var(--main-text)',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--card-subtle)';
                              e.currentTarget.style.borderColor = '#8B5CF6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Rename</span>
                          </button>

                          <button
                            onClick={() => {
                              setDeletingColor(colorItem);
                              const firstOther = goalColors.find(c => c.id !== colorItem.id);
                              setTargetColorId(firstOther ? firstOther.id : '');
                              setDeleteColorError(null);
                            }}
                            title="Delete Color"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: '#EF4444',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#EF4444';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                              e.currentTarget.style.color = '#EF4444';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================= */}

      {/* MODAL 1: Add Standard Category */}
      {isAddCategoryModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Add Standard Category
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Create a new standard category available to all FinTrack users.
            </p>

            {/* Error inside modal popup */}
            {addCategoryError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{addCategoryError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Category Ledger Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategoryType('expense');
                      setAddCategoryError(null);
                    }}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: newCategoryType === 'expense' ? '2px solid #EF4444' : '1px solid var(--border)',
                      backgroundColor: newCategoryType === 'expense' ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-subtle)',
                      color: newCategoryType === 'expense' ? '#EF4444' : 'var(--secondary-text)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowDownLeft size={15} />
                    <span>Expense</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewCategoryType('income');
                      setAddCategoryError(null);
                    }}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: newCategoryType === 'income' ? '2px solid #10B981' : '1px solid var(--border)',
                      backgroundColor: newCategoryType === 'income' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-subtle)',
                      color: newCategoryType === 'income' ? '#10B981' : 'var(--secondary-text)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowUpRight size={15} />
                    <span>Income</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder={newCategoryType === 'income' ? 'e.g., Royalties, Grants, Freelance' : 'e.g., Software, Groceries, Travel'}
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (addCategoryError) setAddCategoryError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCategoryAdd || !newCategoryName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: newCategoryType === 'income' ? '#10B981' : '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingCategoryAdd || !newCategoryName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingCategoryAdd || !newCategoryName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingCategoryAdd ? 'Creating...' : `Create ${newCategoryType === 'income' ? 'Income' : 'Expense'} Category`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Rename Category */}
      {editingCategory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Rename Category
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Update the display name for standard {editingCategory.type} category <strong>{editingCategory.name}</strong>.
            </p>

            {/* Error inside modal popup */}
            {editCategoryError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{editCategoryError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCategory}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  New Category Name
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => {
                    setEditCategoryName(e.target.value);
                    if (editCategoryError) setEditCategoryError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCategoryEdit || !editCategoryName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingCategoryEdit || !editCategoryName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingCategoryEdit || !editCategoryName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingCategoryEdit ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Category with Safe Reassignment */}
      {deletingCategory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
                Delete {deletingCategory.type === 'income' ? 'Income' : 'Expense'} Category: {deletingCategory.name}
              </h3>
            </div>

            {/* Error inside modal popup */}
            {deleteCategoryError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{deleteCategoryError}</span>
              </div>
            )}

            {deletingCategory.transaction_count > 0 ? (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                  This category already has <strong>{deletingCategory.transaction_count} existing {deletingCategory.type} {deletingCategory.transaction_count === 1 ? 'entry' : 'entries'}</strong> across user accounts.
                  To ensure no user records are lost, choose a target {deletingCategory.type} category to safely move these entries to:
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                    Reassign {deletingCategory.type === 'income' ? 'Income' : 'Expense'} Entries To:
                  </label>
                  <select
                    value={targetCategoryId}
                    onChange={(e) => {
                      setTargetCategoryId(e.target.value);
                      if (deleteCategoryError) setDeleteCategoryError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-subtle)',
                      color: 'var(--main-text)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {categories
                      .filter(c => c.type === deletingCategory.type && c.id !== deletingCategory.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '12.5px',
                  color: 'var(--main-text)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ArrowRight size={16} color="#10B981" />
                  <span>
                    All {deletingCategory.transaction_count} entries will be transferred safely before deleting.
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Are you sure you want to delete the standard {deletingCategory.type} category <strong>"{deletingCategory.name}"</strong>?
                This category has 0 associated transactions and will be removed from default options.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={submittingCategoryDelete || (deletingCategory.transaction_count > 0 && !targetCategoryId)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: submittingCategoryDelete ? 'not-allowed' : 'pointer',
                  opacity: submittingCategoryDelete ? 0.6 : 1
                }}
              >
                {submittingCategoryDelete ? 'Deleting...' : deletingCategory.transaction_count > 0 ? 'Reassign & Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Goal Icon */}
      {isAddIconModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Add Goal Icon
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Configure a new icon option for users when setting up savings goals.
            </p>

            {/* Error inside modal popup */}
            {addIconError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{addIconError}</span>
              </div>
            )}

            <form onSubmit={handleCreateIcon}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Icon Label / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Vacation, Education, Wedding, Real Estate"
                  value={newIconName}
                  onChange={(e) => {
                    setNewIconName(e.target.value);
                    if (addIconError) setAddIconError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Select Icon Key (Preview: {renderGoalIcon(newIconKey, 18, '#3B82F6')})
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-subtle)'
                }}>
                  {AVAILABLE_GOAL_ICONS.map(i => {
                    const isSelected = newIconKey === i.key;
                    return (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => {
                          setNewIconKey(i.key);
                          if (!newIconName) setNewIconName(i.label);
                          if (addIconError) setAddIconError(null);
                        }}
                        title={`${i.label} (${i.key})`}
                        style={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #3B82F6' : '1px solid var(--border)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--card)',
                          color: isSelected ? '#3B82F6' : 'var(--main-text)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <i.IconComp size={18} />
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Selected identifier:</span>
                  <code style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 700 }}>{newIconKey}</code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddIconModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIconAdd || !newIconName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingIconAdd || !newIconName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingIconAdd || !newIconName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingIconAdd ? 'Adding...' : 'Add Icon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Rename / Edit Goal Icon */}
      {editingIcon && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Edit Goal Icon
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Rename icon or update its graphical identifier symbol. Existing goals using this icon will be updated automatically.
            </p>

            {/* Error inside modal popup */}
            {editIconError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{editIconError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateIcon}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={editIconName}
                  onChange={(e) => {
                    setEditIconName(e.target.value);
                    if (editIconError) setEditIconError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Choose Lucide Symbol (Current: {renderGoalIcon(editIconKey, 18, '#3B82F6')})
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-subtle)'
                }}>
                  {AVAILABLE_GOAL_ICONS.map(i => {
                    const isSelected = editIconKey === i.key;
                    return (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => {
                          setEditIconKey(i.key);
                          if (editIconError) setEditIconError(null);
                        }}
                        title={`${i.label} (${i.key})`}
                        style={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #3B82F6' : '1px solid var(--border)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--card)',
                          color: isSelected ? '#3B82F6' : 'var(--main-text)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <i.IconComp size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingIcon(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIconEdit || !editIconName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingIconEdit || !editIconName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingIconEdit || !editIconName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingIconEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Delete Goal Icon with Safe Reassignment */}
      {deletingIcon && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
                Delete Goal Icon: {deletingIcon.name}
              </h3>
            </div>

            {/* Error inside modal popup */}
            {deleteIconError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{deleteIconError}</span>
              </div>
            )}

            {deletingIcon.goal_count > 0 ? (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                  This icon is currently used by <strong>{deletingIcon.goal_count} active user {deletingIcon.goal_count === 1 ? 'goal' : 'goals'}</strong>.
                  Please select a replacement icon to safely reassign those goals:
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                    Reassign Existing Goals To:
                  </label>
                  <select
                    value={targetIconId}
                    onChange={(e) => {
                      setTargetIconId(e.target.value);
                      if (deleteIconError) setDeleteIconError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-subtle)',
                      color: 'var(--main-text)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {goalIcons
                      .filter(i => i.id !== deletingIcon.id)
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.icon_key})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '12.5px',
                  color: 'var(--main-text)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ArrowRight size={16} color="#10B981" />
                  <span>
                    All {deletingIcon.goal_count} goals will safely adopt the selected replacement icon.
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Are you sure you want to delete the goal icon <strong>"{deletingIcon.name}"</strong>?
                No user goals are currently using this icon.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingIcon(null)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteIcon}
                disabled={submittingIconDelete || (deletingIcon.goal_count > 0 && !targetIconId)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: submittingIconDelete ? 'not-allowed' : 'pointer',
                  opacity: submittingIconDelete ? 0.6 : 1
                }}
              >
                {submittingIconDelete ? 'Deleting...' : deletingIcon.goal_count > 0 ? 'Reassign & Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Add Goal Color Tag */}
      {isAddColorModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Add Color Tag
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Add a new theme color tag for user savings goals.
            </p>

            {/* Error inside modal popup for Color Tag */}
            {addColorError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{addColorError}</span>
              </div>
            )}

            <form onSubmit={handleCreateColor}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Color Tag Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sunset Orange, Emerald Green, Indigo"
                  value={newColorName}
                  onChange={(e) => {
                    setNewColorName(e.target.value);
                    if (addColorError) setAddColorError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Pick Hex Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => {
                      setNewColorHex(e.target.value);
                      if (addColorError) setAddColorError(null);
                    }}
                    style={{
                      width: '48px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={newColorHex}
                    onChange={(e) => {
                      setNewColorHex(e.target.value);
                      if (addColorError) setAddColorError(null);
                    }}
                    placeholder="#10B981"
                    required
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-subtle)',
                      color: 'var(--main-text)',
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'monospace',
                      fontWeight: 700
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddColorModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingColorAdd || !newColorName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingColorAdd || !newColorName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingColorAdd || !newColorName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingColorAdd ? 'Adding...' : 'Add Color Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: Rename / Edit Goal Color Tag */}
      {editingColor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
              Edit Color Tag
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              Rename color tag or update its hex code. User goals referencing this color tag will adapt automatically.
            </p>

            {/* Error inside modal popup for Color Tag */}
            {editColorError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{editColorError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateColor}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '6px' }}>
                  Color Tag Name / Label
                </label>
                <input
                  type="text"
                  value={editColorName}
                  onChange={(e) => {
                    setEditColorName(e.target.value);
                    if (editColorError) setEditColorError(null);
                  }}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card-subtle)',
                    color: 'var(--main-text)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                  Hex Code
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="color"
                    value={editColorHex}
                    onChange={(e) => {
                      setEditColorHex(e.target.value);
                      if (editColorError) setEditColorError(null);
                    }}
                    style={{
                      width: '48px',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={editColorHex}
                    onChange={(e) => {
                      setEditColorHex(e.target.value);
                      if (editColorError) setEditColorError(null);
                    }}
                    required
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-subtle)',
                      color: 'var(--main-text)',
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'monospace',
                      fontWeight: 700
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingColor(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--secondary-text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingColorEdit || !editColorName.trim()}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submittingColorEdit || !editColorName.trim() ? 'not-allowed' : 'pointer',
                    opacity: submittingColorEdit || !editColorName.trim() ? 0.6 : 1
                  }}
                >
                  {submittingColorEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: Delete Goal Color Tag with Safe Reassignment */}
      {deletingColor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--main-text)' }}>
                Delete Goal Color Tag: {deletingColor.name}
              </h3>
            </div>

            {/* Error inside modal popup */}
            {deleteColorError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{deleteColorError}</span>
              </div>
            )}

            {deletingColor.goal_count > 0 ? (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                  This color is currently used by <strong>{deletingColor.goal_count} active user {deletingColor.goal_count === 1 ? 'goal' : 'goals'}</strong>.
                  Please select a replacement color tag to safely reassign those goals:
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--main-text)', marginBottom: '8px' }}>
                    Reassign Existing Goals To:
                  </label>
                  <select
                    value={targetColorId}
                    onChange={(e) => {
                      setTargetColorId(e.target.value);
                      if (deleteColorError) setDeleteColorError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-subtle)',
                      color: 'var(--main-text)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {goalColors
                      .filter(c => c.id !== deletingColor.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.hex})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '12.5px',
                  color: 'var(--main-text)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ArrowRight size={16} color="#10B981" />
                  <span>
                    All {deletingColor.goal_count} goals will safely adopt the selected replacement color tag.
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                Are you sure you want to delete the color tag <strong>"{deletingColor.name}"</strong>?
                No user goals are currently using this color tag.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingColor(null)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteColor}
                disabled={submittingColorDelete || (deletingColor.goal_count > 0 && !targetColorId)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: submittingColorDelete ? 'not-allowed' : 'pointer',
                  opacity: submittingColorDelete ? 0.6 : 1
                }}
              >
                {submittingColorDelete ? 'Deleting...' : deletingColor.goal_count > 0 ? 'Reassign & Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
