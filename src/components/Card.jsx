import { useState } from 'react'
import { LINK_TYPES } from '../storage'

// Cycle des priorités : un clic passe à la suivante.
const PRIORITY_NEXT = { Haute: 'Moyenne', Moyenne: 'Basse', Basse: 'Haute' }

// Libellé affiché pour chaque type de lien.
const LINK_LABEL = Object.fromEntries(LINK_TYPES.map(t => [t.key, t.label]))

// Une carte = un sujet, avec titre, note, priorité, personnes et liens.
export default function Card({
  card,
  columnId,
  columnTitle,
  columns,
  contacts,
  onUpdate,
  onDelete,
  onMove,
  linkApi,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState('lié')

  // Priorité actuelle (Moyenne par défaut pour les cartes existantes sans champ).
  const priority = card.priority || 'Moyenne'

  // Change la priorité au clic (Haute → Moyenne → Basse → Haute).
  function cyclePriority() {
    onUpdate({ ...card, priority: PRIORITY_NEXT[priority] || 'Moyenne' })
  }

  // Construit le lien de composition Gmail pré-rempli (ouvre Gmail dans le
  // navigateur plutôt que l'application mail par défaut comme le ferait mailto:).
  function emailHref() {
    const assigned = contacts.filter(c => card.people.includes(c.id))
    const to = assigned.map(c => c.email).filter(Boolean).join(',')
    const lines = []
    if (card.note) lines.push(card.note)
    lines.push('', `Thème : ${columnTitle}`)
    const params = new URLSearchParams({
      view: 'cm', // mode composition
      fs: '1', // plein écran
      to,
      su: card.title,
      body: lines.join('\n'),
    })
    return `https://mail.google.com/mail/?${params.toString()}`
  }

  const assignedNames = contacts
    .filter(c => card.people.includes(c.id))
    .map(c => c.name)

  // ---------- Liens ----------
  const myLinks = linkApi.links.filter(l => l.from === card.id || l.to === card.id)
  const otherCards = linkApi.cards.filter(c => c.id !== card.id)

  // L'autre extrémité d'un lien (la carte qui n'est pas celle-ci).
  function otherEnd(l) {
    const id = l.from === card.id ? l.to : l.from
    const c = linkApi.cards.find(x => x.id === id)
    return { id, title: c ? c.title || 'Sans titre' : '(carte supprimée)' }
  }

  function submitLink() {
    if (!linkTarget) return
    linkApi.onAdd(card.id, linkTarget, linkType)
    setLinkTarget('')
  }

  // Fait défiler jusqu'à une carte liée et l'illumine brièvement.
  function jumpTo(id) {
    const el = document.getElementById('card-' + id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    linkApi.onHover(id)
    setTimeout(() => linkApi.onHover(null), 1400)
  }

  // États visuels de surlignage selon la carte survolée dans tout le tableau.
  const isHover = linkApi.hoverId === card.id
  const isLinked = linkApi.linkedIds.has(card.id)
  const dim = linkApi.hoverId && !isHover && !isLinked
  const className =
    'card' +
    (isHover ? ' card-hover' : '') +
    (isLinked ? ' card-linked' : '') +
    (dim ? ' card-dim' : '')

  return (
    <article
      id={'card-' + card.id}
      className={className}
      draggable
      onMouseEnter={() => linkApi.onHover(card.id)}
      onMouseLeave={() => linkApi.onHover(null)}
      onDragStart={e => {
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({ cardId: card.id, fromCol: columnId })
        )
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="card-top">
        <button
          className={`priority priority-${priority}`}
          onClick={cyclePriority}
          title="Cliquer pour changer la priorité"
        >
          <span className="priority-dot" />
          {priority}
        </button>
        <button className="icon-btn" title="Supprimer la carte" onClick={() => onDelete(card.id)}>
          ×
        </button>
      </div>

      {editingTitle ? (
        <input
          className="card-title-input"
          autoFocus
          value={card.title}
          onChange={e => onUpdate({ ...card, title: e.target.value })}
          onBlur={() => setEditingTitle(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') setEditingTitle(false)
          }}
        />
      ) : (
        <h4 className="card-title" onClick={() => setEditingTitle(true)} title="Cliquer pour modifier">
          {card.title || 'Sans titre'}
        </h4>
      )}

      {editingNote ? (
        <textarea
          className="card-note-input"
          autoFocus
          value={card.note}
          placeholder="Écrire une note…"
          onChange={e => onUpdate({ ...card, note: e.target.value })}
          onBlur={() => setEditingNote(false)}
        />
      ) : (
        <p
          className={`card-note ${card.note ? '' : 'empty'}`}
          onClick={() => setEditingNote(true)}
          title="Cliquer pour modifier la note"
        >
          {card.note || 'Ajouter une note…'}
        </p>
      )}

      {assignedNames.length > 0 && (
        <div className="people-chips">
          {assignedNames.map(n => (
            <span key={n} className="chip">
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="card-actions">
        <a
          className="mini-btn"
          href={emailHref()}
          target="_blank"
          rel="noopener noreferrer"
        >
          ✉ E-mail
        </a>
        <button
          className={`mini-btn${myLinks.length ? ' has-links' : ''}`}
          onClick={() => setShowLinks(s => !s)}
          title="Lier à d'autres cartes"
        >
          🔗{myLinks.length ? ` ${myLinks.length}` : ''}
        </button>
        {/* Menu de secours pour mobile : déplacer la carte sans glisser-déposer. */}
        <select
          className="move-select"
          value=""
          onChange={e => {
            if (e.target.value) onMove(card.id, columnId, e.target.value)
          }}
          title="Déplacer vers une autre colonne"
        >
          <option value="">Déplacer ▾</option>
          {columns
            .filter(c => c.id !== columnId)
            .map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
        </select>
      </div>

      {showLinks && (
        <div className="link-popover">
          {myLinks.length > 0 && (
            <ul className="link-list">
              {myLinks.map(l => {
                const o = otherEnd(l)
                const dir = l.type === 'lié' ? '↔' : l.from === card.id ? '→' : '←'
                return (
                  <li key={l.id}>
                    <button
                      className="link-jump"
                      onClick={() => jumpTo(o.id)}
                      title={`${LINK_LABEL[l.type] || l.type} · aller à la carte`}
                    >
                      <span className="link-dir">{dir}</span> {o.title}
                    </button>
                    <button
                      className="icon-btn"
                      title="Supprimer le lien"
                      onClick={() => linkApi.onDelete(l.id)}
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {otherCards.length === 0 ? (
            <p className="muted">Aucune autre carte à lier.</p>
          ) : (
            <div className="link-form">
              <select value={linkType} onChange={e => setLinkType(e.target.value)}>
                {LINK_TYPES.map(t => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select value={linkTarget} onChange={e => setLinkTarget(e.target.value)}>
                <option value="">Choisir une carte…</option>
                {otherCards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || 'Sans titre'}
                  </option>
                ))}
              </select>
              <button className="add-btn" onClick={submitLink} title="Créer le lien">
                ＋
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
