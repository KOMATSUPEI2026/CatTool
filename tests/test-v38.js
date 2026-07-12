/* 校譯台 V38 端到端譯者之旅：入稿→專案管理→翻譯工作→術語庫→翻譯記憶
   含三項修正驗證：刪除開啟中檔案的幽靈畫面、TM 側欄 Shift+Tab、+新增詞條配對跟隨目前檔案 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../cat-tool-demo.html');
const results = [];
let page;

function assert(name, cond, detail){
  results.push({name, pass: !!cond, detail: detail || ''});
}
async function state(){
  return page.evaluate(()=>({
    doc: (()=>{ const d = documents.find(d=>d.id===currentDocId);
      return d ? {name:d.name, folderId:d.folderId, segs:d.segments.map(s=>({ja:s.ja, zh:s.zh, confirmed:s.confirmed, tmId:s.tmId}))} : null; })(),
    docCount: documents.length,
    folders: folders.map(f=>({id:f.id, name:f.name})),
    terms: termBase.map(t=>({ja:t.ja, zh:t.zh, srcLang:t.srcLang, tgtLang:t.tgtLang})),
    tm: tmSegments.map(t=>({id:t.id, ja:t.ja, zh:t.zh}))
  }));
}

(async ()=>{
  const browser = await puppeteer.launch({executablePath: CHROME, headless: 'new'});
  page = await browser.newPage();
  await page.setViewport({width:1440, height:1000});
  const errors = [];
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('dialog', d=>{ d.type()==='prompt' ? d.accept('測試資料夾') : d.accept(); });
  await page.goto(PAGE, {waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,800));

  /* ── ① 入稿工作區：語系閘門 ── */
  let disabled = await page.$eval('#btn-segment', el=>el.disabled);
  assert('①a 未選語系時建立檔案封鎖', disabled===true);
  await page.select('#src-lang','ja');
  await page.select('#tgt-lang','ja');
  const hint = await page.$eval('#lang-gate-hint', el=>el.textContent);
  assert('①b 相同語系被擋', hint.includes('不可相同'), hint);
  await page.select('#tgt-lang','zh-TW');
  disabled = await page.$eval('#btn-segment', el=>el.disabled);
  assert('①c 配對完成後解鎖', disabled===false);
  await page.type('#doc-name-input','旅程稿');
  await page.click('#raw-input');
  await page.keyboard.type('一句目です。二句目です。三句目です。');
  await page.click('#btn-segment');
  await new Promise(r=>setTimeout(r,300));
  let s = await state();
  assert('①d 建檔 3 句並跳轉專案區', s.docCount===1, `docs=${s.docCount}`);

  /* ── ② 專案管理區：資料夾（Modal）／指派／搜尋（無結果提示） ── */
  await page.click('#btn-new-folder');
  await page.waitForSelector('#folder-name-input');
  await page.evaluate(()=>{ document.getElementById('folder-name-input').value='測試資料夾'; });
  await page.click('#folder-confirm');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('②a 新增資料夾（Modal）', s.folders.length===1 && s.folders[0].name==='測試資料夾', JSON.stringify(s.folders));
  await page.select('.doc-folder-select', s.folders[0].id);
  await new Promise(r=>setTimeout(r,200));
  const docFolder = await page.evaluate(()=>documents[0].folderId);
  assert('②b 檔案指派資料夾', docFolder===s.folders[0].id);
  await page.type('#project-search','不存在的檔名');
  await new Promise(r=>setTimeout(r,200));
  let rowCount = await page.$$eval('#project-tbody tr', els=>els.length);
  const projHint = await page.$eval('#project-no-result', el=>el.style.display);
  assert('②c 搜尋過濾＋無結果提示', rowCount===0 && projHint==='inline', `rows=${rowCount} hint=${projHint}`);
  await page.evaluate(()=>{ document.getElementById('project-search').value=''; renderProjects(); });
  const projHint2 = await page.$eval('#project-no-result', el=>el.style.display);
  assert('②d 清空搜尋提示消失', projHint2==='none', projHint2);

  /* ── ③ 翻譯工作區：Tab 確認／術語／TM 側欄／搜尋取代 ── */
  await page.click('.doc-link');
  await new Promise(r=>setTimeout(r,300));
  await page.click('textarea[data-seg]');
  await page.keyboard.type('第一句譯文');
  await page.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('③a Tab 確認進 TM', s.doc.segs[0].confirmed===true && s.tm.length===1);

  // 新增術語（等同反白流程，直接開 Modal）→ 原文標記出現
  await page.evaluate(()=>openTermModal(null,'二句目'));
  await page.waitForSelector('#modal-zh');
  await page.type('#modal-zh','第二句');
  await page.click('#modal-confirm');
  await new Promise(r=>setTimeout(r,300));
  const hitCount = await page.$$eval('#seg-list .term-hit', els=>els.length);
  assert('③b 術語標記出現在原文', hitCount===1, `hits=${hitCount}`);

  // TM 側欄：聚焦與 TM 同原文的句段 → 相似卡片；Shift+Tab 不改寫；Enter 套用
  await page.evaluate(()=>{ setTMMode('similar'); openTMSidebar(); tmSidebarPinned = true; });
  await page.click('textarea[data-seg]');   // 句 1（與 TM 原文相同）
  await new Promise(r=>setTimeout(r,300));
  const cardCount = await page.$$eval('#tm-sidebar-body .tm-card', els=>els.length);
  assert('③c 相似記憶卡片出現', cardCount>=1, `cards=${cardCount}`);
  const tmZhBefore = (await state()).tm[0].zh;
  await page.click('#tm-sidebar-body .tm-card textarea');
  await page.keyboard.type('改');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('③d Shift+Tab 不改寫記憶（修正驗證）', s.tm[0].zh===tmZhBefore, `zh=${s.tm[0].zh}`);
  await page.click('#tm-sidebar-body .tm-card textarea');
  await page.keyboard.press('Enter');       // 套用至左側
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('③e Enter 套用且退回未確認', s.doc.segs[0].zh.includes('改') && s.doc.segs[0].confirmed===false,
         JSON.stringify(s.doc.segs[0]));
  await page.evaluate(()=>{ tmSidebarPinned=false; closeTMSidebar(); });

  // Toast：空搜尋按「取代」→ 出現輕量提示（取代原生 alert）
  await page.click('#sr-replace-btn');
  await page.waitForSelector('.toast.show', {timeout:2000});
  const toastText = await page.$eval('.toast', el=>el.textContent);
  assert('③h Toast 取代 alert', toastText.includes('搜尋框輸入'), toastText);

  // 搜尋取代 → 復原
  await page.click('#sr-query');
  await page.keyboard.type('譯文');
  await page.click('#sr-replace');
  await page.keyboard.type('翻譯');
  await page.click('#sr-replace-btn');
  await page.waitForSelector('#sr-confirm');
  await page.click('#sr-confirm');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('③f 取代生效', s.doc.segs[0].zh.includes('翻譯'), s.doc.segs[0].zh);
  await page.click('#sr-undo-btn');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('③g 復原生效', s.doc.segs[0].zh.includes('譯文'), s.doc.segs[0].zh);
  await page.evaluate(()=>{ document.getElementById('sr-query').value=''; srQuery=''; updateSRCount(); renderSegments(); });

  /* ── ④ 術語庫：+新增詞條配對跟隨目前檔案／inline 編輯／刪除 ── */
  // 故意把入稿區改成 en→ja，驗證新詞條仍跟隨目前檔案的 ja→zh-TW（修正驗證）
  await page.evaluate(()=>activateTab('intake'));
  await page.select('#src-lang','en');
  await page.select('#tgt-lang','ja');
  await page.evaluate(()=>activateTab('terms'));
  await page.click('#btn-add-term');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('④a 新詞條配對跟隨目前檔案（修正驗證）', s.terms[0].srcLang==='ja' && s.terms[0].tgtLang==='zh-TW',
         `${s.terms[0].srcLang}→${s.terms[0].tgtLang}`);
  await page.type('#term-tbody input[data-field="ja"]','三句目');
  await page.type('#term-tbody input[data-field="zh"]','第三句');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('④b inline 編輯即時寫入', s.terms[0].ja==='三句目' && s.terms[0].zh==='第三句');
  await page.evaluate(()=>{ const del=document.querySelector('#term-tbody .row-del'); del.click(); });
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('④c 刪除詞條', s.terms.length===1 && s.terms[0].ja==='二句目', JSON.stringify(s.terms));
  await page.type('#term-search','絕對搜不到的詞');
  await new Promise(r=>setTimeout(r,200));
  const termHint = await page.$eval('#term-no-result', el=>el.style.display);
  assert('④d 術語庫無結果提示', termHint==='inline', termHint);
  await page.evaluate(()=>{ document.getElementById('term-search').value=''; termPage=1; renderTermTable(); });

  /* ── ⑤ 翻譯記憶：刪除紀錄 → 句段徽章退空心、譯文保留 ── */
  // 先把句 1 重新確認（Enter 套用後為未確認）
  await page.evaluate(()=>activateTab('work'));
  await page.click('textarea[data-seg]');
  await page.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('⑤a 重新確認', s.doc.segs[0].confirmed===true && s.tm.length===1);
  const zhBeforeDel = s.doc.segs[0].zh;
  await page.evaluate(()=>activateTab('tm'));
  await page.type('#tm-search','絕對搜不到的記憶');
  await new Promise(r=>setTimeout(r,200));
  const tmHint = await page.$eval('#tm-no-result', el=>el.style.display);
  assert('⑤a2 翻譯記憶無結果提示', tmHint==='inline', tmHint);
  await page.evaluate(()=>{ document.getElementById('tm-search').value=''; tmPage=1; renderTMTable(); });
  await page.evaluate(()=>{ document.querySelector('#tm-tbody .row-del').click(); });
  await new Promise(r=>setTimeout(r,200));
  s = await state();
  assert('⑤b 刪TM→徽章退回、譯文保留', s.tm.length===0 && s.doc.segs[0].confirmed===false
         && s.doc.segs[0].tmId===null && s.doc.segs[0].zh===zhBeforeDel, JSON.stringify(s.doc.segs[0]));

  /* ── ⑥ 幽靈畫面修正驗證：刪除目前開啟中的檔案（走置中確認 Modal） ── */
  await page.evaluate(()=>activateTab('projects'));
  await page.evaluate(()=>{ document.querySelector('#project-tbody .row-del[data-docid]').click(); });
  await page.waitForSelector('.modal-overlay [data-role="ok"]');
  await page.click('.modal-overlay [data-role="ok"]');
  await new Promise(r=>setTimeout(r,300));
  await page.evaluate(()=>activateTab('work'));
  await new Promise(r=>setTimeout(r,200));
  const ghost = await page.evaluate(()=>({
    segCount: document.querySelectorAll('#seg-list .seg').length,
    emptyShown: document.getElementById('seg-empty').style.display !== 'none',
    docName: document.getElementById('current-doc-name').textContent
  }));
  assert('⑥ 刪除開啟中檔案無幽靈畫面（修正驗證）', ghost.segCount===0 && ghost.emptyShown && ghost.docName==='—',
         JSON.stringify(ghost));

  assert('⑦ 全程無 JS 執行錯誤', errors.length===0, errors.join(' | '));

  await browser.close();
  let fail = 0;
  results.forEach(r=>{
    if(!r.pass) fail++;
    console.log(`${r.pass?'✅':'❌'} ${r.name}${r.detail?'  ['+r.detail+']':''}`);
  });
  console.log(fail===0 ? '\n全部通過' : `\n${fail} 項失敗`);
  process.exit(fail===0?0:1);
})().catch(e=>{ console.error('腳本錯誤:', e); process.exit(2); });
