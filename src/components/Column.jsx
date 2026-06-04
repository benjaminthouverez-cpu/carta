import { useState } from 'react'
import Card from './Card'

// Une colonne = un thème, contenant des cartes. Elle appartient à un groupe.
export default function Column({
  column,
  groupId,
  groups,
  allColumns,
  contacts,
  isVisibleCard,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  onManageContacts,
  linkApi,
}) {
  const [newTitle, setNewTitle] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Ajoute une carte à partir du champ « + ajouter un sujet ».
  function addCard() {
    const t = newTitle.trim()
    if (!t) return
    onAddCard(column.id, t)
    setNewTitle('')
  }

  // Réception d'une carte glissée-déposée dans cette colonne.
  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    try {
      const { cardId, fromCol } = JSON.parse(e.dataTransfer.getData('text/plain'))
      onMoveCard(cardId, fromCol, column.id)
    } catch (err) {
      // Donnée de glisser-déposer invalide : on ignore.
    }
  }

  // Rang de tri : les priorités fortes remontent en haut. À priorité égale,
  // l'ordre d'origine est conservé (le tri de JS est stable).
  const PRIORITY_RANK = { Haute: 0, Moyenne: 1, Basse: 2 }
  const visibleCards = column.cards
    .filter(isVisibleCard)
    .slice()
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
    )

  return (
    <section
      className={`column ${dragOver ? 'drag-over' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="column-header">
        {editingName ? (
          <input
            className="column-name-input"
            autoFocus
            value={column.title}
            onChange={e => onRenameColumn(column.id, e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => {
              if (e.key === 'Enter') setEditingName(false)
            }}
          />
        ) : (
          <h3
            className="column-name"
            onClick={() => setEditingName(true)}
            title="Cliquer pour renommer"
          >
            {column.title}
          </h3>
        )}
        <div className="column-meta">
          <span className="count">{visibleCards.length}</span>
          {/* Déplacer toute la colonne vers un autre groupe. */}
          {groups.length > 1 && (
            <select
              className="move-col-select"
              value=""
              onChange={e => {
                if (e.target.value) onMoveColumn(column.id, e.target.value)
              }}
              title="Déplacer cette colonne vers un autre groupe"
            >
              <option value="">↦</option>
              {groups
                .filter(g => g.id !== groupId)
                .map(g => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </select>
          )}
          <button
            className="icon-btn"
            title="Supprimer la colonne"
            onClick={() => onDeleteColumn(column.id)}
          >
            ×
          </button>
        </div>
      </div>

      <div className="cards">
        {visibleCards.map(card => (
          <Card
            key={card.id}
            card={card}
            columnId={column.id}
            columnTitle={column.title}
            columns={allColumns}
            contacts={contacts}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
            onMove={onMoveCard}
            onManageContacts={onManageContacts}
            linkApi={linkApi}
          />
        ))}
      </div>

      <div className="add-card">
        <input
          value={newTitle}
          placeholder="+ ajouter un sujet"
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') addCard()
          }}
        />
        <button className="add-btn" onClick={addCard} title="Ajouter le sujet">
          ＋
        </button>
      </div>
    </section>
  )
}
