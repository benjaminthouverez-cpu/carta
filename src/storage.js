// Gestion des données : sauvegarde locale dans le navigateur (localStorage).
// Aucune connexion, aucun serveur, aucun compte.

const STORAGE_KEY = 'carta-data-v1'

// Les trois étiquettes possibles d'une carte.
export const LABELS = ['Pro', 'Perso', 'Idée']

// Génère un identifiant unique simple.
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Crée une nouvelle carte (sujet).
export function makeCard(title, label = 'Idée') {
  return { id: uid(), title, note: '', label, people: [] }
}

// Crée une nouvelle colonne (thème).
export function makeColumn(title, cards = []) {
  return { id: uid(), title, cards }
}

// Colonnes par défaut au tout premier lancement.
function defaultColumns() {
  return [
    makeColumn('US · Dubai'),
    makeColumn('Europe'),
    makeColumn('Idées'),
    makeColumn('Perso'),
  ]
}

// Lit les données sauvegardées, ou renvoie l'état par défaut.
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && Array.isArray(data.columns)) {
        return { columns: data.columns, contacts: data.contacts || [] }
      }
    }
  } catch (e) {
    // Données illisibles : on repart proprement.
  }
  return { columns: defaultColumns(), contacts: [] }
}

// Enregistre l'état complet dans le navigateur.
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    // Stockage indisponible (mode privé strict, etc.) : on ignore.
  }
}
