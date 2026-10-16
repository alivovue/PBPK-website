import {
  Backpack, BookOpenText, Castle, ChevronDown, Coins, Crown, Gem,
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

export function TopBar({ onMenu }) {
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
          <div><small>INTI CENDEKIA IV</small><ProgressBar value={68} tone="gold" label="2.720 / 4.000 EXP" /></div>
        </div>
        <div className="wallet"><span><Coins size={17} /> 2.480</span><span><Gem size={16} /> 36</span></div>
        <button className="profile-chip"><span className="avatar-token">RK</span><span className="profile-name">Raka</span><ChevronDown size={15} /></button>
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
              {id === 'learn' && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="season-card">
          <span className="season-label">MUSIM I</span>
          <Shield size={27} />
          <strong>Konvergensi Awal</strong>
          <small>Berakhir dalam 12 hari</small>
          <ProgressBar value={57} tone="cyan" />
        </div>
        <div className="version-stamp"><UserRound size={14} /> Prototipe v0.1</div>
      </aside>
    </>
  )
}
