import { LockKeyhole, Search } from 'lucide-react';
import { useState } from 'react';
import { routes, withQuery } from '../api/routes.js';
import { DataState, SignInPrompt } from '../components/DataState.jsx';
import { EmptyPortrait, Panel, PlaceholderArt } from '../components/UI.jsx';
import { useApi } from '../hooks/useApi.js';

const filters = [
  { label: 'Semua', value: 'all' },
  { label: 'Milikku', value: 'owned' },
  { label: 'Legendaris', value: 'Legendary' },
  { label: 'Epik', value: 'Epic' },
];

function CharacterDetail({ characterId, token }) {
  const character = useApi(characterId ? (token ? routes.player.character(characterId) : routes.characters.detail(characterId)) : null, { token });
  const selected = character.data;
  return (
    <Panel className="character-detail">
      <DataState resource={character} emptyMessage="Pilih karakter untuk melihat detailnya.">
        {selected && <>
          <div className="detail-character-head">
            <PlaceholderArt id={`CHARACTER_${selected.id}`} label={selected.name} tone={selected.color} className="detail-character-sprite" />
            <div><span className="eyebrow">{selected.rarity}</span><h2>{selected.name}</h2><p>{selected.title}</p></div>
          </div>
          <div className="stat-power"><span>DAYA PENGETAHUAN</span><strong>{selected.power.toLocaleString('id-ID')}</strong></div>
          <div className="stat-grid">
            <div><span>PERAN</span><b>{selected.role}</b></div>
            <div><span>TINGKAT</span><b>{selected.level}</b></div>
            <div><span>SEMESTA</span><b>{selected.universe}</b></div>
            <div><span>KEPEMILIKAN</span><b>{token ? (selected.owned ? 'Dimiliki' : 'Belum dimiliki') : 'Masuk untuk melihat'}</b></div>
          </div>
        </>}
      </DataState>
    </Panel>
  );
}

export default function Collection({ token, onSignIn }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [characterId, setCharacterId] = useState(null);
  const [offset, setOffset] = useState(0);
  const needsSignIn = filter === 'owned' && !token;
  const catalogue = useApi(needsSignIn ? null : withQuery(token ? routes.player.characters : routes.characters.list, {
    rarity: !['all', 'owned'].includes(filter) ? filter : undefined,
    owned: filter === 'owned' ? true : undefined,
    offset, limit: 100,
  }), { token });
  const query = search.trim().toLocaleLowerCase('id-ID');
  const visible = catalogue.data?.filter((character) => `${character.name} ${character.title} ${character.universe}`.toLocaleLowerCase('id-ID').includes(query)) ?? [];
  const selected = visible.find((character) => character.id === characterId) ?? visible[0];
  return (
    <div className="collection-layout">
      <section className="collection-browser game-panel">
        <div className="browser-toolbar">
          <div className="filter-tabs">
            {filters.map(({ label, value }) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setOffset(0); }}>{label}</button>)}
          </div>
          <label className="search-field"><Search size={17} /><input aria-label="Cari karakter pada halaman ini" placeholder="Cari di halaman ini…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="collection-count"><span>{visible.length} tokoh ditampilkan</span></div>
        {needsSignIn ? <SignInPrompt onSignIn={onSignIn} /> : (
          <DataState resource={catalogue} emptyMessage="Belum ada karakter untuk filter ini.">
            <div className="character-grid">
              {visible.map((character) => (
                <button key={character.id} className={`character-card ${selected?.id === character.id ? 'selected' : ''} ${token && !character.owned ? 'unowned' : ''}`} onClick={() => setCharacterId(character.id)}>
                  <PlaceholderArt id={`CHAR_${character.id.toUpperCase()}_CARD_01`} label={character.name} tone={character.color} className="character-art" badge={character.rarity} />
                  {token && !character.owned && <span className="lock-overlay"><LockKeyhole size={20} /> BELUM DIMILIKI</span>}
                  <div className="character-summary"><div><span>{character.universe}</span><h3>{character.name}</h3><small>{character.title}</small></div><b>Lv. {character.level}</b></div>
                </button>
              ))}
            </div>
            {visible.length === 0 && <p className="data-state">Tidak ada karakter yang cocok.</p>}
          </DataState>
        )}
        {!needsSignIn && <div className="pagination">
          <button className="secondary-button" disabled={offset === 0 || catalogue.loading} onClick={() => setOffset((value) => Math.max(0, value - 100))}>Sebelumnya</button>
          <span>Halaman {offset / 100 + 1}</span>
          <button className="secondary-button" disabled={catalogue.loading || catalogue.error || catalogue.data?.length !== 100} onClick={() => setOffset((value) => value + 100)}>Berikutnya</button>
        </div>}
      </section>
      <CharacterDetail characterId={selected?.id} token={token} />
    </div>
  );
}
