import { LockKeyhole, Sparkles } from 'lucide-react'

export function PlaceholderArt({ id, label, tone = 'indigo', className = '', badge }) {
  const imagePaths = { ENV_HUB_GATE_01: '/Gate.png', ENV_ARENA_RIFT_01: '/Gate.png' };
  const spritePaths = {
    CHAR_TUNGSAHUR_CARD_01: '/triple3-transparent.png', CHAR_ELONMUSK_CARD_01: '/elon.png',
    CHAR_GHOST_CARD_01: '/ghost.png', CHAR_GODZILLA_CARD_01: '/godzilla.png',
    CHARACTER_tungsahur: '/triple3-transparent.png', CHARACTER_elonmusk: '/elon.png',
    CHARACTER_ghost: '/ghost.png', CHARACTER_godzilla: '/godzilla.png',
    BATTLE_tungsahur: '/triple3-transparent.png', BATTLE_elonmusk: '/elon.png',
    BATTLE_ghost: '/ghost.png', BATTLE_godzilla: '/godzilla.png',
    BATTLE_RIFT_GUARDIAN: '/triple3-transparent.png',
  };
  const spritePath = spritePaths[id];
  const displayLabel = id === 'EVENT_UTBK_2024' ? 'SouthEast Asia Masters Olympiad 2024' : label;
  if (imagePaths[id]) {
    return (
      <div className={`placeholder-art image-art tone-${tone} ${className}`} data-asset-id={id}>
        {badge && <span className="art-badge">{badge}</span>}
        <img src={imagePaths[id]} alt={displayLabel} />
      </div>
    );
  }
  if (spritePath) {
    return (
      <div className={`placeholder-art character-sprite tone-${tone} ${className}`} data-asset-id={id}>
        {badge && <span className="art-badge">{badge}</span>}
        <img src={spritePath} alt={label} />
      </div>
    );
  }
  return (
    <div className={`placeholder-art tone-${tone} ${className}`} data-asset-id={id} role="img" aria-label={`Placeholder aset: ${label}`}>
      {badge && <span className="art-badge">{badge}</span>}
      <span className="art-rune" aria-hidden="true">◇</span>
      <div>
        <strong>{displayLabel}</strong>
        <small>{id}</small>
      </div>
    </div>
  )
}

export function ProgressBar({ value, tone = 'gold', label }) {
  return (
    <div className="progress-wrap" aria-label={label ?? `Progres ${value}%`}>
      <div className="progress-track"><span className={`progress-fill fill-${tone}`} style={{ width: `${value}%` }} /></div>
      {label && <span className="progress-label">{label}</span>}
    </div>
  )
}

export function Panel({ children, className = '', eyebrow, title, action }) {
  return (
    <section className={`game-panel ${className}`}>
      {(eyebrow || title || action) && (
        <header className="panel-heading">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Tag({ children, tone = 'neutral' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export function EmptyPortrait({ name = 'Terkunci', tone = 'locked' }) {
  return (
    <div className={`mini-portrait portrait-${tone}`}>
      {tone === 'locked' ? <LockKeyhole size={18} /> : <Sparkles size={18} />}
      <span>{name.slice(0, 1)}</span>
    </div>
  )
}
