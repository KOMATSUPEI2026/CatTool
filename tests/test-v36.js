/* 校譯台 V36 句段整理五功能：headless Chrome 自動化測試 */
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
      tm: tmSegments.map(t=>({ja:t.ja, zh:t.zh}))
    };
  });
}
async function submitModal(){
  await page.click('.modal-overlay [data-role="submit"]');
}
async function waitModalGone(){
  await page.waitForSelector('.modal-overlay', {hidden:true, timeout:3000});
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

  /* ── T1 建檔（貼上入稿 ja→zh-TW，3 句） ── */
  await page.select('#src-lang','ja');
  await page.select('#tgt-lang','zh-TW');
  await page.type('#doc-name-input','自動測試稿');
  await page.click('#raw-input');
  await page.keyboard.type('一句目です。二句目です。三句目です。');
  await page.click('#btn-segment');
  await new Promise(r=>setTimeout(r,300));
  await page.click('.doc-link');           // 專案管理區 → 開檔進翻譯工作區
  await new Promise(r=>setTimeout(r,300));
  let s = await state();
  assert('T1 建檔 3 句段', s.segs && s.segs.length===3, JSON.stringify(s.segs?.map(x=>x.ja)));

  /* ── T2 Tab 確認第一句 → 進 TM ── */
  await page.click('textarea[data-seg]');
  await page.keyboard.type('第一句譯文');
  await page.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('T2 Tab 確認進 TM', s.segs[0].confirmed===true && s.tmCount===1, `confirmed=${s.segs[0].confirmed} tm=${s.tmCount}`);

  /* ── T3 新增句子：插入為第一句 ── */
  await page.click('#btn-seg-add');
  await page.waitForSelector('.modal-overlay .seg-tool-list');
  await page.screenshot({path:path.join(SHOT_DIR,'shot-add-modal.png')});
  // 未選位置就送出 → 應報錯
  await submitModal();
  let err = await page.$eval('.seg-tool-err', el=>({text:el.textContent, shown:el.style.display==='block'}));
  assert('T3a 未選位置報錯', err.shown && err.text.includes('插入位置'), err.text);
  await page.click('.seg-tool-item[data-pos="0"]');
  await page.click('.seg-tool-newtext');
  await page.keyboard.type('新しい冒頭の句。');
  await submitModal();
  await waitModalGone();
  s = await state();
  assert('T3b 新句插入為第一句', s.segs.length===4 && s.segs[0].ja==='新しい冒頭の句。' && s.segs[0].confirmed===false,
         `len=${s.segs.length} first=${s.segs[0].ja}`);
  assert('T3c 原已確認句不受影響', s.segs[1].confirmed===true, `seg1 confirmed=${s.segs[1].confirmed}`);

  /* ── T4 編輯/分割：分割已確認句（V28 原文側延伸）＋順帶編輯末句 ── */
  await page.click('#btn-seg-edit');
  await page.waitForSelector('.modal-overlay .seg-tool-list textarea');
  await page.screenshot({path:path.join(SHOT_DIR,'shot-edit-modal.png')});
  // 已確認句「一句目です。」現在是 idx=1：游標放在「一句目」後（第 3 字元）按 Enter 分割
  await page.evaluate(()=>{
    const ta = document.querySelector('.modal-overlay textarea[data-idx="1"]');
    ta.focus(); ta.setSelectionRange(3,3);
  });
  await page.keyboard.press('Enter');
  await new Promise(r=>setTimeout(r,200));
  // 分割後末句 idx=4（三句目です。）：改寫內容
  await page.evaluate(()=>{
    const ta = document.querySelector('.modal-overlay textarea[data-idx="4"]');
    ta.focus(); ta.value = '三句目を書き換えた。';
    ta.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await submitModal();
  await waitModalGone();
  s = await state();
  assert('T4a 分割成 5 句', s.segs.length===5, `len=${s.segs.length} ja=${JSON.stringify(s.segs.map(x=>x.ja))}`);
  assert('T4b 前半句保留譯文但退未確認斷tmId', s.segs[1].ja==='一句目' && s.segs[1].zh==='第一句譯文'
         && s.segs[1].confirmed===false && s.segs[1].tmId===null, JSON.stringify(s.segs[1]));
  assert('T4c 後半句=新句譯文空白', s.segs[2].ja==='です。' && s.segs[2].zh==='' && s.segs[2].confirmed===false,
         JSON.stringify(s.segs[2]));
  assert('T4d 編輯生效', s.segs[4].ja==='三句目を書き換えた。', s.segs[4].ja);
  assert('T4e TM 紀錄保留', s.tmCount===1, `tm=${s.tmCount}`);

  /* ── T5 排序：把第一句拖到最後 ── */
  await page.click('#btn-seg-reorder');
  await page.waitForSelector('.modal-overlay .seg-tool-list');
  await page.evaluate(()=>{
    const list = document.querySelector('.modal-overlay .seg-tool-list');
    const items = [...list.querySelectorAll('.seg-tool-item')];
    const dt = new DataTransfer();
    items[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
    const last = items[items.length-1].getBoundingClientRect();
    list.dispatchEvent(new DragEvent('dragover',{bubbles:true,clientY:last.bottom+1,dataTransfer:dt}));
    items[0].dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}));
  });
  await submitModal();
  await waitModalGone();
  s = await state();
  assert('T5 拖曳排序：首句移至末尾', s.segs[s.segs.length-1].ja==='新しい冒頭の句。' && s.segs[0].ja==='一句目',
         JSON.stringify(s.segs.map(x=>x.ja)));

  /* ── T6 合併：先驗不相鄰報錯，再合併前兩句 ── */
  await page.click('#btn-seg-merge');
  await page.waitForSelector('.modal-overlay .seg-tool-list');
  const items6 = await page.$$('.modal-overlay .seg-tool-item');
  await items6[0].click(); await items6[2].click();   // 不相鄰
  await submitModal();
  err = await page.$eval('.seg-tool-err', el=>({text:el.textContent, shown:el.style.display==='block'}));
  assert('T6a 不相鄰報錯', err.shown && err.text.includes('連續'), err.text);
  await items6[2].click();                            // 取消第 3 句 → 改選第 2 句
  await items6[1].click();
  await submitModal();
  await waitModalGone();
  s = await state();
  assert('T6b 相鄰合併：原文譯文串接', s.segs.length===4 && s.segs[0].ja==='一句目です。'
         && s.segs[0].zh==='第一句譯文' && s.segs[0].confirmed===false && s.segs[0].tmId===null,
         JSON.stringify(s.segs[0]));

  /* ── T7 刪除：先 Tab 確認末句，刪除後 TM 應保留 ── */
  const tas = await page.$$('#seg-list textarea');
  await tas[tas.length-1].click();
  await page.keyboard.type('末句譯文');
  await page.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  const tmBefore = s.tmCount;
  await page.click('#btn-seg-delete');
  await page.waitForSelector('.modal-overlay .seg-tool-list');
  const flags = await page.evaluate(()=>{
    const last = [...document.querySelectorAll('.modal-overlay .seg-tool-item')].pop();
    return [...last.querySelectorAll('.seg-tool-flag')].map(f=>f.textContent);
  });
  assert('T7a 警示標籤顯示', flags.includes('已有譯文') && flags.includes('已確認'), JSON.stringify(flags));
  await page.evaluate(()=>{ [...document.querySelectorAll('.modal-overlay .seg-tool-item')].pop().click(); });
  await submitModal();
  await waitModalGone();
  s = await state();
  assert('T7b 刪除後句段減一、TM 保留', s.segs.length===3 && s.tmCount===tmBefore,
         `len=${s.segs.length} tm=${s.tmCount}(before ${tmBefore})`);

  assert('T8 無 JS 執行錯誤', errors.length===0, errors.join(' | '));

  await browser.close();
  let fail = 0;
  results.forEach(r=>{
    if(!r.pass) fail++;
    console.log(`${r.pass?'✅':'❌'} ${r.name}${r.detail?'  ['+r.detail+']':''}`);
  });
  console.log(fail===0 ? '\n全部通過' : `\n${fail} 項失敗`);
  process.exit(fail===0?0:1);
})().catch(e=>{ console.error('腳本錯誤:', e); process.exit(2); });
