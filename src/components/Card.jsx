import { useState } from 'react'

// Une carte = un sujet, avec titre, note et personnes.
export default function Card({
  card,
  columnId,
  columnTitle,
  columns,
  contacts,
  onUpdate,
  onDelete,
  onMove,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)

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

  return (
    <article
      className="card"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({ cardId: card.id, fromCol: columnId })
        )
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="card-top">
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
    </article>
  )
}
