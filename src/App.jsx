import { useEffect, useState } from 'react'
import Group from './components/Group'
import ContactBook from './components/ContactBook'
import { loadState, saveState, makeCard, makeColumn, makeGroup, uid } from './storage'

// Les filtres disponibles en haut du tableau.
const FILTERS = ['Tous', 'Pro', 'Perso', 'Idée']

export default function App() {
  // On charge une seule fois l'état sauvegardé au démarrage.
  const initial = loadState()
  const [groups, setGroups] = useState(initial.groups)
  const [contacts, setContacts] = useState(initial.contacts)
  const [filter, setFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [showContacts, setShowContacts] = useState(false)

  // À chaque changement, on sauvegarde automatiquement dans le navigateur.
  useEffect(() => {
    saveState({ groups, contacts })
  }, [groups, contacts])

  // Toutes les colonnes, tous groupes confondus (utile pour déplacer une carte).
  const allColumns = groups.flatMap(g => g.columns)

  // ---------- Cartes (sujets) ----------
  function addCard(columnId, title) {
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c =>
          c.id === columnId ? { ...c, cards: [...c.cards, makeCard(title)] } : c
        ),
      }))
    )
  }

  function updateCard(updated) {
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c => ({
          ...c,
          cards: c.cards.map(card => (card.id === updated.id ? updated : card)),
        })),
      }))
    )
  }

  function deleteCard(cardId) {
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c => ({
          ...c,
          cards: c.cards.filter(card => card.id !== cardId),
        })),
      }))
    )
  }

  // Déplace une carte d'une colonne vers une autre (n'importe quel groupe).
  function moveCard(cardId, fromCol, toCol) {
    if (fromCol === toCol) return
    setGroups(gs => {
      let moving = null
      const removed = gs.map(g => ({
        ...g,
        columns: g.columns.map(c => {
          if (c.id === fromCol) {
            moving = c.cards.find(card => card.id === cardId)
            return { ...c, cards: c.cards.filter(card => card.id !== cardId) }
          }
          return c
        }),
      }))
      if (!moving) return gs
      return removed.map(g => ({
        ...g,
        columns: g.columns.map(c =>
          c.id === toCol ? { ...c, cards: [...c.cards, moving] } : c
        ),
      }))
    })
  }

  // ---------- Colonnes (thèmes) ----------
  function addColumn(groupId) {
    setGroups(gs =>
      gs.map(g =>
        g.id === groupId ? { ...g, columns: [...g.columns, makeColumn('Nouveau thème')] } : g
      )
    )
  }

  function renameColumn(columnId, title) {
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c => (c.id === columnId ? { ...c, title } : c)),
      }))
    )
  }

  function deleteColumn(columnId) {
    const col = allColumns.find(c => c.id === columnId)
    if (
      col &&
      col.cards.length > 0 &&
      !window.confirm(`Supprimer « ${col.title} » et ses ${col.cards.length} carte(s) ?`)
    ) {
      return
    }
    setGroups(gs =>
      gs.map(g => ({ ...g, columns: g.columns.filter(c => c.id !== columnId) }))
    )
  }

  // Déplace une colonne entière vers un autre groupe.
  function moveColumn(columnId, toGroupId) {
    setGroups(gs => {
      let moving = null
      const removed = gs.map(g => {
        if (g.columns.some(c => c.id === columnId)) {
          moving = g.columns.find(c => c.id === columnId)
          return { ...g, columns: g.columns.filter(c => c.id !== columnId) }
        }
        return g
      })
      if (!moving) return gs
      return removed.map(g =>
        g.id === toGroupId ? { ...g, columns: [...g.columns, moving] } : g
      )
    })
  }

  // ---------- Groupes ----------
  function addGroup() {
    setGroups(gs => [...gs, makeGroup('Nouveau groupe')])
  }

  function renameGroup(groupId, title) {
    setGroups(gs => gs.map(g => (g.id === groupId ? { ...g, title } : g)))
  }

  function toggleGroup(groupId) {
    setGroups(gs =>
      gs.map(g => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    )
  }

  function deleteGroup(groupId) {
    const grp = groups.find(g => g.id === groupId)
    const nbCols = grp ? grp.columns.length : 0
    if (
      nbCols > 0 &&
      !window.confirm(
        `Supprimer le groupe « ${grp.title} » et ses ${nbCols} colonne(s) ?`
      )
    ) {
      return
    }
    setGroups(gs => gs.filter(g => g.id !== groupId))
  }

  // ---------- Carnet de contacts ----------
  function addContact(name, email) {
    setContacts(cs => [...cs, { id: uid(), name, email }])
  }

  function deleteContact(contactId) {
    setContacts(cs => cs.filter(c => c.id !== contactId))
    // On retire aussi ce contact des cartes où il était nommé.
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c => ({
          ...c,
          cards: c.cards.map(card => ({
            ...card,
            people: card.people.filter(id => id !== contactId),
          })),
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
          <button className="ghost-btn" onClick={addGroup}>
            ＋ Groupe
          </button>
        </div>
      </header>

      <main className="board">
        {groups.map(group => (
          <Group
            key={group.id}
            group={group}
            groups={groups}
            allColumns={allColumns}
            contacts={contacts}
            isVisibleCard={isVisibleCard}
            onToggle={toggleGroup}
            onRenameGroup={renameGroup}
            onDeleteGroup={deleteGroup}
            onAddColumn={addColumn}
            onAddCard={addCard}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onMoveCard={moveCard}
            onRenameColumn={renameColumn}
            onDeleteColumn={deleteColumn}
            onMoveColumn={moveColumn}
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
