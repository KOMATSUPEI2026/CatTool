import { createRoot } from 'react-dom/client';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import '../cat-tool.css';
import App from './App.jsx';
import { useStore } from './store.js';

// 遷移期後門：入稿區未遷移前，測試腳本與主控台可經 window.__catStore.setState 注入資料
window.__catStore = useStore;

createRoot(document.getElementById('root')).render(<App />);
