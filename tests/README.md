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
```

全部通過會輸出「全部通過」並以 exit code 0 結束；任一失敗列出 ❌ 明細並以 exit code 1 結束。
執行過程的 `shot-*.png` 截圖（目視校對用）一律寫到系統暫存目錄（`os.tmpdir()`），不留在專案內、不進版控；.gitignore 另有 `*.png` 雙保險。

## 慣例

- 測試全程在 headless 瀏覽器記憶體中進行，不影響任何實際資料
- 新版功能請比照現有腳本新增 `test-vXX.js`，並沿用 `assert(名稱, 條件, 明細)` 輸出格式
- 修改主程式後除了跑本測試，仍須執行交接文件「已知注意事項」第 6 點的三項靜態驗證（node --check／CSS 括號配對／設計刻度掃描）
