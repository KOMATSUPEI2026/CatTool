/* 純函式工具：自 vanilla 版原樣搬遷，不依賴 DOM 與全域狀態 */

export function cid(){ return Math.random().toString(36).slice(2,10); }

export function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = n => String(n).padStart(2,'0');
  return `${months[d.getMonth()]}-${pad(d.getDate())}-${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ja/zh 為內部儲存鍵名（歷史慣例），實際語言由 doc.srcLang/tgtLang 決定 */
export function docStats(doc){
  let jaChars=0, zhChars=0, draftCount=0, confirmedCount=0;
  doc.segments.forEach(s=>{
    jaChars += s.ja.replace(/\s/g,'').length;
    zhChars += (s.zh||'').replace(/\s/g,'').length;
    if((s.zh||'').trim()) draftCount++;
    if(s.confirmed) confirmedCount++;
  });
  const total = doc.segments.length;
  return {
    jaChars, zhChars,
    draftPct: total ? Math.round(draftCount/total*100) : 0,
    confirmedPct: total ? Math.round(confirmedCount/total*100) : 0
  };
}

export function docPair(doc){
  return { src: (doc && doc.srcLang) || 'ja', tgt: (doc && doc.tgtLang) || 'zh-TW' };
}

export function downloadJSON(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function importJSON(file, cb, onError){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ cb(JSON.parse(reader.result)); }
    catch(err){ onError && onError(err.message); }
  };
  reader.readAsText(file);
}

export const LANG_NAMES = {
  'zh-TW':'繁體中文','zh-HK':'繁體中文','zh-CN':'簡體中文','zh-SG':'簡體中文',
  'en':'英文','en-US':'英文','en-GB':'英文',
  'ja':'日文','ko':'韓文','fr':'法文','de':'德文','es':'西班牙文','vi':'越南文','th':'泰文'
};
export function langName(code){ return LANG_NAMES[code] || code || '—'; }
