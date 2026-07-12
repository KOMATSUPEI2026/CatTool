# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概要

「校譯台」（cat-tool-demo）：自製網頁版 CAT（電腦輔助翻譯）工具，取代 Termsoup，主力工作流為日文→繁體中文書籍翻譯（現已支援 14 語系配對）。純 HTML + CSS + 原生 JavaScript，兩檔：`cat-tool-demo.html`（結構＋JS，約 2380 行）＋`cat-tool.css`（樣式約 660 行，頂部含現代精簡 reset，勿改回 Meyer 式全歸零）。無建置系統、無套件管理；自動化測試獨立放在 `tests/`（Puppeteer，不影響主程式零依賴）。

外部依賴僅來自 CDN（首次開啟需網路）：Google Fonts、SheetJS 0.18.5（xlsx 解析）、Bootstrap Icons 1.11.3。資料全部存在瀏覽器記憶體，重新整理即清空；各分頁支援 JSON 匯出/匯入備份。目前尚無任何後端或網路請求程式碼。

## 必讀文件

修改前務必先讀這三份文件，內含大量歷次討論定案的設計決策與踩過的坑，不要在不知情下重新踏入或推翻：

- [docs/cat-tool-handoff.md](docs/cat-tool-handoff.md) — 交接文件主體：資料模型、版本演進、核心設計決策（勿隨意推翻）、已知注意事項（血淚教訓）、Google Sheets 串接規劃
- [docs/cat-tool-sitemap.md](docs/cat-tool-sitemap.md) — 五分頁結構、分頁間資料流向、Modal 清單、JSON 匯出入格式
- [docs/cat-tool-flowcharts.md](docs/cat-tool-flowcharts.md) — 各區塊流程圖（Mermaid）

這三份文件會隨版本演進持續更新；修改功能後記得同步更新對應段落與版號。

## 開發與驗證

沒有 build/lint 指令。開發方式是直接用瀏覽器開啟 `cat-tool-demo.html`。

自動化測試在 `tests/`（Puppeteer + headless Chrome，見 [tests/README.md](tests/README.md)）：首次 `cd tests && npm install puppeteer-core`，之後 `node tests/test-vXX.js` 執行；新功能比照現有腳本新增 `test-vXX.js`。

重大修改後，依 handoff 文件「已知注意事項」第 6 點手動驗證：
- `cat-tool.css` 大括號配對是否平衡（V38 起 CSS 已獨立成檔，直接檢查）
- 抽出 `<script>` 內容以 `node --check` 語法檢查（JS 仍在 html 內）
- 設計規範刻度掃描（字級僅 10/12/14/16/24px；spacing 全偶數 px，唯一例外是 1px 邊框）

測試前務必先用畫面上的「匯出 JSON」備份，資料只存在記憶體，關頁即失。

## 架構要點

### 資料模型（單一事實來源，記憶體全域變數）

```js
documents = [{ id, name, folderId, srcLang, tgtLang,
               segments: [{ id, ja, zh, confirmed, tmId, srcNo }],
               createdAt, updatedAt }]
termBase   = [{ id, ja, zh, note, source, srcLang, tgtLang }]
tmSegments = [{ id, ja, zh, source, srcLang, tgtLang }]
folders    = [{ id, name }]
```

**重要慣例**：句段/TM/術語的 `ja`/`zh` 是內部儲存鍵名（歷史包袱，刻意保留避免大改 30+ 處引用），實際裝什麼語言由 `srcLang`/`tgtLang` 決定。對外 JSON 匯出則用動態鍵名（`{en:…, "zh-TW":…, srcLang, tgtLang}`），匯入需相容四種歷史格式（見 handoff 文件資料模型段落）。

### 五分頁 SPA 結構

單頁應用、分頁切換靠 `activateTab(key)`，無真實路由：入稿工作區 → 專案管理區 → 翻譯工作區（核心作業區）→ 術語庫 / 翻譯記憶。詳細元件與資料流向見 sitemap 文件。

### 核心設計決策（不可隨意推翻，需先與使用者討論）

1. **TM 單向資料流**：進 TM 的唯一入口是翻譯工作區 Tab 確認；刪 TM 不清譯文；刪文件不動 TM
2. **嚴格語系隔離**：TM/術語只在「配對完全相同」下比對顯示（反向配對降權方案已評估並否決）
3. **編輯即退回未確認**（V28 核心規則）：已確認句段的譯文一被改動，`confirmed` 立即退 `false`，但 `tmId` 保留，重按 Tab 覆寫同筆不產生重複
4. **匯入譯文一律未確認**：xlsx 帶入的 zh 照填但徽章空心，需校閱按 Tab 才進 TM
5. 「儲存檔案」按鈕暫緩，等 Google Sheets 串接後定義
6. 框架評估結論：暫不重寫 React，分水嶺是 Sheets 串接後的非同步複雜度；屆時資料模型與自訂 CSS 原樣搬遷。BS5 版面樣式不採用（僅用 Bootstrap Icons）
7. API 方案已定：日後串接用 axios（CDN 鎖 1.7.x），不用原生 fetch；interceptor 統一掛 OAuth token 與 401 刷新

### 已知陷阱

- **icon 點擊委派**：按鈕內含 `<i class="bi">` 時，事件委派必須用 `e.target.closest()`，禁用 `e.target.classList.contains()`
- **隱藏面板量測**：`display:none` 面板 `scrollHeight` 為 0，`autoGrow` 等量測必須在面板切回可見後補算（`activateTab` 已掛鉤點）
- **IME 相容**：側欄搜尋框結構是「搜尋框常駐 + 只重繪結果區 + composition 事件」，改動搜尋相關功能不可破壞此結構
- 動態改寫含 icon 的按鈕要用 `innerHTML`，用 `textContent` 會吃掉 icon
- **幽靈畫面**：改動全域資料（documents/termBase/tmSegments/folders）後必須重繪所有受影響的 view，漏繪會讓使用者對殘影操作、輸入靜默丟失；測試斷言要同時驗資料層與 DOM（詳見 handoff 已知注意事項第 10 點與 tests/README）

### 設計規範（全站強制刻度）

- 配色（亮）：紙 #E7E4DC / 卡片 #FBFAF7 / 墨 #272522 / 朱紅 #B33A2E / teal #1F5C5C（暗黑模式見 CSS 變數）
- 字體：UI = Noto Sans TC；標題/分頁/徽章 = Noto Serif TC；日文原文 = Noto Serif JP
- 刻度：字級僅 10/12/14/16/24px；spacing 全偶數 px（唯一奇數例外是 1px 邊框）；圓角 2/4/6/8/10/20px + 50%
- 標記 ×scale 的屬性乘 `--text-scale` / `--side-scale` / `--ui-pad-scale`（防老花模式）

## 開發慣例

- 使用者以繁體中文溝通，回覆一律使用繁體中文
- 版號規則：每輪功能變更 +1（微調可不升版），交接文件（尤其 handoff.md）需同步更新版本演進表
- 使用者有雙 GitHub 帳號（KOMATSUPEI、KOMATSUPEI2026），已用 SSH 金鑰分流；建立 remote 前先確認要掛哪個帳號
- 涉及「核心設計決策」（見 docs/cat-tool-handoff.md）的變更，先討論取得同意才實作
- 使用者說「先討論」「聊聊」「評估一下」時，只分析不改檔案
- 動手前先簡述修改計畫與影響範圍
