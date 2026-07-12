/* 校譯台 V37 快捷標點符號列：headless Chrome 自動化測試 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const SHOT_DIR = require('os').tmpdir();   // 截圖寫到系統暫存目錄，不留在專案內、不進版控

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../cat-tool-demo.html');
const results = [];
let page;

function assert(name, cond, detail){
  results.push({name, pass: !!cond, detail: detail || ''});
}
async function state(){
  return page.evaluate(()=>{
    const doc = documents.find(d=>d.id===currentDocId);
    return {
      segs: doc ? doc.segments.map(s=>({ja:s.ja, zh:s.zh, confirmed:s.confirmed, tmId:s.tmId})) : null,
      tmCount: tmSegments.length,
      punctBar: punctBar
    };
  });
}
async function caret(){
  return page.evaluate(()=>{
    const ta = document.activeElement;
    return ta && ta.tagName==='TEXTAREA'
      ? {tag:'TEXTAREA', seg:ta.dataset.seg, value:ta.value, start:ta.selectionStart, end:ta.selectionEnd}
      : {tag: ta ? ta.tagName : null};
  });
}

(async ()=>{
  const browser = await puppeteer.launch({executablePath: CHROME, headless: 'new'});
  page = await browser.newPage();
  await page.setViewport({width:1440, height:1000});
  const errors = [];
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('dialog', d=>d.accept());
  await page.goto(PAGE, {waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,800));

  /* ── 建檔（ja→zh-TW，2 句）並開檔 ── */
  await page.select('#src-lang','ja');
  await page.select('#tgt-lang','zh-TW');
  await page.click('#raw-input');
  await page.keyboard.type('一句目です。二句目です。');
  await page.click('#btn-segment');
  await new Promise(r=>setTimeout(r,300));

  /* ── T1 顯示時機：專案管理區隱藏 → 工作區顯示 ── */
  let barShown = await page.$eval('#punct-bar', el=>el.classList.contains('show'));
  assert('T1a 專案管理區不顯示標點列', barShown===false, `show=${barShown}`);
  await page.click('.doc-link');
  await new Promise(r=>setTimeout(r,300));
  barShown = await page.$eval('#punct-bar', el=>el.classList.contains('show'));
  assert('T1b 翻譯工作區顯示標點列', barShown===true, `show=${barShown}`);
  const keyCount = await page.$$eval('#punct-bar .punct-key', els=>els.length);
  assert('T1c 10 格預設符號', keyCount===10, `keys=${keyCount}`);
  await page.screenshot({path:path.join(SHOT_DIR,'shot-punct-bar.png')});

  /* ── T2 點擊插入：游標處插入「，」、焦點留在 textarea ── */
  await page.click('textarea[data-seg]');
  await page.keyboard.type('你好世界');
  await page.evaluate(()=>{ document.activeElement.setSelectionRange(2,2); });   // 游標放「你好|世界」
  await page.click('.punct-key[data-idx="0"]');   // ，
  await new Promise(r=>setTimeout(r,150));
  let c = await caret();
  assert('T2 點擊插入於游標處且焦點保留', c.tag==='TEXTAREA' && c.value==='你好，世界' && c.start===3,
         JSON.stringify(c));

  /* ── T3 配對括號：無反白停中間 → 打字 → 反白包住 ── */
  await page.evaluate(()=>{ const ta=document.activeElement; ta.setSelectionRange(ta.value.length, ta.value.length); });
  await page.click('.punct-key[data-idx="5"]');   // 「」
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T3a 括號成對插入且游標停中間', c.value==='你好，世界「」' && c.start===c.value.length-1, JSON.stringify(c));
  await page.keyboard.type('內文');
  c = await caret();
  assert('T3b 中間打字', c.value==='你好，世界「內文」', c.value);
  await page.evaluate(()=>{ document.activeElement.setSelectionRange(0,2); });    // 反白「你好」
  await page.click('.punct-key[data-idx="6"]');   // 『』
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T3c 反白包住', c.value==='『你好』，世界「內文」' && c.start===4, JSON.stringify(c));

  /* ── T4 快捷鍵 Ctrl+Shift+2 → 插入第 2 格「。」；Ctrl+Shift+0 → 第 10 格 ── */
  await page.evaluate(()=>{ const ta=document.activeElement; ta.setSelectionRange(ta.value.length, ta.value.length); });
  await page.keyboard.down('Control'); await page.keyboard.down('Shift');
  await page.keyboard.press('2');
  await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T4a Ctrl+Shift+2 插入「。」', c.value.endsWith('。'), c.value);
  await page.keyboard.down('Control'); await page.keyboard.down('Shift');
  await page.keyboard.press('0');
  await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T4b Ctrl+Shift+0 插入第10格“”且停中間', c.value.endsWith('“”') && c.start===c.value.length-1, c.value);

  /* ── T5 V28：Tab 確認後點標點 → 退回未確認、tmId 斷開？（標點插入走 insertIntoSeg） ── */
  await page.keyboard.press('Tab');   // 確認第 1 句
  await new Promise(r=>setTimeout(r,200));
  let s = await state();
  assert('T5a Tab 確認', s.segs[0].confirmed===true && s.tmCount===1, `confirmed=${s.segs[0].confirmed}`);
  // 焦點已跳到下一句？點回第一句 textarea 再插入標點
  await page.click('textarea[data-seg]');
  await page.click('.punct-key[data-idx="7"]');   // ！
  await new Promise(r=>setTimeout(r,150));
  s = await state();
  assert('T5b 標點插入已確認句 → 退回未確認（V28）', s.segs[0].confirmed===false && s.segs[0].zh.includes('！'),
         `confirmed=${s.segs[0].confirmed} zh=${s.segs[0].zh}`);
  assert('T5c tmId 保留（重按 Tab 覆寫同筆）', s.segs[0].tmId !== null, `tmId=${s.segs[0].tmId}`);

  /* ── T6 術語帶入也退回未確認（V28 補齊驗證，直接呼叫 insertIntoSeg 模擬晶片點擊路徑） ── */
  await page.keyboard.press('Tab');   // 重新確認
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  const segId0 = await page.evaluate(()=>documents.find(d=>d.id===currentDocId).segments[0].id);
  await page.evaluate((id)=>{ insertIntoSeg(id, '術語譯名'); }, segId0);
  await new Promise(r=>setTimeout(r,150));
  s = await state();
  assert('T6 術語帶入路徑退回未確認', s.segs[0].confirmed===false && s.segs[0].zh.includes('術語譯名'),
         `confirmed=${s.segs[0].confirmed}`);

  /* ── T7 編輯模式：✎ → 點第 3 格 → 改成「※」→ 儲存 → 點擊插入「※」 ── */
  await page.click('#punct-edit-toggle');
  let editing = await page.$eval('#punct-bar', el=>el.classList.contains('editing'));
  assert('T7a 進入編輯模式', editing===true);
  await page.click('.punct-key[data-idx="2"]');
  await page.waitForSelector('#punct-input');
  await page.screenshot({path:path.join(SHOT_DIR,'shot-punct-modal.png')});
  await page.evaluate(()=>{ document.getElementById('punct-input').value=''; });
  await page.type('#punct-input','※');
  await page.click('#punct-save');
  await new Promise(r=>setTimeout(r,150));
  s = await state();
  assert('T7b 第 3 格改為※', s.punctBar[2]==='※', JSON.stringify(s.punctBar));
  await page.click('#punct-edit-toggle');   // 退出編輯模式
  editing = await page.$eval('#punct-bar', el=>el.classList.contains('editing'));
  assert('T7c 退出編輯模式', editing===false);
  await page.click('textarea[data-seg]');
  await page.evaluate(()=>{ const ta=document.activeElement; ta.setSelectionRange(ta.value.length, ta.value.length); });
  await page.click('.punct-key[data-idx="2"]');
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T7d 自訂符號可插入', c.value.endsWith('※'), c.value);

  /* ── T8 清空格位：編輯模式存空值 → 格位變空、點擊改開設定 Modal ── */
  await page.click('#punct-edit-toggle');
  await page.click('.punct-key[data-idx="2"]');
  await page.waitForSelector('#punct-input');
  await page.evaluate(()=>{ document.getElementById('punct-input').value=''; });
  await page.click('#punct-save');
  await page.click('#punct-edit-toggle');
  await new Promise(r=>setTimeout(r,150));
  const isEmpty = await page.$eval('.punct-key[data-idx="2"]', el=>el.classList.contains('blank'));
  await page.click('.punct-key[data-idx="2"]');   // 一般模式點空格 → 應開設定 Modal
  const modalOpen = await page.$('#punct-input') !== null;
  assert('T8 清空格位＋空格點擊開設定', isEmpty && modalOpen, `empty=${isEmpty} modal=${modalOpen}`);
  await page.click('#punct-cancel');

  /* ── T9 切分頁隱藏 ── */
  await page.click('.tab-btn[data-tab="terms"]').catch(()=>page.evaluate(()=>activateTab('terms')));
  await new Promise(r=>setTimeout(r,200));
  barShown = await page.$eval('#punct-bar', el=>el.classList.contains('show'));
  assert('T9 切到術語庫標點列隱藏', barShown===false, `show=${barShown}`);

  /* ── T11 空格鍵尺寸固定 36×36（empty 撞名跑版修正） ── */
  await page.evaluate(()=>activateTab('work'));
  const blankSize = await page.$eval('.punct-key.blank', el=>{
    const s = getComputedStyle(el); return {w:s.width, h:s.height};
  });
  assert('T11 空格鍵固定 36×36', blankSize.w==='36px' && blankSize.h==='36px', JSON.stringify(blankSize));

  /* ── T12 Shift+Tab 不觸發確認 ── */
  let s12 = await state();
  const tmB4 = s12.tmCount;
  const confB4 = s12.segs.map(x=>x.confirmed);
  const tas12 = await page.$$('#seg-list textarea');
  await tas12[tas12.length-1].click();
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  await new Promise(r=>setTimeout(r,200));
  s12 = await state();
  assert('T12 Shift+Tab 不確認不進TM', s12.tmCount===tmB4 && JSON.stringify(s12.segs.map(x=>x.confirmed))===JSON.stringify(confB4),
         `tm=${s12.tmCount}(before ${tmB4})`);

  /* ── T13 焦點在搜尋框時快捷鍵不插入 ── */
  let s13 = await state();
  const zhB4 = JSON.stringify(s13.segs.map(x=>x.zh));
  await page.click('#sr-query');
  await page.keyboard.down('Control'); await page.keyboard.down('Shift');
  await page.keyboard.press('1');
  await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  await new Promise(r=>setTimeout(r,200));
  s13 = await state();
  assert('T13 焦點在搜尋框不隱形改字', JSON.stringify(s13.segs.map(x=>x.zh))===zhB4, s13.segs.map(x=>x.zh).join('|'));

  /* ── T14 非白名單 2+ 字元符號整串插入（……） ── */
  await page.click('#punct-edit-toggle');
  await page.click('.punct-key[data-idx="3"]');
  await page.waitForSelector('#punct-input');
  await page.evaluate(()=>{ document.getElementById('punct-input').value=''; });
  await page.type('#punct-input','……');
  await page.click('#punct-save');
  await page.click('#punct-edit-toggle');
  await new Promise(r=>setTimeout(r,150));
  await page.click('textarea[data-seg]');
  await page.evaluate(()=>{ const ta=document.activeElement; ta.setSelectionRange(ta.value.length, ta.value.length); });
  await page.click('.punct-key[data-idx="3"]');
  await new Promise(r=>setTimeout(r,150));
  c = await caret();
  assert('T14 ……整串插入且游標在末尾', c.value.endsWith('……') && c.start===c.value.length, JSON.stringify({end:c.value.slice(-4), start:c.start, len:c.value.length}));

  /* ── T15 工作區底部留白 72px ── */
  const padB = await page.$eval('#panel-work', el=>getComputedStyle(el).paddingBottom);
  assert('T15 panel-work 底部留白', padB==='72px', padB);

  /* ── T16 暗黑模式截圖（目視校色用） ── */
  await page.click('#btn-dark-mode');
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({path:path.join(SHOT_DIR,'shot-punct-dark.png')});

  assert('T10 無 JS 執行錯誤', errors.length===0, errors.join(' | '));

  await browser.close();
  let fail = 0;
  results.forEach(r=>{
    if(!r.pass) fail++;
    console.log(`${r.pass?'✅':'❌'} ${r.name}${r.detail?'  ['+r.detail+']':''}`);
  });
  console.log(fail===0 ? '\n全部通過' : `\n${fail} 項失敗`);
  process.exit(fail===0?0:1);
})().catch(e=>{ console.error('腳本錯誤:', e); process.exit(2); });
