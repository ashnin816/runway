'use client';
import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ModelContext = createContext(null);

const initialState = {
  bankBalance: 0,
  otherCosts: 0,
  estimatedRevenue: 0,
  masterBenefitsPct: 22,
  gridStartKey: '2025-01',
  gridEndKey: '2027-12',
  actualsCutoffKey: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  })(),
  empRows: [],
  contractorRows: [],
  cutState: { empCuts: [], ctCuts: [] },
  newHireRows: [],
  revenueClientRows: [],
  actuals: {},
  committedCapital: 0,
};

function modelReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE': {
      const loaded = { ...initialState, ...action.payload };
      // Ensure arrays are always arrays (guard against corrupt localStorage)
      if (!Array.isArray(loaded.empRows)) loaded.empRows = [];
      if (!Array.isArray(loaded.contractorRows)) loaded.contractorRows = [];
      if (!Array.isArray(loaded.newHireRows)) loaded.newHireRows = [];
      if (!Array.isArray(loaded.revenueClientRows)) loaded.revenueClientRows = [];
      return loaded;
    }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_EMPLOYEE':
      return { ...state, empRows: [...state.empRows, action.payload] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        empRows: state.empRows.map((row, i) =>
          i === action.index ? { ...row, ...action.payload } : row
        ),
      };
    case 'REMOVE_EMPLOYEE':
      return { ...state, empRows: state.empRows.filter((_, i) => i !== action.index) };
    case 'SET_EMPLOYEES':
      return { ...state, empRows: action.payload };
    case 'ADD_CONTRACTOR':
      return { ...state, contractorRows: [...state.contractorRows, action.payload] };
    case 'UPDATE_CONTRACTOR':
      return {
        ...state,
        contractorRows: state.contractorRows.map((row, i) =>
          i === action.index ? { ...row, ...action.payload } : row
        ),
      };
    case 'REMOVE_CONTRACTOR':
      return { ...state, contractorRows: state.contractorRows.filter((_, i) => i !== action.index) };
    case 'SET_CONTRACTORS':
      return { ...state, contractorRows: action.payload };
    case 'ADD_NEW_HIRE':
      return { ...state, newHireRows: [...state.newHireRows, action.payload] };
    case 'UPDATE_NEW_HIRE':
      return {
        ...state,
        newHireRows: state.newHireRows.map((row, i) =>
          i === action.index ? { ...row, ...action.payload } : row
        ),
      };
    case 'REMOVE_NEW_HIRE':
      return { ...state, newHireRows: state.newHireRows.filter((_, i) => i !== action.index) };
    case 'SET_NEW_HIRES':
      return { ...state, newHireRows: action.payload };
    case 'ADD_REVENUE_CLIENT':
      return { ...state, revenueClientRows: [...state.revenueClientRows, action.payload] };
    case 'UPDATE_REVENUE_CLIENT':
      return {
        ...state,
        revenueClientRows: state.revenueClientRows.map((row, i) =>
          i === action.index ? { ...row, ...action.payload } : row
        ),
      };
    case 'REMOVE_REVENUE_CLIENT':
      return { ...state, revenueClientRows: state.revenueClientRows.filter((_, i) => i !== action.index) };
    case 'SET_REVENUE_CLIENTS':
      return { ...state, revenueClientRows: action.payload };
    case 'SET_ACTUALS_FIELD': {
      const { monthKey, field, value } = action;
      const monthData = state.actuals[monthKey] || { openingBalance: '', expenses: [], revenue: '', notes: '' };
      return {
        ...state,
        actuals: { ...state.actuals, [monthKey]: { ...monthData, [field]: value } },
      };
    }
    case 'SET_ACTUALS_EXPENSE': {
      const { monthKey, expIndex, value } = action;
      const monthData = { ...(state.actuals[monthKey] || { openingBalance: '', expenses: [], revenue: '', notes: '' }) };
      const expenses = [...(monthData.expenses || [])];
      while (expenses.length <= expIndex) expenses.push({ name: '', amount: '' });
      expenses[expIndex] = { ...expenses[expIndex], amount: value };
      return {
        ...state,
        actuals: { ...state.actuals, [monthKey]: { ...monthData, expenses } },
      };
    }
    case 'SET_ACTUALS':
      return { ...state, actuals: action.payload };
    case 'SET_GRID_RANGE':
      return { ...state, gridStartKey: action.startKey, gridEndKey: action.endKey };
    case 'SET_CUT_STATE':
      return { ...state, cutState: action.payload };
    default:
      return state;
  }
}

export function ModelProvider({ children }) {
  const [state, dispatch] = useReducer(modelReducer, initialState);
  const [saveStatus, setSaveStatus] = useState('idle');
  const isLoadedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const modelIdRef = useRef(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync without triggering re-renders
  useEffect(() => { stateRef.current = state; }, [state]);

  const doSave = useCallback(async () => {
    const currentState = stateRef.current;
    setSaveStatus('saving');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        if (modelIdRef.current) {
          await supabase.from('models')
            .update({ state: currentState, updated_at: new Date().toISOString() })
            .eq('id', modelIdRef.current);
          await supabase.from('snapshots')
            .insert({ model_id: modelIdRef.current, state: currentState, note: 'Auto-save' });
        } else {
          const { data: existing } = await supabase.from('models')
            .select('id').eq('user_id', user.id).limit(1).single();
          if (existing) {
            modelIdRef.current = existing.id;
            await supabase.from('models')
              .update({ state: currentState, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            const { data } = await supabase.from('models')
              .insert({ user_id: user.id, state: currentState })
              .select('id').single();
            if (data) modelIdRef.current = data.id;
          }
        }
      }

      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.error('Auto-save failed:', e);
      setSaveStatus('error');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, []); // no deps — reads from stateRef

  // Auto-save on state changes (skip initial LOAD_STATE)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, doSave]);

  const value = {
    state,
    dispatch,
    saveStatus,
    modelIdRef,
    isLoadedRef,
    setModelId: (id) => { modelIdRef.current = id; },
    markLoaded: () => { isLoadedRef.current = true; },
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel must be used within ModelProvider');
  return ctx;
}
