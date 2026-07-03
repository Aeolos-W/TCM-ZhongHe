import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { MedicalRecord, AppConfig } from '@/types/medical-record';
import {
  pickStorageFolder, loadConfig, saveConfig, loadRecords,
  saveRecord, deleteRecord, generateId, getDefaultConfig, isWebView,
  buildCategories, exportRecords, importRecordsNative, importRecordsFromFile,
} from './fileSystemService';

interface State {
  isFolderSelected: boolean;
  records: MedicalRecord[];
  config: AppConfig | null;
  selectedRecordId: string | null;
  selectedCategoryId: string | null;
  searchQuery: string;
  isLoading: boolean;
}

type Action =
  | { type: 'SET_FOLDER_SELECTED'; payload: boolean }
  | { type: 'SET_RECORDS'; payload: MedicalRecord[] }
  | { type: 'SET_CONFIG'; payload: AppConfig }
  | { type: 'SELECT_RECORD'; payload: string | null }
  | { type: 'SELECT_CATEGORY'; payload: string | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_RECORD'; payload: MedicalRecord }
  | { type: 'UPDATE_RECORD'; payload: MedicalRecord }
  | { type: 'REMOVE_RECORD'; payload: string };

const initialState: State = {
  isFolderSelected: false, records: [], config: null,
  selectedRecordId: null, selectedCategoryId: null, searchQuery: '', isLoading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FOLDER_SELECTED': return { ...state, isFolderSelected: action.payload };
    case 'SET_RECORDS': return { ...state, records: action.payload };
    case 'SET_CONFIG': return { ...state, config: action.payload };
    case 'SELECT_RECORD': return { ...state, selectedRecordId: action.payload };
    case 'SELECT_CATEGORY': return { ...state, selectedCategoryId: action.payload, selectedRecordId: null };
    case 'SET_SEARCH': return { ...state, searchQuery: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'ADD_RECORD': return { ...state, records: [action.payload, ...state.records] };
    case 'UPDATE_RECORD': return { ...state, records: state.records.map((r) => (r.id === action.payload.id ? action.payload : r)) };
    case 'REMOVE_RECORD': return { ...state, records: state.records.filter((r) => r.id !== action.payload), selectedRecordId: state.selectedRecordId === action.payload ? null : state.selectedRecordId };
    default: return state;
  }
}

interface DataStoreContextValue {
  state: State;
  selectFolder: () => Promise<void>;
  refreshRecords: () => Promise<void>;
  selectRecord: (id: string | null) => void;
  selectCategory: (id: string | null) => void;
  setSearch: (query: string) => void;
  createRecord: (categoryId?: string) => Promise<MedicalRecord | null>;
  updateRecord: (record: MedicalRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  getSelectedRecord: () => MedicalRecord | null;
  getFilteredRecords: () => MedicalRecord[];
  exportAllRecords: () => void;
  importRecords: (file?: File) => Promise<number>;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const selectFolder = useCallback(async () => {
    const ok = await pickStorageFolder();
    if (!ok && !isWebView()) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let config = await loadConfig();
      if (!config) { config = getDefaultConfig(); }
      const records = await loadRecords();
      // 动态生成分类
      config.categories = buildCategories(records);
      await saveConfig(config);
      dispatch({ type: 'SET_CONFIG', payload: config });
      dispatch({ type: 'SET_RECORDS', payload: records });
    } catch (err) {
      console.error('[DataStore] selectFolder error:', err);
    }
    dispatch({ type: 'SET_FOLDER_SELECTED', payload: true });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const refreshRecords = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const records = await loadRecords();
      dispatch({ type: 'SET_RECORDS', payload: records });
      if (state.config) {
        const newConfig = { ...state.config, categories: buildCategories(records) };
        await saveConfig(newConfig);
        dispatch({ type: 'SET_CONFIG', payload: newConfig });
      }
    } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
  }, [state.config]);

  const selectRecord = useCallback((id: string | null) => { dispatch({ type: 'SELECT_RECORD', payload: id }); }, []);
  const selectCategory = useCallback((id: string | null) => { dispatch({ type: 'SELECT_CATEGORY', payload: id }); }, []);
  const setSearch = useCallback((query: string) => { dispatch({ type: 'SET_SEARCH', payload: query }); }, []);

  const createRecord = useCallback(async (categoryId?: string): Promise<MedicalRecord | null> => {
    const newRecord: MedicalRecord = {
      id: generateId(), title: '新医案',
      location: '', era: '',
      metadata: { cause: '', locationOfDisease: '', mechanism: '', symptoms: [], tcmDiagnosis: [], wmDiagnosis: [], source: '' },
      keyAnalysis: '', syndromeDiagnosis: '', classicReference: '',
      content: '', tags: [], doctor: '', patient: '', date: new Date().toISOString(),
      categoryId: categoryId || state.selectedCategoryId || '',
    };
    await saveRecord(newRecord);
    dispatch({ type: 'ADD_RECORD', payload: newRecord });
    dispatch({ type: 'SELECT_RECORD', payload: newRecord.id });
    if (state.config) {
      const newConfig = { ...state.config, categories: buildCategories([...state.records, newRecord]) };
      await saveConfig(newConfig);
      dispatch({ type: 'SET_CONFIG', payload: newConfig });
    }
    return newRecord;
  }, [state.config, state.selectedCategoryId, state.records]);

  const updateRecord = useCallback(async (record: MedicalRecord) => { await saveRecord(record); dispatch({ type: 'UPDATE_RECORD', payload: record }); }, []);
  const removeRecord = useCallback(async (id: string) => { await deleteRecord(id); dispatch({ type: 'REMOVE_RECORD', payload: id }); }, []);

  const exportAllRecords = useCallback(() => {
    exportRecords(state.records, state.config);
  }, [state.records, state.config]);

  const importRecords = useCallback(async (file?: File): Promise<number> => {
    if (file) {
      // Browser mode: use file input
      const { records } = await importRecordsFromFile(file);
      for (const r of records) { await saveRecord(r); }
      const allRecords = await loadRecords();
      dispatch({ type: 'SET_RECORDS', payload: allRecords });
      if (state.config) {
        const newConfig = { ...state.config, categories: buildCategories(allRecords) };
        await saveConfig(newConfig);
        dispatch({ type: 'SET_CONFIG', payload: newConfig });
      }
      return records.length;
    } else {
      // WebView mode: use native file picker
      return new Promise((resolve) => {
        importRecordsNative(async (records, count) => {
          for (const r of records) { await saveRecord(r); }
          const allRecords = await loadRecords();
          dispatch({ type: 'SET_RECORDS', payload: allRecords });
          if (state.config) {
            const newConfig = { ...state.config, categories: buildCategories(allRecords) };
            await saveConfig(newConfig);
            dispatch({ type: 'SET_CONFIG', payload: newConfig });
          }
          resolve(count);
        });
      });
    }
  }, [state.config]);

  const getSelectedRecord = useCallback(() => {
    if (!state.selectedRecordId) return null;
    return state.records.find((r) => r.id === state.selectedRecordId) || null;
  }, [state.selectedRecordId, state.records]);

  const getFilteredRecords = useCallback(() => {
    let filtered = state.records;
    if (state.selectedCategoryId) {
      const catId = state.selectedCategoryId;
      // 父维度分类: dim-tcm / dim-wm / dim-sym / dim-mech
      if (catId.startsWith('dim-')) {
        // 点击父维度 → 显示所有属于该维度的子项
        const prefix = catId.replace('dim-', '');
        const prefixMap: Record<string, (r: MedicalRecord) => boolean> = {
          tcm: (r) => r.metadata.tcmDiagnosis.length > 0,
          wm: (r) => r.metadata.wmDiagnosis.length > 0,
          sym: (r) => r.metadata.symptoms.length > 0,
          mech: (r) => !!r.metadata.mechanism,
        };
        if (prefixMap[prefix]) filtered = filtered.filter(prefixMap[prefix]);
      } else {
        // 子分类: tcm-xxx / wm-xxx / sym-xxx / mech-xxx
        const [prefix, ...nameParts] = catId.split('-');
        const name = nameParts.join('-');
        if (prefix === 'tcm') filtered = filtered.filter((r) => r.metadata.tcmDiagnosis.includes(name));
        else if (prefix === 'wm') filtered = filtered.filter((r) => r.metadata.wmDiagnosis.includes(name));
        else if (prefix === 'sym') filtered = filtered.filter((r) => r.metadata.symptoms.includes(name));
        else if (prefix === 'mech') filtered = filtered.filter((r) => r.metadata.mechanism === name);
      }
    }
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.title.toLowerCase().includes(query) || r.metadata.cause.toLowerCase().includes(query) || r.metadata.mechanism.toLowerCase().includes(query) || r.metadata.tcmDiagnosis.some((d) => d.toLowerCase().includes(query)) || r.metadata.wmDiagnosis.some((d) => d.toLowerCase().includes(query)) || r.metadata.source.toLowerCase().includes(query) || r.metadata.symptoms.some((s) => s.toLowerCase().includes(query)) || r.content.toLowerCase().includes(query) || r.doctor.toLowerCase().includes(query));
    }
    return filtered;
  }, [state.records, state.selectedCategoryId, state.searchQuery, state.config]);

  return (
    <DataStoreContext.Provider value={{ state, selectFolder, refreshRecords, selectRecord, selectCategory, setSearch, createRecord, updateRecord, removeRecord, getSelectedRecord, getFilteredRecords, exportAllRecords, importRecords }}>
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore(): DataStoreContextValue {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within DataStoreProvider');
  return ctx;
}

// Categories are now dynamically built from records via buildCategories() in fileSystemService
