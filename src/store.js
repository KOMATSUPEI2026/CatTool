import { create } from 'zustand';
import { cid } from './utils.js';

/* 資料模型原樣搬遷（欄位與 ja/zh 內部鍵名慣例不變，見 docs/cat-tool-handoff.md）：
   documents = [{ id, name, folderId, srcLang, tgtLang, segments:[{id, ja, zh, confirmed, tmId, srcNo}], createdAt, updatedAt }]
   termBase   = [{ id, ja, zh, note, source, srcLang, tgtLang }]
   tmSegments = [{ id, ja, zh, source, srcLang, tgtLang }]
   folders    = [{ id, name }]
   後續各輪把 vanilla 的資料變動函式逐一收成 actions */
export const useStore = create((set) => ({
  documents: [],
  termBase: [],
  tmSegments: [],
  folders: [],
  currentTab: 'ingest',
  currentDocId: null,
  collapsedFolders: new Set(),
  toast: null,   // { msg, seq }：seq 遞增讓同文字連發也能觸發重播（單例頂替）
  // 入稿區語系配對（入稿前必選；文件建立時定格記錄）。放 store 供術語庫新增詞條當後備配對
  ingestSrcLang: '',
  ingestTgtLang: '',

  activateTab: (key) => set({ currentTab: key }),
  openDoc: (docId) => set({ currentDocId: docId, currentTab: 'work' }),
  setIngestLang: (which, value) => set(which === 'src' ? { ingestSrcLang: value } : { ingestTgtLang: value }),

  // 入稿兩條路徑共用：建檔後自動切到專案管理區
  addDocuments: (docs) => set(s => ({ documents: [...s.documents, ...docs], currentTab: 'projects' })),

  showToast: (msg) => set(s => ({ toast: { msg, seq: (s.toast?.seq || 0) + 1 } })),

  addFolder: (name) => set(s => ({ folders: [...s.folders, { id: cid(), name }] })),
  deleteFolder: (folderId) => set(s => ({
    folders: s.folders.filter(f => f.id !== folderId),
    documents: s.documents.map(d => d.folderId === folderId ? { ...d, folderId: null } : d)
  })),
  toggleFolder: (folderId) => set(s => {
    const next = new Set(s.collapsedFolders);
    if(next.has(folderId)) next.delete(folderId); else next.add(folderId);
    return { collapsedFolders: next };
  }),
  deleteDocument: (docId) => set(s => ({
    documents: s.documents.filter(d => d.id !== docId),
    currentDocId: s.currentDocId === docId ? null : s.currentDocId
  })),
  setDocFolder: (docId, folderId) => set(s => ({
    documents: s.documents.map(d =>
      d.id === docId ? { ...d, folderId: folderId || null, updatedAt: Date.now() } : d)
  })),

  addTerm: (term) => set(s => ({ termBase: [term, ...s.termBase] })),
  updateTerm: (id, field, value) => set(s => ({
    termBase: s.termBase.map(t => t.id === id ? { ...t, [field]: value } : t)
  })),
  deleteTerm: (id) => set(s => ({ termBase: s.termBase.filter(t => t.id !== id) })),
  importTerms: (rows) => set(s => ({ termBase: [...s.termBase, ...rows] })),

  // 刪 TM 不清譯文：懸空參照的句段徽章退回未確認，譯文文字保留（核心設計決策 1）
  deleteTmSegment: (tmId) => set(s => ({
    tmSegments: s.tmSegments.filter(t => t.id !== tmId),
    documents: s.documents.map(d => d.segments.some(seg => seg.tmId === tmId)
      ? { ...d, segments: d.segments.map(seg =>
          seg.tmId === tmId ? { ...seg, tmId: null, confirmed: false } : seg) }
      : d)
  })),
  importTmSegments: (rows) => set(s => ({ tmSegments: [...s.tmSegments, ...rows] }))
}));
