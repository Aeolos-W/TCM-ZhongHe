import { useState, useCallback } from 'react';
import { useDataStore } from '@/lib/dataStore';
import type { CategoryNode } from '@/types/medical-record';
import { ChevronRight, ChevronDown, FolderTree, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

function TreeNode({ node, level, selectedId, expandedIds, onSelect, onToggle }: {
  node: CategoryNode; level: number; selectedId: string | null;
  expandedIds: Set<string>; onSelect: (id: string) => void; onToggle: (id: string) => void;
}) {
  const isSelected = selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const padLeft = level * 14 + 6;
  return (
    <div>
      <button onClick={() => { onSelect(node.id); if (hasChildren) onToggle(node.id); }}
        className={`group w-full flex items-center gap-1 py-1.5 pr-2 text-left transition-colors relative ${isSelected ? 'bg-[#fdf2f2] text-[#601005]' : 'text-gray-700 hover:bg-gray-50'}`}
        style={{ paddingLeft: `${padLeft}px` }}>
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#a83232]" />}
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200/50">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </span>
        ) : <span className="w-5" />}
        <span className={`flex-1 text-sm truncate ${isSelected ? 'font-medium' : ''}`}>{node.name}</span>
        <span className={`text-xs shrink-0 ${isSelected ? 'text-[#a83232]' : 'text-gray-400'}`}>({node.count})</span>
      </button>
      {hasChildren && isExpanded && node.children!.map((child) => (
        <TreeNode key={child.id} node={child} level={level + 1} selectedId={selectedId} expandedIds={expandedIds} onSelect={onSelect} onToggle={onToggle} />
      ))}
    </div>
  );
}

export default function CaseTreeView({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const { state, selectCategory } = useDataStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const categories = state.config?.categories || [];

  // 收起的窄条状态
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 bg-[#f9fafb] border-r border-gray-200 w-10 shrink-0">
        <button onClick={onToggleCollapse} className="p-1.5 text-gray-500 hover:text-[#802008] hover:bg-gray-100 rounded transition-colors mb-3" title="展开案由">
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className="w-5 h-px bg-gray-200 mb-3" />
        <FolderTree className="w-4 h-4 text-[#802008] mb-2" />
        {/* 简化的分类圆点 */}
        <div className="flex flex-col gap-2 items-center">
          {categories.slice(0, 6).map((cat) => (
            <button key={cat.id} onClick={() => selectCategory(cat.id)}
              className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center transition-colors ${
                state.selectedCategoryId === cat.id ? 'bg-[#802008] text-white' : 'bg-gray-200 text-gray-500 hover:bg-[#f9d6d6]'
              }`} title={cat.name}>
              {cat.name.charAt(0)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f9fafb] border-r border-gray-200 w-56 shrink-0">
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-4 h-4 text-[#802008]" />
          <span className="text-sm font-semibold text-gray-700">案由</span>
        </div>
        <button onClick={onToggleCollapse} className="p-1 text-gray-400 hover:text-[#802008] hover:bg-gray-100 rounded transition-colors" title="收起">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {categories.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            暂无分类<br />录入医案后将自动生成分类
          </div>
        ) : (
          categories.map((cat) => (
            <TreeNode key={cat.id} node={cat} level={0} selectedId={state.selectedCategoryId} expandedIds={expandedIds} onSelect={selectCategory} onToggle={handleToggle} />
          ))
        )}
      </div>
      <div className="shrink-0 px-3 py-2 border-t border-gray-200 text-xs text-gray-400">
        共 {state.records.length} 条医案
      </div>
    </div>
  );
}
