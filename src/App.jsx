import { useEffect, useRef, useState } from 'react'
import Group from './components/Group'
import CategoryBoard from './components/CategoryBoard'
import ContactBook from './components/ContactBook'
import AuthBar from './components/AuthBar'
import { supabase } from './supabase'
import {
  loadState,
  saveState,
  makeCard,
  makeColumn,
  makeGroup,
  uid,
  loadZoom,
  saveZoom,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from './storage'

// Les filtres disponibles en haut du tableau.
const FILTERS = ['Tous', 'Pro', 'Perso', 'Idée']

// Identifiant unique de cet onglet/appareil. Il sert à reconnaître — et donc à
// ignorer — nos PROPRES mises à jour qui nous reviennent en temps réel.
// (Supabase stocke en JSON « jsonb » et réordonne les clés : on ne peut donc
// pas se fier à une simple comparaison de texte pour repérer notre écho.)
const CLIENT_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export default function App() {
  // On charge une seule fois l'état sauvegardé localement au démarrage
  // (cache hors-ligne ; remplacé par les données du cloud après connexion).
  const initial = loadState()
  const [groups, setGroups] = useState(initial.groups)
  const [contacts, setContacts] = useState(initial.contacts)
  const [filter, setFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [showContacts, setShowContacts] = useState(false)
  // Vue du tableau : 'themes' (colonnes = thèmes) ou 'categories'
  // (colonnes = Pro/Perso/Idée, glisser-déposer pour changer la catégorie).
  const [boardView, setBoardView] = useState('themes')
  // Niveau de zoom de l'affichage (réglage local, persisté par appareil).
  const [zoom, setZoom] = useState(loadZoom)

  // Synchronisation cloud (Supabase).
  const [session, setSession] = useState(null)
  const [cloudReady, setCloudReady] = useState(false)
  const [status, setStatus] = useState('')
  const lastSyncedRef = useRef(null) // dernier contenu envoyé/reçu (anti-boucle)
  const saveTimerRef = useRef(null)
  const stateRef = useRef({ groups, contacts })
  stateRef.current = { groups, contacts }

  // --- Suivi de la session de connexion ---
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- Au login : on charge les données du cloud ---
  useEffect(() => {
    if (!supabase || !session) {
      setCloudReady(false)
      return
    }
    let cancelled = false
    async function load() {
      setCloudReady(false)
      setStatus('Chargement…')
      const { data, error } = await supabase
        .from('boards')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setStatus('Erreur de chargement')
        setCloudReady(true)
        return
      }
      if (data && data.data && Array.isArray(data.data.groups)) {
        // Le cloud fait foi : on adopte ses données (on ne garde que le contenu
        // du tableau, sans les métadonnées internes comme _writer).
        const content = {
          groups: data.data.groups,
          contacts: data.data.contacts || [],
        }
        lastSyncedRef.current = JSON.stringify(content)
        setGroups(content.groups)
        setContacts(content.contacts)
        setStatus('Synchronisé')
      } else {
        // Aucune donnée dans le cloud : on y pousse l'état local actuel.
        await pushToCloud(session.user.id, stateRef.current)
      }
      setCloudReady(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session])

  // --- Mise à jour en direct depuis un autre appareil ---
  useEffect(() => {
    if (!supabase || !session) return
    const channel = supabase
      .channel('board-' + session.user.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
          filter: 'user_id=eq.' + session.user.id,
        },
        payload => {
          const row = payload.new
          if (!row || !row.data || !Array.isArray(row.data.groups)) return
          // On ignore nos propres écritures (même appareil) : elles sont déjà
          // appliquées localement. On n'applique que les vraies mises à jour
          // venant d'un AUTRE appareil.
          if (row.data._writer === CLIENT_ID) return
          const content = { groups: row.data.groups, contacts: row.data.contacts || [] }
          lastSyncedRef.current = JSON.stringify(content)
          setGroups(content.groups)
          setContacts(content.contacts)
          setStatus('Mis à jour depuis un autre appareil')
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  // --- Sauvegarde : locale toujours, cloud si connecté ---
  useEffect(() => {
    const payload = { groups, contacts }
    saveState(payload) // cache local (hors-ligne)

    if (!supabase || !session) return
    if (!cloudReady) return // on attend la fin du chargement initial
    const json = JSON.stringify(payload)
    if (json === lastSyncedRef.current) return // rien de neuf

    setStatus('Sauvegarde…')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      pushToCloud(session.user.id, payload)
    }, 700)
  }, [groups, contacts, session, cloudReady])

  // Envoie l'état complet vers le cloud.
  async function pushToCloud(userId, payload) {
    const json = JSON.stringify(payload)
    const { error } = await supabase.from('boards').upsert({
      user_id: userId,
      // On marque l'écriture avec notre identifiant d'appareil pour pouvoir
      // ignorer l'écho temps-réel qui nous reviendra.
      data: { ...payload, _writer: CLIENT_ID },
      updated_at: new Date().toISOString(),
    })
    if (error) {
      setStatus('Erreur de sauvegarde')
    } else {
      lastSyncedRef.current = json
      setStatus('Synchronisé')
    }
  }

  // Connexion par lien magique envoyé par e-mail.
  async function signIn(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href.split('#')[0] },
    })
    return error ? { ok: false, message: error.message } : { ok: true }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setStatus('')
  }

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

  // Change la catégorie (étiquette) d'une carte, où qu'elle soit. Utilisé par
  // la vue « Catégories » en glisser-déposer.
  function setCardCategory(cardId, label) {
    setGroups(gs =>
      gs.map(g => ({
        ...g,
        columns: g.columns.map(c => ({
          ...c,
          cards: c.cards.map(card =>
            card.id === cardId ? { ...card, label } : card
          ),
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
      !window.confirm(`Supprimer le groupe « ${grp.title} » et ses ${nbCols} colonne(s) ?`)
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
  // Recherche seule (titre + note) — utilisée par la vue « Catégories », où le
  // filtre Pro/Perso/Idée n'a pas de sens puisque les colonnes SONT les catégories.
  function matchesSearch(card) {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      card.title.toLowerCase().includes(q) ||
      (card.note || '').toLowerCase().includes(q)
    )
  }

  function isVisibleCard(card) {
    if (filter !== 'Tous' && card.label !== filter) return false
    return matchesSearch(card)
  }

  // Toutes les cartes à plat, avec le contexte de leur colonne d'origine
  // (pour la vue par catégorie : déplacement de thème + e-mail restent possibles).
  const allCards = groups.flatMap(g =>
    g.columns.flatMap(c =>
      c.cards.map(card => ({ card, columnId: c.id, columnTitle: c.title }))
    )
  )

  // ---------- Zoom de l'affichage ----------
  useEffect(() => {
    saveZoom(zoom)
  }, [zoom])

  function changeZoom(delta) {
    setZoom(z => {
      const next = Math.round((z + delta) * 100) / 100
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Carta</h1>
          <span className="tagline">vos sujets, à l'encre sur papier</span>
          <div className="brand-spacer" />
          <AuthBar
            configured={!!supabase}
            session={session}
            status={status}
            onSignIn={signIn}
            onSignOut={signOut}
          />
        </div>

        <div className="toolbar">
          <input
            className="search"
            placeholder="Rechercher un sujet…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {boardView === 'themes' && (
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
          )}
          <div className="view-toggle" role="group" aria-label="Mode d'affichage">
            <button
              className={`filter-btn ${boardView === 'themes' ? 'active' : ''}`}
              onClick={() => setBoardView('themes')}
              title="Organiser par thèmes"
            >
              Thèmes
            </button>
            <button
              className={`filter-btn ${boardView === 'categories' ? 'active' : ''}`}
              onClick={() => setBoardView('categories')}
              title="Organiser par catégorie — glissez une carte pour changer sa catégorie"
            >
              Catégories
            </button>
          </div>
          <div className="zoom-control" role="group" aria-label="Zoom de l'affichage">
            <button
              className="zoom-btn"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
              title="Dézoomer"
              aria-label="Dézoomer"
            >
              −
            </button>
            <button
              className="zoom-level"
              onClick={() => setZoom(1)}
              title="Réinitialiser le zoom (100 %)"
            >
              {Math.round(zoom * 100)} %
            </button>
            <button
              className="zoom-btn"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
              title="Zoomer"
              aria-label="Zoomer"
            >
              ＋
            </button>
          </div>
          <button className="ghost-btn" onClick={() => setShowContacts(true)}>
            Carnet
          </button>
          {boardView === 'themes' && (
            <button className="ghost-btn" onClick={addGroup}>
              ＋ Groupe
            </button>
          )}
        </div>
      </header>

      <main className="board" style={{ zoom }}>
        {boardView === 'categories' ? (
          <CategoryBoard
            cards={allCards}
            allColumns={allColumns}
            contacts={contacts}
            matchesSearch={matchesSearch}
            onSetCategory={setCardCategory}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onMoveCard={moveCard}
            onManageContacts={() => setShowContacts(true)}
          />
        ) : (
          groups.map(group => (
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
          ))
        )}
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
