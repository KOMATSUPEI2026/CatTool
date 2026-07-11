# 校譯台（cat-tool-demo）交接文件 V35

> 用途：在 Claude Code 中以本文件 + cat-tool-demo.html 接續開發。
> 目前版本：**第 35 版**（V23 → V35 演進，變更摘要見下）
> 上一份交接文件版本：V23。本文件已整併 V24–V35 全部變更與討論結論。

## 專案概要

- **目標**：自製網頁版 CAT（電腦輔助翻譯）工具，取代停止服務的 Termsoup，主力工作流為日文→繁體中文書籍翻譯（插畫技法書），已支援多語系配對
- **技術**：純 HTML + CSS + 原生 JavaScript，單一檔案（約 2400 行）
- **外部依賴（CDN，首次開啟需網路）**：Google Fonts（Noto Serif TC / Sans TC / Serif JP）、SheetJS 0.18.5（xlsx 解析）、Bootstrap Icons 1.11.3（全站圖示）。V23 的「零依賴」原則已在 V26/V30 經使用者同意打破
- **資料**：全部存在瀏覽器記憶體，重新整理即清空；各分頁支援 JSON 匯出/匯入備份
- **開發環境**：M2 MacBook Air，本機瀏覽器直開 HTML

## V24–V35 版本演進摘要

| 版本 | 變更 |
|---|---|
| V24 | 術語庫/翻譯記憶分頁（每頁 10 筆、頁碼列、搜尋回第 1 頁、刪除夾回） |
| V25 | 工作區匯出 JSON 格式 → {ja, zh, confirmed, source} |
| V26 | xlsx 拖放入稿（SheetJS）、一檔多分頁、前綴欄位、srcNo、CRLF 正規化、原文區 pre-wrap |
| V27 | 貼上入稿重名防呆（uniqueDocName）、分頁籤切換即重繪專案區、「原文進度」改名「翻譯進度」 |
| V28 | **編輯即退回未確認**（核心規則）、側欄 Enter 套用同步退回、「重置確認狀態」按鈕 |
| V29 | 工作區進度條（翻譯/校對雙條）、重置 Modal 加寬 440、進度條淺色 60% 透明變數 |
| V30 | 進度條併入情境列、置頂/置底膠囊、全站 icon 換 Bootstrap Icons |
| V31 | 修 icon 換裝引發的刪除/開檔失效（e.target.closest）、譯文框自動撐高（autoGrow，15 掛點） |
| V32 | 語系配對選擇（14 語系）、入稿防呆閘門、xlsx 表頭依語系代碼定位、介面語系標示連動 |
| V33 | **TM/術語庫嚴格語系隔離**（方案 A）、語言欄、表頭中性化、匯出入帶 srcLang/tgtLang |
| V34 | 匯出 JSON 鍵名動態化（{en:…, "zh-TW":…}）、匯入相容四種歷史格式 |
| V35 | 「特定頁檢視」→「跨頁檢視」，搜尋跨度：檔名/語系代碼/原文譯文內容三路比對 |

## 資料模型（核心）

```js
documents = [{ id, name, folderId, srcLang, tgtLang,
               segments: [{ id, ja, zh, confirmed, tmId, srcNo }],
               createdAt, updatedAt }]
termBase   = [{ id, ja, zh, note, source, srcLang, tgtLang }]
tmSegments = [{ id, ja, zh, source, srcLang, tgtLang }]
folders    = [{ id, name }]
```

**重要慣例**：句段/TM/術語的 `ja`/`zh` 是**內部儲存鍵名**（歷史包袱，刻意保留避免大改 30+ 處引用），實際裝什麼語言由 `srcLang`/`tgtLang` 決定。對外 JSON 從 V34 起為動態鍵名（`{en:…, "zh-TW":…, srcLang, tgtLang}`）。匯入相容：新動態鍵格式／舊 ja+zh+語系標記／最舊 ja+zh 無標記（補 ja→zh-TW）／V33 過渡格式。

## 分頁結構與工作流

入稿工作區 → 專案管理區 → 翻譯工作區 → 術語庫 / 翻譯記憶

1. **入稿工作區**：頂部**語系配對列**（來源→目標，14 語系，未配對或相同語系時兩條入稿路徑全部封鎖、按鈕 disabled）。兩張入稿卡：
   - 貼上入稿：文件名稱（重名自動 P005 (2)）+ 原文 textarea →「建立檔案」依「。！？＋換行」切句
   - xlsx 拖放：前綴欄位（前綴-分頁名）+ 拖放區（兩段式：解析→摘要預覽→建立）。表頭依所選語系代碼定位欄位（大小寫不敏感）+「標號」欄存 srcNo；ja/zh-tw 皆空的模板列略過；語系配對變更即作廢暫存
2. **專案管理區**：欄位含語言（srcLang ▶ tgtLang）、翻譯進度%（有譯文即計）、校對進度%（Tab 確認才計）；資料夾分類、刪除、搜尋
3. **翻譯工作區**：核心作業區（明細見下）
4. **術語庫**：每頁 10 筆分頁；欄位含語言配對；表格內即時編輯；譯名「;」並列上限 9
5. **翻譯記憶**：每頁 10 筆分頁；欄位含語言配對；刪除紀錄→句段徽章退空心、譯文保留

## 翻譯工作區功能明細

- **情境列**（單卡整合）：目前檔案名 +「← 返回專案管理區」「⟲ 重置確認狀態」+ 翻譯/校對雙進度條（朱紅/teal 淺色 60% 透明，即時連動）
- **檢視模式**：校閱（左右）→ 翻譯（上下）→ 純譯文，循環切換
- **譯文框自動撐高**：autoGrow（resize:none、overflow hidden），15 個重算掛點（渲染後/打字/套用/檢視切換/字級切換/分頁切回/視窗縮放防抖）。**陷阱**：面板 display:none 時 scrollHeight=0，切回分頁時必須補算
- **Tab 確認**：存入 TM（帶文件語系配對）、徽章空心→實心 teal；有 tmId 則覆寫同筆、無則新增；清空+Tab 退回未確認、TM 保留
- **編輯即退回未確認（V28 核心規則）**：已確認句段的譯文一被改動（打字/清空/Enter 套用），confirmed 立即退 false、徽章退空心，**tmId 保留**→重按 Tab 覆寫同筆不產生重複。實心徽章語意 =「按 Tab 後未被動過且與 TM 同步」
- **重置確認狀態**：置中確認 Modal（440 寬）→ 全文件退回未確認、tmId 保留、作廢取代復原快照
- **搜尋取代**：僅目前檔案；受影響句段退未確認、TM 保留；復原快照（含 docId），被 Tab 重新確認的句段退出快照
- **術語標記/卡片**：只比對同語系配對的術語；卡片 Ctrl(Mac)/Alt(Win)+1~9 帶入；△ 編輯、✕ 刪除
- **右側欄翻譯記憶**：相似模式（bigram Jaccard 前 8 筆）/搜尋模式，**只比對同配對紀錄**；卡片 Tab=更新該筆、Enter=套用至左側（套用即編輯→退回未確認）
- **左側欄頁面檢視**：上下頁檢視／**跨頁檢視**（V35：檔名/語系代碼/內文三路搜尋，最多列 3 檔，IME 相容）
- **置頂/置底膠囊**：貼內容區右緣外側、垂直置中、z-index 80；僅專案管理區與翻譯工作區顯示

## 核心設計決策（歷次討論定案，勿隨意推翻）

1. **TM 單向資料流**：進 TM 的唯一入口是工作區 Tab 確認；刪 TM 不清譯文（斷參照退徽章）；刪文件不動 TM
2. **嚴格語系隔離（方案 A）**：TM/術語只在「配對完全相同」下比對顯示；反向配對降權方案（B）已評估並否決（不符實際接案模式）；管理頁顯示全部紀錄供跨池管理
3. **匯入譯文一律未確認**：xlsx 帶入的 zh 照填但徽章空心，校閱按 Tab 才進 TM（順便把舊稿沉澱進記憶庫）
4. **「儲存檔案」按鈕暫緩**：等 Google Sheets 串接後再定義（屆時儲存目的地=試算表）；快照/還原方案已評估並否決（雙快照互斥、TM 重複等問題）
5. **快捷鍵**：Mac Ctrl / Win Alt + 數字（Shift 出符號、Option 被輸入法攔截）
6. **框架評估結論**：暫不重寫 React；分水嶺=Sheets 串接後的非同步複雜度。屆時資料模型原樣搬遷。**BS5 版面樣式不採用**（僅用 Bootstrap Icons），設計系統維持自訂 CSS
7. **API 方案已定**：axios（CDN、鎖版本 1.7.x）、interceptor 統一掛 OAuth token 與 401 刷新、Sheets 請求集中單一模組。目前**尚無任何網路請求程式碼**

## 設計規範（核心刻度，全站強制）

- **配色（亮色）**：紙 #E7E4DC / 卡片 #FBFAF7 / 墨 #272522 / 朱紅 #B33A2E / teal #1F5C5C；暗黑模式有對應變數；進度條專用 --progress-translate / --progress-confirm（淺一階 60% 透明，雙主題）
- **字體**：UI=Noto Sans TC；標題/分頁/徽章=Noto Serif TC；日文原文=Noto Serif JP
- **刻度**：字級僅 10/12/14/16/24px；spacing 全偶數 px 禁 .5；圓角 2/4/6/8/10/20px + 50%；唯一奇數例外=1px 邊框。標記 ×scale 的屬性乘 --text-scale / --side-scale / --ui-pad-scale
- **V24–V35 新元件刻度**：頁碼鈕 12px/28×28/radius 4（active 朱紅底白字）；進度條軌 8px 高/radius 10；膠囊 radius 20/按鈕 padding 10 8；語系 select 14px/padding 8 10/radius 4；拖放區 2px dashed/radius 6/padding 40 16；加寬 Modal 440px
- 詳細元件刻度表沿用 V23 交接文件（本次未變更的元件全部維持原值）

## 已知注意事項（血淚教訓，Claude Code 必讀）

1. 資料僅存記憶體，關頁即失；測試前務必先匯出 JSON 備份
2. **icon 點擊陷阱**：按鈕內含 `<i class="bi">` 時，事件委派必須用 `e.target.closest()`，禁用 `e.target.classList.contains()`（V31 修過一整批）。現存 4 處 contains 是安全的（term-hit 純文字 span、doc-folder-select）
3. **隱藏面板量測陷阱**：panel display:none 時 scrollHeight=0，autoGrow 等量測必須在面板可見後補算（activateTab 已掛）
4. **IME 相容模式**：側欄搜尋框=「搜尋框常駐+只重繪結果區+composition 事件」，改動搜尋相關功能時不可破壞此結構
5. 動態改寫含 icon 的按鈕要用 innerHTML，用 textContent 會吃掉 icon
6. 重大修改後驗證：CSS 大括號配對、`node --check`（抽出 script 檢查）、設計規範刻度掃描（字級/偶數 spacing）
7. TM 相似度為字元 bigram Jaccard，非商用 CAT 等級
8. CDN 三依賴首次載入需網路；SheetJS 載入失敗時拖放區有明確提示（非無聲失敗）

## 討論中/未實作事項

- **句段合併與交換（下一個功能候選，已完成可行性分析）**：交換=陣列對調、零風險（狀態都在句段物件上、徽章依索引重編、segId 定位不受影響），UI 建議簡化為「上移/下移」；相鄰合併=可行但三代價：(a) confirmed 歸零+tmId 設 null（徽章誠實原則）(b) 第二句 srcNo 遺失（影響未來模板寫回）(c) 不可逆（無拆分功能前需置中確認 Modal）。建議先做相鄰合併（OCR 稿真實痛點）再做移動
- **localStorage 持久化**：曾評估（正式環境可用，artifacts 限制不適用於本機開檔），暫緩等 Sheets
- **拆分句段**：未議

## Claude Code 遷移指引

### Git 版本控制（使用者要求）
- 建議 `git init` 後首 commit 即 V35 現狀；commit 訊息沿用「第 N 版：變更摘要」慣例，一版一 commit
- 建議結構：`cat-tool-demo.html` + `docs/`（三份交接文件）+ 未來 `test/`（驗證腳本可固化為 npm script 或 shell）
- **使用者有雙 GitHub 帳號**（KOMATSUPEI、KOMATSUPEI2026），已設 SSH 金鑰分流（ed25519、~/.ssh/config Host 別名）——建 remote 前先確認要掛哪個帳號、用對應 Host 別名
- GitHub Pages 部署已確認可行（private repo 可用 Pages），尚未實作

### Google Sheets API 串接（幾版後的目標）
- 前置：Google Cloud OAuth Client ID 申請（費用已確認免費）
- HTTP client：**axios**（使用者指定，CDN 引入鎖 1.7.x，不用原生 fetch）；interceptor 統一掛 token/處理 401；所有 Sheets 請求集中一個模組
- 結構對應（已定案）：每分頁=一檔案、每列=一句段；欄位對應 srcLang/tgtLang/confirmed/srcNo；批次操作（取代等）用 values.batchUpdate 寫回；srcNo 供寫回原模板對應列
- 「儲存檔案」按鈕在此階段一併定義（儲存目的地=試算表）
- **串接後重新評估 React 重寫**（非同步狀態複雜度是分水嶺）；重寫時資料模型原樣搬遷、自訂 CSS 原樣保留

### 開發慣例
- 使用者以繁體中文溝通，全域 ~/.claude/CLAUDE.md 已強制繁中回覆
- 版號規則：每輪功能變更 +1，微調可不升版；交接文件記得同步
- 修改前先讀本文件「已知注意事項」與「核心設計決策」；設計決策要推翻前先與使用者討論
