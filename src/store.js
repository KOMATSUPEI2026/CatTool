import { create } from 'zustand';

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
  currentTab: 'projects',

  activateTab: (key) => set({ currentTab: key })
}));
