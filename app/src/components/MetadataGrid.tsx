import { useState, useRef, useEffect, useCallback } from 'react';
import type { MedicalRecord } from '@/types/medical-record';
import { Pencil, Check, X, Tag, MapPin, Microscope } from 'lucide-react';

/** 标签输入组件 */
export function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addTag = (text: string) => { const t = text.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(''); };
  const removeTag = (i: number) => onChange(tags.filter((_, idx) => idx !== i));
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); addTag(input); }
    else if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags.length - 1);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-gray-200 rounded-lg focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/20 transition-all min-h-[36px]"
      onClick={() => inputRef.current?.focus()}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md">
          {tag}<button onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="text-amber-400 hover:text-amber-600"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : ''} className="flex-1 min-w-[60px] text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400" />
    </div>
  );
}

function EditableField({ label, value, icon, onSave }: { label: string; value: string; icon: React.ReactNode; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => setEditValue(value), [value]);
  const handleSave = useCallback(() => { if (editValue !== value) onSave(editValue); setEditing(false); }, [editValue, value, onSave]);
  const handleCancel = () => { setEditValue(value); setEditing(false); };
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSave(); else if (e.key === 'Escape') handleCancel(); };
  return (
    <div className="group relative flex items-start gap-2 p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50/50 transition-all" onDoubleClick={() => setEditing(true)}>
      <div className="shrink-0 mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKey} onBlur={handleSave}
              className="flex-1 min-w-0 px-2 py-1 text-sm text-gray-800 bg-white border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleCancel} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-800 truncate">{value || <span className="text-gray-400 italic">双击编辑...</span>}</span>
            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-amber-600 transition-all"><Pencil className="w-3 h-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MetadataGrid({ record, onUpdate }: { record: MedicalRecord; onUpdate: (r: MedicalRecord) => void }) {
  const handleField = useCallback((field: string, value: string | string[]) => {
    if (field.startsWith('metadata.')) {
      const metaField = field.replace('metadata.', '') as keyof MedicalRecord['metadata'];
      onUpdate({ ...record, metadata: { ...record.metadata, [metaField]: value } });
    } else {
      onUpdate({ ...record, [field]: value });
    }
  }, [record, onUpdate]);

  return (
    <div>
      <div className="mb-2">
        <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1 px-1">病理三要素</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
          <EditableField label="病因" value={record.metadata.cause} icon={<Tag className="w-4 h-4" />} onSave={(v) => handleField('metadata.cause', v)} />
          <EditableField label="病所" value={record.metadata.locationOfDisease} icon={<MapPin className="w-4 h-4" />} onSave={(v) => handleField('metadata.locationOfDisease', v)} />
          <EditableField label="病机" value={record.metadata.mechanism} icon={<Microscope className="w-4 h-4" />} onSave={(v) => handleField('metadata.mechanism', v)} />
        </div>
      </div>
    </div>
  );
}
