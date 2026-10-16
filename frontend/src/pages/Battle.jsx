import { Swords } from 'lucide-react';
import { routes, withQuery } from '../api/routes.js';
import { DataState, SignInPrompt } from '../components/DataState.jsx';
import { EmptyPortrait, Panel, PlaceholderArt, Tag } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

export default function Battle({ token, onSignIn }) {
  const roster = useApi(token ? withQuery(routes.player.characters, { owned: true }) : null, { token });
  const demons = useApi(token ? routes.heartDemons : null, { token });
  return (
    <div className="read-stack battle-page">
      <Panel className="read-panel" eyebrow="ARENA KONVERGENSI" title="Para Penantang">
        <PlaceholderArt id="ENV_ARENA_RIFT_01" label="Arena Konvergensi" tone="arena" className="arena-preview" />
        <p className="feature-note">Pertarungan belum diaktifkan. Kamu dapat melihat karakter dan tantanganmu di sini.</p>
        <button className="secondary-button" disabled><Swords size={17} /> Pertarungan segera hadir</button>
      </Panel>
      <Panel className="read-panel" title="Karakter Milikmu">
        {token ? <DataState resource={roster} emptyMessage="Kamu belum memiliki karakter.">
          <div className="read-list">
            {roster.data?.map((character) => <div className="read-card roster-summary" key={character.id}>
              <EmptyPortrait name={character.name} tone={character.color} />
              <div><strong>{character.name}</strong><span>Lv. {character.level} · Daya {character.power.toLocaleString('id-ID')}</span></div>
              <Tag>{character.role}</Tag>
            </div>)}
          </div>
        </DataState> : <SignInPrompt onSignIn={onSignIn} />}
      </Panel>
      <Panel className="read-panel" eyebrow="HEART DEMON" title="Tantangan Pengetahuan">
        {token ? <DataState resource={demons} emptyMessage="Belum ada tantangan pengetahuan.">
          <div className="read-list">{demons.data?.map((demon) => <div className="read-card" key={demon.id}>
            <strong>Topik #{demon.topic_id}</strong><Tag>{demon.status}</Tag>
            <span>Target penguasaan: {(demon.required_mastery * 100).toLocaleString('id-ID')}%</span>
          </div>)}</div>
        </DataState> : <SignInPrompt onSignIn={onSignIn} />}
      </Panel>
    </div>
  );
}
