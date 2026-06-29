import type { MedicalRecord, AppConfig, CategoryNode } from '@/types/medical-record';
import { extractCategoriesFromRecords } from '@/types/medical-record';

const CONFIG_FILE = 'config.json';
const RECORDS_DIR = 'records';

// ========== WebView Bridge Interface ==========
interface AndroidBridgeInterface {
  readFile(path: string): string | null;
  writeFile(path: string, content: string): boolean;
  deleteFile(path: string): boolean;
  listFiles(dir: string): string;
  fileExists(path: string): boolean;
  getBasePath(): string;
  showToast(message: string): void;
  // Export / Import via native Android
  exportData(jsonContent: string): void;
  importData(): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    onImportComplete?: (jsonContent: string) => void;
  }
}

/** Detect if running inside Android WebView */
export function isWebView(): boolean {
  return typeof window !== 'undefined' && !!window.AndroidBridge;
}

// ========== Storage Backend Interface ==========
interface StorageBackend {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(dir: string): Promise<string[]>;
  fileExists(path: string): Promise<boolean>;
  getBasePath(): string;
}

// ========== Android Backend (via JS Bridge) ==========
const androidBackend: StorageBackend = {
  async readFile(path: string): Promise<string | null> {
    if (!window.AndroidBridge) return null;
    const result = window.AndroidBridge.readFile(path);
    return result === null || result === '' ? null : result;
  },
  async writeFile(path: string, content: string): Promise<void> {
    if (!window.AndroidBridge) throw new Error('AndroidBridge not available');
    const ok = window.AndroidBridge.writeFile(path, content);
    if (!ok) throw new Error(`Failed to write ${path}`);
  },
  async deleteFile(path: string): Promise<void> {
    if (!window.AndroidBridge) return;
    window.AndroidBridge.deleteFile(path);
  },
  async listFiles(dir: string): Promise<string[]> {
    if (!window.AndroidBridge) return [];
    const result = window.AndroidBridge.listFiles(dir);
    try { return JSON.parse(result); } catch { return []; }
  },
  async fileExists(path: string): Promise<boolean> {
    if (!window.AndroidBridge) return false;
    return window.AndroidBridge.fileExists(path);
  },
  getBasePath(): string {
    if (!window.AndroidBridge) return '';
    return window.AndroidBridge.getBasePath();
  },
};

// ========== File System Access API Backend (Browser) ==========
let currentDirectoryHandle: FileSystemDirectoryHandle | null = null;

const fsAccessBackend: StorageBackend = {
  async readFile(path: string): Promise<string | null> {
    if (!currentDirectoryHandle) return null;
    try {
      const parts = path.split('/').filter(Boolean);
      let dir = currentDirectoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch { return null; }
  },
  async writeFile(path: string, content: string): Promise<void> {
    if (!currentDirectoryHandle) throw new Error('No directory selected');
    const parts = path.split('/').filter(Boolean);
    let dir = currentDirectoryHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  },
  async deleteFile(path: string): Promise<void> {
    if (!currentDirectoryHandle) return;
    try {
      const parts = path.split('/').filter(Boolean);
      let dir = currentDirectoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      await dir.removeEntry(parts[parts.length - 1]);
    } catch { /* ignore */ }
  },
  async listFiles(dir: string): Promise<string[]> {
    if (!currentDirectoryHandle) return [];
    try {
      let targetDir = currentDirectoryHandle;
      if (dir && dir !== '.') {
        const parts = dir.split('/').filter(Boolean);
        for (const part of parts) {
          targetDir = await targetDir.getDirectoryHandle(part);
        }
      }
      const files: string[] = [];
      for await (const [name, handle] of (targetDir as any).entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) files.push(name);
      }
      return files;
    } catch { return []; }
  },
  async fileExists(path: string): Promise<boolean> {
    if (!currentDirectoryHandle) return false;
    try {
      const parts = path.split('/').filter(Boolean);
      let dir = currentDirectoryHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      await dir.getFileHandle(parts[parts.length - 1]);
      return true;
    } catch { return false; }
  },
  getBasePath(): string {
    return currentDirectoryHandle?.name || '';
  },
};

// ========== Get Current Backend ==========
function getBackend(): StorageBackend {
  return isWebView() ? androidBackend : fsAccessBackend;
}

// ========== Public API ==========
export async function pickStorageFolder(): Promise<boolean> {
  if (isWebView()) {
    return true;
  }
  try {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    currentDirectoryHandle = dirHandle;
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(): Promise<AppConfig | null> {
  const backend = getBackend();
  const text = await backend.readFile(CONFIG_FILE);
  if (!text) return null;
  try { return JSON.parse(text) as AppConfig; } catch { return null; }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const backend = getBackend();
  await backend.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function loadRecords(): Promise<MedicalRecord[]> {
  const backend = getBackend();
  const records: MedicalRecord[] = [];
  try {
    const files = await backend.listFiles(RECORDS_DIR);
    for (const name of files) {
      if (name.endsWith('.json')) {
        const text = await backend.readFile(`${RECORDS_DIR}/${name}`);
        if (text) { try { records.push(JSON.parse(text) as MedicalRecord); } catch { /* skip */ } }
      }
    }
  } catch { /* dir may not exist */ }
  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveRecord(record: MedicalRecord): Promise<void> {
  const backend = getBackend();
  await backend.writeFile(`${RECORDS_DIR}/${record.id}.json`, JSON.stringify(record, null, 2));
}

export async function deleteRecord(id: string): Promise<void> {
  const backend = getBackend();
  await backend.deleteFile(`${RECORDS_DIR}/${id}.json`);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getDefaultConfig(): AppConfig {
  return {
    storageFolder: isWebView() ? '应用私有目录' : '',
    lastOpened: new Date().toISOString(),
    categories: [],
  };
}

/** Build category tree dynamically from records */
export function buildCategories(records: MedicalRecord[]): CategoryNode[] {
  return extractCategoriesFromRecords(records);
}

export function showToast(message: string): void {
  if (isWebView() && window.AndroidBridge) {
    window.AndroidBridge.showToast(message);
  }
}

// ========== Export / Import via JS Bridge ==========

/** Export all records — uses native Android share panel in WebView */
export function exportRecords(records: MedicalRecord[], config: AppConfig | null): void {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appName: '仲景医案录',
    recordCount: records.length,
    config,
    records,
  };
  const json = JSON.stringify(exportData, null, 2);

  if (isWebView() && window.AndroidBridge) {
    // In Android WebView: call native to save + share
    window.AndroidBridge.exportData(json);
  } else {
    // In Browser: use download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `仲景医案录_导出_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/** Import records — uses native Android file picker in WebView */
export async function importRecordsNative(
  onImport: (records: MedicalRecord[], count: number) => void
): Promise<void> {
  if (isWebView() && window.AndroidBridge) {
    // Register callback for native to call back
    window.onImportComplete = (jsonContent: string) => {
      try {
        const data = JSON.parse(jsonContent);
        let records: MedicalRecord[] = [];
        if (data.records && Array.isArray(data.records)) {
          records = data.records as MedicalRecord[];
        } else if (Array.isArray(data)) {
          records = data as MedicalRecord[];
        }
        // Validate and fix records
        const validRecords: MedicalRecord[] = [];
        for (const r of records) {
          if (!r.id) r.id = generateId();
          if (!r.date) r.date = new Date().toISOString();
          if (!r.metadata) {
            r.metadata = { cause: '', locationOfDisease: '', mechanism: '', symptoms: [], tcmDiagnosis: [], wmDiagnosis: [], source: '' };
          }
          if (!r.metadata.tcmDiagnosis) r.metadata.tcmDiagnosis = [];
          if (!r.metadata.wmDiagnosis) r.metadata.wmDiagnosis = [];
          if (!r.metadata.symptoms) r.metadata.symptoms = [];
          validRecords.push(r as MedicalRecord);
        }
        onImport(validRecords, validRecords.length);
      } catch (err: any) {
        showToast('导入失败：' + (err.message || '文件格式错误'));
      }
      window.onImportComplete = undefined;
    };
    // Call native to open file picker
    window.AndroidBridge.importData();
  } else {
    // In Browser: not supported
    throw new Error('请在 Android App 中使用导入功能');
  }
}

/** Browser fallback for import (used by hidden file input) */
export async function importRecordsFromFile(file: File): Promise<{ records: MedicalRecord[]; count: number }> {
  const text = await file.text();
  const data = JSON.parse(text);
  let records: MedicalRecord[] = [];
  if (data.records && Array.isArray(data.records)) {
    records = data.records as MedicalRecord[];
  } else if (Array.isArray(data)) {
    records = data as MedicalRecord[];
  }
  const validRecords: MedicalRecord[] = [];
  for (const r of records) {
    if (!r.id) r.id = generateId();
    if (!r.date) r.date = new Date().toISOString();
    if (!r.metadata) {
      r.metadata = { cause: '', locationOfDisease: '', mechanism: '', symptoms: [], tcmDiagnosis: [], wmDiagnosis: [], source: '' };
    }
    if (!r.metadata.tcmDiagnosis) r.metadata.tcmDiagnosis = [];
    if (!r.metadata.wmDiagnosis) r.metadata.wmDiagnosis = [];
    if (!r.metadata.symptoms) r.metadata.symptoms = [];
    validRecords.push(r as MedicalRecord);
  }
  return { records: validRecords, count: validRecords.length };
}
