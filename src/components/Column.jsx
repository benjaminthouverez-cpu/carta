import { useState } from 'react'
import Card from './Card'

// Une colonne = un thème, contenant des cartes.
export default function Column({
  column,
  columns,
  contacts,
  isVisibleCard,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onRenameColumn,
  onDeleteColumn,
  onManageContacts,
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

  const visibleCards = column.cards.filter(isVisibleCard)

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
            columns={columns}
            contacts={contacts}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
            onMove={onMoveCard}
            onManageContacts={onManageContacts}
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
