import { useRef } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { isWebView } from '@/lib/fileSystemService';
import { Plus, RefreshCw, Stethoscope, Download, Upload } from 'lucide-react';

export default function TopNavigation() {
  const { refreshRecords, createRecord, exportAllRecords, importRecords, state } = useDataStore();
  const recordCount = state.records.length;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (isWebView()) {
      // WebView mode: use native file picker via JS Bridge
      try {
        const count = await importRecords();
        alert(`成功导入 ${count} 条医案`);
      } catch (err: any) {
        alert('导入失败：' + (err.message || '未知错误'));
      }
    } else {
      // Browser mode: use hidden file input
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importRecords(file);
      alert(`成功导入 ${count} 条医案`);
    } catch (err: any) {
      alert('导入失败：' + (err.message || '未知错误'));
    }
    e.target.value = '';
  };

  const handleExport = () => {
    try {
      exportAllRecords();
      if (isWebView()) {
        // In WebView, export is done via native share panel
        // Toast will be shown by Android side
      } else {
        alert('导出成功');
      }
    } catch (err: any) {
      alert('导出失败：' + (err.message || '未知错误'));
    }
  };

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white">
      {/* Hidden file input for browser import */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

      {/* 主Tab栏 */}
      <div className="flex items-center px-3 sm:px-4 h-11 sm:h-12 border-b border-gray-100 overflow-hidden">
        <div className="flex items-center gap-1.5 mr-3 sm:mr-6 shrink-0">
          <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-[#802008]" />
          <span className="text-sm font-bold text-gray-800 hidden sm:inline">仲景医案录</span>
          <span className="text-sm font-bold text-gray-800 sm:hidden">医案录</span>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
          <button className="px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap shrink-0 text-[#601005] bg-[#fdf2f2] font-medium">
            医案库{recordCount > 0 && <span className="ml-0.5 text-[10px] text-[#a83232]">({recordCount})</span>}
          </button>
        </div>
      </div>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-9 sm:h-10 bg-gray-50/60">
        <div className="flex items-center gap-2">
          <button onClick={() => { createRecord(); }} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-[#802008] hover:bg-[#601005] rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">新建医案</span>
            <span className="sm:hidden">新建</span>
          </button>
          <button onClick={() => refreshRecords()} disabled={state.isLoading} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${state.isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleExport} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors" title="导出全部医案">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出</span>
          </button>
          <button onClick={handleImport} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-[#601005] hover:text-[#400803] hover:bg-[#fdf2f2] rounded-md transition-colors" title="导入医案">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入</span>
          </button>
        </div>
      </div>
    </div>
  );
}
