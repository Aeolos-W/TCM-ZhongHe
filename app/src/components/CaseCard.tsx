import { useState } from 'react';
import type { MedicalRecord } from '@/types/medical-record';
import { HeartPulse, Microscope, Stethoscope, BookOpen, MapPin, Clock } from 'lucide-react';

export default function CaseCard({ record, isSelected, onClick }: { record: MedicalRecord; isSelected: boolean; onClick: () => void }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    { key: 'pathology', label: '病理三要素', icon: <HeartPulse className="w-3 h-3" /> },
    { key: 'analysis', label: '关键分析', icon: <Microscope className="w-3 h-3" /> },
    { key: 'diagnosis', label: '证候及疾病诊断', icon: <Stethoscope className="w-3 h-3" /> },
    { key: 'classic', label: '引用经典', icon: <BookOpen className="w-3 h-3" /> },
  ];

  const getContent = (key: string) => {
    switch (key) {
      case 'pathology':
        return (
          <div className="space-y-1">
            <p><span className="text-amber-600 font-medium">病因：</span>{record.metadata.cause || '未填写'}</p>
            <p><span className="text-amber-600 font-medium">病所：</span>{record.metadata.locationOfDisease || '未填写'}</p>
            <p><span className="text-amber-600 font-medium">病机：</span>{record.metadata.mechanism || '未填写'}</p>
          </div>
        );
      case 'analysis':
        return <p>{record.keyAnalysis || '暂无关键分析'}</p>;
      case 'diagnosis':
        return (
          <div className="space-y-1">
            <p><span className="text-amber-600 font-medium">证候：</span>{record.metadata.symptoms.join('、') || '未填写'}</p>
            <p><span className="text-amber-600 font-medium">中医诊断：</span>{record.metadata.tcmDiagnosis.join('、') || '未填写'}</p>
            <p><span className="text-amber-600 font-medium">西医诊断：</span>{record.metadata.wmDiagnosis.join('、') || '未填写'}</p>
            <p>{record.syndromeDiagnosis || ''}</p>
          </div>
        );
      case 'classic':
        return <p>{record.classicReference || record.metadata.source || '暂无引用经典'}</p>;
      default:
        return '';
    }
  };

  // 格式化标题: "xx治x某xx病案"
  const formatTitle = () => {
    if (record.title && record.title !== '新医案') return record.title;
    const doctor = record.doctor || '某医';
    const patient = record.patient || '某';
    const diagnosis = record.metadata.tcmDiagnosis[0] || record.metadata.wmDiagnosis[0] || '某';
    return `${doctor}治${patient}某${diagnosis}病案`;
  };

  return (
    <div onClick={onClick} className={`relative border-b border-gray-100 cursor-pointer transition-all ${isSelected ? 'bg-white shadow-sm ring-1 ring-amber-400/50' : 'bg-[#fdfbf7] hover:bg-white'}`}>
      <div className="px-4 py-3">
        {/* 标题: xx治x某xx病案 */}
        <h3 className={`text-[15px] leading-snug mb-1 ${isSelected ? 'text-amber-700 font-semibold' : 'text-gray-800 font-medium'}`}>
          {formatTitle()}
        </h3>

        {/* 副标题: 地点 时间或年代 (灰色) */}
        <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
          {record.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {record.location}
            </span>
          )}
          {record.era && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {record.era}
            </span>
          )}
          {!record.location && !record.era && (
            <span>{record.date ? new Date(record.date).toLocaleDateString('zh-CN') : ''}</span>
          )}
        </div>

        {/* 摘要 */}
        {record.content && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
            {record.content.replace(/[#*`]/g, '').slice(0, 150)}
            {record.content.length > 150 ? '...' : ''}
          </p>
        )}

        {/* 底部四标签: 病理三要素 | 关键分析 | 证候及疾病诊断 | 引用经典 */}
        <div className="flex items-center gap-0.5 mt-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(activeTab === tab.key ? null : tab.key);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-amber-50 text-amber-700 font-medium border border-amber-200/60'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 展开内容 */}
        {activeTab && (
          <div className="mt-2 px-3 py-2.5 bg-gray-50/70 rounded-lg border border-gray-100 text-xs text-gray-700 leading-relaxed" onClick={(e) => e.stopPropagation()}>
            {getContent(activeTab)}
          </div>
        )}
      </div>
    </div>
  );
}
