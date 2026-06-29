import { useDataStore } from '@/lib/dataStore';
import { isWebView } from '@/lib/fileSystemService';
import { FolderOpen, Stethoscope, BookOpen, Database, Smartphone } from 'lucide-react';

const FIRST_RUN_KEY = 'zhongjing_first_run';

export default function FolderPicker() {
  const { selectFolder } = useDataStore();
  const inWebView = isWebView();

  function handleStart() {
    localStorage.setItem(FIRST_RUN_KEY, 'true');
    selectFolder();
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#fdfbf7] text-center px-4">
      <div className="mb-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Stethoscope className="w-10 h-10 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">仲景医案录</h1>
        </div>
        <p className="text-gray-500 text-base max-w-md leading-relaxed">
          {inWebView
            ? '中医医案数据库管理系统。数据将保存在应用私有目录中，安全且便于管理。'
            : '中医医案数据库管理系统。请选择本地文件夹作为数据存储位置，所有医案数据将以 JSON 格式保存在该文件夹中。'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg">
        {[
          { icon: inWebView ? <Smartphone className="w-8 h-8 text-amber-600 mb-2" /> : <Database className="w-8 h-8 text-amber-600 mb-2" />, title: inWebView ? '本地存储' : '本地存储', desc: inWebView ? '应用私有目录' : '数据完全由您掌控' },
          { icon: <BookOpen className="w-8 h-8 text-amber-600 mb-2" />, title: 'Markdown', desc: '支持 Markdown 录入' },
          { icon: <Stethoscope className="w-8 h-8 text-amber-600 mb-2" />, title: '结构化', desc: '症状/疾病/病机/病因' },
        ].map((item) => (
          <div key={item.title} className="flex flex-col items-center p-4 rounded-lg bg-white border border-gray-200">
            {item.icon}
            <span className="text-sm font-medium text-gray-700">{item.title}</span>
            <span className="text-xs text-gray-400 mt-1">{item.desc}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        className="group flex items-center gap-3 px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
      >
        <FolderOpen className="w-5 h-5" />
        <span className="text-base font-medium">{inWebView ? '开始使用' : '选择数据存储文件夹'}</span>
      </button>

      <p className="mt-4 text-xs text-gray-400">
        {inWebView ? '首次使用会自动创建数据目录和默认分类' : '首次使用会自动创建配置文件和医案数据目录'}
      </p>
    </div>
  );
}
