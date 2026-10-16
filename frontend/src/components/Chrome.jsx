import {
  Backpack, BookOpenText, Castle, ChevronDown, Coins, Crown,
  Menu, Shield, Sparkles, Swords, Trophy, UserRound, X,
} from 'lucide-react'
import { ProgressBar } from './UI.jsx'

const navItems = [
  { id: 'hub', label: 'Festival', icon: Castle },
  { id: 'learn', label: 'Belajar', icon: BookOpenText },
  { id: 'collection', label: 'Koleksi', icon: Backpack },
  { id: 'battle', label: 'Arena', icon: Swords },
  { id: 'competition', label: 'Peringkat', icon: Trophy },
  { id: 'progression', label: 'Kultivasi', icon: Sparkles },
]

export function TopBar({ onMenu, onAccount, token, user, profile }) {
  const name = user?.display_name || user?.username || (token ? 'Akunmu' : 'Masuk');
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Buka navigasi"><Menu size={22} /></button>
      <div className="brand-lockup">
        <div className="brand-sigil" aria-hidden="true">GC</div>
        <div><span className="brand-kicker">FESTIVAL OF WORLDS</span><strong>GRAND CONVERGENCE</strong></div>
      </div>
      <div className="player-summary">
        <div className="player-rank">
          <div className="rank-crest"><Crown size={18} /></div>
          <div><small>{profile?.rank ?? (token ? 'PENANTANG' : 'PENANTANG TAMU')}</small>{profile && <ProgressBar value={Math.min(100, profile.total_exp / profile.next_level_at_exp * 100)} tone="gold" label={`${profile.total_exp.toLocaleString('id-ID')} / ${profile.next_level_at_exp.toLocaleString('id-ID')} EXP`} />}</div>
        </div>
        {token && <div className="wallet"><span><Coins size={17} /> {profile ? profile.currency_balance.toLocaleString('id-ID') : '—'}</span></div>}
        <button className="profile-chip" onClick={onAccount} aria-label={token ? 'Buka akun' : 'Masuk ke akun'}><span className="avatar-token">{token ? name.slice(0, 2).toUpperCase() : <UserRound size={17} aria-hidden="true" />}</span><span className="profile-name">{name}</span><ChevronDown size={15} /></button>
      </div>
    </header>
  )
}

export function SideNav({ current, onNavigate, open, onClose }) {
  return (
    <>
      {open && <button className="nav-scrim" aria-label="Tutup navigasi" onClick={onClose} />}
      <aside className={`sidenav ${open ? 'nav-open' : ''}`}>
        <button className="nav-close" onClick={onClose} aria-label="Tutup navigasi"><X size={20} /></button>
        <nav aria-label="Navigasi utama">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={current === id ? 'nav-item active' : 'nav-item'} onClick={() => { onNavigate(id); onClose() }}>
              <span className="nav-icon"><Icon size={20} /></span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="season-card">
          <span className="season-label">FESTIVAL</span>
          <Shield size={27} />
          <strong>Konvergensi Awal</strong>
          <small>Jelajahi dunia pengetahuan.</small>
        </div>
        <div className="version-stamp"><UserRound size={14} /> Prototipe v0.1</div>
      </aside>
    </>
  )
}
