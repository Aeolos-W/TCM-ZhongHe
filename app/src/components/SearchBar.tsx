import { useState, useRef, useEffect } from 'react';
import { useDataStore } from '@/lib/dataStore';
import { Search, ChevronDown, Sparkles, SlidersHorizontal } from 'lucide-react';

const modes = [
  { value: 'fulltext', label: '全文' },
  { value: 'symptom', label: '症状' },
  { value: 'disease', label: '疾病' },
  { value: 'mechanism', label: '病机' },
  { value: 'cause', label: '病因' },
];

export default function SearchBar() {
  const { setSearch, state } = useDataStore();
  const [searchMode, setSearchMode] = useState('fulltext');
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => { function handler(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); } document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, []);
  const handleSearch = (value: string) => { setInputValue(value); setSearch(value); };
  const currentLabel = modes.find((m) => m.value === searchMode)?.label || '全文';
  return (
    <div className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:border-[#c94d4d] focus-within:ring-1 focus-within:ring-[#c94d4d]/20 transition-all">
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1 px-2.5 sm:px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border-r border-gray-200 rounded-l-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
              {currentLabel}<ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                {modes.map((mode) => <button key={mode.value} onClick={() => { setSearchMode(mode.value); setShowDropdown(false); }} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#fdf2f2] transition-colors ${searchMode === mode.value ? 'text-[#601005] bg-[#fdf2f2]' : 'text-gray-600'}`}>{mode.label}</button>)}
              </div>
            )}
          </div>
          <input type="text" value={inputValue} onChange={(e) => handleSearch(e.target.value)} placeholder="搜索医案、症状、疾病..." className="flex-1 bg-transparent px-2.5 sm:px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0" />
          <button className="p-2 text-gray-400 hover:text-[#802008] transition-colors"><Search className="w-4 h-4" /></button>
        </div>
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#601005] bg-[#fdf2f2] hover:bg-[#f9d6d6] border border-[#f5b5b5] rounded-lg transition-colors"><Sparkles className="w-3.5 h-3.5" />类案AI</button>
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"><SlidersHorizontal className="w-3.5 h-3.5" />高级检索</button>
      </div>
      {state.searchQuery && <div className="mt-1.5 sm:mt-2 text-xs text-gray-500">共找到 <span className="text-[#601005] font-medium">{state.records.length}</span> 条医案</div>}
    </div>
  );
}
