import { ArrowRight, BookOpen, MessageCircleQuestion, Play, Sparkles, Star, Swords, Trophy } from 'lucide-react';
import { routes } from '../api/routes.js';
import { DataState, SignInPrompt } from '../components/DataState.jsx';
import { Panel, PlaceholderArt } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

export default function Hub({ navigate, session, onSignIn, notify }) {
  const subjects = useApi(routes.learning.subjects);
  const name = session.account.data?.display_name || session.account.data?.username;
  const profile = session.profile.data;
  return (
    <div className="screen-grid hub-grid">
      <section className="hub-stage">
        <div className="stage-copy">
          <span className="eyebrow"><Sparkles size={13} /> FESTIVAL GRAND CONVERGENCE</span>
          <h2>Gerbang pengetahuan<br />telah terbuka.</h2>
          <p>Jelajahi materi pembelajaran, temui para penantang, dan ikuti perkembangan festival.</p>
          <div className="stage-actions">
            <button className="primary-button" onClick={() => navigate('learn')}><Play size={17} /> Jelajahi pelajaran</button>
          </div>
        </div>
        <PlaceholderArt id="ENV_HUB_GATE_01" label="Ilustrasi Gerbang Festival" tone="indigo" className="hub-art" badge="LATAR HUB" />
      </section>
      <Panel className="auri-card">
        <div className="auri-row">
          <PlaceholderArt id="CHAR_AURI_BUST_01" label="Potret AURI" tone="mint" className="auri-art" />
          <div>
            <span className="eyebrow">PESAN DARI AURI</span>
            <h3>{name ? `Selamat datang, ${name}.` : 'Selamat datang, Penantang.'}</h3>
            <p>“Pikiran yang tekun adalah kompas terbaik di antara dunia.”</p>
          </div>
        </div>
        <button className="text-button" onClick={() => notify('Percakapan AURI belum tersedia.')}><MessageCircleQuestion size={17} /> Tanya AURI <ArrowRight size={16} /></button>
      </Panel>
      <Panel className="daily-panel" eyebrow="PENANTANG" title="Perjalananmu">
        {session.token ? (
          <DataState resource={session.profile}>
            <div className="stat-grid">
              <div><span>TINGKAT</span><b>{profile?.level}</b></div>
              <div><span>PERINGKAT</span><b>{profile?.rank ?? '—'}</b></div>
              <div><span>TOTAL EXP</span><b>{profile?.total_exp.toLocaleString('id-ID')}</b></div>
              <div><span>KOIN</span><b>{profile?.currency_balance.toLocaleString('id-ID')}</b></div>
              <div><span>STREAK SAAT INI</span><b>{profile?.current_streak} hari</b></div>
              <div><span>STREAK TERPANJANG</span><b>{profile?.longest_streak} hari</b></div>
            </div>
          </DataState>
        ) : <SignInPrompt onSignIn={onSignIn} />}
      </Panel>
      <Panel className="quick-panel" eyebrow="PILIH JALUR" title="Kegiatan Festival">
        <div className="quick-grid">
          {[
            ['learn', BookOpen, 'Ruang Belajar', 'Jelajahi materi'],
            ['battle', Swords, 'Arena', 'Lihat penantangmu'],
            ['competition', Trophy, 'Peringkat', 'Lihat turnamen'],
            ['collection', Star, 'Koleksi', 'Jelajahi karakter'],
          ].map(([page, Icon, title, detail]) => (
            <button key={page} className={`quick-card ${page}`} onClick={() => navigate(page)}>
              <Icon size={22} /><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={18} />
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="quick-panel" eyebrow="AKADEMI" title="Mata Pelajaran">
        <DataState resource={subjects} emptyMessage="Belum ada mata pelajaran tersedia.">
          <div className="read-list">
            {subjects.data?.map((subject) => (
              <button className="read-card" key={subject.id} onClick={() => navigate('learn')}>
                <strong>{subject.name}</strong><span>{subject.description}</span>
              </button>
            ))}
          </div>
        </DataState>
      </Panel>
    </div>
  );
}
