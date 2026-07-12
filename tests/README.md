# 自動化測試（Puppeteer + headless Chrome）

驅動本機 Chrome 實際載入 `cat-tool-demo.html`，模擬點擊與鍵盤操作驗證功能與資料狀態。

## 環境需求

- Node.js
- Google Chrome（macOS 預設路徑 `/Applications/Google Chrome.app`；其他平台請改各腳本開頭的 `CHROME` 常數）
- 首次執行前安裝依賴：

```bash
cd tests
npm install puppeteer-core
```

## 執行

```bash
cd tests
node test-v36.js   # V36 句段整理五功能（16 項斷言）
node test-v37.js   # V37 快捷標點符號列＋bug 修正回歸（25 項斷言）
node test-v38.js   # V38 端到端譯者之旅：五分頁完整流程＋三項 bug 修正驗證（21 項斷言）
```

全部通過會輸出「全部通過」並以 exit code 0 結束；任一失敗列出 ❌ 明細並以 exit code 1 結束。
執行過程的 `shot-*.png` 截圖（目視校對用）一律寫到系統暫存目錄（`os.tmpdir()`），不留在專案內、不進版控；.gitignore 另有 `*.png` 雙保險。

## 慣例

- 測試全程在 headless 瀏覽器記憶體中進行，不影響任何實際資料
- 新版功能請比照現有腳本新增 `test-vXX.js`，並沿用 `assert(名稱, 條件, 明細)` 輸出格式
- 修改主程式後除了跑本測試，仍須執行交接文件「已知注意事項」第 6 點的三項靜態驗證（node --check／CSS 括號配對／設計刻度掃描）

## 幽靈畫面檢測（必做，見交接文件已知注意事項第 10 點）

「幽靈畫面」＝資料已變但畫面沒重繪，使用者對著殘影操作、輸入靜默丟失（歷史案例：刪除開啟中檔案後工作區殘留舊句段）。檢測要求：

- **斷言必須同時驗「資料層」與「DOM」**：例如刪除句段後，`doc.segments.length` 與 `#seg-list .seg` 的元素數量必須相等；只驗 `state()` 回傳的資料抓不到這類 BUG
- 凡測試涉及「在 A 分頁改資料 → 切到 B 分頁看結果」的流程，切過去後要驗 B 分頁的 DOM 是否反映新資料（表格列數、空狀態提示、側欄卡片數、header 統計數字）
- 發現幽靈畫面：先修「該資料變動函式漏了哪個 view 的重繪」，再檢查同一函式是否還漏了其他 view，一併修正並補斷言
