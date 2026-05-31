import { useState } from 'react'

// Cycle des étiquettes : un clic passe à la suivante.
const LABEL_NEXT = { Pro: 'Perso', Perso: 'Idée', Idée: 'Pro' }

// Une carte = un sujet, avec titre, note, étiquette et personnes.
export default function Card({
  card,
  columnId,
  columnTitle,
  columns,
  contacts,
  onUpdate,
  onDelete,
  onMove,
  onManageContacts,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [showPeople, setShowPeople] = useState(false)

  // Change l'étiquette au clic.
  function cycleLabel() {
    onUpdate({ ...card, label: LABEL_NEXT[card.label] || 'Pro' })
  }

  // Coche/décoche une personne du carnet sur cette carte.
  function togglePerson(contactId) {
    const has = card.people.includes(contactId)
    const people = has
      ? card.people.filter(id => id !== contactId)
      : [...card.people, contactId]
    onUpdate({ ...card, people })
  }

  // Construit le lien e-mail pré-rempli (mailto).
  function emailHref() {
    const assigned = contacts.filter(c => card.people.includes(c.id))
    const to = assigned.map(c => c.email).filter(Boolean).join(',')
    const subject = encodeURIComponent(card.title)
    const lines = []
    if (card.note) lines.push(card.note)
    lines.push('', `Thème : ${columnTitle}`)
    const body = encodeURIComponent(lines.join('\n'))
    return `mailto:${to}?subject=${subject}&body=${body}`
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
        <span
          className={`label label-${card.label}`}
          onClick={cycleLabel}
          title="Cliquer pour changer l'étiquette"
        >
          {card.label}
        </span>
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
        <button className="mini-btn" onClick={() => setShowPeople(s => !s)}>
          Qui ?
        </button>
        <a className="mini-btn" href={emailHref()}>
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

      {showPeople && (
        <div className="people-popover">
          {contacts.length === 0 && <p className="muted">Carnet vide.</p>}
          {contacts.map(c => (
            <label key={c.id} className="people-row">
              <input
                type="checkbox"
                checked={card.people.includes(c.id)}
                onChange={() => togglePerson(c.id)}
              />
              {c.name}
            </label>
          ))}
          <button
            className="mini-btn"
            onClick={() => {
              setShowPeople(false)
              onManageContacts()
            }}
          >
            ＋ Gérer le carnet
          </button>
        </div>
      )}
    </article>
  )
}
