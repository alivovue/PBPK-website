import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { routes, withQuery } from '../api/routes.js';
import { DataState } from '../components/DataState.jsx';
import { EmptyPortrait, Panel, Tag } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

function dateLabel(value) {
  return new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Competition({ account }) {
  const competitions = useApi(routes.competitions.list);
  const ranks = useApi(routes.ranks);
  const [tab, setTab] = useState('global');
  const [competitionId, setCompetitionId] = useState(null);
  const [offset, setOffset] = useState(0);
  const selected = competitions.data?.find((competition) => competition.id === competitionId) ?? competitions.data?.[0];
  const leaderboard = useApi(tab === 'global' ? withQuery(routes.leaderboard, { limit: 20, offset }) : selected ? routes.competitions.leaderboard(selected.id) : null);
  const rankName = (id) => ranks.data?.find((rank) => rank.id === id)?.name ?? '—';
  return (
    <div className="competition-grid">
      <Panel className="read-panel" eyebrow="FESTIVAL" title="Turnamen">
        <DataState resource={competitions} emptyMessage="Belum ada turnamen tersedia.">
          <div className="read-list">
            {competitions.data?.map((competition) => (
              <button key={competition.id} className={`read-card ${selected?.id === competition.id ? 'selected' : ''}`} onClick={() => setCompetitionId(competition.id)}>
                <Trophy size={20} /><strong>{competition.title}</strong><span>{competition.description}</span>
              </button>
            ))}
          </div>
          {selected && <div className="competition-details">
            <h3>{selected.title}</h3>
            <dl className="data-facts">
              <dt>Mulai</dt><dd>{dateLabel(selected.starts_at)}</dd>
              <dt>Berakhir</dt><dd>{dateLabel(selected.ends_at)}</dd>
              <dt>Peringkat minimum</dt><dd>{rankName(selected.minimum_rank_id)}</dd>
              <dt>Hadiah turnamen</dt><dd>{selected.reward_currency.toLocaleString('id-ID')} Koin</dd>
            </dl>
            <p className="feature-note">Pendaftaran dan pertandingan belum diaktifkan.</p>
          </div>}
        </DataState>
      </Panel>
      <Panel className="leaderboard-panel" title="Papan Peringkat" action={<div className="mini-tabs">
        <button className={tab === 'global' ? 'active' : ''} onClick={() => setTab('global')}>Global</button>
        <button className={tab === 'competition' ? 'active' : ''} disabled={!selected} onClick={() => setTab('competition')}>Turnamen</button>
      </div>}>
        <p className="feature-note">{tab === 'global' ? 'Diurutkan berdasarkan total EXP.' : selected?.title}</p>
        <DataState resource={leaderboard} emptyMessage="Belum ada penantang di papan peringkat.">
          <div className="leader-list">
            {leaderboard.data?.map((player) => (
              <div className={`leader-row ${player.username === account?.username ? 'current' : ''}`} key={player.username}>
                <span className={`rank-num rank-${player.position}`}>{player.position}</span>
                <EmptyPortrait name={player.username} tone="cyan" />
                <div className="leader-name"><strong>{player.username}</strong><small>{tab === 'global' ? `${rankName(player.rank_id)} · Lv. ${player.level}` : 'Skor turnamen'}</small></div>
                <b>{tab === 'global' ? `${player.total_exp.toLocaleString('id-ID')} EXP` : `${(player.score * 100).toLocaleString('id-ID')}%`}</b>
              </div>
            ))}
          </div>
        </DataState>
        {tab === 'global' && <div className="pagination">
          <button className="secondary-button" disabled={offset === 0 || leaderboard.loading} onClick={() => setOffset((value) => Math.max(0, value - 20))}>Sebelumnya</button>
          <span>Halaman {offset / 20 + 1}</span>
          <button className="secondary-button" disabled={leaderboard.loading || leaderboard.error || leaderboard.data?.length !== 20} onClick={() => setOffset((value) => value + 20)}>Berikutnya</button>
        </div>}
      </Panel>
    </div>
  );
}
