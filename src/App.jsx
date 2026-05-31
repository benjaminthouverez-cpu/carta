import { useEffect, useState } from 'react'
import Column from './components/Column'
import ContactBook from './components/ContactBook'
import { loadState, saveState, makeCard, makeColumn, uid } from './storage'

// Les filtres disponibles en haut du tableau.
const FILTERS = ['Tous', 'Pro', 'Perso', 'Idée']

export default function App() {
  // On charge une seule fois l'état sauvegardé au démarrage.
  const initial = loadState()
  const [columns, setColumns] = useState(initial.columns)
  const [contacts, setContacts] = useState(initial.contacts)
  const [filter, setFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [showContacts, setShowContacts] = useState(false)

  // À chaque changement, on sauvegarde automatiquement dans le navigateur.
  useEffect(() => {
    saveState({ columns, contacts })
  }, [columns, contacts])

  // ---------- Cartes (sujets) ----------
  function addCard(columnId, title) {
    setColumns(cols =>
      cols.map(c => (c.id === columnId ? { ...c, cards: [...c.cards, makeCard(title)] } : c))
    )
  }

  function updateCard(updated) {
    setColumns(cols =>
      cols.map(c => ({
        ...c,
        cards: c.cards.map(card => (card.id === updated.id ? updated : card)),
      }))
    )
  }

  function deleteCard(cardId) {
    setColumns(cols =>
      cols.map(c => ({ ...c, cards: c.cards.filter(card => card.id !== cardId) }))
    )
  }

  // Déplace une carte d'une colonne vers une autre.
  function moveCard(cardId, fromCol, toCol) {
    if (fromCol === toCol) return
    setColumns(cols => {
      let moving = null
      const without = cols.map(c => {
        if (c.id === fromCol) {
          moving = c.cards.find(card => card.id === cardId)
          return { ...c, cards: c.cards.filter(card => card.id !== cardId) }
        }
        return c
      })
      if (!moving) return cols
      return without.map(c => (c.id === toCol ? { ...c, cards: [...c.cards, moving] } : c))
    })
  }

  // ---------- Colonnes (thèmes) ----------
  function addColumn() {
    setColumns(cols => [...cols, makeColumn('Nouveau thème')])
  }

  function renameColumn(columnId, title) {
    setColumns(cols => cols.map(c => (c.id === columnId ? { ...c, title } : c)))
  }

  function deleteColumn(columnId) {
    const col = columns.find(c => c.id === columnId)
    if (
      col &&
      col.cards.length > 0 &&
      !window.confirm(`Supprimer « ${col.title} » et ses ${col.cards.length} carte(s) ?`)
    ) {
      return
    }
    setColumns(cols => cols.filter(c => c.id !== columnId))
  }

  // ---------- Carnet de contacts ----------
  function addContact(name, email) {
    setContacts(cs => [...cs, { id: uid(), name, email }])
  }

  function deleteContact(contactId) {
    setContacts(cs => cs.filter(c => c.id !== contactId))
    // On retire aussi ce contact des cartes où il était nommé.
    setColumns(cols =>
      cols.map(c => ({
        ...c,
        cards: c.cards.map(card => ({
          ...card,
          people: card.people.filter(id => id !== contactId),
        })),
      }))
    )
  }

  // ---------- Filtre + recherche ----------
  // Une carte est affichée si elle passe le filtre ET la recherche.
  function isVisibleCard(card) {
    if (filter !== 'Tous' && card.label !== filter) return false
    const q = search.trim().toLowerCase()
    if (q) {
      const inTitle = card.title.toLowerCase().includes(q)
      const inNote = (card.note || '').toLowerCase().includes(q)
      if (!inTitle && !inNote) return false
    }
    return true
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Carta</h1>
          <span className="tagline">vos sujets, à l'encre sur papier</span>
        </div>

        <div className="toolbar">
          <input
            className="search"
            placeholder="Rechercher un sujet…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filters">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="ghost-btn" onClick={() => setShowContacts(true)}>
            Carnet
          </button>
          <button className="ghost-btn" onClick={addColumn}>
            ＋ Colonne
          </button>
        </div>
      </header>

      <main className="board">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            columns={columns}
            contacts={contacts}
            isVisibleCard={isVisibleCard}
            onAddCard={addCard}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onMoveCard={moveCard}
            onRenameColumn={renameColumn}
            onDeleteColumn={deleteColumn}
            onManageContacts={() => setShowContacts(true)}
          />
        ))}
      </main>

      {showContacts && (
        <ContactBook
          contacts={contacts}
          onAdd={addContact}
          onDelete={deleteContact}
          onClose={() => setShowContacts(false)}
        />
      )}
    </div>
  )
}
