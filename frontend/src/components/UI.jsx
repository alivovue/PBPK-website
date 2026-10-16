import { LockKeyhole, Sparkles } from 'lucide-react'

export function PlaceholderArt({ id, label, tone = 'indigo', className = '', badge }) {
  return (
    <div className={`placeholder-art tone-${tone} ${className}`} data-asset-id={id} role="img" aria-label={`Placeholder aset: ${label}`}>
      {badge && <span className="art-badge">{badge}</span>}
      <span className="art-rune" aria-hidden="true">◇</span>
      <div>
        <strong>{label}</strong>
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
