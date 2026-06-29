import { useDataStore } from '@/lib/dataStore';
import CaseCard from './CaseCard';
import { FileText } from 'lucide-react';

export default function CaseList() {
  const { state, selectRecord, getFilteredRecords } = useDataStore();
  const filtered = getFilteredRecords();
  if (state.isLoading) return (
    <div className="h-full overflow-y-auto"><div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>)}</div></div>
  );
  if (filtered.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400">
      <FileText className="w-12 h-12 mb-3 text-gray-300" />
      <p className="text-sm">{state.searchQuery || state.selectedCategoryId ? '没有找到符合条件的医案' : '暂无医案，点击"新建医案"开始录入'}</p>
    </div>
  );
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-gray-200 text-xs text-gray-500">
        <span>共 <span className="font-medium text-gray-700">{filtered.length}</span> 条医案</span>
        <span className="text-gray-400">{state.selectedCategoryId ? '已按分类筛选' : state.searchQuery ? '搜索结果' : '全部医案'}</span>
      </div>
      <div>{filtered.map((r) => <CaseCard key={r.id} record={r} isSelected={state.selectedRecordId === r.id} onClick={() => selectRecord(r.id)} />)}</div>
    </div>
  );
}
