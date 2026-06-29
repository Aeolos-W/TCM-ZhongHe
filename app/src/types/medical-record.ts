export interface MedicalRecord {
  id: string;
  title: string;
  location: string;
  era: string;
  metadata: {
    cause: string;
    locationOfDisease: string;
    mechanism: string;
    symptoms: string[];
    tcmDiagnosis: string[];   // 中医诊断（标签化）
    wmDiagnosis: string[];    // 西医诊断（标签化）
    source: string;
  };
  keyAnalysis: string;
  syndromeDiagnosis: string;
  classicReference: string;
  content: string;
  tags: string[];
  doctor: string;
  patient: string;
  date: string;
  categoryId: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  count: number;
  children?: CategoryNode[];
}

export interface AppConfig {
  storageFolder: string;
  lastOpened: string;
  categories: CategoryNode[];
}

/** 从医案的四维度提取分类树：中医诊断、西医诊断、症状、病机 */
export function extractCategoriesFromRecords(records: MedicalRecord[]): CategoryNode[] {
  // 收集四个维度的所有唯一值
  const tcmSet = new Set<string>();
  const wmSet = new Set<string>();
  const symptomSet = new Set<string>();
  const mechanismSet = new Set<string>();

  for (const r of records) {
    r.metadata.tcmDiagnosis.forEach((d) => { if (d.trim()) tcmSet.add(d.trim()); });
    r.metadata.wmDiagnosis.forEach((d) => { if (d.trim()) wmSet.add(d.trim()); });
    r.metadata.symptoms.forEach((s) => { if (s.trim()) symptomSet.add(s.trim()); });
    if (r.metadata.mechanism.trim()) mechanismSet.add(r.metadata.mechanism.trim());
  }

  const buildChildren = (items: Set<string>, prefix: string): CategoryNode[] => {
    const sorted = Array.from(items).sort();
    return sorted.map((name) => ({
      id: `${prefix}-${name}`,
      name,
      count: records.filter((r) => {
        if (prefix === 'tcm') return r.metadata.tcmDiagnosis.includes(name);
        if (prefix === 'wm') return r.metadata.wmDiagnosis.includes(name);
        if (prefix === 'sym') return r.metadata.symptoms.includes(name);
        if (prefix === 'mech') return r.metadata.mechanism === name;
        return false;
      }).length,
    }));
  };

  return [
    {
      id: 'dim-tcm',
      name: '中医诊断',
      count: 0,
      children: buildChildren(tcmSet, 'tcm'),
    },
    {
      id: 'dim-wm',
      name: '西医诊断',
      count: 0,
      children: buildChildren(wmSet, 'wm'),
    },
    {
      id: 'dim-sym',
      name: '症状',
      count: 0,
      children: buildChildren(symptomSet, 'sym'),
    },
    {
      id: 'dim-mech',
      name: '病机',
      count: 0,
      children: buildChildren(mechanismSet, 'mech'),
    },
  ].filter((cat) => (cat.children?.length || 0) > 0)
   .map((cat) => ({ ...cat, count: cat.children?.reduce((s, c) => s + c.count, 0) || 0 }));
}
