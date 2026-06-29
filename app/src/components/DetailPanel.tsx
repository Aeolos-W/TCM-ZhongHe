import { useState, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useDataStore } from '@/lib/dataStore';
import MarkdownEditor from './MarkdownEditor';
import {
  X, Trash2, Save, Bookmark, FileText, Calendar, User, Hash, MapPin, Clock,
  Stethoscope, BookOpen, Lightbulb, XCircle
} from 'lucide-react';

/** Tag Input Component for symptoms */
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const t = text.trim();
    if (t && !tags.includes(t)) { onChange([...tags, t]); }
    setInput('');
  };

  const removeTag = (i: number) => { onChange(tags.filter((_, idx) => idx !== i)); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); addTag(input); }
    else if (e.key === 'Backspace' && !input && tags.length > 0) { removeTag(tags.length - 1); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-gray-200 rounded-lg focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/20 transition-all min-h-[36px]"
      onClick={() => inputRef.current?.focus()}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md">
          {tag}
          <button onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="text-amber-400 hover:text-amber-600"><XCircle className="w-3 h-3" /></button>
        </span>
      ))}
      <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? (placeholder || '输入症状按回车...') : ''}
        className="flex-1 min-w-[80px] text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400" />
    </div>
  );
}

/** Section block with icon + label */
function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-gray-700">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function DetailPanel() {
  const { selectRecord, updateRecord, removeRecord, getSelectedRecord } = useDataStore();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const record = getSelectedRecord();
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [patient, setPatient] = useState('');
  const [location, setLocation] = useState('');
  const [era, setEra] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [cause, setCause] = useState('');
  const [locationOfDisease, setLocationOfDisease] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [tcmDiagnosis, setTcmDiagnosis] = useState<string[]>([]);
  const [wmDiagnosis, setWmDiagnosis] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [keyAnalysis, setKeyAnalysis] = useState('');
  const [syndromeDiagnosis, setSyndromeDiagnosis] = useState('');
  const [classicReference, setClassicReference] = useState('');

  useMemo(() => {
    if (record) {
      setTitle(record.title); setDoctor(record.doctor); setPatient(record.patient || '');
      setLocation(record.location || ''); setEra(record.era || '');
      setTags(record.tags); setContent(record.content);
      setCause(record.metadata.cause); setLocationOfDisease(record.metadata.locationOfDisease);
      setMechanism(record.metadata.mechanism);
      setTcmDiagnosis([...record.metadata.tcmDiagnosis]); setWmDiagnosis([...record.metadata.wmDiagnosis]);
      setSource(record.metadata.source); setSymptoms(record.metadata.symptoms);
      setKeyAnalysis(record.keyAnalysis || ''); setSyndromeDiagnosis(record.syndromeDiagnosis || '');
      setClassicReference(record.classicReference || '');
    }
  }, [record?.id]);

  const handleSave = useCallback(async () => {
    if (!record) return;
    await updateRecord({
      ...record, title: title || record.title, doctor, patient, location, era, tags,
      content, keyAnalysis, syndromeDiagnosis, classicReference,
      metadata: { cause, locationOfDisease, mechanism, symptoms, tcmDiagnosis, wmDiagnosis, source },
    });
  }, [record, title, doctor, patient, location, era, tags, content, cause, locationOfDisease, mechanism, symptoms, tcmDiagnosis, wmDiagnosis, source, keyAnalysis, syndromeDiagnosis, classicReference, updateRecord]);

  const handleDelete = useCallback(async () => { if (!record) return; if (window.confirm('确定删除这条医案？')) await removeRecord(record.id); }, [record, removeRecord]);

  const previewHtml = useMemo(() => content ? DOMPurify.sanitize(marked.parse(content) as string) : '', [content]);

  if (!record) return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white">
      <FileText className="w-16 h-16 mb-4 text-gray-200" />
      <p className="text-sm">选择左侧列表中的医案查看详情</p>
    </div>
  );

  // 标题格式提示
  const firstDiagnosis = tcmDiagnosis[0] || wmDiagnosis[0] || '某';
  const titleHint = `${doctor || '某医'}治${patient || '某'}某${firstDiagnosis}病案`;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* 顶部操作栏 - 固定 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white z-10">
        <h2 className="text-sm font-semibold text-gray-700 truncate flex-1 mr-2">
          {title || titleHint}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleSave} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="保存"><Save className="w-4 h-4" /></button>
          <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="收藏"><Bookmark className="w-4 h-4" /></button>
          <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
          <button onClick={() => selectRecord(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded" title="关闭"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 统一滚动区域 - 参考图四模式 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* === 基本信息 === */}
          <Section icon={<User className="w-4 h-4" />} label="基本信息">
            <div className="space-y-3">
              {/* 标题 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">案例名 <span className="text-gray-300">(例: 张仲景治王某伤寒病案)</span></label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleSave}
                  placeholder={titleHint}
                  className="w-full text-base font-semibold text-gray-800 bg-transparent border-b border-gray-200 focus:border-amber-400 outline-none px-1 py-1 transition-colors" />
              </div>
              {/* 医师/患者 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">医师</label>
                  <input value={doctor} onChange={(e) => setDoctor(e.target.value)} onBlur={handleSave} placeholder="医师姓名"
                    className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">患者</label>
                  <input value={patient} onChange={(e) => setPatient(e.target.value)} onBlur={handleSave} placeholder="患者姓名"
                    className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
                </div>
              </div>
              {/* 地点/年代/日期 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">地点</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input value={location} onChange={(e) => setLocation(e.target.value)} onBlur={handleSave} placeholder="地点"
                      className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">时间/年代</label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input value={era} onChange={(e) => setEra(e.target.value)} onBlur={handleSave} placeholder="年代"
                      className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">录入日期</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input value={format(new Date(record.date), 'yyyy-MM-dd', { locale: zhCN })} readOnly
                      className="w-full text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* === 病理三要素 === */}
          <Section icon={<Stethoscope className="w-4 h-4" />} label="病理三要素">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">病因</label>
                <input value={cause} onChange={(e) => setCause(e.target.value)} onBlur={handleSave} placeholder="如：外感风寒"
                  className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">病所</label>
                <input value={locationOfDisease} onChange={(e) => setLocationOfDisease(e.target.value)} onBlur={handleSave} placeholder="如：太阳经"
                  className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">病机</label>
                <input value={mechanism} onChange={(e) => setMechanism(e.target.value)} onBlur={handleSave} placeholder="如：营卫不和"
                  className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
              </div>
            </div>
          </Section>

          {/* === 症状 - 标签化 === */}
          <Section icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} label="症状">
            <TagInput tags={symptoms} onChange={(v) => { setSymptoms(v); handleSave(); }} placeholder="输入症状，按回车添加标签..." />
          </Section>

          {/* === 疾病诊断 === */}
          <Section icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} label="疾病诊断">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">中医诊断</label>
                <TagInput tags={tcmDiagnosis} onChange={(v) => setTcmDiagnosis(v)} placeholder="如：太阳病、中风..." />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">西医诊断</label>
                <TagInput tags={wmDiagnosis} onChange={(v) => setWmDiagnosis(v)} placeholder="如：上呼吸道感染..." />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">来源/经典</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} onBlur={handleSave} placeholder="如：《伤寒论》"
                className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all" />
            </div>
            <textarea value={syndromeDiagnosis} onChange={(e) => setSyndromeDiagnosis(e.target.value)} onBlur={handleSave} placeholder="详细证候及疾病诊断描述..."
              className="w-full mt-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all resize-y min-h-[60px]" />
          </Section>

          {/* === 关键分析 === */}
          <Section icon={<Lightbulb className="w-4 h-4" />} label="关键分析">
            <textarea value={keyAnalysis} onChange={(e) => setKeyAnalysis(e.target.value)} onBlur={handleSave} placeholder="医案的关键分析要点..."
              className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all resize-y min-h-[60px]" />
          </Section>

          {/* === 引用经典 === */}
          <Section icon={<BookOpen className="w-4 h-4" />} label="引用经典">
            <textarea value={classicReference} onChange={(e) => setClassicReference(e.target.value)} onBlur={handleSave} placeholder="引用古籍经典条文..."
              className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all resize-y min-h-[60px]" />
          </Section>

          {/* === 标签 === */}
          <Section icon={<Hash className="w-4 h-4" />} label="标签">
            <TagInput tags={tags} onChange={(v) => { setTags(v); handleSave(); }} placeholder="添加标签..." />
          </Section>

          {/* === 编辑正文 / 阅读视图 Tab === */}
          <div className="mb-2 mt-6">
            <div className="flex items-center gap-4 border-b border-gray-200 mb-3">
              {(['edit', 'preview'] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t ? 'text-amber-700 border-amber-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  {t === 'edit' ? '编辑正文' : '阅读视图'}
                </button>
              ))}
            </div>
          </div>

          {/* === Markdown 编辑/预览 === */}
          {activeTab === 'edit' ? (
            <MarkdownEditor value={content} onChange={setContent} onSave={handleSave} />
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="min-h-[300px] p-4 prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-[1.8] prose-strong:text-gray-800 prose-blockquote:border-l-amber-400 prose-blockquote:bg-amber-50/30 prose-table:text-sm prose-th:bg-gray-50 prose-th:font-medium prose-td:border-gray-100"
                style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400 italic text-center py-8">暂无内容</p>' }} />
            </div>
          )}

          {/* 底部留白 */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
