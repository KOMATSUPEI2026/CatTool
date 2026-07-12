import { useStore } from './store.js';

const TABS = [
  { key: 'ingest',   label: '入稿工作區' },
  { key: 'projects', label: '專案管理區' },
  { key: 'work',     label: '翻譯工作區' },
  { key: 'terms',    label: '術語庫' },
  { key: 'tm',       label: '翻譯記憶' }
];

export default function App() {
  const currentTab  = useStore(s => s.currentTab);
  const activateTab = useStore(s => s.activateTab);
  const termCount   = useStore(s => s.termBase.length);
  const tmCount     = useStore(s => s.tmSegments.length);
  const docCount    = useStore(s => s.documents.length);

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <span className="seal-mark">校</span>
          <div>
            <h1>校譯台</h1>
            <div className="tagline">術語比對・翻譯記憶</div>
          </div>
        </div>
        <div className="header-right">
          <div className="stat-line">
            <span>術語條目　<b>{termCount}</b></span>
            <span>記憶句段　<b>{tmCount}</b></span>
            <span>文件數　<b>{docCount}</b></span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="點擊連結 Google 帳號"><i className="bi bi-person"></i> 訪客模式</button>
            <button className="icon-btn"><i className="bi bi-keyboard"></i> 快捷鍵</button>
            <button className="icon-btn"><i className="bi bi-moon"></i> 暗黑模式</button>
            <button className="icon-btn"><i className="bi bi-zoom-in"></i> 防老花模式：1x</button>
            <button className="icon-btn" title="將文件、術語庫與翻譯記憶儲存至 Google 試算表"><i className="bi bi-cloud-arrow-up"></i> 儲存至雲端</button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.key}
                  className={'tab-btn' + (currentTab === t.key ? ' active' : '')}
                  onClick={() => activateTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {TABS.map(t => (
        <section key={t.key} className={'panel' + (currentTab === t.key ? ' active' : '')} id={'panel-' + t.key}>
          <div className="card">
            <p>{t.label}——React 版遷移中，本分頁待後續輪次搬遷。</p>
          </div>
        </section>
      ))}
    </div>
  );
}
