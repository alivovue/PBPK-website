import { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, X } from 'lucide-react';
import { AccountDialog } from './components/AccountDialog.jsx';
import { SideNav, TopBar } from './components/Chrome.jsx';
import { DataState } from './components/DataState.jsx';
import { EmptyPortrait } from './components/UI.jsx';
import { useSession } from './hooks/useSession.js';
import Battle from './pages/Battle.jsx';
import Collection from './pages/Collection.jsx';
import Competition from './pages/Competition.jsx';
import Hub from './pages/Hub.jsx';
import Learn from './pages/Learn.jsx';
import Progression from './pages/Progression.jsx';

const pageTitles = {
  hub: ['GERBANG UTAMA', 'Festival Grand Convergence'],
  learn: ['AKADEMI ANTARDIMENSI', 'Jalur Pembelajaran'],
  collection: ['ARSIP PARA PENANTANG', 'Koleksi Karakter'],
  battle: ['ARENA KONVERGENSI', 'Pertarungan Pengetahuan'],
  competition: ['TURNAMEN', 'Peringkat Festival'],
  progression: ['JALAN SANG CENDEKIA', 'Kultivasi Pengetahuan'],
};

function currentPage() {
  const requested = new URLSearchParams(window.location.search).get('screen');
  return Object.hasOwn(pageTitles, requested) ? requested : 'hub';
}

export default function App() {
  const [page, setPage] = useState(currentPage);
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const session = useSession();
  const pageMeta = pageTitles[page];
  const onSignIn = () => setAccountOpen(true);

  useEffect(() => {
    const onPopState = () => setPage(currentPage());
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  };
  const navigate = (next) => {
    if (!Object.hasOwn(pageTitles, next)) return;
    setPage(next);
    const url = new URL(window.location.href);
    url.searchParams.set('screen', next);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <TopBar onMenu={() => setNavOpen(true)} onAccount={onSignIn} token={session.token} user={session.account.data} profile={session.profile.data} />
      <SideNav current={page} onNavigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="main-content">
        <header className="page-header"><div><span className="eyebrow">{pageMeta[0]}</span><h1>{pageMeta[1]}</h1></div></header>
        {session.token && session.account.error && <DataState resource={session.account} />}
        {page === 'hub' && <Hub navigate={navigate} session={session} onSignIn={onSignIn} notify={notify} />}
        {page === 'learn' && <Learn />}
        {page === 'collection' && <Collection token={session.token} onSignIn={onSignIn} />}
        {page === 'battle' && <Battle token={session.token} onSignIn={onSignIn} />}
        {page === 'competition' && <Competition account={session.account.data} />}
        {page === 'progression' && <Progression session={session} onSignIn={onSignIn} />}
      </main>
      <button className="auri-fab" onClick={() => setHelpOpen(!helpOpen)} aria-label="Buka bantuan AURI"><Bot size={23} /><span>AURI</span></button>
      {helpOpen && <div className="auri-popover">
        <div><EmptyPortrait name="AURI" tone="mint" /><span><b>AURI</b><small>Pemandu Festival</small></span><button onClick={() => setHelpOpen(false)} aria-label="Tutup bantuan"><X size={18} /></button></div>
        <p>Pilih <b>Belajar</b> untuk menjelajahi pelajaran, atau lihat para penantang di <b>Koleksi</b>.</p>
        <button className="secondary-button" onClick={() => { navigate('learn'); setHelpOpen(false); }}>Buka jalur belajar</button>
      </div>}
      {accountOpen && <AccountDialog session={session} onClose={() => setAccountOpen(false)} />}
      {toast && <div className="toast" role="status"><Sparkles size={18} />{toast}</div>}
    </div>
  );
}
