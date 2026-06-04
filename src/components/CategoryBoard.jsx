import { useState } from 'react'
import Card from './Card'

// Les catégories possibles d'une carte (l'étiquette `label`).
const CATEGORIES = ['Pro', 'Perso', 'Idée']

// Vue « par catégorie » : une colonne par étiquette (Pro / Perso / Idée).
// Glisser une carte dans une autre colonne change sa CATÉGORIE — sans toucher
// au thème/colonne d'origine de la carte.
export default function CategoryBoard({
  cards, // liste à plat : { card, columnId, columnTitle }
  allColumns,
  contacts,
  matchesSearch,
  onSetCategory,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onManageContacts,
}) {
  return (
    <div className="category-board">
      {CATEGORIES.map(cat => (
        <CategoryColumn
          key={cat}
          category={cat}
          items={cards.filter(it => it.card.label === cat && matchesSearch(it.card))}
          allColumns={allColumns}
          contacts={contacts}
          onSetCategory={onSetCategory}
          onUpdateCard={onUpdateCard}
          onDeleteCard={onDeleteCard}
          onMoveCard={onMoveCard}
          onManageContacts={onManageContacts}
        />
      ))}
    </div>
  )
}

function CategoryColumn({
  category,
  items,
  allColumns,
  contacts,
  onSetCategory,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onManageContacts,
}) {
  const [dragOver, setDragOver] = useState(false)

  // Réception d'une carte glissée : on ne lit que l'identifiant et on lui
  // attribue la catégorie de cette colonne.
  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    try {
      const { cardId } = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (cardId) onSetCategory(cardId, category)
    } catch (err) {
      // Donnée de glisser-déposer invalide : on ignore.
    }
  }

  return (
    <section
      className={`column category-column ${dragOver ? 'drag-over' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3 className="column-name">
          <span className={`label label-${category}`}>{category}</span>
        </h3>
        <div className="column-meta">
          <span className="count">{items.length}</span>
        </div>
      </div>

      <div className="cards">
        {items.map(({ card, columnId, columnTitle }) => (
          <Card
            key={card.id}
            card={card}
            columnId={columnId}
            columnTitle={columnTitle}
            columns={allColumns}
            contacts={contacts}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
            onMove={onMoveCard}
            onManageContacts={onManageContacts}
          />
        ))}
        {items.length === 0 && (
          <p className="muted category-empty">Glissez une carte ici.</p>
        )}
      </div>
    </section>
  )
}
