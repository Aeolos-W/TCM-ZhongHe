import { useState } from 'react';
import { useDataStore } from '@/lib/dataStore';
import TopNavigation from './TopNavigation';
import SearchBar from './SearchBar';
import CaseTreeView from './CaseTreeView';
import CaseList from './CaseList';
import DetailPanel from './DetailPanel';

export default function WorkspaceLayout() {
  const { state } = useDataStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col bg-[#fdfbf7] overflow-hidden">
      <TopNavigation />
      <SearchBar />
      <div className="flex-1 flex overflow-hidden">
        <CaseTreeView collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <CaseList />
        </div>
        {state.selectedRecordId && (
          <div className="w-full sm:w-[480px] md:w-[520px] lg:w-[560px] shrink-0 overflow-hidden fixed sm:relative inset-0 sm:inset-auto z-50 sm:z-auto bg-white">
            <DetailPanel />
          </div>
        )}
      </div>
    </div>
  );
}
